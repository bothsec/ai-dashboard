import type { AIService, StreamCallbacks } from './aiService';
import type { Message, Settings } from '../types/chat';
import { parseSSEStream } from './sseParser';

export class OpenAIService implements AIService {
  async generateStream(
    messages: Message[],
    settings: Settings,
    callbacks: StreamCallbacks
  ): Promise<void> {
    try {
      const response = await fetch('/api/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${settings.apiKeys.openai}`,
        },
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
        extractContent: (data: any) => data.choices[0]?.delta?.content || '',
      });
    } catch (error) {
      callbacks.onError(error instanceof Error ? error : new Error('Unknown error'));
    }
  }
}
