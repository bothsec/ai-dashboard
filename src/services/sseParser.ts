import type { StreamCallbacks } from './aiService';

interface SSEParseOptions {
  /** Extract the content string from a parsed JSON data object. */
  extractContent: (data: unknown) => string;
  /** Optional AbortSignal to cancel the stream. */
  signal?: AbortSignal;
}

/**
 * Shared SSE stream parser for OpenAI, Anthropic, and NVIDIA services.
 * Handles SSE protocol with JSON data frames, [DONE] markers, and event lines.
 */
export async function parseSSEStream(
  response: Response,
  callbacks: StreamCallbacks,
  options: SSEParseOptions
): Promise<void> {
  const reader = response.body?.getReader();
  if (!reader) {
    callbacks.onError?.(new Error('ReadableStream not supported'));
    return;
  }

  const { extractContent, signal } = options;
  let fullContent = '';
  const decoder = new TextDecoder();
  let buffer = '';

  const processLines = (lines: string[]) => {
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine || trimmedLine === 'data: [DONE]') continue;
      if (trimmedLine.startsWith('event:')) continue;

      if (trimmedLine.startsWith('data: ')) {
        const jsonStr = trimmedLine.slice(6);
        let data: unknown;
        try {
          data = JSON.parse(jsonStr);
        } catch {
          // Skip malformed JSON — don't crash the stream
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

  try {
    while (true) {
      if (signal?.aborted) break;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { done, value } = await (reader.read as unknown as (options?: { signal?: AbortSignal }) => Promise<{ done: boolean; value?: Uint8Array }>)({ signal });
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

    callbacks.onComplete(fullContent);
  } catch (err) {
    callbacks.onError?.(new Error(err instanceof Error ? err.message : 'Stream read error'));
  } finally {
    // Always release the reader lock so the stream can be GC'd
    try { reader.releaseLock(); } catch { /* already released */ }
  }
}