export type AIProvider = 'openai' | 'anthropic' | 'api';

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

export type ChatTheme = 'default' | 'midnight' | 'ocean' | 'forest' | 'sunset' | 'minimal'

export interface Settings {
  theme: Theme;
  chatTheme: ChatTheme;
  activeProvider: AIProvider;
  apiKeys: {
    openai: string;
    anthropic: string;
    api: string;
  };
  model: {
    openai: string;
    anthropic: string;
    api: string;
  };
}

export interface ChatState {
  chats: Chat[];
  activeChatId: string | null;
  isStreaming: boolean;
  streamingMessageId: string | null;
  tokensPerSecond: number;
  error: string | null;
}
