import type { AIService, StreamCallbacks } from './aiService';
import type { Message, Settings } from '../types/chat';
import { parseNDJSONStream } from './sseParser';

export class OllamaService implements AIService {
  async generateStream(
    messages: Message[],
    settings: Settings,
    callbacks: StreamCallbacks
  ): Promise<void> {
    try {
      const baseUrl = settings.apiKeys.ollamaBaseUrl.replace(/\/$/, '');
      const response = await fetch(`${baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: settings.model.ollama,
          messages: messages.map(({ role, content }) => ({ role, content })),
          stream: true,
        }),
      });

      if (!response.ok) {
        const error = await response.text().catch(() => 'Ollama API error');
        throw new Error(error || 'Ollama API error');
      }

      await parseNDJSONStream(response, callbacks, {
        extractContent: (data: any) => data.message?.content || '',
        isDone: (data: any) => data.done,
      });
    } catch (error) {
      callbacks.onError(error instanceof Error ? error : new Error('Unknown error'));
    }
  }
}
