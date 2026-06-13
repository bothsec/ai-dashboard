import type { AIService, StreamCallbacks } from './aiService';
import type { Message, Settings } from '../types/chat';
import { parseSSEStream } from './sseParser';
import { withRetry } from './retry';

export class ChatService implements AIService {
  async generateStream(
    messages: Message[],
    _settings: Settings,
    callbacks: StreamCallbacks,
    signal?: AbortSignal
  ): Promise<void> {
    try {
      await withRetry(
        async () => {
          // Call our server-side /api/chat endpoint which hides the model name
          // The server adds the model and forwards to NVIDIA
          const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            signal,
            body: JSON.stringify({
              messages: messages.map(({ role, content }) => ({ role, content })),
            }),
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            const errorMessage = errorData?.error?.message || response.statusText;
            throw new Error(`Chat API Error (${response.status}): ${errorMessage}`);
          }

          await parseSSEStream(response, callbacks, {
            extractContent: (data: unknown) => {
              const d = data as { choices?: Array<{ delta?: { content?: string } }> };
              return d.choices?.[0]?.delta?.content || '';
            },
          });
        },
        {
          maxRetries: 3,
          baseDelay: 1000,
          onRetry: (attempt, error) => {
            console.warn(`Retry ${attempt}/3:`, error.message);
            callbacks.onError(new Error(`Retrying... (${attempt}/3)`));
          },
        }
      );
    } catch (error) {
      callbacks.onError(error instanceof Error ? error : new Error('Unknown error'));
    }
  }
}