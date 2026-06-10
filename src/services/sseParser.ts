import type { StreamCallbacks } from './aiService';

interface SSEParseOptions {
  /** Extract the content string from a parsed JSON data object. */
  extractContent: (data: unknown) => string;
  /** Optional AbortSignal to cancel the stream. */
  signal?: AbortSignal;
}

interface NDJSONParseOptions extends SSEParseOptions {
  /** Return true when the stream signals completion (e.g. Ollama `data.done`). */
  isDone: (data: unknown) => boolean;
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
        try {
          const data = JSON.parse(jsonStr);
          const content = extractContent(data);
          if (content) {
            fullContent += content;
            callbacks.onChunk(content);
          }
        } catch {
          // Silently skip unparseable chunks.
        }
      }
    }
  };

  try {
    while (true) {
      if (signal?.aborted) {
        reader.cancel();
        break;
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
  } finally {
    callbacks.onComplete(fullContent);
  }
}

/**
 * Shared NDJSON stream parser for Ollama.
 */
export async function parseNDJSONStream(
  response: Response,
  callbacks: StreamCallbacks,
  options: NDJSONParseOptions
): Promise<void> {
  const reader = response.body?.getReader();
  if (!reader) throw new Error('ReadableStream not supported');

  const { extractContent, isDone, signal } = options;
  let fullContent = '';
  const decoder = new TextDecoder();
  let buffer = '';
  let completed = false;

  const processLines = (lines: string[]) => {
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      try {
        const data = JSON.parse(trimmedLine);
        const content = extractContent(data);
        if (content) {
          fullContent += content;
          callbacks.onChunk(content);
        }
        if (isDone(data)) {
          completed = true;
        }
      } catch {
        // Silently skip unparseable chunks.
      }
    }
  };

  try {
    while (true) {
      if (signal?.aborted) {
        reader.cancel();
        break;
      }

      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      processLines(lines);
      if (completed) break;
    }

    if (!completed && buffer.trim()) {
      processLines([buffer]);
    }
  } finally {
    callbacks.onComplete(fullContent);
  }
}
