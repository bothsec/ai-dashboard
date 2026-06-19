/**
 * URL Summarizer: fetch any public URL, extract readable text, return markdown.
 * Powers the "summarize this article" feature in the chat.
 */
import sanitizeHtmlLib from 'sanitize-html';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

interface SummarizeResult {
  title: string;
  siteName: string | null;
  text: string; // extracted readable content, ~500-2000 chars
  url: string;
}

function sanitizeHtml(html: string): string {
  const text = sanitizeHtmlLib(html, {
    allowedTags: [],
    allowedAttributes: {},
    disallowedTagsMode: 'discard',
    textFilter: (value) => value.replace(/\s+/g, ' '),
  });
  return text.replace(/\s+/g, ' ').trim();
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

function isPrivateOrReservedIPv6(ip: string): boolean {
  const normalized = ip.toLowerCase();
  return normalized === '::1' ||
    normalized.startsWith('fe80:') || // link-local
    normalized.startsWith('fc') || normalized.startsWith('fd') || // unique local
    normalized === '::' ||
    normalized.startsWith('::ffff:127.') ||
    normalized.startsWith('::ffff:10.') ||
    normalized.startsWith('::ffff:192.168.') ||
    /^::ffff:172\.(1[6-9]|2\d|3[0-1])\./.test(normalized);
}

function isPrivateOrReservedAddress(address: string): boolean {
  const embedded = extractEmbeddedIPv4(address);
  if (embedded) return isPrivateIPv4(embedded);
  const family = isIP(address);
  if (family === 4) return isPrivateIPv4(address);
  if (family === 6) return isPrivateOrReservedIPv6(address);
  return false;
}

async function assertPublicHttpUrl(url: URL): Promise<void> {
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('Only http and https URLs are supported');
  }
  const hostname = url.hostname.toLowerCase();
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
  if (isPrivateHost || isPrivateOrReservedAddress(hostname)) {
    throw new Error('Private/internal URLs are not allowed');
  }
  const resolved = await lookup(hostname, { all: true, verbatim: true });
  if (resolved.length === 0 || resolved.some(({ address }) => isPrivateOrReservedAddress(address))) {
    throw new Error('Private/internal URLs are not allowed');
  }
}

export async function summarizeUrl(rawUrl: string): Promise<SummarizeResult> {
  // --- Validate & parse URL ---
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error('Invalid URL');
  }

  await assertPublicHttpUrl(url);

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
      // Resolve relative redirects against the original URL and re-validate.
      const redirectUrl = new URL(location, url.href);
      await assertPublicHttpUrl(redirectUrl);
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