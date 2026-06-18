import { formatRiel, parseNumber } from './khmerCurrency';

const KHR_RATE = 4000; // 1 USD = 4000 KHR

const DOLLAR_REGEX = /\$\s*([\d,]+(?:\.\d{1,2})?)/g;
const RIEL_REGEX = /([\d,]+)\s*៛|([\d,]+)\s*រៀល/g;

/** Detect all currency amounts in a string */
export interface DetectedCurrency {
  fullMatch: string;
  type: 'usd' | 'riel';
  amount: number;        // in riel (canonical)
  displayUSD: string;    // formatted as ~$XXX.XX
  displayRiel: string;   // formatted as X,XX,XXX ៛
}

function parseDollars(text: string): DetectedCurrency[] {
  const results: DetectedCurrency[] = [];
  let m: RegExpExecArray | null;
  const r = new RegExp(DOLLAR_REGEX.source, 'g');
  while ((m = r.exec(text)) !== null) {
    const num = parseNumber(m[1]);
    if (num === null) continue;
    const riel = num * KHR_RATE;
    results.push({
      fullMatch: m[0],
      type: 'usd',
      amount: riel,
      displayUSD: `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      displayRiel: formatRiel(riel),
    });
  }
  return results;
}

function parseRiels(text: string): DetectedCurrency[] {
  const results: DetectedCurrency[] = [];
  const seen = new Set<string>();
  let m: RegExpExecArray | null;
  const r = new RegExp(RIEL_REGEX.source, 'g');
  while ((m = r.exec(text)) !== null) {
    const num = parseNumber(m[1] || m[2]);
    if (num === null) continue;
    const key = m[0].trim();
    if (seen.has(key)) continue;
    seen.add(key);
    const riel = num;
    results.push({
      fullMatch: m[0],
      type: 'riel',
      amount: riel,
      displayUSD: `~$${(riel / KHR_RATE).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      displayRiel: formatRiel(riel),
    });
  }
  return results;
}

export function detectCurrencies(text: string): DetectedCurrency[] {
  const usd = parseDollars(text);
  const riel = parseRiels(text);
  // Return all, sorted by position in string
  const all = [...usd, ...riel];
  all.sort((a, b) => text.indexOf(a.fullMatch) - text.indexOf(b.fullMatch));
  return all;
}