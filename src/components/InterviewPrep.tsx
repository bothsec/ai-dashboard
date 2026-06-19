import { memo, useState } from 'react';
import { X, ChevronDown, ChevronUp, Lightbulb, Sparkles, Briefcase } from 'lucide-react';
import { INTERVIEW_QUESTIONS, INTERVIEW_CATEGORIES, INDUSTRIES, type InterviewQuestion } from '../data/interviewPrepData';

interface Props {
  onClose: () => void;
  onAskAI: (question: string, tips: string[]) => void;
}

const CategoryTabs = memo(({ active, onSelect }: { active: string; onSelect: (c: string) => void }) => (
  <div className="flex gap-1 flex-wrap mb-4">
    {INTERVIEW_CATEGORIES.map(cat => (
      <button
        key={cat}
        onClick={() => onSelect(cat)}
        className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
          active === cat
            ? 'bg-indigo-600 text-white'
            : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-700'
        }`}
      >
        {cat}
      </button>
    ))}
  </div>
));

const QuestionCard = memo(({ q, khLang }: { q: InterviewQuestion; khLang: boolean }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`rounded-xl border transition-colors ${expanded ? 'border-indigo-500/40 bg-indigo-500/5' : 'border-zinc-700/50 bg-zinc-800/30 hover:border-zinc-600'}`}>
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-start gap-3 p-4 text-left"
      >
        <span className="mt-0.5 shrink-0 text-indigo-400">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium leading-snug text-zinc-200">
            {khLang ? q.kh : q.en}
          </p>
          {!expanded && (
            <p className="text-xs text-zinc-500 mt-1 truncate">{q.tips[0]}</p>
          )}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 pl-11 space-y-3">
          <div className="flex gap-2 text-xs text-zinc-500">
            <span className="font-medium text-indigo-400">{q.en}</span>
            <span>•</span>
            <span>{q.kh}</span>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-medium text-amber-400">
              <Lightbulb className="w-3.5 h-3.5" />
              {khLang ? 'Tips' : 'Tips for answering'}
            </div>
            {q.tips.map((tip, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-amber-500 mt-1 text-xs">•</span>
                <p className="text-xs text-zinc-300 leading-relaxed">{tip}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

export const InterviewPrep = memo(({ onClose, onAskAI }: Props) => {
  const [activeCategory, setActiveCategory] = useState('All');
  const [activeIndustry, setActiveIndustry] = useState('all');
  const [khLang, setKhLang] = useState(false);

  const filtered = INTERVIEW_QUESTIONS.filter(q => {
    const matchCat = activeCategory === 'All' || q.category === activeCategory;
    const matchInd = activeIndustry === 'all' || q.industry === activeIndustry;
    return matchCat && matchInd;
  });

  const handleAskAI = () => {
    const questions = filtered.map(q => `- ${q.en}`).join('\n');
    const tips = filtered.flatMap(q => q.tips).join('\n');
    const prompt = khLang
      ? `Help me practice for a Cambodian job interview. Here are the questions I might face:\n\n${questions}\n\nTips for these questions:\n${tips}\n\nPlease act as an interviewer and ask me one question at a time. After I answer, give me feedback on my answer.`
      : `Help me practice for a Cambodian job interview. Here are the questions I might face:\n\n${questions}\n\nTips for these questions:\n${tips}\n\nPlease act as an interviewer and ask me one question at a time. After I answer, give me feedback on my answer.`;
    onAskAI(prompt, filtered.flatMap(q => q.tips));
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-lg max-h-[85vh] flex flex-col shadow-2xl">

        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-700/50 shrink-0">
          <div>
            <h2 className="text-sm font-semibold text-zinc-200">Interview Prep</h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Cambodia Job Market • {filtered.length} questions
              {activeIndustry !== 'all' && ` • ${INDUSTRIES.find(i => i.id === activeIndustry)?.icon} ${INDUSTRIES.find(i => i.id === activeIndustry)?.label}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setKhLang(k => !k)}
              className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-colors ${khLang ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-zinc-200'}`}
            >
              {khLang ? 'EN' : 'KH'}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {/* Industry track selector */}
          <div className="flex items-center gap-2 mb-1">
            <Briefcase className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
              {INDUSTRIES.map(ind => (
                <button
                  key={ind.id}
                  onClick={() => setActiveIndustry(ind.id)}
                  className={`shrink-0 px-2 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap transition-colors ${
                    activeIndustry === ind.id
                      ? 'bg-emerald-600 text-white'
                      : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-700'
                  }`}
                >
                  {ind.icon} {ind.label}
                </button>
              ))}
            </div>
          </div>

          <CategoryTabs active={activeCategory} onSelect={setActiveCategory} />

          {filtered.map(q => (
            <QuestionCard key={q.id} q={q} khLang={khLang} />
          ))}

          {filtered.length === 0 && (
            <p className="text-sm text-zinc-500 text-center py-8">No questions in this category.</p>
          )}
        </div>

        <div className="px-5 py-3 border-t border-zinc-700/50 shrink-0 space-y-2">
          <button
            onClick={handleAskAI}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            {khLang ? 'សន្ទនាជាមួយAI' : 'Practice with AI Interviewer'}
          </button>
          <p className="text-xs text-zinc-500 text-center">
            Tap a question to expand tips • {filtered.length} questions shown
          </p>
        </div>
      </div>
    </div>
  );
});