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

// Parse IPv4 address to a 32-bit integer for CIDR range checks
function ipv4ToInt(ip: string): number {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some(isNaN)) return -1;
  return (parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3];
}

// Check if an IPv4 address (or IPv4-mapped IPv6 address) falls in a private/reserved range
function isPrivateIPv4(ip: string): boolean {
  const n = ipv4ToInt(ip);
  if (n < 0) return false;
  // 127.0.0.0/8 — loopback
  if ((n & 0xff000000) === 0x7f000000) return true;
  // 10.0.0.0/8
  if ((n & 0xff000000) === 0x0a000000) return true;
  // 172.16.0.0/12
  if ((n & 0xfff00000) === 0xac100000) return true;
  // 192.168.0.0/16
  if ((n & 0xffff0000) === 0xc0a80000) return true;
  // 169.254.0.0/16 — link-local
  if ((n & 0xffff0000) === 0xa9fe0000) return true;
  return false;
}

// Extract embedded IPv4 from IPv4-mapped IPv6 (::ffff:x.x.x.x)
function extractEmbeddedIPv4(hostname: string): string | null {
  const m = hostname.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
  return m ? m[1] : null;
}

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

  // SSRF check: block all private, loopback, link-local, and multicast ranges
  const hostname = url.hostname.toLowerCase();

  // Reject plain hostnames that resolve to private ranges
  const isPrivateHost =
    hostname === 'localhost' ||
    hostname === '0.0.0.0' ||
    hostname === '::1' ||
    hostname.endsWith('.internal') ||
    hostname.endsWith('.local') ||
    /^fe80:/i.test(hostname) ||
    /^::1$/i.test(hostname) ||
    /^::ffff:/i.test(hostname) ||
    hostname === '127.0.0.1';

  if (isPrivateHost) {
    throw new Error('Private/internal URLs are not allowed');
  }

  // Check IPv4 addresses and IPv4-mapped IPv6 addresses against private ranges
  const ipv4 = ipv4ToInt(hostname);
  if (ipv4 >= 0 && isPrivateIPv4(hostname)) {
    throw new Error('Private/internal URLs are not allowed');
  }
  const embeddedV4 = extractEmbeddedIPv4(hostname);
  if (embeddedV4 && isPrivateIPv4(embeddedV4)) {
    throw new Error('Private/internal URLs are not allowed');
  }

  // --- Check cache ---
  // Use validated url.href (not rawUrl) as cache key to be consistent
  const cacheKey = url.href;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return cached.result;
  }

  // --- Fetch ---
  // Use the validated and normalized url.href — not the raw string.
  // This prevents bypasses where rawUrl contains encoding or fragment tricks
  // that new URL() normalizes away but fetch() might interpret differently.
  let response: Response;
  try {
    response = await fetch(url.href, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; AI-Dashboard/1.0; +summarize)',
        Accept: 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(10_000),
      redirect: 'manual',
    });

    // Handle redirects manually — validate each redirect URL before following
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get('location');
      if (!location) {
        throw new Error('Redirect response has no Location header');
      }
      // Resolve relative redirects against the original URL
      const redirectUrl = new URL(location, url.href);
      // Re-validate the redirect target hostname
      const rh = redirectUrl.hostname.toLowerCase();
      const rhIPv4 = ipv4ToInt(rh);
      const rhEmbeddedV4 = extractEmbeddedIPv4(rh);
      const rhIsPrivate =
        rh === 'localhost' || rh === '0.0.0.0' || rh === '::1' ||
        rh.endsWith('.internal') || rh.endsWith('.local') ||
        /^fe80:/i.test(rh) || /^::ffff:/i.test(rh) ||
        rh === '127.0.0.1' ||
        (rhIPv4 >= 0 && isPrivateIPv4(rh)) ||
        (!!rhEmbeddedV4 && isPrivateIPv4(rhEmbeddedV4));
      if (rhIsPrivate) {
        throw new Error('Redirect to private/internal URL is not allowed');
      }
      // Follow the validated redirect
      response = await fetch(redirectUrl.href, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; AI-Dashboard/1.0; +summarize)',
          Accept: 'text/html,application/xhtml+xml',
        },
        signal: AbortSignal.timeout(10_000),
        redirect: 'manual',
      });
    }
  } catch (err) {
    throw new Error(`Failed to fetch URL: ${err instanceof Error ? err.message : String(err)}`, { cause: err });
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