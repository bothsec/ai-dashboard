/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Settings, AIProvider, Theme } from '../types/chat';

/** Get model from VITE env or fallback. Server-injected window.__ENV was removed. */
const getModel = (envKey: string, fallback: string): string =>
  import.meta.env[envKey] || fallback;

interface SettingsContextType {
  settings: Settings;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  updateSettings: (newSettings: Partial<Settings>) => void;
  updateApiKey: (provider: AIProvider, key: string) => void;
  updateModel: (provider: AIProvider, model: string) => void;
}

const defaultSettings: Settings = {
  theme: 'dark',
  activeProvider: 'api',
  apiKeys: {
    openai: '',
    anthropic: '',
    api: '',
  },
  model: {
    openai: getModel('VITE_OPENAI_MODEL', 'gpt-4o'),
    anthropic: getModel('VITE_ANTHROPIC_MODEL', 'claude-3-5-sonnet-20240620'),
    api: getModel('VITE_API_MODEL_DEFAULT', ''),
  },
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<Settings>(() => {
    const saved = localStorage.getItem('ai-dashboard-settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          ...defaultSettings,
          theme: (parsed.theme as Theme) || defaultSettings.theme,
          activeProvider: parsed.activeProvider ?? defaultSettings.activeProvider,
          model: {
            ...defaultSettings.model,
            ...(parsed.model || {}),
          },
        };
      } catch {
        // Corrupted settings — use defaults silently
      }
    }
    return defaultSettings;
  });

  // Apply theme to document
  useEffect(() => {
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(settings.theme);
  }, [settings.theme]);

  // Persist theme and settings — never persist API keys
  useEffect(() => {
    const toSave = {
      theme: settings.theme,
      activeProvider: settings.activeProvider,
      model: settings.model,
    };
    localStorage.setItem('ai-dashboard-settings', JSON.stringify(toSave));
  }, [settings]);

  const setTheme = (theme: Theme) => {
    setSettings((prev) => ({ ...prev, theme }));
  };

  const toggleTheme = () => {
    setSettings((prev) => ({ ...prev, theme: prev.theme === 'dark' ? 'light' : 'dark' }));
  };

  const updateSettings = (newSettings: Partial<Settings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  };

  const updateApiKey = (provider: AIProvider, key: string) => {
    setSettings((prev) => ({
      ...prev,
      apiKeys: { ...prev.apiKeys, [provider]: key },
    }));
  };

  const updateModel = (provider: AIProvider, model: string) => {
    setSettings((prev) => ({
      ...prev,
      model: { ...prev.model, [provider]: model },
    }));
  };

  return (
    <SettingsContext.Provider
      value={{ settings, setTheme, toggleTheme, updateSettings, updateApiKey, updateModel }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};