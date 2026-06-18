/**
 * Khmer Number to Words — convert integers to Khmer script words.
 * Covers 0 → 999,999,999 (zero through nearly a billion).
 */

const UNITS = [
  '', 'មួយ', 'ពីរ', 'បី', 'បួន', 'ប្រាំ',
  'ប្រាំមួយ', 'ប្រាំពីរ', 'ប្រាំបី', 'ប្រាំបួន',
];

const TEENS = [
  'ដប់', 'ដប់មួយ', 'ដប់ពីរ', 'ដប់បី', 'ដប់បួន', 'ដប់ប្រាំ',
  'ដប់ប្រាំមួយ', 'ដប់ប្រាំពីរ', 'ដប់ប្រាំបី', 'ដប់ប្រាំបួន',
];

const MAGNITUDES: { threshold: number; word: string }[] = [
  { threshold: 1_000_000_000, word: 'មឿន' },
  { threshold: 100_000_000,   word: 'រយលាន' },
  { threshold: 1_000_000,    word: 'លាន' },
  { threshold: 100_000,      word: 'សែន' },
  { threshold: 10_000,       word: 'ម៉ឺន' },
  { threshold: 1_000,        word: 'ពាន់' },
  { threshold: 100,          word: 'រយ' },
];

function sayHundreds(n: number): string {
  if (n === 0) return '';
  if (n < 10) return UNITS[n];
  if (n < 20) return TEENS[n - 10];
  const hundreds = Math.floor(n / 100);
  const remainder = n % 100;
  const parts: string[] = [];
  if (hundreds > 0) parts.push(UNITS[hundreds], 'រយ');
  if (remainder > 0) parts.push(sayHundreds(remainder));
  return parts.join('');
}

/**
 * Convert a non-negative integer to Khmer words.
 * Returns null for numbers outside 0 – 999,999,999.
 */
export function numberToKhmerWords(n: number): string | null {
  if (!Number.isInteger(n) || n < 0 || n > 999_999_999) return null;
  if (n === 0) return 'សូន្យ';

  const parts: string[] = [];
  let remaining = n;

  for (const { threshold, word } of MAGNITUDES) {
    if (remaining < threshold) continue;
    const count = Math.floor(remaining / threshold);
    remaining = remaining % threshold;

    if (count === 1) {
      parts.push(word);
    } else {
      parts.push(sayHundreds(count), word);
    }
  }

  if (remaining > 0) {
    parts.push(sayHundreds(remaining));
  }

  return parts.join(' ');
}