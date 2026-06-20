import React, { useState, memo } from 'react';
import { Type, X, Copy, CheckCheck } from 'lucide-react';
import { numberToKhmerWords } from '../utils/khmerNumberWords';
import { parseNumber, toKhmerNumeral } from '../utils/khmerCurrency';

export const KhmerNumberWords = memo(function KhmerNumberWords({
  onClose,
}: {
  onClose: () => void;
}) {
  const [input, setInput] = useState('');
  const [khWords, setKhWords] = useState<string | null>(null);
  const [arWords, setArWords] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const convert = () => {
    setError('');
    const n = parseNumber(input);
    if (n === null || n < 0) {
      setError('Enter a valid non-negative number');
      setKhWords(null);
      setArWords(null);
      return;
    }
    if (n > 999_999_999) {
      setError('Maximum supported value is 999,999,999');
      setKhWords(null);
      setArWords(null);
      return;
    }
    const kh = numberToKhmerWords(n);
    setKhWords(kh);
    setArWords(n === 0 ? 'zero' : null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') convert();
  };

  const copyToClipboard = () => {
    if (!khWords) return;
    navigator.clipboard.writeText(khWords).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden border border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center">
              <Type className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">Khmer Number to Words</h2>
              <p className="text-[10px] text-gray-500 dark:text-gray-400">លេខ → ពាក្យ</p>
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
              onChange={e => { setInput(e.target.value); setKhWords(null); setArWords(null); setError(''); }}
              onKeyDown={handleKeyDown}
              placeholder="e.g. 1500000 or ១,៥០០,០០០"
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500 dark:focus:ring-teal-400 focus:border-transparent font-mono"
              autoFocus
            />
            {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
          </div>

          {/* Convert button */}
          <button
            onClick={convert}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg text-xs font-medium transition-colors"
          >
            <Type className="w-3.5 h-3.5" />
            Convert to Khmer Words
          </button>

          {/* Result */}
          {khWords && (
            <div className="rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-900 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-teal-600 dark:text-teal-400 mb-0.5">Khmer (ខ្មែរ)</p>
                  <p
                    className="text-lg font-semibold text-teal-700 dark:text-teal-300 leading-relaxed"
                    dir="ltr"
                    lang="km"
                  >
                    {khWords}
                  </p>
                </div>
                <button
                  onClick={copyToClipboard}
                  className="p-1.5 rounded-lg text-teal-400 hover:text-teal-300 hover:bg-teal-500/10 transition-colors"
                  title="Copy to clipboard"
                >
                  {copied ? <CheckCheck className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <div className="border-t border-teal-200 dark:border-teal-800 pt-2">
                <p className="text-[10px] text-teal-500 mb-0.5">Arabic numerals</p>
                <p className="text-sm font-mono text-teal-600 dark:text-teal-400">
                  {toKhmerNumeral(input.trim().replace(/,/g, ''))}
                  {arWords && <span className="ml-2 text-xs text-teal-400/70">({arWords})</span>}
                </p>
              </div>
            </div>
          )}

          <p className="text-[10px] text-gray-500 dark:text-gray-400 text-center">
            Converts numbers up to 999,999,999 to Khmer script words
          </p>
        </div>
      </div>
    </div>
  );
});