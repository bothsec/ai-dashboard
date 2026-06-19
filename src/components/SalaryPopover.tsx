import { memo } from 'react';
import { X, ArrowRightLeft } from 'lucide-react';
import { usdToRiel, formatRiel, formatUsd, detectSalaryRanges } from '../utils/salaryDetector';

interface Props {
  text: string;
  isDark: boolean;
  onClose: () => void;
}

export const SalaryPopover = memo(function SalaryPopover({ text, isDark, onClose }: Props) {
  const salaries = detectSalaryRanges(text);

  if (salaries.length === 0) return null;

  return (
    <div
      className={`absolute bottom-full mb-2 right-4 w-72 z-50 rounded-xl border shadow-2xl overflow-hidden ${
        isDark ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-gray-200'
      }`}
    >
      {/* Header */}
      <div className={`flex items-center justify-between px-3 py-2 border-b ${isDark ? 'border-zinc-700 bg-zinc-800' : 'border-gray-100 bg-gray-50'}`}>
        <span className={`text-xs font-semibold flex items-center gap-1.5 ${isDark ? 'text-zinc-200' : 'text-gray-700'}`}>
          💰 Salary Conversion
        </span>
        <button
          onClick={onClose}
          className={`p-0.5 rounded ${isDark ? 'hover:bg-zinc-700 text-zinc-400' : 'hover:bg-gray-200 text-gray-500'}`}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Conversions */}
      <div className="p-2 space-y-1.5">
        {salaries.map((salary, i) => (
          <div key={i} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs ${
            isDark ? 'bg-zinc-800' : 'bg-gray-50'
          }`}>
            <span className={`font-semibold ${isDark ? 'text-zinc-300' : 'text-gray-700'}`}>
              {salary.raw}
            </span>
            <ArrowRightLeft className={`w-3 h-3 shrink-0 ${isDark ? 'text-zinc-500' : 'text-gray-400'}`} />
            {salary.currency === 'USD' ? (
              <span className={`font-medium ${isDark ? 'text-green-400' : 'text-green-600'}`}>
                ≈ {formatRiel(usdToRiel(salary.value))}
              </span>
            ) : (
              <span className={`font-medium ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                ≈ {formatUsd(Math.round(salary.value / 4050))} USD
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Insert hint */}
      <div className={`px-3 pb-2 text-[10px] ${isDark ? 'text-zinc-600' : 'text-gray-400'}`}>
        Conversions are approximate (1 USD ≈ 4,050 KHR)
      </div>
    </div>
  );
});