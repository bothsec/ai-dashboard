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

// Simple HTML → plain text extractor (no external deps, pure Node.js stdlib)
function htmlToText(html: string): string {
  // Remove scripts, styles, nav, footer, comments
  let t = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '\n')
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '\n')
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '\n');

  // Replace block elements with newlines
  t = t.replace(/<\/(p|div|br|h[1-6]|li|tr)>/gi, '\n');

  // Remove all remaining HTML tags
  t = t.replace(/<[^>]+>/g, '');

  // Decode common HTML entities
  t = t
    .replace(/&nbsp;/gi, ' ')
    .replace(/&/gi, '&')
    .replace(/</gi, '<')
    .replace(/>/gi, '>')
    .replace(/"/gi, '"')
    .replace(/'/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/'/gi, "'")
    .replace(/&#x2F;/gi, '/')
    .replace(/&mdash;/gi, '—')
    .replace(/&ndash;/gi, '–')
    .replace(/&hellip;/gi, '…')
    .replace(/&copy;/gi, '©')
    .replace(/&reg;/gi, '®')
    .replace(/&trade;/gi, '™');

  // Collapse whitespace
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
  return htmlToText(body);
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
  let response: Response;
  try {
    response = await fetch(rawUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; AI-Dashboard/1.0; +summarize)',
        Accept: 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(10_000),
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