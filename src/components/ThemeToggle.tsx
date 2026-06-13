import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';

export const ThemeToggle: React.FC = () => {
  const { settings, toggleTheme } = useSettings();

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-lg hover:bg-[var(--bg-hover)] transition-colors"
      title={`Switch to ${settings.theme === 'dark' ? 'light' : 'dark'} mode`}
      style={{ color: 'var(--text-secondary)' }}
    >
      {settings.theme === 'dark' ? (
        <Sun className="w-5 h-5" />
      ) : (
        <Moon className="w-5 h-5" />
      )}
    </button>
  );
};