import type { AIService, StreamCallbacks } from './aiService';
import type { Message, Settings } from '../types/chat';
import { parseSSEStream } from './sseParser';
import { withRetry } from './retry';

export class OpenAIService implements AIService {
  async generateStream(
    messages: Message[],
    settings: Settings,
    callbacks: StreamCallbacks,
    signal?: AbortSignal
  ): Promise<void> {
    try {
      await withRetry(
        async () => {
          const response = await fetch('/api/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${settings.apiKeys.openai}`,
            },
            signal,
            body: JSON.stringify({
              model: settings.model.openai,
              messages: messages.map(({ role, content }) => ({ role, content })),
              stream: true,
            }),
          });

          if (!response.ok) {
            const error = await response.json().catch(() => ({ error: { message: 'OpenAI API error' } }));
            throw new Error(error.error?.message || 'OpenAI API error');
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
            console.warn(`OpenAI retry ${attempt}/3:`, error.message);
            callbacks.onError(new Error(`Retrying... (${attempt}/3)`));
          },
        }
      );
    } catch (error) {
      callbacks.onError(error instanceof Error ? error : new Error('Unknown error'));
    }
  }
}