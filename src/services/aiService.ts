import type { Message, Settings } from '../types/chat';

export interface StreamCallbacks {
  onChunk: (chunk: string) => void;
  onComplete: (fullContent: string) => void;
  onError: (error: Error) => void;
}

export interface AIService {
  generateStream(
    messages: Message[],
    settings: Settings,
    callbacks: StreamCallbacks,
    signal?: AbortSignal
  ): Promise<void>;
}
