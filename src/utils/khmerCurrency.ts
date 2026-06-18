const KHMER_DIGITS = ['០', '១', '២', '៣', '៤', '៥', '៦', '៧', '៨', '៩'];

const KHMER_MONTHS = [
  'មករា', 'កុម្ភៈ', 'មីនា', 'មេសា', 'ឧសភា', 'មេសា',
  'កក្កដា', 'សីហា', 'កញ្ញា', 'តុលា', 'វិច្ឆិកា', 'ធ្នូ',
];

/** Convert Arabic digits to Khmer numerals */
export function toKhmerNumeral(n: number | string): string {
  return String(n).replace(/\d/g, d => KHMER_DIGITS[parseInt(d)]);
}

/** Convert Khmer numerals to Arabic number string */
export function fromKhmerNumeral(s: string): string {
  return s.replace(/[០-៩]/g, c => {
    const idx = KHMER_DIGITS.indexOf(c);
    return idx >= 0 ? String(idx) : c;
  });
}

/** Format a number as Cambodian Riel (e.g. 1500000 → "១,៥០០,០០០ រៀល") */
export function formatRiel(amount: number): string {
  const formatted = amount.toLocaleString('en-US');
  const khmer = toKhmerNumeral(formatted);
  return `${khmer} រៀល`;
}

/** Format Riel with dollar equivalent (e.g. 1500000 → "~$375.00") */
export function formatRielWithDollar(amount: number): { riel: string; usd: string } {
  const riel = formatRiel(amount);
  const usd = amount / 4000;
  const usdFormatted = `~$${usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return { riel, usd: toKhmerNumeral(usdFormatted) };
}

/** Format a number in both Khmer and Arabic for display */
export function formatNumberBilingual(n: number): { arabic: string; khmer: string } {
  const arabic = n.toLocaleString('en-US');
  return { arabic, khmer: toKhmerNumeral(arabic) };
}

/** Parse a number string that may contain Khmer digits */
export function parseNumber(input: string): number | null {
  const cleaned = fromKhmerNumeral(input.trim()).replace(/[^\d]/g, '');
  const n = parseInt(cleaned, 10);
  return isNaN(n) ? null : n;
}

export { KHMER_MONTHS, KHMER_DIGITS };