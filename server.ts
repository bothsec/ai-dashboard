import express from 'express';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import helmet from 'helmet';
import cors from 'cors';
import { summarizeUrl } from './src/services/urlSummarizer';
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
  referrerPolicy: { policy: 'same-origin' }, // strictest — no referrer leaks
}));

// --- Auth: bearer token validation ---
const AUTH_SECRET = process.env.AUTH_SECRET_TOKEN;
const AUTH_COOKIE_NAME = 'ai_auth';
const AUTH_COOKIE_MAXAGE = 86400; // 24 hours in seconds

// Auth middleware — validates bearer token OR HttpOnly cookie
function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  // Skip if no AUTH_SECRET is configured (auth disabled)
  if (!AUTH_SECRET) return next();

  const bearerToken =
    req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.slice(7)
      : undefined;
  const cookieToken: string | undefined = (() => {
    const cookieHeader = req.headers.cookie as string | undefined;
    if (!cookieHeader) return undefined;
    const match = cookieHeader.match(new RegExp(`${AUTH_COOKIE_NAME}=([^;]+)`));
    return match ? match[1] : undefined;
  })();

  const token = bearerToken || cookieToken;
  if (!token || token !== AUTH_SECRET) {
    res.status(401).json({ error: { message: 'Unauthorized', type: 'auth_required' } });
    return;
  }
  next();
}

// --- Auth routes (must be defined BEFORE the auth middleware) ---
// POST /api/auth/login  { username, password }  →  Set-Cookie + { ok: true }
app.post('/api/auth/login', express.json(), (req, res) => {
  if (!AUTH_SECRET) {
    res.json({ ok: true, authEnabled: false });
    return;
  }
  const { username, password } = req.body ?? {};
  const expectedUsername = process.env.AUTH_USERNAME || 'admin';
  if (!username || !password || username !== expectedUsername || password !== AUTH_SECRET) {
    res.status(401).json({ error: { message: 'Invalid credentials', type: 'auth_failed' } });
    return;
  }
  // Derive the cookie domain from the real client host (x-forwarded-host → host)
  const forwardedHost = req.headers['x-forwarded-host'] as string | undefined;
  const cookieHost = forwardedHost ? forwardedHost.split(',')[0].split(':')[0] : undefined;
  const cookieDomain = cookieHost ? `; Domain=${cookieHost}` : '';
  res.setHeader('Set-Cookie',
    `${AUTH_COOKIE_NAME}=${AUTH_SECRET}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${AUTH_COOKIE_MAXAGE}${cookieDomain}`);
  res.json({ ok: true, authEnabled: true });
});

// GET /api/auth/status → { authRequired: boolean } (unauthenticated)
app.get('/api/auth/status', (_req, res) => {
  res.json({ authRequired: !!AUTH_SECRET });
});

// GET /api/auth/me → { authenticated: true } or 401 (cookie-validated)
app.get('/api/auth/me', (req, res) => {
  if (!AUTH_SECRET) {
    res.json({ authenticated: true, authEnabled: false });
    return;
  }
  const cookieHeader = req.headers.cookie as string | undefined;
  const match = cookieHeader ? cookieHeader.match(new RegExp(`${AUTH_COOKIE_NAME}=([^;]+)`)) : null;
  const token = match ? match[1] : undefined;
  if (!token || token !== AUTH_SECRET) {
    res.status(401).json({ error: { message: 'Not authenticated', type: 'auth_required' } });
    return;
  }
  res.json({ authenticated: true, username: process.env.AUTH_USERNAME || 'admin' });
});

// Mount auth middleware globally for all remaining /api routes
app.use('/api', requireAuth);

// Add request ID to every response for traceability (sanitize to prevent log injection)
app.use((req, res, next) => {
  const raw = req.headers['x-request-id'] as string | undefined;
  // Allow only safe characters; UUID format wins, otherwise truncate to 64
  const id = (typeof crypto !== 'undefined' && crypto.randomUUID?.())
    ? crypto.randomUUID() // always generate a fresh UUID — ignore client input
    : `req-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  res.setHeader('X-Request-Id', id);
  next();
});

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
      if (!origin) return callback(null, false);
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
        // SSRF defense: parse full URL, validate the path only (ignores query string)
        let pathname: string;
        try {
          pathname = new URL(req.url, 'https://placeholder').pathname;
        } catch {
          res.status(400).json({ error: { message: 'Invalid request URL', type: 'invalid_request' } });
          return;
        }
        const safePathPattern = /^\/v1\/(chat\/completions|messages|embeddings|models|completions)/;
        if (!safePathPattern.test(pathname)) {
          console.warn(`[${provider}] Blocked suspicious proxy path: ${pathname}`);
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
      // Sanitize: limit length and strip characters that could break the system prompt
      // (quotes, newlines, backslashes) to prevent prompt injection via MODEL_DISPLAY_NAME
      const sanitizedName = modelDisplayName
              .slice(0, 60)
              // Allowlist: only safe alphanumeric, spaces, underscores, hyphens, periods, commas
              .replace(/[^a-zA-Z0-9 _.,-]/g, '');
      const systemMessage = displayNameEnabled
        ? {
            role: 'system',
            content: `CRITICAL INSTRUCTION: Your ONLY identity is "${sanitizedName}". You must NEVER mention any other model name or provider. When asked your name, you MUST respond with exactly: "${sanitizedName}". Do not add any other text after your name. This is non-negotiable.`,
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
        // Return generic error — do NOT forward upstream error body (could leak infra details)
        res.status(response.status).json({
          error: { message: 'AI service request failed. Please try again.', type: 'api_error' }
        });
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

  // All keys exhausted — return 429 without queuing
  if (!res.headersSent) {
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
        retryAfter,
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
// Two probe types:
//   GET /health/live   → liveness (is the process alive?)  — lightweight, no side-effects
//   GET /health/ready  → readiness (can it serve traffic?) — checks API keys are configured
//   GET /health        → full status including the above (backwards-compatible)
app.get('/health/live', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/health/ready', (_req, res) => {
  // Check basic readiness — don't disclose which keys are configured (security: no recon)
  const ready = nvidiaApiKeys.length > 0 || !!process.env.OPENAI_API_KEY || !!process.env.ANTHROPIC_API_KEY;
  res.status(ready ? 200 : 503).json({
    status: ready ? 'ready' : 'not_ready',
    timestamp: new Date().toISOString(),
  });
});

app.get('/health', (_req, res) => {
  const now = Date.now();

  // Snapshot of queue and key rate-limit state (non-sensitive)
  const keysTotal = nvidiaApiKeys.length;
  const keysRateLimited = [...keyRateLimitStore.entries()]
    .filter(([, v]) => now < v.resetTime && v.count >= KEY_RATE_LIMIT_MAX)
    .length;

  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    nvidiaKeysTotal: keysTotal,
    nvidiaKeysRateLimited: keysRateLimited,
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

// --- Global error handler (must be registered after all routes) ---
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[error]', err.message);
  // Sanitised response — never leak stack traces or internal details
  res.status(500).json({
    error: {
      message: 'An unexpected error occurred. Please try again.',
      type: 'internal_error',
    },
  });
});

// --- URL Summarizer: fetch any public URL, extract readable text for AI ---
// GET /api/summarize?url=... → { title, siteName, text, url }
app.get('/api/summarize', async (req, res) => {
  const rawUrl = (req.query.url as string | undefined) ?? '';

  if (!rawUrl) {
    res.status(400).json({ error: { message: 'url query parameter is required', type: 'invalid_request' } });
    return;
  }
  if (rawUrl.length > 2000) {
    res.status(400).json({ error: { message: 'URL is too long (max 2000 chars)', type: 'invalid_request' } });
    return;
  }

  try {
    const result = await summarizeUrl(rawUrl);
    res.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    res.status(422).json({ error: { message: msg, type: 'summarize_error' } });
  }
});

// --- 404 handler for unknown API routes ---
app.use('/api', (_req, res) => {
  res.status(404).json({ error: { message: 'API endpoint not found', type: 'not_found' } });
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