import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Settings, AIProvider } from '../types/chat';

interface SettingsContextType {
  settings: Settings;
  updateSettings: (newSettings: Partial<Settings>) => void;
  updateApiKey: (provider: AIProvider, key: string) => void;
  updateModel: (provider: AIProvider, model: string) => void;
}

const DEFAULT_SETTINGS: Settings = {
  activeProvider: 'nvidia',
  apiKeys: {
    // API keys are NOT exposed to browser for security.
    // All requests go through server-side proxies that inject keys.
    openai: '',
    anthropic: '',
    nvidia: '',
  },
  model: {
    openai: (import.meta.env.VITE_OPENAI_MODEL || '') || (typeof window !== 'undefined' ? (window as any).__ENV?.OPENAI_MODEL || '' : '') || 'gpt-4o',
    anthropic: (import.meta.env.VITE_ANTHROPIC_MODEL || '') || (typeof window !== 'undefined' ? (window as any).__ENV?.ANTHROPIC_MODEL || '' : '') || 'claude-3-5-sonnet-20240620',
    nvidia: (import.meta.env.VITE_NVIDIA_MODEL || '') || (typeof window !== 'undefined' ? (window as any).__ENV?.NVIDIA_MODEL || '' : '') || 'minimaxai/minimax-m2.7',
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
          ...DEFAULT_SETTINGS,
          activeProvider: parsed.activeProvider ?? DEFAULT_SETTINGS.activeProvider,
          model: {
            ...DEFAULT_SETTINGS.model,
            ...(parsed.model || {}),
          },
        };
      } catch (e) {
        console.error('Failed to parse settings', e);
      }
    }
    return DEFAULT_SETTINGS;
  });

  // Only persist provider selection and model choices — never API keys
  useEffect(() => {
    const toSave = {
      activeProvider: settings.activeProvider,
      model: settings.model,
    };
    localStorage.setItem('ai-dashboard-settings', JSON.stringify(toSave));
  }, [settings]);

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
    <SettingsContext.Provider value={{ settings, updateSettings, updateApiKey, updateModel }}>
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
