export type AIProvider = 'openai' | 'anthropic' | 'ollama' | 'nvidia';

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

export interface Settings {
  activeProvider: AIProvider;
  apiKeys: {
    openai: string;
    anthropic: string;
    nvidia: string;
    ollamaBaseUrl: string;
  };
  model: {
    openai: string;
    anthropic: string;
    nvidia: string;
    ollama: string;
  };
}

export interface ChatState {
  chats: Chat[];
  activeChatId: string | null;
  isStreaming: boolean;
  error: string | null;
}
