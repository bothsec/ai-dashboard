import type { StreamCallbacks } from './aiService';

interface SSEParseOptions {
  /** Extract the content string from a parsed JSON data object. */
  extractContent: (data: unknown) => string;
  /** Optional AbortSignal to cancel the stream. */
  signal?: AbortSignal;
}

/**
 * Shared SSE stream parser for OpenAI, Anthropic, and NVIDIA services.
 */
export async function parseSSEStream(
  response: Response,
  callbacks: StreamCallbacks,
  options: SSEParseOptions
): Promise<void> {
  const reader = response.body?.getReader();
  if (!reader) throw new Error('ReadableStream not supported');

  const { extractContent, signal } = options;
  let fullContent = '';
  const decoder = new TextDecoder();
  let buffer = '';

  const processLines = (lines: string[]) => {
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine || trimmedLine === 'data: [DONE]' || trimmedLine.startsWith('event:')) {
        continue;
      }

      if (trimmedLine.startsWith('data: ')) {
        const jsonStr = trimmedLine.slice(6);
        let data: unknown;
        try {
          data = JSON.parse(jsonStr);
        } catch {
          // Skip malformed JSON — don't crash the stream
          console.warn('[sseParser] Skipping malformed JSON:', jsonStr.slice(0, 80));
          continue;
        }
        const content = extractContent(data);
        if (content) {
          fullContent += content;
          callbacks.onChunk(content);
        }
      }
    }
  };

  while (true) {
      if (signal?.aborted) {
        reader.cancel();
        break;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { done, value } = await (reader.read as any)({ signal });
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      processLines(lines);
    }

    // Process final buffer if not empty
    if (buffer.trim()) {
      processLines([buffer]);
    }
    
    // Call onComplete only after successful stream exhaustion
    callbacks.onComplete(fullContent);
  }