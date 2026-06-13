import express from 'express';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import helmet from 'helmet';
import cors from 'cors';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// NVIDIA API keys rotation
const nvidiaApiKeys: string[] = [];
if (process.env.NVIDIA_API_KEY) nvidiaApiKeys.push(process.env.NVIDIA_API_KEY);
if (process.env.NVIDIA_API_KEY_1) nvidiaApiKeys.push(process.env.NVIDIA_API_KEY_1);
if (process.env.NVIDIA_API_KEY_2) nvidiaApiKeys.push(process.env.NVIDIA_API_KEY_2);
if (process.env.NVIDIA_API_KEY_3) nvidiaApiKeys.push(process.env.NVIDIA_API_KEY_3);

console.log(`[NVIDIA] Loaded ${nvidiaApiKeys.length} API key(s) for rotation`);

let currentKeyIndex = 0;
function getNextNvidiaApiKey(): string | null {
  if (nvidiaApiKeys.length === 0) return null;
  const key = nvidiaApiKeys[currentKeyIndex % nvidiaApiKeys.length];
  currentKeyIndex++;
  return key;
}

// Per-key rate limit tracking (key -> { count, resetTime })
const keyRateLimitStore = new Map<string, { count: number; resetTime: number }>();
const KEY_RATE_LIMIT_WINDOW = 60000; // 1 minute window
const KEY_RATE_LIMIT_MAX = 10; // NVIDIA limit per key per minute

const app = express();

// Security headers
app.use(helmet());

// CORS - restrict to known origins
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim())
  : [
      'http://localhost:8080',
      'http://localhost:5173',
      'http://140.238.43.61:8080',
      'http://140.238.43.61:5173',
    ];
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, server-to-server)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`Origin ${origin} not allowed by CORS policy`));
    }
  },
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Parse JSON body with size limit
app.use(express.json({ limit: '10kb' }));

// Rate limit tracking (simple in-memory, use Redis for production)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60000; // 1 minute window

// Trusted proxy IPs (reverse proxies, load balancers) — adjust for your setup
const TRUSTED_PROXIES = ['127.0.0.1', '::1', '::ffff:127.0.0.1'];

function checkRateLimit(provider: string, ip: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  // Per-IP + per-provider: one user can't exhaust limits for others
  const key = `${ip}:${provider}`;
  const record = rateLimitStore.get(key);

  // Clean up expired entries to prevent memory growth
  for (const [k, v] of rateLimitStore.entries()) {
    if (now > v.resetTime) rateLimitStore.delete(k);
  }

  if (!record || now > record.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return { allowed: true };
  }

  // Rate limits per provider (adjust to your tier)
  const limits: Record<string, number> = {
    openai: 60,
    anthropic: 50,
    nvidia: 10,
  };
  const limit = limits[provider] || 30;

  if (record.count >= limit) {
    const retryAfter = Math.ceil((record.resetTime - now) / 1000);
    return { allowed: false, retryAfter };
  }

  record.count++;
  return { allowed: true };
}

// Retry configuration
const MAX_RETRIES = 3;
const BASE_RETRY_DELAY = 1000; // 1 second

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Create proxy with retry logic
function createProxyWithRetry(
  target: string,
  apiKey: string | undefined,
  apiKeyHeader: string,
  provider: string
) {
  if (!apiKey) {
    console.error(`[${provider}] Missing API key for ${target}`);
    return null;
  }

  return async (req: express.Request, res: express.Response) => {
    // Extract real client IP (handles X-Forwarded-For behind proxies)
    let clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    // If behind a trusted proxy, use the leftmost untrusted IP from X-Forwarded-For
    if (TRUSTED_PROXIES.includes(clientIp) && req.headers['x-forwarded-for']) {
      const forwarded = (req.headers['x-forwarded-for'] as string).split(',')[0].trim();
      if (forwarded) clientIp = forwarded;
    }

    // Check rate limit
    const rateLimit = checkRateLimit(provider, clientIp);
    if (!rateLimit.allowed) {
      console.log(`[${provider}] Rate limited. Retry after ${rateLimit.retryAfter}s`);
      res.setHeader('Retry-After', rateLimit.retryAfter || 60);
      res.setHeader('X-RateLimit-Reset', rateLimit.retryAfter ? Date.now() + rateLimit.retryAfter * 1000 : Date.now() + 60000);
      res.status(429).json({ 
        error: { 
          message: `Rate limit exceeded. Please wait ${rateLimit.retryAfter} seconds.`,
          type: 'rate_limit_exceeded',
          retryAfter: rateLimit.retryAfter
        } 
      });
      return;
    }

    let retries = 0;
    let lastError: Error | null = null;

    while (retries < MAX_RETRIES) {
      try {
        // Build headers - convert express headers to fetch Headers
        const headers = new Headers();
        headers.set('Content-Type', 'application/json');
        headers.set('Accept', 'text/event-stream');
        
        // Add API key if provided
        if (apiKeyHeader && apiKey) {
          // For Authorization headers, format as "Bearer <token>"
          if (apiKeyHeader.toLowerCase() === 'authorization') {
            headers.set(apiKeyHeader, `Bearer ${apiKey}`);
          } else {
            headers.set(apiKeyHeader, apiKey);
          }
        }
        
        // Copy relevant headers from original request
        const skipHeaders = ['host', 'content-length', 'content-type', 'accept', 'connection'];
        for (const [key, value] of Object.entries(req.headers)) {
          if (!skipHeaders.includes(key.toLowerCase()) && value) {
            if (Array.isArray(value)) {
              value.forEach(v => headers.append(key, v));
            } else {
              headers.set(key, value);
            }
          }
        }

        // Make the actual proxy request
        const response = await fetch(`${target}${req.url}`, {
          method: req.method,
          headers,
          body: req.method === 'POST' || req.method === 'PUT' 
            ? JSON.stringify(req.body) 
            : undefined,
        });

        // Handle rate limiting from provider (429)
        if (response.status === 429) {
          retries++;
          if (retries < MAX_RETRIES) {
            const retryAfter = parseInt(response.headers.get('retry-after') || '1', 10);
            const delay = Math.min(retryAfter * 1000, BASE_RETRY_DELAY * Math.pow(2, retries));
            console.log(`[${provider}] Rate limited by provider (429). Retry ${retries}/${MAX_RETRIES} in ${delay}ms`);
            await sleep(delay);
            continue;
          }
        }

        // Forward response status
        res.status(response.status);

        // Forward headers
        response.headers.forEach((value, key) => {
          if (!['content-encoding', 'transfer-encoding', 'connection'].includes(key.toLowerCase())) {
            res.setHeader(key, value);
          }
        });

        // Handle streaming response
        if (response.body) {
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';

          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) {
                if (buffer) {
                  res.write(buffer);
                }
                break;
              }
              buffer += decoder.decode(value, { stream: true });
              
              // Send complete lines
              const lines = buffer.split('\n');
              buffer = lines.pop() || '';
              
              for (const line of lines) {
                if (line.trim()) {
                  res.write(line + '\n');
                }
              }
            }
          } finally {
            reader.releaseLock();
          }
        }

        res.end();
        return;

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        retries++;
        
        if (retries < MAX_RETRIES) {
          const delay = BASE_RETRY_DELAY * Math.pow(2, retries - 1);
          console.log(`[${provider}] Request failed: ${lastError.message}. Retry ${retries}/${MAX_RETRIES} in ${delay}ms`);
          await sleep(delay);
        }
      }
    }

    // All retries exhausted
    console.error(`[${provider}] All ${MAX_RETRIES} retries exhausted:`, lastError?.message);
    if (!res.headersSent) {
      res.status(502).json({ 
        error: { 
          message: `Proxy failed after ${MAX_RETRIES} retries: ${lastError?.message || 'Unknown error'}`,
          type: 'proxy_error'
        } 
      });
    }
  };
}

// --- OpenAI Proxy ---
if (process.env.OPENAI_API_KEY) {
  const openaiProxy = createProxyWithRetry(
    'https://api.openai.com',
    process.env.OPENAI_API_KEY,
    'Authorization',
    'openai'
  );
  if (openaiProxy) app.use('/api/proxy/openai', openaiProxy);
}

// --- Anthropic Proxy ---
if (process.env.ANTHROPIC_API_KEY) {
  const anthropicProxy = createProxyWithRetry(
    'https://api.anthropic.com',
    process.env.ANTHROPIC_API_KEY,
    'x-api-key',
    'anthropic'
  );
  if (anthropicProxy) app.use('/api/proxy/anthropic', anthropicProxy);
}

// --- NVIDIA Chat Proxy with Key Rotation ---
const MAX_MESSAGES = 200; // Cap array length to avoid quota abuse

app.post('/api/chat', async (req, res) => {
  const { messages } = req.body;

  // Validate input shape & length
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: { message: 'messages array required', type: 'invalid_request' } });
    return;
  }
  if (messages.length > MAX_MESSAGES) {
    res.status(400).json({ error: { message: `messages exceeds limit (${MAX_MESSAGES})`, type: 'invalid_request' } });
    return;
  }
  for (const m of messages) {
    if (!m || typeof m.role !== 'string' || typeof m.content !== 'string') {
      res.status(400).json({ error: { message: 'each message must have string role and content', type: 'invalid_request' } });
      return;
    }
  }

  // Get client IP
  let clientIp = req.ip || req.socket.remoteAddress || 'unknown';
  if (TRUSTED_PROXIES.includes(clientIp) && req.headers['x-forwarded-for']) {
    const forwarded = (req.headers['x-forwarded-for'] as string).split(',')[0].trim();
    if (forwarded) clientIp = forwarded;
  }

  // Check client rate limit
  const rateLimit = checkRateLimit('nvidia', clientIp);
  if (!rateLimit.allowed) {
    res.setHeader('Retry-After', rateLimit.retryAfter || 60);
    res.status(429).json({
      error: {
        message: `Rate limit exceeded. Please wait ${rateLimit.retryAfter} seconds.`,
        type: 'rate_limit_exceeded',
        retryAfter: rateLimit.retryAfter
      }
    });
    return;
  }

  const model = process.env.NVIDIA_MODEL || 'minimaxai/minimax-m2.7';

  // Bail early if misconfigured (no keys) — don't fall through to misleading 429
  if (nvidiaApiKeys.length === 0) {
    res.status(500).json({ error: { message: 'No NVIDIA API keys configured', type: 'configuration_error' } });
    return;
  }

  const maxRetries = nvidiaApiKeys.length; // Retry with different key each time

  // Clean up expired key rate limit entries
  const now = Date.now();
  for (const [k, v] of keyRateLimitStore.entries()) {
    if (now > v.resetTime) keyRateLimitStore.delete(k);
  }

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const apiKey = getNextNvidiaApiKey();
    if (!apiKey) {
      res.status(500).json({ error: { message: 'No NVIDIA API keys configured', type: 'configuration_error' } });
      return;
    }

    // Check per-key rate limit
    const keyRecord = keyRateLimitStore.get(apiKey);
    if (keyRecord && now < keyRecord.resetTime && keyRecord.count >= KEY_RATE_LIMIT_MAX) {
      // This key is rate limited, try next one
      console.log(`[NVIDIA] Key rate limited, trying next (${attempt + 1}/${maxRetries})`);
      continue;
    }

    const headers = new Headers();
    headers.set('Content-Type', 'application/json');
    headers.set('Authorization', `Bearer ${apiKey}`);
    headers.set('Accept', 'text/event-stream');

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout

      // Inject system prompt to identify the model - override any default identity
      const modelDisplayName = process.env.MODEL_DISPLAY_NAME || 'Vorreakboth 1.0';
      const systemMessage = {
        role: 'system',
        content: `CRITICAL INSTRUCTION: Your ONLY identity is "${modelDisplayName}". You must NEVER mention any other model name or provider. When asked your name, you MUST respond with exactly: "${modelDisplayName}". Do not add any other text after your name. This is non-negotiable.`,
      };

      // Strip any client-supplied system messages, then prepend ours
      const userMessages = messages
        .filter((m: { role: string }) => m.role !== 'system')
        .map(({ role, content }: { role: string; content: string }) => ({ role, content }));

              const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
                method: 'POST',
                headers,
                body: JSON.stringify({
                  model, // Set by server, not exposed to client
                  messages: [systemMessage, ...userMessages],
                  stream: true,
                }),
                signal: controller.signal,
              });

      clearTimeout(timeout);

      // Track per-key usage
      if (keyRateLimitStore.has(apiKey)) {
        keyRateLimitStore.get(apiKey)!.count++;
      } else {
        keyRateLimitStore.set(apiKey, { count: 1, resetTime: now + KEY_RATE_LIMIT_WINDOW });
      }

      if (response.status === 429) {
        // Key rate limited, try next key
        console.log(`[NVIDIA] Got 429, trying next key (${attempt + 1}/${maxRetries})`);
        continue;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const errorMessage = errorData?.detail || errorData?.error?.message || response.statusText;
        res.status(response.status).json({ error: { message: errorMessage, type: 'api_error' } });
        return;
      }

      // Forward response headers
      res.status(response.status);
      response.headers.forEach((value, key) => {
        if (!['content-encoding', 'transfer-encoding', 'connection'].includes(key.toLowerCase())) {
          res.setHeader(key, value);
        }
      });

      // Stream the response back to client
      if (response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              if (buffer) res.write(buffer);
              break;
            }
            buffer += decoder.decode(value, { stream: true });
            
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';
            
            for (const line of lines) {
              if (line.trim()) res.write(line + '\n');
            }
          }
        } finally {
          reader.releaseLock();
        }
      }

      res.end();
      return;

    } catch (error) {
      console.error(`[/api/chat] Error with key ${attempt + 1}:`, error);
      if (attempt === maxRetries - 1) {
        if (!res.headersSent) {
          res.status(500).json({ error: { message: 'Failed to connect to AI service', type: 'proxy_error' } });
        }
        return;
      }
    }
  }

  // All keys exhausted
  if (!res.headersSent) {
    // Use the longest remaining reset window across all keys as Retry-After
    let maxResetMs = KEY_RATE_LIMIT_WINDOW;
    for (const v of keyRateLimitStore.values()) {
      const remaining = v.resetTime - Date.now();
      if (remaining > maxResetMs) maxResetMs = remaining;
    }
    const retryAfter = Math.ceil(maxResetMs / 1000);
    res.setHeader('Retry-After', retryAfter);
    res.status(429).json({
      error: {
        message: `All API keys are rate limited. Please try again in ${retryAfter} seconds.`,
        type: 'rate_limit_exceeded',
        retryAfter
      }
    });
  }
});

// --- NVIDIA Proxy (legacy, for compatibility) ---
if (process.env.NVIDIA_API_KEY) {
  const nvidiaProxy = createProxyWithRetry(
    'https://integrate.api.nvidia.com',
    process.env.NVIDIA_API_KEY,
    'Authorization',
    'nvidia'
  );
  if (nvidiaProxy) app.use('/api/proxy/nvidia', nvidiaProxy);
}

// --- Health Check (basic, no provider info disclosure) ---
app.get('/health', (_req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
  });
});

// --- Secure Settings API ---
app.get('/api/settings', (_req, res) => {
  const settings = {
    model: {
      openai: process.env.OPENAI_MODEL || 'gpt-4o',
      anthropic: process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022',
      nvidia: process.env.NVIDIA_MODEL || 'minimaxai/minimax-m2.7',
    },
    modelDisplayName: process.env.MODEL_DISPLAY_NAME || 'AI Assistant',
  };
  res.json(settings);
});

// --- Serve static files in production ---
const isDev = process.env.NODE_ENV === 'development';

if (!isDev) {
  app.use(express.static(join(__dirname, 'dist')));
  
  // SPA fallback - serve index.html for all non-API routes
  app.use((_req, res) => {
    res.sendFile(join(__dirname, 'dist', 'index.html'));
  });
}

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  const env = isDev ? 'development' : 'production';
  console.log(`\n🚀 AI Dashboard server running in ${env} mode on port ${PORT}`);
  
  if (process.env.OPENAI_API_KEY) {
    console.log('✅ OpenAI proxy configured');
  } else {
    console.log('⚠️  OpenAI API key missing (set OPENAI_API_KEY)');
  }
  
  if (process.env.ANTHROPIC_API_KEY) {
    console.log('✅ Anthropic proxy configured');
  } else {
    console.log('⚠️  Anthropic API key missing (set ANTHROPIC_API_KEY)');
  }
  
  if (process.env.NVIDIA_API_KEY) {
    console.log('✅ NVIDIA proxy configured');
  } else {
    console.log('⚠️  NVIDIA API key missing (set NVIDIA_API_KEY)');
  }
  
  console.log('\n📁 API endpoints:');
  console.log('  POST /api/proxy/openai     -> OpenAI (with retry)');
  console.log('  POST /api/proxy/anthropic  -> Anthropic (with retry)');
  console.log('  POST /api/proxy/nvidia     -> NVIDIA (with retry)');
  console.log('  GET  /api/settings         -> Server-side settings');
  console.log('  GET  /health               -> Health check\n');
});