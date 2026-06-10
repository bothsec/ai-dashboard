import type { AIService, StreamCallbacks } from './aiService';
import type { Message, Settings } from '../types/chat';
import { parseSSEStream } from './sseParser';

export class NvidiaService implements AIService {
  async generateStream(
    messages: Message[],
    settings: Settings,
    callbacks: StreamCallbacks
  ): Promise<void> {
    try {
      const response = await fetch('/api/nvidia/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
          'Authorization': `Bearer ${settings.apiKeys.nvidia}`,
        },
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
        extractContent: (data: any) => data.choices[0]?.delta?.content || '',
      });
    } catch (error) {
      callbacks.onError(error instanceof Error ? error : new Error('Unknown error'));
    }
  }
}
