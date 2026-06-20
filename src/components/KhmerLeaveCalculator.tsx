import { useState, memo } from 'react';
import { CalendarDays, X, Info } from 'lucide-react';

interface LeaveResult {
  annual: number;
  sick: number;
  maternity: number;
  publicHolidays: number;
  probation: string;
  total: number;
  rielValue: string;
}

function estimateRielValue(
  monthlySalary: number,
  annualDays: number,
  sickDays: number
): string {
  const dailyRate = monthlySalary / 26;
  const annualValue = annualDays * dailyRate;
  const sickPaidDays = Math.max(0, sickDays - 2) * dailyRate * 0.6;
  const total = annualValue + sickPaidDays;
  if (total >= 1_000_000) {
    return `${(total / 1_000_000).toFixed(1)}M ៛ ($${(total / 4000).toFixed(0)})`;
  }
  return `${total.toLocaleString()} ៛`;
}

function calcLeave(years: number, monthlySalary: number): LeaveResult {
  const annual = years < 1 ? 0 : 18;
  const sick = 30;
  const maternity = 90;
  const publicHolidays = 17;
  const probation = years < 1 ? 'Active — កេរ្តិ៍' : 'Completed ✓';
  const total = annual + sick + publicHolidays;
  const rielValue = monthlySalary > 0 ? estimateRielValue(monthlySalary, annual, sick) : '—';
  return { annual, sick, maternity, publicHolidays, probation, total, rielValue };
}

export const KhmerLeaveCalculator = memo(function KhmerLeaveCalculator({
  onClose,
}: {
  onClose: () => void;
}) {
  const [years, setYears] = useState(1);
  const [monthlySalary, setMonthlySalary] = useState(0);
  const result = calcLeave(years, monthlySalary);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden border border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
              <CalendarDays className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
                Leave Entitlements
              </h2>
              <p className="text-[10px] text-gray-500 dark:text-gray-400">Cambodian Labor Law</p>
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
          {/* Service years */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] text-gray-500 dark:text-gray-400 mb-1">Years of Service</label>
              <input
                type="number"
                min={0}
                max={50}
                value={years}
                onChange={e => setYears(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-[10px] text-gray-500 dark:text-gray-400 mb-1">Monthly Salary ($)</label>
              <input
                type="number"
                min={0}
                placeholder="0"
                value={monthlySalary || ''}
                onChange={e => setMonthlySalary(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
              />
            </div>
          </div>

          {/* Results */}
          <div className="space-y-2">
            {[
              { label: 'Annual Leave', value: result.annual, note: '18 days after 1yr', color: 'emerald' },
              { label: 'Sick Leave', value: result.sick, note: '30 days/yr', color: 'amber' },
              { label: 'Public Holidays', value: result.publicHolidays, note: '17 days/yr', color: 'blue' },
              { label: 'Maternity Leave', value: result.maternity, note: '90 days (S.S.F.)', color: 'pink' },
            ].map(row => (
              <div key={row.label} className="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/50">
                <div>
                  <p className="text-xs font-medium text-gray-700 dark:text-gray-300">{row.label}</p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400">{row.note}</p>
                </div>
                <span className={`text-lg font-bold font-mono text-${row.color}-600 dark:text-${row.color}-400`}>
                  {row.value}d
                </span>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mb-0.5">Total Paid Leave / Year</p>
                <p className="text-xl font-bold text-emerald-700 dark:text-emerald-300 font-mono">{result.total} days</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mb-0.5">Est. Value</p>
                <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">{result.rielValue}</p>
              </div>
            </div>
            <div className="border-t border-emerald-200 dark:border-emerald-800 pt-2 flex items-center justify-between">
              <p className="text-[10px] text-emerald-600 dark:text-emerald-400">Probation Status</p>
              <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300">{result.probation}</p>
            </div>
          </div>

          {/* Info */}
          <div className="flex items-start gap-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900 p-2.5">
            <Info className="w-3.5 h-3.5 text-indigo-400 mt-0.5 flex-shrink-0" />
            <p className="text-[10px] text-indigo-600 dark:text-indigo-400 leading-relaxed">
              Based on Cambodian Labor Law (2007). Sick days 3–30 are paid at 60%. Annual leave vests after 1 year. Maternity funded by National Social Security Fund.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
});