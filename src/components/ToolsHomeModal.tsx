import React, { memo } from 'react';
import {
  Sparkles, Palette, Command, BarChart2, Lightbulb, Shield, Clock,
  TrendingUp, FileText, GraduationCap, Currency, Type, CalendarDays,
  Calculator, BookOpen, ScrollText, X, Wrench,
} from 'lucide-react';
import { useSettings } from '../context/SettingsContext';

interface ToolItem {
  key: string;
  featureKey: string;
  label: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
  run: () => void;
}

interface Props {
  onClose: () => void;
}

export const ToolsHomeModal = memo(function ToolsHomeModal({ onClose }: Props) {
  const { isFeatureEnabled, settings } = useSettings();

  const dispatchOpen = (event: string) => () => {
    onClose();
    window.dispatchEvent(new CustomEvent(event));
  };

  const tools: ToolItem[] = [
    { key: 'resume',     featureKey: 'resumeBuilder',     label: 'Resume Builder',                desc: 'Craft a Khmer/English CV tailored to a Phnom Penh job',         icon: FileText,       run: dispatchOpen('resume:open') },
    { key: 'interview',  featureKey: 'interviewPrep',     label: 'Interview Prep',                desc: 'Practice common questions for Cambodian employers',             icon: GraduationCap,  run: dispatchOpen('interview:open') },
    { key: 'contract',   featureKey: 'contractAnalyzer',  label: 'Contract Checker',              desc: 'Review clauses in a Khmer labor contract',                       icon: ScrollText,     run: () => window.dispatchEvent(new CustomEvent('contract-analyzer:open')) },
    { key: 'salary',     featureKey: 'salaryConverter',   label: 'Salary & OT Calculator',        desc: 'Compute hourly, overtime, and Riel totals',                      icon: Calculator,     run: () => window.dispatchEvent(new CustomEvent('ot-calculator:open')) },
    { key: 'dictionary', featureKey: 'jobDictionary',     label: 'Khmer Job Dictionary',          desc: 'Look up Khmer workplace, factory, and office terms',             icon: BookOpen,       run: () => window.dispatchEvent(new CustomEvent('job-dictionary:open')) },
    { key: 'calendar',   featureKey: 'khmerCalendar',     label: 'Khmer Calendar Converter',      desc: 'Convert Khmer dates to Gregorian and Buddhist Era',              icon: CalendarDays,   run: dispatchOpen('khmer-calendar:open') },
    { key: 'phrases',    featureKey: 'khmerPhrasebank',   label: 'Khmer Phrasebank',              desc: 'Common workplace phrases in Khmer with pronunciation',          icon: Sparkles,       run: () => window.dispatchEvent(new CustomEvent('khmer-phrasebank:open')) },
    { key: 'riel',       featureKey: 'rielFormatter',     label: 'Khmer Riel Formatter',          desc: 'Format KHR with Khmer numerals and USD conversion',              icon: Currency,       run: () => window.dispatchEvent(new CustomEvent('riel-formatter:open')) },
    { key: 'numbers',    featureKey: 'numberWords',       label: 'Khmer Number to Words',         desc: 'Convert numbers to written Khmer',                               icon: Type,           run: () => window.dispatchEvent(new CustomEvent('number-words:open')) },
    { key: 'leave',      featureKey: 'leaveCalculator',   label: 'Leave Entitlements Calculator', desc: 'Cambodia annual + sick leave balance (Labour Law)',              icon: Shield,         run: () => window.dispatchEvent(new CustomEvent('leave-calculator:open')) },
    { key: 'probation',  featureKey: 'probationTracker',  label: 'Probation Tracker',             desc: 'Track your 3-month probation evaluation',                        icon: TrendingUp,     run: () => window.dispatchEvent(new CustomEvent('probation-tracker:open')) },
    { key: 'tips',       featureKey: 'workplaceTips',     label: 'Khmer Workplace Tips',          desc: 'Workplace culture, etiquette, and HR guidance',                  icon: Lightbulb,      run: () => window.dispatchEvent(new CustomEvent('workplace-tips:open')) },
    { key: 'themes',     featureKey: 'themes',            label: 'Chat Themes',                   desc: 'Switch between Midnight, Ocean, Forest, Sunset, and Minimal',     icon: Palette,        run: () => window.dispatchEvent(new CustomEvent('themes:open')) },
    { key: 'search',     featureKey: 'chatSearch',        label: 'Search Chats (Ctrl+K)',         desc: 'Find any message across conversations',                          icon: Command,        run: () => window.dispatchEvent(new CustomEvent('chat-search:open')) },
    { key: 'stats',      featureKey: 'chatStats',         label: 'Chat Statistics',               desc: 'See your usage, top messages, and token totals',                 icon: BarChart2,      run: () => window.dispatchEvent(new CustomEvent('chat-stats:open')) },
  ];

  const enabledTools = tools.filter(t => isFeatureEnabled(t.featureKey));

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 md:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Tools"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className={`relative w-full max-w-4xl max-h-[90vh] rounded-2xl md:rounded-3xl shadow-2xl overflow-hidden flex flex-col ${settings.theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'}`}>
        <div className={`flex items-center justify-between p-4 md:p-6 border-b ${settings.theme === 'dark' ? 'border-gray-800' : 'border-gray-200'}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <Wrench className="w-5 h-5 md:w-6 md:h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg md:text-2xl font-bold">Tools</h2>
              <p className={`text-xs md:text-sm ${settings.theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                {enabledTools.length} {enabledTools.length === 1 ? 'tool' : 'tools'} enabled for your account
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`w-9 h-9 md:w-10 md:h-10 rounded-lg flex items-center justify-center transition-colors ${settings.theme === 'dark' ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}
            aria-label="Close tools"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          {enabledTools.length === 0 ? (
            <div className={`text-center py-12 ${settings.theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
              <Clock className="w-10 h-10 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No tools are enabled for your account yet.</p>
              <p className="text-xs mt-1">Ask your admin to enable Khmer workplace tools.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
              {enabledTools.map((tool) => {
                const Icon = tool.icon;
                return (
                  <button
                    key={tool.key}
                    onClick={tool.run}
                    className={`group flex flex-col items-start gap-2 p-4 rounded-xl text-left transition-all duration-200 hover:-translate-y-0.5 ${
                      settings.theme === 'dark'
                        ? 'bg-gray-800/60 hover:bg-gray-800 border border-gray-700/50 hover:border-gray-600 hover:shadow-lg hover:shadow-black/30'
                        : 'bg-white hover:bg-gray-50 border border-gray-200 hover:border-gray-300 hover:shadow-lg hover:shadow-black/10'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${settings.theme === 'dark' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className={`text-sm md:text-base font-semibold ${settings.theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {tool.label}
                      </h3>
                      <p className={`text-xs mt-0.5 leading-relaxed ${settings.theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                        {tool.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
