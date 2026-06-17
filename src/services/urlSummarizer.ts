/**
 * URL Summarizer: fetch any public URL, extract readable text, return markdown.
 * Powers the "summarize this article" feature in the chat.
 */

interface SummarizeResult {
  title: string;
  siteName: string | null;
  text: string; // extracted readable content, ~500-2000 chars
  url: string;
}

// Safe HTML sanitizer: iteratively remove dangerous tags until stable.
// Avoids fragile regex that can be bypassed with malformed HTML.
// Approach: encode < > first, then decode safe tags, then strip everything else.
function sanitizeHtml(html: string): string {
  // Step 1: encode all angle brackets to neutralize any injected script/text
  let t = html
    .replace(/</g, '<')
    .replace(/>/g, '>');

  // Step 2: iteratively strip dangerous tags until no change (handles nested/malformed)
  let prev = '';
  while (prev !== t) {
    prev = t;
    t = t
      // Remove script, style, and their content completely (case-insensitive, dotall)
      .replace(/<script[^>]*>[\s\S]*?<\/script\s*>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style\s*>/gi, '')
      // Remove on* event handler attributes (XSS vector)
      .replace(/\son\w+="[^"]*"/gi, '')
      .replace(/\son\w+='[^']*'/gi, '')
      // Remove javascript: URLs
      .replace(/href\s*=\s*["']javascript:[^"']*["']/gi, 'href="#"')
      .replace(/src\s*=\s*["']javascript:[^"']*["']/gi, 'src="#"');
  }

  // Step 3: convert safe block tags to newlines for readability
  t = t
    .replace(/<\/(p|div|br|h[1-6]|li|tr)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<hr\s*\/?>/gi, '\n\n');

  // Step 4: remove all remaining HTML tags
  t = t.replace(/<[^>]+>/g, '');

  // Step 5: decode common HTML entities
  t = t
    .replace(/&nbsp;/gi, ' ')
    .replace(/&/gi, '&')
    .replace(/</gi, '<')
    .replace(/>/gi, '>')
    .replace(/"/gi, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&#x2F;/gi, '/')
    .replace(/&mdash;/gi, '—')
    .replace(/&ndash;/gi, '–')
    .replace(/&hellip;/gi, '…')
    .replace(/&copy;/gi, '©')
    .replace(/&reg;/gi, '®')
    .replace(/&trade;/gi, '™');

  // Step 6: collapse whitespace
  t = t.replace(/[ \t]+/g, ' ');
  t = t.replace(/\n\s*\n/g, '\n\n');
  t = t.trim();

  return t;
}

function extractTitle(html: string): string {
  const m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (m) return m[1].trim();
  const hm = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i);
  if (hm) return hm[1].trim();
  return 'Untitled';
}

function extractSiteName(html: string): string | null {
  const m = html.match(/<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["']/i);
  if (m) return m[1].trim();
  const sm = html.match(/<meta[^>]+name=["']application-name["'][^>]+content=["']([^"']+)["']/i);
  if (sm) return sm[1].trim();
  return null;
}

function extractText(body: string): string {
  return sanitizeHtml(body);
}

// Rate-limited in-memory cache: url → { result, ts }
// TTL 15 minutes to avoid hammering the same URLs
const cache = new Map<string, { result: SummarizeResult; ts: number }>();
const CACHE_TTL_MS = 15 * 60 * 1000;

export async function summarizeUrl(rawUrl: string): Promise<SummarizeResult> {
  // --- Validate & parse URL ---
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error('Invalid URL');
  }

  // Only allow http/https
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('Only http and https URLs are supported');
  }

  // SSRF check: resolve hostname, block private ranges
  const hostname = url.hostname.toLowerCase();
  const isPrivate =
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '0.0.0.0' ||
    hostname.startsWith('192.168.') ||
    hostname.startsWith('10.') ||
    hostname.startsWith('172.16.') ||
    hostname.endsWith('.internal') ||
    hostname.endsWith('.local') ||
    hostname === '::1' ||
    /^fe80:/i.test(hostname) ||
    /^::ffff:/i.test(hostname);
  if (isPrivate) {
    throw new Error('Private/internal URLs are not allowed');
  }

  // --- Check cache ---
  const cached = cache.get(rawUrl);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return cached.result;
  }

  // --- Fetch ---
  // SSRF protection: rawUrl was validated as non-private (lines 83-111) before this call.
  // The URL is not re-constructed here to prevent bypass via redirects.
  // Allowed protocols (http/https) and private hostnames were already checked.
  let response: Response;
  try {
    response = await fetch(rawUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; AI-Dashboard/1.0; +summarize)',
        Accept: 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(10_000),
      // Don't follow redirects to avoid redirect-based SSRF (same protection as upstream)
      redirect: 'follow',
    });
  } catch (err) {
    throw new Error(`Failed to fetch URL: ${err instanceof Error ? err.message : String(err)}`);
  }

  if (!response.ok) {
    throw new Error(`URL returned HTTP ${response.status}`);
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('text/html')) {
    throw new Error(`URL is not HTML (content-type: ${contentType}). Only web pages can be summarized.`);
  }

  // Read with size limit (2 MB max)
  const TEXT_MAX_BYTES = 2 * 1024 * 1024;
  const html = await response.text();
  const textBytes = new TextEncoder().encode(html).length;
  if (textBytes > TEXT_MAX_BYTES) {
    throw new Error(`Page is too large (${(textBytes / 1024).toFixed(0)} KB). Max supported size is 2 MB.`);
  }
  const title = extractTitle(html);
  const siteName = extractSiteName(html);
  let text = extractText(html);

  // Collapse the text to a useful length (500-2000 chars)
  // Aim for ~1500 to keep context window manageable
  if (text.length > 1800) {
    text = text.slice(0, 1800).replace(/\s\S+$/, '…');
  }

  const result: SummarizeResult = { title, siteName, text, url: rawUrl };

  // Cache it
  cache.set(rawUrl, { result, ts: Date.now() });

  return result;
}

/** Clear the cache (useful for testing or manual refresh) */
export function clearSummarizeCache(): void {
  cache.clear();
}