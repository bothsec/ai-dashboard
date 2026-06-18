import { memo } from 'react';
import { X, AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { detectContractClauses, type DetectedClause } from '../data/contractRedFlags';

interface Props {
  text: string;
  isDark: boolean;
  onClose: () => void;
}

const SEVERITY_ICON = {
  critical: AlertTriangle,
  high: AlertCircle,
  medium: Info,
};

const SEVERITY_COLOR = {
  critical: 'text-red-400 border-red-500/50 bg-red-500/10',
  high: 'text-amber-400 border-amber-500/50 bg-amber-500/10',
  medium: 'text-blue-400 border-blue-500/50 bg-blue-500/10',
};

const ClauseRow = memo(({ item }: { item: DetectedClause }) => {
  const Icon = SEVERITY_ICON[item.clause.severity];
  return (
    <div className={`flex gap-2 p-2.5 rounded-lg border text-xs ${SEVERITY_COLOR[item.clause.severity]}`}>
      <Icon className="w-4 h-4 mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="font-semibold mb-0.5">{item.clause.enLabel}</div>
        <div className="opacity-70 mb-1.5 font-hanuman text-[11px]">{item.clause.khLabel}</div>
        <div className="opacity-80 leading-relaxed">{item.clause.enExplanation}</div>
      </div>
    </div>
  );
});

export const ContractAnalyzer = memo(function ContractAnalyzer({ text, isDark, onClose }: Props) {
  const detected = detectContractClauses(text);

  if (detected.length === 0) return null;

  const critical = detected.filter(d => d.clause.severity === 'critical');
  const high = detected.filter(d => d.clause.severity === 'high');
  const medium = detected.filter(d => d.clause.severity === 'medium');

  return (
    <div
      className={`absolute bottom-full mb-2 right-4 w-80 z-50 rounded-xl border shadow-2xl overflow-hidden max-h-96 flex flex-col ${
        isDark ? 'bg-z-900 border-z-700' : 'bg-white border-gray-200'
      }`}
    >
      {/* Header */}
      <div className={`flex items-center justify-between px-3 py-2 border-b shrink-0 ${
        isDark ? 'border-z-700 bg-z-800' : 'border-gray-100 bg-gray-50'
      }`}>
        <span className={`text-xs font-semibold flex items-center gap-1.5 ${isDark ? 'text-z-200' : 'text-gray-700'}`}>
          📋 Labor Contract Analyzer
        </span>
        <button
          onClick={onClose}
          className={`p-0.5 rounded ${isDark ? 'hover:bg-z-700 text-z-400' : 'hover:bg-gray-200 text-gray-500'}`}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Body */}
      <div className="overflow-y-auto p-2 space-y-2">
        {critical.length > 0 && (
          <>
            <div className="text-[10px] font-bold text-red-400 uppercase tracking-wider px-1">
              ⚠️ Critical — Must Fix
            </div>
            {critical.map((d, i) => <ClauseRow key={d.clause.id + i} item={d} />)}
          </>
        )}
        {high.length > 0 && (
          <>
            <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wider px-1 pt-1">
              ⚠️ High Risk
            </div>
            {high.map((d, i) => <ClauseRow key={d.clause.id + i} item={d} />)}
          </>
        )}
        {medium.length > 0 && (
          <>
            <div className="text-[10px] font-bold text-blue-400 uppercase tracking-wider px-1 pt-1">
              ℹ️ Review Carefully
            </div>
            {medium.map((d, i) => <ClauseRow key={d.clause.id + i} item={d} />)}
          </>
        )}
      </div>

      {/* Footer */}
      <div className={`px-3 py-1.5 text-[10px] border-t shrink-0 ${isDark ? 'border-z-700 text-z-500' : 'border-gray-100 text-gray-400'}`}>
        Detected {detected.length} clause{detected.length !== 1 ? 's' : ''} — Khmer Labor Law reference
      </div>
    </div>
  );
});