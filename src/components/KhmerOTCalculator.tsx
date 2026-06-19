import { useState, memo } from 'react';
import { Clock, X, Info } from 'lucide-react';

interface OTBreakdown {
  label: string;
  hours: number;
  rate: number;
  multiplier: number;
  total: number;
}

function calcOT(monthlySalary: number, normalHours: number, nightHours: number, weekendHours: number, holidayHours: number): OTBreakdown[] {
  const hourlyRate = monthlySalary / 26 / 8;
  const rows: OTBreakdown[] = [];

  if (normalHours > 0) {
    rows.push({
      label: 'Normal OT (1.5×)',
      hours: normalHours,
      rate: hourlyRate,
      multiplier: 1.5,
      total: normalHours * hourlyRate * 1.5,
    });
  }
  if (nightHours > 0) {
    rows.push({
      label: 'Night OT (2×)',
      hours: nightHours,
      rate: hourlyRate,
      multiplier: 2,
      total: nightHours * hourlyRate * 2,
    });
  }
  if (weekendHours > 0) {
    rows.push({
      label: 'Weekend OT (2×)',
      hours: weekendHours,
      rate: hourlyRate,
      multiplier: 2,
      total: weekendHours * hourlyRate * 2,
    });
  }
  if (holidayHours > 0) {
    rows.push({
      label: 'Public Holiday OT (2.5×)',
      hours: holidayHours,
      rate: hourlyRate,
      multiplier: 2.5,
      total: holidayHours * hourlyRate * 2.5,
    });
  }
  return rows;
}

function formatRiel(amount: number): string {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(2)}M ៛`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)}K ៛`;
  return `${Math.round(amount).toLocaleString()} ៛`;
}

export const KhmerOTCalculator = memo(function KhmerOTCalculator({ onClose }: { onClose: () => void }) {
  const [monthlySalary, setMonthlySalary] = useState(800);
  const [normalHours, setNormalHours] = useState(0);
  const [nightHours, setNightHours] = useState(0);
  const [weekendHours, setWeekendHours] = useState(0);
  const [holidayHours, setHolidayHours] = useState(0);

  const breakdown = calcOT(monthlySalary, normalHours, nightHours, weekendHours, holidayHours);
  const grandTotal = breakdown.reduce((sum, r) => sum + r.total, 0);
  const hourlyRate = monthlySalary / 26 / 8;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div
        className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl shadow-2xl w-full max-w-md"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-500" />
            <h2 className="font-semibold text-[var(--text-primary)]">Khmer OT Calculator</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-[var(--hover)] transition-colors">
            <X className="w-4 h-4 text-[var(--text-secondary)]" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4">
          {/* Salary input */}
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
              Monthly Salary (USD)
            </label>
            <input
              type="number"
              value={monthlySalary}
              onChange={e => setMonthlySalary(Math.max(0, Number(e.target.value)))}
              className="w-full bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-amber-500/50"
              min="0"
              step="50"
            />
            <p className="mt-1 text-xs text-[var(--text-secondary)]">
              ≈ {formatRiel(monthlySalary * 4000)} / month
            </p>
          </div>

          {/* OT hour inputs */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Normal OT (1.5×)', value: normalHours, setter: setNormalHours, tip: 'Mon–Fri, daytime' },
              { label: 'Night OT (2×)', value: nightHours, setter: setNightHours, tip: '10pm–5am' },
              { label: 'Weekend OT (2×)', value: weekendHours, setter: setWeekendHours, tip: 'Sat–Sun' },
              { label: 'Holiday OT (2.5×)', value: holidayHours, setter: setHolidayHours, tip: 'Public holidays' },
            ].map(({ label, value, setter, tip }) => (
              <div key={label}>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">{label}</label>
                <input
                  type="number"
                  value={value}
                  onChange={e => setter(Math.max(0, Number(e.target.value)))}
                  className="w-full bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-amber-500/50"
                  min="0"
                  step="0.5"
                />
                <p className="mt-0.5 text-xs text-[var(--text-secondary)]">{tip}</p>
              </div>
            ))}
          </div>

          {/* Rate info */}
          <div className="flex items-start gap-1.5 text-xs text-[var(--text-secondary)] bg-[var(--bg-tertiary)] rounded-lg px-3 py-2">
            <Info className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-500" />
            <span>
              Hourly rate: <strong>${hourlyRate.toFixed(2)}</strong> ({formatRiel(hourlyRate * 4000)}/hr). Rates per Cambodia Labor Law Prakas 443.
            </span>
          </div>

          {/* Breakdown */}
          {breakdown.length > 0 ? (
            <div className="space-y-2">
              <div className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">Breakdown</div>
              {breakdown.map(row => (
                <div key={row.label} className="flex justify-between items-center text-sm">
                  <div>
                    <span className="text-[var(--text-primary)]">{row.label}</span>
                    <span className="ml-2 text-[var(--text-secondary)]">×{row.hours}h</span>
                  </div>
                  <span className="text-[var(--text-primary)] font-medium">{formatRiel(row.total)}</span>
                </div>
              ))}
              <div className="border-t border-[var(--border)] pt-2 flex justify-between items-center">
                <span className="text-sm font-semibold text-[var(--text-primary)]">Total OT Pay</span>
                <span className="text-sm font-bold text-amber-500">{formatRiel(grandTotal)}</span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-center text-[var(--text-secondary)] py-2">
              Enter overtime hours above to calculate pay
            </p>
          )}
        </div>
      </div>
    </div>
  );
});