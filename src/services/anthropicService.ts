import type { AIService, StreamCallbacks } from './aiService';
import type { Message, Settings } from '../types/chat';
import { parseSSEStream } from './sseParser';
import { withRetry } from './retry';

export class AnthropicService implements AIService {
  async generateStream(
    messages: Message[],
    settings: Settings,
    callbacks: StreamCallbacks,
    signal?: AbortSignal
  ): Promise<void> {
    try {
      await withRetry(
        async () => {
          const response = await fetch('/api/anthropic/v1/messages', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': settings.apiKeys.anthropic,
              'anthropic-version': '2023-06-01',
              'dangerously-allow-browser': 'true',
            },
            signal,
            body: JSON.stringify({
              model: settings.model.anthropic,
              messages: messages.map(({ role, content }) => ({ role, content })),
              max_tokens: 4096,
              stream: true,
            }),
          });

          if (!response.ok) {
            const error = await response.json().catch(() => ({ error: { message: 'Anthropic API error' } }));
            throw new Error(error.error?.message || 'Anthropic API error');
          }

          await parseSSEStream(response, callbacks, {
            extractContent: (data: unknown) => {
            const d = data as { type?: string; delta?: { text?: string } };
            return d?.type === 'content_block_delta' ? d.delta?.text || '' : '';
          },
          });
        },
        {
          maxRetries: 3,
          baseDelay: 1000,
          onRetry: (attempt, error) => {
            console.warn(`Anthropic retry ${attempt}/3:`, error.message);
            callbacks.onError(new Error(`Retrying... (${attempt}/3)`));
          },
        }
      );
    } catch (error) {
      callbacks.onError(error instanceof Error ? error : new Error('Unknown error'));
    }
  }
}