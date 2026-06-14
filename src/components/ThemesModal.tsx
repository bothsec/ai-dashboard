import { memo } from 'react';
import { X, Check } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import type { ChatTheme } from '../types/chat';

interface ThemeOption {
  id: ChatTheme;
  label: string;
  gradient: string;
  bg: string;
  surface: string;
  userBubble: string;
  aiBubble: string;
  border: string;
}

const THEME_OPTIONS: ThemeOption[] = [
  {
    id: 'default',
    label: 'Default',
    gradient: 'from-indigo-500 via-purple-500 to-pink-500',
    bg: 'bg-gradient-to-br from-gray-950 via-slate-900 to-indigo-950',
    surface: 'bg-gray-800/60',
    userBubble: 'bg-gradient-to-r from-indigo-600 to-violet-600',
    aiBubble: 'bg-gray-800/80',
    border: 'border-gray-700/50',
  },
  {
    id: 'midnight',
    label: 'Midnight',
    gradient: 'from-blue-600 via-indigo-600 to-purple-700',
    bg: 'bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950',
    surface: 'bg-blue-900/30',
    userBubble: 'bg-blue-600/90',
    aiBubble: 'bg-blue-950/60',
    border: 'border-blue-800/40',
  },
  {
    id: 'ocean',
    label: 'Ocean',
    gradient: 'from-cyan-500 via-teal-500 to-emerald-500',
    bg: 'bg-gradient-to-br from-slate-950 via-cyan-950 to-slate-950',
    surface: 'bg-cyan-900/30',
    userBubble: 'bg-cyan-600/90',
    aiBubble: 'bg-teal-950/60',
    border: 'border-cyan-800/40',
  },
  {
    id: 'forest',
    label: 'Forest',
    gradient: 'from-emerald-500 via-green-500 to-teal-500',
    bg: 'bg-gradient-to-br from-slate-950 via-green-950 to-slate-950',
    surface: 'bg-green-900/30',
    userBubble: 'bg-emerald-600/90',
    aiBubble: 'bg-green-950/60',
    border: 'border-green-800/40',
  },
  {
    id: 'sunset',
    label: 'Sunset',
    gradient: 'from-orange-500 via-rose-500 to-pink-500',
    bg: 'bg-gradient-to-br from-slate-950 via-orange-950 to-slate-950',
    surface: 'bg-orange-900/30',
    userBubble: 'bg-orange-600/90',
    aiBubble: 'bg-rose-950/60',
    border: 'border-orange-800/40',
  },
  {
    id: 'minimal',
    label: 'Minimal',
    gradient: 'from-gray-400 via-gray-500 to-gray-600',
    bg: 'bg-gradient-to-br from-gray-950 via-neutral-950 to-gray-950',
    surface: 'bg-neutral-800/40',
    userBubble: 'bg-neutral-700/90',
    aiBubble: 'bg-neutral-900/60',
    border: 'border-neutral-700/40',
  },
];

interface ThemesModalProps {
  onClose: () => void;
}

export const ThemesModal = memo(function ThemesModal({ onClose }: ThemesModalProps) {
  const { settings, setChatTheme } = useSettings();
  const currentTheme = settings.chatTheme;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Chat Themes"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        className={`relative w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl ${
          currentTheme === 'midnight' ? 'bg-slate-900/95 border border-blue-800/40' :
          currentTheme === 'ocean' ? 'bg-slate-900/95 border border-cyan-800/40' :
          currentTheme === 'forest' ? 'bg-slate-900/95 border border-green-800/40' :
          currentTheme === 'sunset' ? 'bg-slate-900/95 border border-orange-800/40' :
          currentTheme === 'minimal' ? 'bg-neutral-900/95 border border-neutral-700/40' :
          'bg-gray-900/95 border border-gray-700/50'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <h2 className="text-base font-semibold text-white">Chat Themes</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Theme grid */}
        <div className="p-4 grid grid-cols-3 gap-3">
          {THEME_OPTIONS.map((theme) => (
            <button
              key={theme.id}
              onClick={() => setChatTheme(theme.id)}
              className={`group relative flex flex-col items-center gap-2 p-2 rounded-xl transition-all ${
                currentTheme === theme.id
                  ? 'ring-2 ring-white/30 bg-white/5'
                  : 'hover:bg-white/5'
              }`}
              aria-pressed={currentTheme === theme.id}
            >
              {/* Preview bubble */}
              <div className={`w-full h-16 rounded-lg ${theme.bg} p-2 flex flex-col justify-end gap-1.5 shadow-inner`}>
                <div className={`h-3 w-2/3 rounded-full ${theme.userBubble} opacity-90`} />
                <div className={`h-3 w-1/2 rounded-full ${theme.aiBubble} opacity-70`} />
              </div>

              {/* Label + check */}
              <div className="flex items-center gap-1">
                <span className="text-xs font-medium text-gray-300 group-hover:text-white transition-colors">
                  {theme.label}
                </span>
                {currentTheme === theme.id && (
                  <Check className="w-3 h-3 text-white" aria-hidden="true" />
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Footer hint */}
        <div className="px-5 pb-4 pt-1">
          <p className="text-xs text-gray-500 text-center">
            Changes apply instantly to the chat area
          </p>
        </div>
      </div>
    </div>
  );
});