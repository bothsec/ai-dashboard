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
    openai: import.meta.env.VITE_OPENAI_API_KEY || '',
    anthropic: import.meta.env.VITE_ANTHROPIC_API_KEY || '',
    nvidia: import.meta.env.VITE_NVIDIA_API_KEY || '',
    ollamaBaseUrl: import.meta.env.VITE_OLLAMA_BASE_URL || 'http://localhost:11434',
  },
  model: {
    openai: import.meta.env.VITE_OPENAI_MODEL || 'gpt-4o',
    anthropic: import.meta.env.VITE_ANTHROPIC_MODEL || 'claude-3-5-sonnet-20240620',
    nvidia: import.meta.env.VITE_NVIDIA_MODEL || 'nvidia/llama-3.1-405b-instruct',
    ollama: import.meta.env.VITE_OLLAMA_MODEL || 'llama3',
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
    setSettings((prev) => {
      if (provider === 'ollama') {
        return { ...prev, apiKeys: { ...prev.apiKeys, ollamaBaseUrl: key } };
      }
      return { ...prev, apiKeys: { ...prev.apiKeys, [provider]: key } };
    });
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
