import { memo, useEffect } from 'react';
import { X, Command, CornerDownLeft, Slash, ArrowLeft } from 'lucide-react';

interface ShortcutsModalProps {
  onClose: () => void;
}

interface ShortcutItem {
  keys: React.ReactNode[];
  description: string;
}

const shortcuts: ShortcutItem[] = [
  {
    keys: [<Command className="w-3.5 h-3.5" />, <span>N</span>],
    description: 'New chat',
  },
  {
    keys: [<Command className="w-3.5 h-3.5" />, <span>K</span>],
    description: 'Search chats',
  },
  {
    keys: [<CornerDownLeft className="w-3.5 h-3.5" />],
    description: 'Send message',
  },
  {
    keys: [<span>Shift</span>, <CornerDownLeft className="w-3.5 h-3.5" />],
    description: 'New line in input',
  },
  {
    keys: [<span>Tab</span>],
    description: 'Focus input',
  },
  {
    keys: [<span>Esc</span>],
    description: 'Cancel streaming / close panels',
  },
  {
    keys: [<span>?</span>],
    description: 'Show keyboard shortcuts',
  },
  {
    keys: [<Slash className="w-3.5 h-3.5" />],
    description: 'Type /new, /clear, or /export in chat',
  },
  {
    keys: [<span>Click</span>, <ArrowLeft className="w-3 h-3" />],
    description: 'Edit last message',
  },
];

export const ShortcutsModal = memo(function ShortcutsModal({ onClose }: ShortcutsModalProps) {
  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="relative w-full max-w-sm bg-gray-900 border border-gray-700/50 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700/50">
          <h2 className="text-sm font-semibold text-gray-200">Keyboard Shortcuts</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-gray-800 transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Shortcuts list */}
        <div className="p-4 grid grid-cols-1 gap-1">
          {shortcuts.map((item, i) => (
            <div
              key={i}
              className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-gray-800/50 transition-colors"
            >
              <span className="text-xs text-gray-400">{item.description}</span>
              <div className="flex items-center gap-1">
                {item.keys.map((key, j) => (
                  <span
                    key={j}
                    className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 rounded bg-gray-800 border border-gray-700/60 text-[11px] font-mono text-gray-300"
                  >
                    {key}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="px-5 pb-4">
          <p className="text-[10px] text-gray-600 text-center">
            Press <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-gray-800 border border-gray-700/60 text-[10px] font-mono text-gray-400">?</span> anytime to open this panel
          </p>
        </div>
      </div>
    </div>
  );
});