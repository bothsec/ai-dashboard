import type { AIService, StreamCallbacks } from './aiService';
import type { Message, Settings } from '../types/chat';
import { parseSSEStream } from './sseParser';
import { withRetry } from './retry';

// In-memory auth token — not stored anywhere persistent (security: no localStorage exposure)
let _authToken: string | null = null;
export function setAuthToken(token: string | null) { _authToken = token; }
export function getAuthToken(): string | null { return _authToken; }

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
          const headers: Record<string, string> = {
            'Content-Type': 'application/json',
          };
          const token = getAuthToken();
          if (token) headers['Authorization'] = `Bearer ${token}`;

          const response = await fetch('/api/chat', {
            method: 'POST',
            headers,
            signal,
            body: JSON.stringify({
              messages: messages.map(({ role, content }) => ({ role, content })),
              model: _settings.model.api,
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
            signal,
          });
        },
        {
          maxRetries: 3,
          baseDelay: 1000,
          onRetry: (attempt, error) => {
            console.warn(`[chat] Retry ${attempt}/3:`, error.message);
            // Don't call callbacks.onError for retries — that's not an error state,
            // it's normal backoff. Calling it shows a confusing red "Retry" message.
          },
        }
      );
    } catch (error) {
      callbacks.onError(error instanceof Error ? error : new Error('Unknown error'));
    }
  }
}