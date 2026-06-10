import type { AIService, StreamCallbacks } from './aiService';
import type { Message, Settings } from '../types/chat';
import { parseSSEStream } from './sseParser';

export class AnthropicService implements AIService {
  async generateStream(
    messages: Message[],
    settings: Settings,
    callbacks: StreamCallbacks
  ): Promise<void> {
    try {
      const response = await fetch('/api/anthropic/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': settings.apiKeys.anthropic,
          'anthropic-version': '2023-06-01',
          'dangerously-allow-browser': 'true',
        },
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
        extractContent: (data: any) => 
          data.type === 'content_block_delta' ? data.delta?.text || '' : '',
      });
    } catch (error) {
      callbacks.onError(error instanceof Error ? error : new Error('Unknown error'));
    }
  }
}
