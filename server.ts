import express from 'express';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import helmet from 'helmet';
import cors from 'cors';

// Load .env with override:true so file values beat stale shell env (e.g. ~/.bashrc exports).
dotenv.config({ override: true });

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// NVIDIA API keys rotation
const nvidiaApiKeys: string[] = [];
if (process.env.NVIDIA_API_KEY) nvidiaApiKeys.push(process.env.NVIDIA_API_KEY);
if (process.env.NVIDIA_API_KEY_1) nvidiaApiKeys.push(process.env.NVIDIA_API_KEY_1);
if (process.env.NVIDIA_API_KEY_2) nvidiaApiKeys.push(process.env.NVIDIA_API_KEY_2);
if (process.env.NVIDIA_API_KEY_3) nvidiaApiKeys.push(process.env.NVIDIA_API_KEY_3);

// NVIDIA API key rotation — count kept private (no console.log to avoid log injection)

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

// --- Message queue for rate-limited requests ---
interface QueuedMessage {
  id: string;
  messages: Array<{ role: string; content: string }>;
  model: string;
  queuedAt: number;
}
const messageQueue: QueuedMessage[] = [];
const QUEUE_FILE = join(__dirname, '.message_queue.json');

function saveQueue() {
  try {
    // persist queue to disk so it survives server restarts
    import('fs').then(fs => {
      fs.writeFileSync(QUEUE_FILE, JSON.stringify(messageQueue, null, 2));
    }).catch(() => {});
  } catch {}
}

function loadQueue() {
  try {
    import('fs').then(fs => {
      if (fs.existsSync(QUEUE_FILE)) {
        const data = JSON.parse(fs.readFileSync(QUEUE_FILE, 'utf-8'));
        if (Array.isArray(data)) messageQueue.push(...data);
      }
    }).catch(() => {});
  } catch {}
}
loadQueue();

// --- Queue status endpoint ---
// (registered after app init below)
// --- Queue retry endpoint ---
// (registered after app init below)

const app = express();

// Security headers — CSP set explicitly via HTTP header (not meta tag) to support nonce
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: false,
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"], // 'unsafe-inline' required for React SPA
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'https://integrate.api.nvidia.com'],
      frameAncestors: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  frameguard: { action: 'deny' },
  xContentTypeOptions: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));

// CORS - restrict to known origins (must be explicitly configured)
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim())
  : ['http://localhost:8080', 'http://localhost:5173', 'http://localhost:3000']; // safe defaults — no hardcoded public IPs

app.use(cors({
  origin: (origin, callback) => {
    // Require a present, allowlisted origin (blocks curl, null-origin, and spoofed origins)
    if (origin && allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`Origin ${origin} not allowed by CORS policy`));
    }
  },
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Parse JSON body with size limit (chat conversations can grow large)
app.use(express.json({ limit: '1mb' }));

// Rate limit tracking (simple in-memory, use Redis for production)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60000; // 1 minute window

// Periodic cleanup to prevent memory growth from expired entries
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of rateLimitStore.entries()) {
    if (now > v.resetTime) rateLimitStore.delete(k);
  }
  for (const [k, v] of keyRateLimitStore.entries()) {
    if (now > v.resetTime) keyRateLimitStore.delete(k);
  }
}, RATE_LIMIT_WINDOW);

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
      // SSRF defense: only allow known-safe API paths
      const safePathPattern = /^\/v1\/(chat\/completions|messages|embeddings|models|completions)/;
      const decodedPath = decodeURIComponent(req.url);
      if (!safePathPattern.test(decodedPath)) {
        console.warn(`[${provider}] Blocked suspicious proxy path: ${decodedPath}`);
        res.status(400).json({ error: { message: 'Invalid request path', type: 'invalid_request' } });
        return;
      }

      // Extract real client IP (handles X-Forwarded-For behind proxies)
      let clientIp = req.ip || req.socket.remoteAddress || 'unknown';
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

    // All retries exhausted — log details server-side only; generic message to client
        console.error(`[${provider}] All ${MAX_RETRIES} retries exhausted:`, lastError?.message);
        if (!res.headersSent) {
          res.status(502).json({
            error: { message: 'AI service temporarily unavailable. Please try again.', type: 'proxy_error' }
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
    if (m.content.length === 0) {
      res.status(400).json({ error: { message: 'message content cannot be empty', type: 'invalid_request' } });
      return;
    }
    if (m.content.length > 10000) {
      res.status(400).json({ error: { message: 'message content exceeds 10000 character limit', type: 'invalid_request' } });
      return;
    }
    const validRoles = ['user', 'assistant', 'system'];
    if (!validRoles.includes(m.role)) {
      res.status(400).json({ error: { message: 'invalid role value', type: 'invalid_request' } });
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

  const model = process.env.NVIDIA_MODEL || 'meta/llama-3.3-70b-instruct';

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
      // Toggle with DISPLAY_MODEL_NAME=false to disable identity rewriting.
      const modelDisplayName = process.env.MODEL_DISPLAY_NAME || 'AI Assistant';
      const displayNameEnabled = (process.env.DISPLAY_MODEL_NAME ?? 'true').toLowerCase() !== 'false';
      const systemMessage = displayNameEnabled
        ? {
            role: 'system',
            content: `CRITICAL INSTRUCTION: Your ONLY identity is "${modelDisplayName}". You must NEVER mention any other model name or provider. When asked your name, you MUST respond with exactly: "${modelDisplayName}". Do not add any other text after your name. This is non-negotiable.`,
          }
        : null;

      // Strip any client-supplied system messages, then prepend ours (if enabled)
      const userMessages = messages
        .filter((m: { role: string }) => m.role !== 'system')
        .map(({ role, content }: { role: string; content: string }) => ({ role, content }));

      const finalMessages = systemMessage
        ? [systemMessage, ...userMessages]
        : userMessages;

      let response: Response;
      try {
        response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            model, // Set by server, not exposed to client
            messages: finalMessages,
            stream: true,
          }),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeout);
      }

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

  // All keys exhausted — queue message for automatic retry
  const queuedId = `q_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  messageQueue.push({ id: queuedId, messages, model, queuedAt: Date.now() });
  saveQueue();
  console.log(`[queue] Message ${queuedId} queued (${messageQueue.length} total) — all keys rate limited`);
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
        message: `All API keys are rate limited. Message queued (id: ${queuedId}). Please try again in ${retryAfter} seconds or wait for automatic retry.`,
        type: 'rate_limit_exceeded',
        retryAfter,
        queueId: queuedId,
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
      nvidia: process.env.NVIDIA_MODEL || 'meta/llama-3.3-70b-instruct',
    },
    modelDisplayName: process.env.MODEL_DISPLAY_NAME || 'AI Assistant',
    displayNameEnabled: (process.env.DISPLAY_MODEL_NAME ?? 'true').toLowerCase() !== 'false',
  };
  res.json(settings);
});

// --- Queue status endpoint ---
app.get('/api/queue/status', (_req, res) => {
  const now = Date.now();
  const keysRateLimited = [...keyRateLimitStore.entries()]
    .filter(([, v]) => now < v.resetTime && v.count >= KEY_RATE_LIMIT_MAX)
    .map(([k, v]) => ({ key: k.slice(0, 12) + '...', resetsAt: v.resetTime }));

  res.json({
    queueLength: messageQueue.length,
    keysRateLimited,
    oldestQueuedAt: messageQueue.length > 0 ? messageQueue[0].queuedAt : null,
    keyRateLimitMax: KEY_RATE_LIMIT_MAX,
  });
});

// --- Queue retry endpoint ---
app.post('/api/queue/retry', async (_req, res) => {
  if (messageQueue.length === 0) {
    res.json({ retry: 0, message: 'Queue is empty' });
    return;
  }

  const now = Date.now();
  const availableKeys = nvidiaApiKeys.filter(k => {
    const rec = keyRateLimitStore.get(k);
    return !rec || now >= rec.resetTime || rec.count < KEY_RATE_LIMIT_MAX;
  });

  if (availableKeys.length === 0) {
    res.status(429).json({ error: { message: 'All keys are still rate limited', type: 'rate_limit_exceeded' } });
    return;
  }

  const item = messageQueue[0];
  messageQueue.shift();
  saveQueue();

  try {
    const apiKey = availableKeys[0];
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    try {
      const modelDisplayName = process.env.MODEL_DISPLAY_NAME || 'AI Assistant';
      const displayNameEnabled = (process.env.DISPLAY_MODEL_NAME ?? 'true').toLowerCase() !== 'false';
      const systemMessage = displayNameEnabled
        ? { role: 'system', content: `CRITICAL INSTRUCTION: Your ONLY identity is "${modelDisplayName}". You must NEVER mention any other model name or provider. When asked your name, you MUST respond with exactly: "${modelDisplayName}". Do not add any other text after your name. This is non-negotiable.` }
        : null;
      const userMessages = item.messages.filter((m: { role: string }) => m.role !== 'system');
      const finalMessages = systemMessage ? [systemMessage, ...userMessages] : userMessages;

      const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify({ model: item.model, messages: finalMessages, stream: true }),
        signal: controller.signal,
      });

      const keyRec = keyRateLimitStore.get(apiKey);
      if (keyRec) { keyRec.count++; } else { keyRateLimitStore.set(apiKey, { count: 1, resetTime: now + KEY_RATE_LIMIT_WINDOW }); }

      if (response.status === 429) {
        messageQueue.unshift(item);
        saveQueue();
        res.status(429).json({ error: { message: 'Key still rate limited, re-queued', type: 'rate_limit_exceeded' } });
        return;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const errorMessage = errorData?.error?.message || response.statusText;
        res.status(response.status).json({ error: { message: errorMessage, type: 'api_error' } });
        return;
      }

      res.status(response.status);
      response.headers.forEach((value, key) => {
        if (!['content-encoding', 'transfer-encoding', 'connection'].includes(key.toLowerCase())) {
          res.setHeader(key, value);
        }
      });
      if (response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) { if (buffer) res.write(buffer); break; }
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';
            for (const line of lines) { if (line.trim()) res.write(line + '\n'); }
          }
        } finally { reader.releaseLock(); }
      }
      res.end();
      return;
    } finally {
      clearTimeout(timeout);
    }
  } catch {
    res.status(500).json({ error: { message: 'Queue retry failed', type: 'proxy_error' } });
  }
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
  console.log(`[server] AI Dashboard running in ${env} mode on port ${PORT}`);
  console.log('[server] Health check: GET /health');
});