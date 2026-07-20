import express from 'express';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import helmet from 'helmet';
import cors from 'cors';
import expressFileUpload from 'express-fileupload';
import rateLimit from 'express-rate-limit';
import { summarizeUrl } from './src/services/urlSummarizer';
import { parseDocument } from './src/services/documentParser';
import { generateResumePDF } from './src/services/resumeGenerator';
import { registerAdminRoutes, getDefaultModelId } from './src/routes/admin-routes';
import { getLiteLLMBackendConfig } from './src/services/litellmBackend';
dotenv.config({ override: true });

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const isDev = process.env.NODE_ENV !== 'production';

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
app.set('trust proxy', 1); // Trust Caddy proxy for X-Forwarded-For / client IP

app.use(helmet({
  contentSecurityPolicy: false,
  frameguard: false,
  xContentTypeOptions: false,
  referrerPolicy: false,
  hsts: false,
}));

// Remove X-XSS-Protection from Express — Caddy sets it correctly at the edge.
// Not removing it causes duplicate headers (Caddy: 1; mode=block + Express: 0).
app.use((_req, res, next) => {
  res.removeHeader('X-XSS-Protection');
  next();
});

// --- Auth: bearer token validation ---
const AUTH_SECRET = process.env.AUTH_SECRET_TOKEN;
const MAIN_SITE_AUTH_REQUIRED = (process.env.MAIN_SITE_AUTH_REQUIRED ?? 'false').toLowerCase() === 'true';
const AUTH_COOKIE_NAME = 'ai_auth';
const AUTH_COOKIE_MAXAGE = 86400; // 24 hours in seconds

// Auth middleware — validates bearer token OR HttpOnly cookie
function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  // Skip health check paths — these are public readiness probes
  const path = req.path;
  if (path.startsWith('/health') || path.startsWith('/api/health')) {
    return next();
  }

  // Main website/API auth is opt-in. Admin routes keep their own session login.
  if (!MAIN_SITE_AUTH_REQUIRED || !AUTH_SECRET) return next();

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
function getClientIp(req: express.Request): string {
  let clientIp = req.ip || req.socket.remoteAddress || 'unknown';
  if (TRUSTED_PROXIES.includes(clientIp) && req.headers['x-forwarded-for']) {
    const forwarded = (req.headers['x-forwarded-for'] as string).split(',')[0].trim();
    if (forwarded) clientIp = forwarded;
  }
  return clientIp;
}

function enforceLoginPreflight(req: express.Request, res: express.Response, next: express.NextFunction): void {
  const clientIp = getClientIp(req);
  const rateLimit = checkLoginRateLimit(clientIp);
  if (!rateLimit.allowed) {
    res.setHeader('Retry-After', rateLimit.retryAfter || 60);
    res.status(429).json({ error: { message: `Too many login attempts. Please wait ${rateLimit.retryAfter} seconds.`, type: 'rate_limit_exceeded' } });
    return;
  }

  // Reject non-JSON content types before the JSON parser runs, so raw SQL probes
  // like `' OR 1=1--` are handled cleanly and do not produce parser error logs.
  const ct = req.headers['content-type'] || '';
  if (!ct.includes('application/json')) {
    res.status(415).json({ error: { message: 'Content-Type must be application/json', type: 'unsupported_media_type' } });
    return;
  }

  next();
}

// POST /api/auth/login  { username, password }  →  Set-Cookie + { ok: true }
app.post('/api/auth/login', enforceLoginPreflight, express.json({ limit: '10kb' }), (req, res) => {
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
  // Security: X-Forwarded-Host can be an array (type confusion attack) — ensure it's a plain string
  const forwardedRaw = req.headers['x-forwarded-host'];
  const forwardedHost = Array.isArray(forwardedRaw) ? forwardedRaw[0] : forwardedRaw;
  const cookieHost = typeof forwardedHost === 'string' ? forwardedHost.split(',')[0].split(':')[0] : undefined;
  // Only set Domain if it's a safe, known host — never trust X-Forwarded-Host directly
  const cookieDomain = (cookieHost && /^(ai\.khmerjob\.tech|khmerjob\.tech|140\.238\.43\.61|localhost)$/.test(cookieHost))
    ? `; Domain=${cookieHost}`
    : '';
  const mainSecure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie',
    `${AUTH_COOKIE_NAME}=${AUTH_SECRET}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${AUTH_COOKIE_MAXAGE}${cookieDomain}${mainSecure}`);
  res.json({ ok: true, authEnabled: true });
});

app.use((err: unknown, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (req.path === '/api/auth/login' && err instanceof SyntaxError) {
    res.status(400).json({ error: { message: 'Invalid JSON body', type: 'invalid_json' } });
    return;
  }
  next(err);
});

// GET /api/auth/status → { authRequired: boolean } (unauthenticated)
app.get('/api/auth/status', (_req, res) => {
  res.json({ authRequired: MAIN_SITE_AUTH_REQUIRED && !!AUTH_SECRET });
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

// POST /api/resume — generate resume PDF (auth required)
app.post('/api/resume', express.json({ limit: '1mb' }), async (req, res) => {
  const { name, email, phone, linkedin, summary, experience = [], skills = [], education = [], template = 'modern' } = req.body ?? {};

  if (!name || !email || !phone) {
    res.status(400).json({ error: { message: 'Name, email, and phone are required.', type: 'validation_error' } });
    return;
  }

  if (!['modern', 'classic'].includes(template)) {
    res.status(400).json({ error: { message: 'Template must be "modern" or "classic".', type: 'validation_error' } });
    return;
  }

  try {
    const pdfBytes = await generateResumePDF({ name, email, phone, linkedin, summary, experience, skills, education, template: template as 'modern' | 'classic' });
    res.setHeader('Content-Type', 'application/pdf');
    // Sanitize filename: strip path traversal and control chars
    const safeName = name.replace(/[^a-zA-Z0-9_\u1780-\u17FF\u19E0-\u19FF\s.,-]/g, '').replace(/\s+/g, '_').slice(0, 100);
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}_Resume.pdf"`);
    res.setHeader('Content-Length', pdfBytes.length);
    res.status(200).send(Buffer.from(pdfBytes));
  } catch (err) {
    console.error('[Resume] generation failed:', err);
    res.status(500).json({ error: { message: 'Failed to generate resume PDF.', type: 'server_error' } });
  }
});

// Register admin routes BEFORE global auth middleware (SQLite user DB)
registerAdminRoutes(app);

// Mount auth middleware globally for all remaining /api routes
app.use('/api', requireAuth);

// Add request ID to every response for traceability (sanitize to prevent log injection)
app.use((req, res, next) => {
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
    // Allow:
    //  - no origin header (native same-origin fetch)
    //  - any allowlisted origin
    // Note: 'null' (file:// pages) is deliberately rejected — no legitimate need for that
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  },
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  // Note: do NOT set credentials:true — with a function origin, cors 2.8.x
  // misbehaves for null/undefined origins (sets ACAO:false regardless of callback).
  // Cookie transmission is browser-managed via credentials:'include' and HttpOnly;
  // no Access-Control-Allow-Credentials header needed for cookie receipt.
}));

// Parse JSON body with size limit (chat conversations can grow large)
app.use(express.json({ limit: '1mb' }));

// File upload middleware for document parsing (PDF/DOCX)
app.use(expressFileUpload({
  limits: { fileSize: 5 * 1024 * 1024 },
  abortOnLimit: true,
}));

// Rate limit tracking (simple in-memory, use Redis for production)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();
const loginRateLimitStore = new Map<string, { count: number; resetTime: number }>();
const LOGIN_RATE_LIMIT_WINDOW = 60000; // 1 minute
const LOGIN_RATE_LIMIT_MAX = 5; // 5 attempts per minute per IP
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
  for (const [k, v] of loginRateLimitStore.entries()) {
    if (now > v.resetTime) loginRateLimitStore.delete(k);
  }
}, RATE_LIMIT_WINDOW);

// Trusted proxy IPs (reverse proxies, load balancers) — adjust for your setup
const TRUSTED_PROXIES = ['127.0.0.1', '::1', '::ffff:127.0.0.1'];

function checkRateLimit(provider: string, ip: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  // Per-IP + per-provider: one user can't exhaust limits for others
  const key = `${ip}:${provider}`;
  const record = rateLimitStore.get(key);

  // If no record or window expired, start fresh
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

function checkLoginRateLimit(ip: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const key = `login:${ip}`;
  const entry = loginRateLimitStore.get(key);

  if (!entry || now > entry.resetTime) {
    loginRateLimitStore.set(key, { count: 1, resetTime: now + LOGIN_RATE_LIMIT_WINDOW });
    return { allowed: true };
  }

  entry.count++;

  if (entry.count > LOGIN_RATE_LIMIT_MAX) {
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
    return { allowed: false, retryAfter };
  }

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
        console.warn(`[${provider}] Rate limited. Retry after ${rateLimit.retryAfter}s`);
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

      const PROXY_TIMEOUT = 30_000; // 30s per upstream request — prevents slow-loris

      while (retries < MAX_RETRIES) {
        try {
          // Per-attempt timeout to prevent hanging connections
          const ac = new AbortController();
          const timeout = setTimeout(() => ac.abort(), PROXY_TIMEOUT);

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
          let response: Response;
          try {
            response = await fetch(`${target}${req.url}`, {
              method: req.method,
              headers,
              body: req.method === 'POST' || req.method === 'PUT'
                ? JSON.stringify(req.body)
                : undefined,
              signal: ac.signal,
            });
          } finally {
            clearTimeout(timeout);
          }

        // Handle rate limiting from provider (429)
        if (response.status === 429) {
          retries++;
          if (retries < MAX_RETRIES) {
            const retryAfter = parseInt(response.headers.get('retry-after') || '1', 10);
            const delay = Math.min(retryAfter * 1000, BASE_RETRY_DELAY * Math.pow(2, retries));
            console.warn(`[${provider}] Rate limited by provider (429). Retry ${retries}/${MAX_RETRIES} in ${delay}ms`);
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

// --- Website Chat via local LiteLLM proxy ---
const MAX_MESSAGES = 200; // Cap array length to avoid quota abuse

app.post('/api/chat', async (req, res) => {
  const { messages } = req.body as { messages?: unknown; model?: string };

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

  // Resolve effective model: always use the top/default model exposed to end users.
  // This prevents stale browser localStorage or crafted requests from selecting hidden models.
  const effectiveModel = getDefaultModelId();

  const { chatCompletionsUrl, apiKey } = getLiteLLMBackendConfig();
  if (!apiKey) {
    res.status(500).json({ error: { message: 'LiteLLM backend is not configured', type: 'configuration_error' } });
    return;
  }

  // Optional identity guard. Keep it narrow so normal answers do not reveal the
  // custom display name unless the user explicitly asks about identity/creator/model.
  const modelDisplayName = process.env.MODEL_DISPLAY_NAME || 'AI Assistant';
  const displayNameEnabled = (process.env.DISPLAY_MODEL_NAME ?? 'true').toLowerCase() !== 'false';
  const sanitizedName = modelDisplayName
    .slice(0, 60)
    .replace(/[^a-zA-Z0-9 _.,-]/g, '');
  const systemMessage = displayNameEnabled
    ? {
        role: 'system',
        content: `Identity policy: Do not mention your custom display name, model name, provider, creator, or backend in normal answers. Only if the user's latest message explicitly asks who you are, what your name/model is, or who created/made you, answer briefly as "${sanitizedName}" and do not include provider or backend details.`,
      }
    : null;

  // Strip client-supplied system messages, then prepend the server policy.
  const userMessages = messages
    .filter((m: { role: string }) => m.role !== 'system')
    .map(({ role, content }: { role: string; content: string }) => ({ role, content }));
  const finalMessages = systemMessage ? [systemMessage, ...userMessages] : userMessages;

  try {
    const controller = new AbortController();
    // LiteLLM handles provider retries and key rotation; allow its 60s upstream timeout to finish.
    const timeout = setTimeout(() => controller.abort(), 75000);
    let response: Response;
    try {
      response = await fetch(chatCompletionsUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: effectiveModel,
          messages: finalMessages,
          stream: true,
        }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      // Do not forward LiteLLM/provider error bodies because they may contain infrastructure details.
      const retryAfter = response.headers.get('retry-after');
      if (retryAfter) res.setHeader('Retry-After', retryAfter);
      res.status(response.status).json({
        error: { message: 'AI service request failed. Please try again.', type: 'api_error' }
      });
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
        clearTimeout(timeout);  // always clear — prevents leaked timers on disconnect/normal close
        reader.releaseLock();
      }
    } else {
      clearTimeout(timeout);
    }

    res.end();
  } catch (error) {
    console.error('[/api/chat] LiteLLM request failed:', error);
    if (!res.headersSent) {
      res.status(502).json({ error: { message: 'Failed to connect to AI service', type: 'proxy_error' } });
    }
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
  const ready = !!getLiteLLMBackendConfig().apiKey || !!process.env.OPENAI_API_KEY || !!process.env.ANTHROPIC_API_KEY;
  res.status(ready ? 200 : 503).json({
    status: ready ? 'ready' : 'not_ready',
    timestamp: new Date().toISOString(),
  });
});

// Mirrored at /api/health/ready for Caddy proxy compatibility
app.get('/api/health/ready', (_req, res) => {
  const ready = !!getLiteLLMBackendConfig().apiKey || !!process.env.OPENAI_API_KEY || !!process.env.ANTHROPIC_API_KEY;
  res.status(ready ? 200 : 503).json({
    status: ready ? 'ready' : 'not_ready',
    timestamp: new Date().toISOString(),
  });
});

app.get('/health', (_req, res) => {
  // Generic health — no internal metrics disclosure
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

// --- Settings API (requires authentication) ---
// Returns minimal public-facing config so the client can render model labels.
// Anything sensitive (API keys, secret model IDs, internal config) must NOT live here.
app.get('/api/settings', requireAuth, (_req, res) => {
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
  // _next is required by Express error-handler signature but intentionally unused
  void _next;
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
  const rawUrl = req.query.url;
  // Prevent type confusion: Express can return string[] when multiple ?url= params are sent
  if (Array.isArray(rawUrl)) {
    res.status(400).json({ error: { message: 'url must be a single value', type: 'invalid_request' } });
    return;
  }
  const urlString = (rawUrl as string | undefined) ?? '';

  if (!urlString) {
    res.status(400).json({ error: { message: 'url query parameter is required', type: 'invalid_request' } });
    return;
  }
  if (urlString.length > 2000) {
    res.status(400).json({ error: { message: 'URL is too long (max 2000 chars)', type: 'invalid_request' } });
    return;
  }

  // SSRF prevention: validate URL in server.ts before it reaches summarizeUrl.
  // CodeQL tracks the dataflow from user input to fetch() — adding the validation
  // here (on top of summarizeUrl's own checks) makes the security boundary visible
  // to static analysis and defense-in-depth against bypasses.
  try {
    const parsedUrl = new URL(urlString);
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      throw new Error('Only http and https are allowed');
    }
    const hostname = parsedUrl.hostname.toLowerCase();
    // Reject all forms of localhost, private, link-local, and broadcast
    const isBlocked =
      hostname === 'localhost' ||
      hostname === '0.0.0.0' ||
      hostname === '::1' ||
      /^::ffff:/i.test(hostname) ||
      hostname === '127.0.0.1' ||
      hostname.endsWith('.internal') ||
      hostname.endsWith('.local') ||
      /^fe80:/i.test(hostname);
    if (isBlocked) {
      throw new Error('Private/internal URLs are not allowed');
    }
    // Block private IPv4 ranges (10.x, 172.16-31.x, 192.168.x, 127.x, 169.254.x)
    const ipParts = hostname.split('.').map(Number);
    if (ipParts.length === 4 && ipParts.every(n => !isNaN(n))) {
      const n = (ipParts[0] << 24) | (ipParts[1] << 16) | (ipParts[2] << 8) | ipParts[3];
      const isPrivate =
        (n & 0xff000000) === 0x7f000000 || // 127.x
        (n & 0xff000000) === 0x0a000000 || // 10.x
        (n & 0xfff00000) === 0xac100000 || // 172.16-31.x
        (n & 0xffff0000) === 0xc0a80000 || // 192.168.x
        (n & 0xffff0000) === 0xa9fe0000;   // 169.254.x
      if (isPrivate) {
        throw new Error('Private/internal URLs are not allowed');
      }
    }
  } catch (e) {
    res.status(400).json({ error: { message: e instanceof Error ? e.message : 'Invalid URL', type: 'invalid_request' } });
    return;
  }

  try {
    const result = await summarizeUrl(urlString);
    res.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    res.status(422).json({ error: { message: msg, type: 'summarize_error' } });
  }
});

// --- Document Parser: upload PDF/DOCX, extract text for AI Q&A ---
// POST /api/document → { text, fileName, mimeType }
app.post('/api/document', async (req, res) => {
  if (!req.files || !req.files.file) {
    res.status(400).json({ error: { message: 'No file uploaded', type: 'invalid_request' } });
    return;
  }

  const file = req.files.file;

  // Handle both single-file and array formats from express-fileupload
  const fileData = Array.isArray(file) ? file[0] : file;
  if (!fileData || !fileData.data) {
    res.status(400).json({ error: { message: 'Invalid file', type: 'invalid_request' } });
    return;
  }

  // Reject unexpected MIME types — client-reported mimetype can't be trusted blindly
  const allowedMimeTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];
  if (!allowedMimeTypes.includes(fileData.mimetype)) {
    res.status(400).json({ error: { message: 'Unsupported file type. Upload a PDF or Word document.', type: 'invalid_request' } });
    return;
  }

  try {
    const text = await parseDocument(Buffer.from(fileData.data), fileData.mimetype);
    // Validate that parsed content is non-empty and the file wasn't just noise/malformed
    if (!text || text.trim().length === 0) {
      res.status(422).json({ error: { message: 'Could not extract text from file — it may be corrupted or password-protected', type: 'parse_error' } });
      return;
    }
    res.json({
      text,
      fileName: fileData.name,
      mimeType: fileData.mimetype,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to parse document';
    res.status(422).json({ error: { message: msg, type: 'parse_error' } });
  }
});

// --- 404 handler for unknown API routes ---
app.use('/api', (_req, res) => {
  res.status(404).json({ error: { message: 'API endpoint not found', type: 'not_found' } });
});

// --- SPA fallback: rate-limited catch-all (prevents DoS on res.sendFile) ---
const spaFallbackRateLimit = rateLimit({
  windowMs: 60_000,
  limit: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { message: 'Too many requests', type: 'rate_limited' } },
});

// --- SPA static file serving (always registered — dist exists after build) ---
app.use(express.static(join(__dirname, 'dist')));

// SPA fallback - serve index.html for all non-API routes
app.use(spaFallbackRateLimit, (_req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'));
});

const PORT = Number(process.env.PORT || 3000);
const BIND_HOST = process.env.BIND_HOST || '127.0.0.1'; // localhost only — reverse proxy handles external access

// Graceful shutdown — drain in-flight requests before exiting
let isShuttingDown = false;
function gracefulShutdown(signal: string) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`[server] Received ${signal}, shutting down gracefully...`);
  server.close(() => {
    console.log('[server] HTTP server closed');
    process.exit(0);
  });
  // Force exit after 10s if requests are still hanging
  setTimeout(() => {
    console.error('[server] Forced exit after graceful shutdown timeout');
    process.exit(1);
  }, 10_000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

const server = app.listen(PORT, BIND_HOST, () => {
  const env = isDev ? 'development' : 'production';
  console.log(`[server] Khmer AI running in ${env} mode on ${BIND_HOST}:${PORT}`);
  console.log('[server] Health check: GET /health');
});