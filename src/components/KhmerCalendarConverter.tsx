import React, { useState, memo } from 'react';
import { CalendarDays, ArrowLeftRight, X } from 'lucide-react';

const KHMER_DIGITS = ['០', '១', '២', '៣', '៤', '៥', '៦', '៧', '៨', '៩'];

function toKhmerNumeral(n: number): string {
  return String(n).replace(/\d/g, d => KHMER_DIGITS[parseInt(d)]);
}

const KHMER_MONTHS_KH = [
  'មករា', 'កុម្ភៈ', 'មីនា', 'មេសា', 'ឧសភា', 'មេសា',
  'កក្កដា', 'សីហា', 'កញ្ញា', 'តុលា', 'វិច្ឆិកា', 'ធ្នូ',
];
const KHMER_MONTHS_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const BUDDHIST_YEAR_OFFSET = 543;

interface ConvertedDate {
  khYear: number;
  khMonth: number;
  khDay: number;
  gregorianYear: number;
  gregorianMonth: number;
  gregorianDay: number;
}

function gregorianToBuddhist(gy: number, gm: number, gd: number): ConvertedDate {
  // Buddhist year = Gregorian + 543
  return {
    khYear: gy + BUDDHIST_YEAR_OFFSET,
    khMonth: gm,
    khDay: gd,
    gregorianYear: gy,
    gregorianMonth: gm,
    gregorianDay: gd,
  };
}

function buddhistToGregorian(by: number, bm: number, bd: number): ConvertedDate {
  return {
    khYear: by,
    khMonth: bm,
    khDay: bd,
    gregorianYear: by - BUDDHIST_YEAR_OFFSET,
    gregorianMonth: bm,
    gregorianDay: bd,
  };
}

function formatKhmerDate(d: ConvertedDate): string {
  const khYear = toKhmerNumeral(d.khYear);
  const khDay = toKhmerNumeral(d.khDay);
  return `${khDay} ${KHMER_MONTHS_KH[d.khMonth - 1]} ${khYear}`;
}

function formatGregorianDate(d: ConvertedDate): string {
  return `${d.gregorianDay} ${KHMER_MONTHS_EN[d.gregorianMonth - 1]} ${d.gregorianYear}`;
}

function parseDMY(s: string): { day: number; month: number; year: number } | null {
  const m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (!m) return null;
  const [, d, mo, y] = m.map(Number);
  if (mo < 1 || mo > 12 || d < 1 || d > 31 || y < 1) return null;
  return { day: d, month: mo, year: y };
}

export const KhmerCalendarConverter = memo(function KhmerCalendarConverter({
  onClose,
}: {
  onClose: () => void;
}) {
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<'g2b' | 'b2g'>('g2b');
  const [result, setResult] = useState<ConvertedDate | null>(null);
  const [error, setError] = useState('');

  function convert() {
    setError('');
    const parsed = parseDMY(input.trim());
    if (!parsed) {
      setError('Use format DD/MM/YYYY or DD-MM-YYYY');
      setResult(null);
      return;
    }
    const converted = mode === 'g2b'
      ? gregorianToBuddhist(parsed.year, parsed.month, parsed.day)
      : buddhistToGregorian(parsed.year, parsed.month, parsed.day);
    setResult(converted);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') convert();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2.5">
            <CalendarDays size={18} className="text-indigo-600 dark:text-indigo-400" />
            <h2 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
              Khmer Calendar Converter
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-5 space-y-4">
          {/* Mode toggle */}
          <div className="flex rounded-lg bg-gray-100 dark:bg-gray-800 p-1 gap-1">
            {([['g2b', 'Gregorian → Khmer'], ['b2g', 'Khmer → Gregorian']] as const).map(([v, label]) => (
              <button
                key={v}
                onClick={() => { setMode(v); setResult(null); setInput(''); setError(''); }}
                className={`flex-1 py-1.5 px-3 rounded-md text-xs font-medium transition-all ${
                  mode === v
                    ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Input */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
              {mode === 'g2b' ? 'Enter Gregorian date' : 'Enter Khmer (Buddhist) date'}
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={e => { setInput(e.target.value); setResult(null); setError(''); }}
                onKeyDown={handleKeyDown}
                placeholder="DD/MM/YYYY"
                className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent"
              />
              <button
                onClick={convert}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors flex items-center gap-1.5"
              >
                <ArrowLeftRight size={14} />
                Convert
              </button>
            </div>
            {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}
          </div>

          {/* Result */}
          {result && (
            <div className="rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/50 dark:to-purple-950/50 border border-indigo-100 dark:border-indigo-900 p-4 space-y-3">
              {mode === 'g2b' ? (
                <>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Khmer (Buddhist) Date</p>
                    <p className="text-lg font-semibold text-indigo-700 dark:text-indigo-300" dir="ltr">
                      {formatKhmerDate(result)}
                    </p>
                    <p className="text-xs text-indigo-400 mt-0.5">{toKhmerNumeral(result.khYear)}</p>
                  </div>
                  <div className="border-t border-indigo-200 dark:border-indigo-800 pt-3">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Gregorian Date</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{formatGregorianDate(result)}</p>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Gregorian Date</p>
                    <p className="text-lg font-semibold text-indigo-700 dark:text-indigo-300">
                      {formatGregorianDate(result)}
                    </p>
                  </div>
                  <div className="border-t border-indigo-200 dark:border-indigo-800 pt-3">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Khmer (Buddhist) Date</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300" dir="ltr">
                      {formatKhmerDate(result)}
                    </p>
                    <p className="text-xs text-indigo-400 mt-0.5">{toKhmerNumeral(result.khYear)}</p>
                  </div>
                </>
              )}
            </div>
          )}

          <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
            Cambodia uses the Buddhist calendar (Gregorian + 543 years)
          </p>
        </div>
      </div>
    </div>
  );
});