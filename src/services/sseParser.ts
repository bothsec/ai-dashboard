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
    // Check HTTP status before attempting to read the body
    if (!response.ok) {
      const bodyText = await response.text().catch(() => '');
      callbacks.onError?.(new Error(`HTTP ${response.status}: ${response.statusText}${bodyText ? ` — ${bodyText}` : ''}`));
      return;
    }

    while (true) {
      if (signal?.aborted) {
        callbacks.onError?.(new Error('Stream aborted'));
        return;
      }

      const { done, value } = await reader.read();
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
    // Preserve original error stack and type — wrapping loses debugging info
    callbacks.onError?.(err instanceof Error ? err : new Error(String(err)));
  } finally {
    // Cancel the stream first, then release the lock
    try { await reader.cancel(); } catch { /* already cancelled */ }
    try { reader.releaseLock(); } catch { /* already released */ }
  }
}