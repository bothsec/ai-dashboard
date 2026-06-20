import { useState, memo, useMemo } from 'react';
import { Clock, X, CheckCircle2, AlertCircle, TrendingUp } from 'lucide-react';

interface ProbationMilestone {
  day: number;
  label: string;
  labelKh: string;
  message: string;
  messageKh: string;
  status: 'upcoming' | 'active' | 'passed';
}

const MILESTONES = [
  {
    day: 30,
    label: '30-Day Check-in',
    labelKh: 'ការវាយតម្លៃ ៣០ ថ្ងៃ',
    message: 'Employer should review performance. Either party can terminate with 7 days notice + prorated pay.',
    messageKh: 'និយោជកគួរតែពិនិត្យមើលការអនុវត្តការងារ។ ភាគីនីមួយៗអាចបញ្ចប់កិច្ចសន្យាដោយផ្តល់ការជូនដំណឹងជាមុន ៧ ថ្ងៃ និងទទួលបានប្រាក់បៀវត្សរ៍សមាមាត្រ។',
  },
  {
    day: 60,
    label: '60-Day Review',
    labelKh: 'ការវាយតម្លៃ ៦០ ថ្ងៃ',
    message: 'Mid-probation assessment. If concerns exist, employer should document them and give chance to improve.',
    messageKh: 'ការវាយតម្លៃពាក់កណ្តាលការសាកល្បងការងារ។ ប្រសិនបើមានការព្រួយបារម្ភ និយោជកគួរតែកត់ត្រាទុក និងផ្តល់ឱកាសឱ្យកែលម្អ។',
  },
  {
    day: 90,
    label: '90-Day Completion',
    labelKh: 'បញ្ចប់ការសាកល្បងការងារ ៩០ ថ្ងៃ',
    message: 'Probation ends. Employer must decide: confirm, extend (max 2 months extra), or terminate. Written notice required.',
    messageKh: 'ការសាកល្បងការងារត្រូវបានបញ្ចប់។ និយោជកត្រូវសម្រេច៖ ទទួលយកជាផ្លូវការ បន្តការសាកល្បង (អតិបរមា ២ ខែបន្ថែម) ឬបញ្ឈប់ពីការងារ។ ត្រូវតែមានលិខិតជូនដំណឹងជាលាយលក្ខណ៍អក្សរ។',
  },
];

function formatRiel(amount: number): string {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(2)}M ៛`;
  return `${Math.round(amount).toLocaleString()} ៛`;
}

function calcProbation(startDate: Date, monthlySalary: number) {
  const now = new Date();
  
  // Normalize both dates to midnight local time to avoid timezone/DST/time of day bugs
  const startMidnight = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  const daysElapsed = Math.floor((nowMidnight.getTime() - startMidnight.getTime()) / (1000 * 60 * 60 * 24));
  const totalDays = 90;
  const daysRemaining = Math.max(0, totalDays - daysElapsed);
  const progress = Math.min(100, Math.max(0, (daysElapsed / totalDays) * 100));

  const milestones: ProbationMilestone[] = MILESTONES.map(m => ({
    ...m,
    status: daysElapsed >= m.day ? 'passed' : daysElapsed >= m.day - 14 ? 'active' : 'upcoming',
  }));

  // End-of-probation severance estimate if terminated before completion
  const dailyRate = monthlySalary / 26;
  // During probation: 7 days notice, no severance typically required
  // After probation: notice period + potential severance
  const endStatus = daysElapsed >= 90 ? 'completed' : daysElapsed >= 60 ? 'final' : 'inProgress';

  let severanceEstimate = '—';
  if (monthlySalary > 0 && daysElapsed < 90) {
    // If terminated during probation, typically only notice pay is due
    // but some employers pay prorated 13th month if applicable
    const noticeDays = 7;
    const noticePay = noticeDays * dailyRate;
    severanceEstimate = formatRiel(noticePay);
  } else if (monthlySalary > 0) {
    severanceEstimate = '0 ៛ (confirmed)';
  }

  return { daysElapsed, daysRemaining, progress, milestones, endStatus, severanceEstimate };
}

export const KhmerProbationTracker = memo(function KhmerProbationTracker({
  onClose,
}: {
  onClose: () => void;
}) {
  const today = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(today);
  const [monthlySalary, setMonthlySalary] = useState(0);

  const result = useMemo(() => {
    // Parse "YYYY-MM-DD" as local time midnight to match calcProbation's midnight logic
    const parts = startDate.split('-');
    if (parts.length !== 3) return null;
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const d = new Date(year, month, day);
    if (isNaN(d.getTime())) return null;
    return calcProbation(d, monthlySalary);
  }, [startDate, monthlySalary]);

  const progressColor =
    !result ? 'bg-gray-300' :
    result.daysRemaining === 0 ? 'bg-emerald-500' :
    result.daysElapsed < 30 ? 'bg-amber-500' :
    'bg-blue-500';

  const statusLabel =
    !result ? '' :
    result.daysRemaining === 0 ? 'Probation Complete ✓' :
    result.daysRemaining < 30 ? 'Final Stretch' :
    result.daysElapsed < 30 ? 'Early Stage' :
    'Mid Probation';

  const statusLabelKh =
    !result ? '' :
    result.daysRemaining === 0 ? 'ការសាកល្បងការងារត្រូវបានបញ្ចប់ ✓' :
    result.daysRemaining < 30 ? 'ដំណាក់កាលចុងក្រោយ' :
    result.daysElapsed < 30 ? 'ដំណាក់កាលដំបូង' :
    'ដំណាក់កាលកណ្តាល';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden border border-gray-200 dark:border-gray-700 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-900 z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center">
              <Clock className="w-4 h-4 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
                Probation Tracker
              </h2>
              <p className="text-[10px] text-gray-500 dark:text-gray-400">Khmer Labor Law</p>
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
          {/* Inputs */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] text-gray-500 dark:text-gray-400 mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-violet-500 font-mono"
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
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 font-mono"
              />
            </div>
          </div>

          {/* Progress bar */}
          {result && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-700 dark:text-gray-300">Progress</p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400">{statusLabel} · {statusLabelKh}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold font-mono text-violet-600 dark:text-violet-400">
                    {result.daysRemaining > 0 ? `${result.daysRemaining}d left` : 'Done!'}
                  </p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400">{result.daysElapsed}d elapsed</p>
                </div>
              </div>

              {/* Visual bar */}
              <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${progressColor}`}
                  style={{ width: `${result.progress}%` }}
                />
              </div>

              {/* Day markers */}
              <div className="relative h-4 mt-1">
                {[33, 66, 100].map((pct, i) => (
                  <div key={i} className="absolute top-0" style={{ left: `${pct}%`, transform: 'translateX(-50%)' }}>
                    <div className="w-0.5 h-2 bg-gray-300 dark:bg-gray-600 mx-auto" />
                    <p className="text-[8px] text-gray-500 dark:text-gray-400 text-center mt-0.5 -translate-x-1/2">{[30, 60, 90][i]}d</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Milestones */}
          {result && (
            <div className="space-y-2">
              {result.milestones.map(m => (
                <div
                  key={m.day}
                  className={`flex items-start gap-2.5 p-3 rounded-xl border transition-colors ${
                    m.status === 'passed'
                      ? 'border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/20'
                      : m.status === 'active'
                      ? 'border-amber-500/40 bg-amber-50/40 dark:bg-amber-950/20'
                      : 'border-gray-200 dark:border-gray-700 bg-gray-50/30 dark:bg-gray-800/30'
                  }`}
                >
                  <div className="mt-0.5 flex-shrink-0">
                    {m.status === 'passed' ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    ) : m.status === 'active' ? (
                      <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                    ) : (
                      <Clock className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-medium ${
                      m.status === 'passed'
                        ? 'text-emerald-700 dark:text-emerald-300'
                        : m.status === 'active'
                        ? 'text-amber-700 dark:text-amber-300'
                        : 'text-gray-500 dark:text-gray-400'
                    }`}>
                      Day {m.day} — {m.label}
                    </p>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-1">{m.labelKh}</p>
                    <p className={`text-[10px] leading-relaxed ${
                      m.status === 'passed'
                        ? 'text-emerald-600/70 dark:text-emerald-400/60'
                        : m.status === 'active'
                        ? 'text-amber-600/70 dark:text-amber-400/60'
                        : 'text-gray-500 dark:text-gray-400'
                    }`}>
                      {m.status === 'active' ? '⚡ ' : ''}{m.message}
                    </p>
                    <p className="text-[9px] text-gray-500 dark:text-gray-400 leading-relaxed">
                      {m.status === 'active' ? '⚡ ' : ''}{m.messageKh}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Summary */}
          {result && (
            <div className="rounded-xl bg-violet-50 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-900 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-violet-600 dark:text-violet-400 mb-0.5">End-of-Period Notice</p>
                  <p className="text-sm font-semibold text-violet-700 dark:text-violet-300">
                    {result.daysRemaining > 0 ? '7 days notice if terminated' : 'Written confirmation required'}
                  </p>
                </div>
                <TrendingUp className="w-4 h-4 text-violet-400" />
              </div>
              <div className="border-t border-violet-200 dark:border-violet-800 pt-2 flex items-center justify-between">
                <p className="text-[10px] text-violet-600 dark:text-violet-400">If Terminated Now</p>
                <p className="text-xs font-medium text-violet-700 dark:text-violet-300 font-mono">
                  {result.severanceEstimate}
                </p>
              </div>
            </div>
          )}

          {/* Your Rights */}
          <div className="flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900 p-2.5">
            <AlertCircle className="w-3.5 h-3.5 text-amber-400 mt-0.5 flex-shrink-0" />
            <p className="text-[10px] text-amber-600 dark:text-amber-400 leading-relaxed">
              <strong>Your probation rights under Cambodian Labor Law:</strong> Maximum 3 months probation (can extend once by 2 months max). Either party can terminate during probation with 7 days notice. No severance owed during probation if terminated. After completion, you are entitled to written confirmation.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
});