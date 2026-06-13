export type AIProvider = 'openai' | 'anthropic' | 'nvidia';

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

export interface Chat {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  provider: AIProvider;
}

export type Theme = 'dark' | 'light'

export interface Settings {
  theme: Theme;
  activeProvider: AIProvider;
  apiKeys: {
    openai: string;
    anthropic: string;
    nvidia: string;
  };
  model: {
    openai: string;
    anthropic: string;
    nvidia: string;
  };
}

export interface ChatState {
  chats: Chat[];
  activeChatId: string | null;
  isStreaming: boolean;
  error: string | null;
}
