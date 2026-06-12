import type { AIService, StreamCallbacks } from './aiService';
import type { Message, Settings } from '../types/chat';
import { parseSSEStream } from './sseParser';
import { withRetry } from './retry';

export class NvidiaService implements AIService {
  async generateStream(
    messages: Message[],
    settings: Settings,
    callbacks: StreamCallbacks,
    signal?: AbortSignal
  ): Promise<void> {
    try {
      await withRetry(
        async () => {
          const response = await fetch('/api/nvidia/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'text/event-stream',
              // Auth is injected by the Vite dev proxy (server-side) — never sent from browser
            },
            signal,
            body: JSON.stringify({
              model: settings.model.nvidia,
              messages: messages.map(({ role, content }) => ({ role, content })),
              stream: true,
            }),
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            const errorMessage = errorData?.detail || errorData?.error?.message || response.statusText;
            throw new Error(`NVIDIA API Error (${response.status}): ${errorMessage}`);
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
            console.warn(`NVIDIA retry ${attempt}/3:`, error.message);
            callbacks.onError(new Error(`Retrying... (${attempt}/3)`));
          },
        }
      );
    } catch (error) {
      callbacks.onError(error instanceof Error ? error : new Error('Unknown error'));
    }
  }
}