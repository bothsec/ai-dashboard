import React, { useState, memo } from 'react';
import { Currency, ArrowLeftRight, X, Copy, CheckCheck } from 'lucide-react';
import { formatRielWithDollar, parseNumber, toKhmerNumeral, fromKhmerNumeral } from '../utils/khmerCurrency';

export const KhmerRielFormatter = memo(function KhmerRielFormatter({
  onClose,
}: {
  onClose: () => void;
}) {
  const [input, setInput] = useState('');
  const [riel, setRiel] = useState<{ riel: string; usd: string } | null>(null);
  const [khNum, setKhNum] = useState<string | null>(null);
  const [arNum, setArNum] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState<string | null>(null);

  const convertCurrency = () => {
    setError('');
    setRiel(null);
    const n = parseNumber(input);
    if (n === null || n < 0) {
      setError('Enter a valid positive number');
      return;
    }
    setRiel(formatRielWithDollar(n));
  };

  const convertNumerals = (dir: 'k2a' | 'a2k') => {
    setError('');
    if (!input.trim()) return;
    if (dir === 'a2k') {
      const n = parseNumber(input);
      if (n === null) { setError('Enter a valid Arabic number'); return; }
      setKhNum(toKhmerNumeral(n));
      setArNum(null);
    } else {
      const converted = fromKhmerNumeral(input);
      const n = parseInt(converted.replace(/[^\d]/g, ''), 10);
      if (isNaN(n)) { setError('No Khmer numerals found'); return; }
      setArNum(n.toLocaleString('en-US'));
      setKhNum(null);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') convertCurrency();
  };

  const CopyBtn = ({ text, label }: { text: string; label: string }) => (
    <button
      onClick={() => copyToClipboard(text, label)}
      className="p-1 rounded text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 transition-colors"
      title="Copy to clipboard"
    >
      {copied === label ? <CheckCheck className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden border border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
              <Currency className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">Khmer Riel Formatter</h2>
              <p className="text-[10px] text-gray-500 dark:text-gray-400">៛ Riel currency & Khmer numerals</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Input */}
          <div>
            <input
              type="text"
              value={input}
              onChange={e => { setInput(e.target.value); setRiel(null); setKhNum(null); setArNum(null); setError(''); }}
              onKeyDown={handleKeyDown}
              placeholder="e.g. 1500000 or ១,៥០០,០០០"
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent font-mono"
              autoFocus
            />
            {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
          </div>

          {/* Currency Convert */}
          <div className="space-y-2">
            <button
              onClick={convertCurrency}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-medium transition-colors"
            >
              <Currency className="w-3.5 h-3.5" />
              Format as Riel (៛)
            </button>

            {riel && (
              <div className="rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-amber-600 dark:text-amber-400 mb-0.5">Khmer Riel</p>
                    <p className="text-lg font-bold text-amber-700 dark:text-amber-300 font-mono">{riel.riel}</p>
                  </div>
                  <CopyBtn text={riel.riel} label="riel" />
                </div>
                <div className="border-t border-amber-200 dark:border-amber-800 pt-2 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-amber-600 dark:text-amber-400 mb-0.5">USD equivalent</p>
                    <p className="text-sm font-semibold text-amber-600 dark:text-amber-400">{riel.usd}</p>
                  </div>
                  <CopyBtn text={riel.usd} label="usd" />
                </div>
              </div>
            )}
          </div>

          {/* Numerals Convert */}
          <div className="space-y-2">
            <div className="flex gap-2">
              <button
                onClick={() => convertNumerals('a2k')}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium transition-colors"
              >
                <ArrowLeftRight className="w-3 h-3" />
                123 → ១២៣
              </button>
              <button
                onClick={() => convertNumerals('k2a')}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-xs font-medium transition-colors"
              >
                <ArrowLeftRight className="w-3 h-3" style={{ transform: 'rotate(180deg)' }} />
                ១២៣ → 123
              </button>
            </div>

            {(khNum || arNum) && (
              <div className="rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-mono text-indigo-700 dark:text-indigo-300">{khNum || arNum}</p>
                  <CopyBtn text={khNum || arNum || ''} label="num" />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="px-5 pb-4">
          <p className="text-[10px] text-gray-500 dark:text-gray-400 text-center">
            Exchange rate: ~$1 ≈ 4,000 ៛ &nbsp;|&nbsp; Cambodia uses Riel (៛) as primary currency
          </p>
        </div>
      </div>
    </div>
  );
});