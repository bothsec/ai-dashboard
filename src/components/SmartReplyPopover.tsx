import React, { memo, useEffect, useRef } from 'react';
import { MessageSquarePlus } from 'lucide-react';

type Category = 'Greetings' | 'Professional' | 'Apologies' | 'Agreements';

interface Template {
  en: string;
  kh: string;
}

const TEMPLATES: Record<Category, Template[]> = {
  Greetings: [
    { en: 'Hello! How are you today?', kh: 'ជំរាបសួរ! តើអ្នកសុខសប្បាយទេ?' },
    { en: 'Good morning! Hope you\'re doing well.', kh: 'ព្រឹកសួស្តី! សង្ឃឹមថាអ្នករាយប៉ាយល្អ។' },
    { en: 'Hi there! Nice to hear from you.', kh: 'សួស្តី! រីករាយដែលបានទទួលសារពីអ្នក។' },
    { en: 'Greetings! Hope this message finds you well.', kh: 'ជំរាបសួរ! សង្ឃឹមថាសារនេះនឹងជួបអ្នកក្នុងស្ថានភាពល្អ។' },
  ],
  Professional: [
    { en: 'Thank you for reaching out. I\'ll get back to you shortly.', kh: 'សូមអរគុណចំពោះការទំនាក់ទំនង។ ខ្ញុំនឹងឆ្លើយតបនាពេលឆាប់ៗ។' },
    { en: 'Please let me know if you need any further assistance.', kh: 'សូមប្រាប់ខ្ញុំប្រសិនបើអ្នកត្រូវការជំនួយបន្ថែម។' },
    { en: 'I appreciate your patience and understanding.', kh: 'ខ្ញុំស្រឡាញ់ការអត់ធ្មត់ និងការយោគយល់រស់អ្នក។' },
    { en: 'Could you please provide more details on this matter?', kh: 'តើអ្នកអាចផ្តល់ព័ត៌មានលំអិតបន្ថែមអំពីបញ្ហានេះបានទេ?' },
  ],
  Apologies: [
    { en: 'I sincerely apologize for the inconvenience caused.', kh: 'ខ្ញុំសូមរាជទាននូវការស្តីបនន្ទះចំពោះភាពមិនប្រក្សាបានបណ្តាលមកពីខ្ញុំ។' },
    { en: 'Sorry for the delay. I\'ll address this as soon as possible.', kh: 'សូមទោសចំពោះការយឺតយ៉ាវ។ ខ្ញុំនឹងដោះស្រាយបញ្ហានេះឱ្យបានលឿនតាមដែលអាចធ្វើទៅបាន។' },
    { en: 'I regret any confusion this may have caused.', kh: 'ខ្ញុំស្តីបនន្ទះចំពោះការភ័ស្ត៍ចម្រូងចម្រាស់ដែលអាចក តមាន។' },
    { en: 'Please accept my apologies for the oversight.', kh: 'សូមទទួលយកការស្តីបនន្ទះរបស់ខ្ញុំចំពោះកំហុស។' },
  ],
  Agreements: [
    { en: 'That sounds great! I agree with your proposal.', kh: 'វាហាក់ដូចជាល្អណាស់! ខ្ញុំឯកភាពជាមួយសំណើរបស់អ្នក។' },
    { en: 'I\'m happy to move forward with this plan.', kh: 'ខ្ញុំពេញចិត្តក្នុងការបន្តជាមួយផែនការនេះ។' },
    { en: 'That works for me. Let\'s proceed accordingly.', kh: 'វាដំណើរការសម្រាប់ខ្ញុំ។ ចូរយើងបន្តតាមគ្នា។' },
    { en: 'I fully agree. Thank you for your understanding.', kh: 'ខ្ញុំឯកភាពយ៉ាងពេញលេញ។ សូមអរគុណចំពោះការយោគយល់រ�ស់អ្នក។' },
  ],
};

const CATEGORY_KEYS = Object.keys(TEMPLATES) as Category[];

interface SmartReplyPopoverProps {
  onInsert: (text: string) => void;
  onClose: () => void;
  isDark: boolean;
}

export const SmartReplyPopover = memo(function SmartReplyPopover({ onInsert, onClose, isDark }: SmartReplyPopoverProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeCategory, setActiveCategory] = React.useState<Category>('Greetings');

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    // Delay to avoid immediate close on the same click that opened
    const timeout = setTimeout(() => document.addEventListener('mousedown', handler), 50);
    return () => {
      clearTimeout(timeout);
      document.removeEventListener('mousedown', handler);
    };
  }, [onClose]);

  return (
    <div
      ref={containerRef}
      className={`absolute bottom-full mb-2 right-0 w-80 sm:w-96 rounded-2xl shadow-2xl border overflow-hidden z-50 ${
        isDark
          ? 'bg-gray-900 border-gray-700/60'
          : 'bg-white border-gray-200'
      }`}
    >
      {/* Header */}
      <div className={`flex items-center justify-between px-4 py-3 border-b ${isDark ? 'border-gray-700/50' : 'border-gray-100'}`}>
        <div className="flex items-center gap-2">
          <MessageSquarePlus className={`w-4 h-4 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
          <span className={`text-sm font-semibold ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>
            Smart Reply
          </span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${isDark ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-700'}`}>
            EN · ខ្មែរ
          </span>
        </div>
        <button
          onClick={onClose}
          className={`p-1 rounded-lg transition-colors ${isDark ? 'text-gray-500 hover:text-gray-300 hover:bg-gray-700/50' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
          aria-label="Close smart reply"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M1 1l12 12M13 1L1 13" />
          </svg>
        </button>
      </div>

      {/* Category tabs */}
      <div className={`flex gap-1 px-3 pt-3 pb-1 ${isDark ? 'border-b border-gray-700/40' : 'border-b border-gray-100'}`}>
        {CATEGORY_KEYS.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeCategory === cat
                ? isDark
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  : 'bg-amber-50 text-amber-700 border border-amber-200'
                : isDark
                  ? 'text-gray-500 hover:text-gray-300 hover:bg-gray-800'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Template list */}
      <div className="max-h-72 overflow-y-auto p-2 space-y-1">
        {TEMPLATES[activeCategory].map((template, i) => (
          <button
            key={i}
            onClick={() => { onInsert(template.en); onClose(); }}
            className={`w-full text-left px-3 py-2.5 rounded-xl transition-all group ${
              isDark
                ? 'hover:bg-gray-800/80 active:bg-gray-700/60'
                : 'hover:bg-gray-50 active:bg-gray-100'
            }`}
          >
            <p className={`text-sm leading-snug ${isDark ? 'text-gray-200 group-hover:text-white' : 'text-gray-800 group-hover:text-gray-900'}`}>
              {template.en}
            </p>
            <p className={`text-xs mt-0.5 leading-relaxed ${isDark ? 'text-gray-500 group-hover:text-gray-400' : 'text-gray-400 group-hover:text-gray-500'}`}>
              {template.kh}
            </p>
          </button>
        ))}
      </div>

      {/* Footer hint */}
      <div className={`px-4 py-2 text-center text-[10px] ${isDark ? 'text-gray-600 border-t border-gray-800' : 'text-gray-400 border-t border-gray-50'}`}>
        Click any template to insert it into the chat
      </div>
    </div>
  );
});