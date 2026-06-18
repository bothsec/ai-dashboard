/**
 * Detects salary-like patterns in text.
 * Matches: $500, 500USD, $1,200/month, 2000 USD, 500$ per month, etc.
 */
export function detectSalaryRanges(text: string): Array<{ value: number; currency: 'USD' | 'KHR'; raw: string }> {
  const results: Array<{ value: number; currency: 'USD' | 'KHR'; raw: string }> = [];

  // Match common salary patterns: $500, 500USD, 1,200 USD, $1200/month, etc.
  const patterns = [
    // $ amount with optional /month, /year suffix
    { re: /\$[\d,]+(?:\.\d+)?(?:\s*\/?\s*(?:month|year|yr|week))?/gi },
    // Number followed by USD/KHR with optional suffix
    { re: /[\d,]+(?:\.\d+)?\s*(?:USD|KHR|khr|usd)\s*(?:\/?\s*(?:month|year|yr|week))?/gi },
    // USD/KHR followed by number
    { re: /(?:USD|KHR|khr|usd)\s*[\d,]+(?:\.\d+)?(?:\s*\/?\s*(?:month|year|yr|week))?/gi },
  ];

  const seen = new Set<string>();

  for (const { re } of patterns) {
    let match: RegExpExecArray | null;
    // Reset regex state
    re.lastIndex = 0;
    while ((match = re.exec(text)) !== null) {
      const raw = match[0];
      if (seen.has(raw.toLowerCase())) continue;
      seen.add(raw.toLowerCase());

      const parsed = parseSalaryString(raw);
      if (parsed) {
        results.push({ ...parsed, raw });
      }
    }
  }

  return results;
}

function parseSalaryString(raw: string): { value: number; currency: 'USD' | 'KHR' } | null {
  // Normalize whitespace
  const s = raw.replace(/\s+/g, ' ').trim();

  // Determine currency
  let currency: 'USD' | 'KHR' = 'USD';
  if (/khr/i.test(s)) currency = 'KHR';

  // Strip currency labels and non-numeric chars except commas and dots
  const numStr = s.replace(/[^0-9,.]/g, '').replace(/,/g, '');
  const value = parseFloat(numStr);
  if (isNaN(value) || value <= 0) return null;

  // If KHR, assume the number is already in KHR (no conversion in this detector)
  // Normalise to integer
  const normalized = Math.round(value);

  return { value: normalized, currency };
}

/**
 * Convert USD to KHR using a standard approximate rate.
 * Uses 1 USD = 4050 KHR (rounded to nearest 10 for display).
 */
export function usdToRiel(usd: number): number {
  return Math.round(usd * 4050 / 10) * 10;
}

/**
 * Format a number as Khmer-style riel with ៛ symbol.
 * e.g. 2025000 → "2,025,000 ៛"
 */
export function formatRiel(khr: number): string {
  return khr.toLocaleString('en-US') + ' ៛';
}

/**
 * Format USD with $ symbol.
 * e.g. 500 → "$500"
 */
export function formatUsd(usd: number): string {
  return '$' + usd.toLocaleString('en-US');
}