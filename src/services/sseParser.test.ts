import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { parseSSEStream } from './sseParser'

const mockOnChunk = vi.fn()
const mockOnComplete = vi.fn()
const mockOnError = vi.fn()

describe('parseSSEStream', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  const createMockResponse = (text: string): Response => {
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(text))
        controller.close()
      },
    })
    return new Response(stream, { status: 200 })
  }

  it('should parse SSE stream and extract content via extractContent', async () => {
    const sseData = 'data: {"choices":[{"delta":{"content":"Hello"}}]}\n'
    const response = createMockResponse(sseData)

    await parseSSEStream(
      response,
      {
        onChunk: mockOnChunk,
        onComplete: mockOnComplete,
        onError: mockOnError,
      },
      {
        extractContent: (data: unknown) => {
          const d = data as { choices?: Array<{ delta?: { content?: string } }> }
          return d.choices?.[0]?.delta?.content || ''
        },
      }
    )

    expect(mockOnChunk).toHaveBeenCalledWith('Hello')
    expect(mockOnComplete).toHaveBeenCalledWith('Hello')
    expect(mockOnError).not.toHaveBeenCalled()
  })

  it('should skip malformed JSON without crashing', async () => {
    const sseData = 'data: not-valid-json\ndata: {"choices":[{"delta":{"content":"Hi"}}]}\n'
    const response = createMockResponse(sseData)

    await parseSSEStream(
      response,
      {
        onChunk: mockOnChunk,
        onComplete: mockOnComplete,
        onError: mockOnError,
      },
      {
        extractContent: (data: unknown) => {
          const d = data as { choices?: Array<{ delta?: { content?: string } }> }
          return d.choices?.[0]?.delta?.content || ''
        },
      }
    )

    // Only the valid JSON line should produce a chunk
    expect(mockOnChunk).toHaveBeenCalledWith('Hi')
    expect(mockOnComplete).toHaveBeenCalledWith('Hi')
  })

  it('should skip lines that are empty or just whitespace', async () => {
    const sseData = '\n\n   \ndata: {"choices":[{"delta":{"content":"A"}}]}\n'
    const response = createMockResponse(sseData)

    await parseSSEStream(
      response,
      {
        onChunk: mockOnChunk,
        onComplete: mockOnComplete,
        onError: mockOnError,
      },
      {
        extractContent: (data: unknown) => {
          const d = data as { choices?: Array<{ delta?: { content?: string } }> }
          return d.choices?.[0]?.delta?.content || ''
        },
      }
    )

    expect(mockOnChunk).toHaveBeenCalledWith('A')
  })

  it('should skip "data: [DONE]" sentinel lines', async () => {
    const sseData =
      'data: {"choices":[{"delta":{"content":"B"}}]}\ndata: [DONE]\n'
    const response = createMockResponse(sseData)

    await parseSSEStream(
      response,
      {
        onChunk: mockOnChunk,
        onComplete: mockOnComplete,
        onError: mockOnError,
      },
      {
        extractContent: (data: unknown) => {
          const d = data as { choices?: Array<{ delta?: { content?: string } }> }
          return d.choices?.[0]?.delta?.content || ''
        },
      }
    )

    expect(mockOnChunk).toHaveBeenCalledWith('B')
    expect(mockOnComplete).toHaveBeenCalledWith('B')
  })

  it('should skip lines starting with "event:" (event-stream format)', async () => {
    const sseData =
      'event: message\ndata: {"choices":[{"delta":{"content":"C"}}]}\n'
    const response = createMockResponse(sseData)

    await parseSSEStream(
      response,
      {
        onChunk: mockOnChunk,
        onComplete: mockOnComplete,
        onError: mockOnError,
      },
      {
        extractContent: (data: unknown) => {
          const d = data as { choices?: Array<{ delta?: { content?: string } }> }
          return d.choices?.[0]?.delta?.content || ''
        },
      }
    )

    expect(mockOnChunk).toHaveBeenCalledWith('C')
  })

  it('should handle multiple chunks and accumulate content', async () => {
    const sseData =
      'data: {"choices":[{"delta":{"content":"Hel"}}]}\n' +
      'data: {"choices":[{"delta":{"content":"lo "}}]}\n' +
      'data: {"choices":[{"delta":{"content":"World"}}]}\n'
    const response = createMockResponse(sseData)

    await parseSSEStream(
      response,
      {
        onChunk: mockOnChunk,
        onComplete: mockOnComplete,
        onError: mockOnError,
      },
      {
        extractContent: (data: unknown) => {
          const d = data as { choices?: Array<{ delta?: { content?: string } }> }
          return d.choices?.[0]?.delta?.content || ''
        },
      }
    )

    expect(mockOnChunk).toHaveBeenCalledTimes(3)
    expect(mockOnChunk).toHaveBeenNthCalledWith(1, 'Hel')
    expect(mockOnChunk).toHaveBeenNthCalledWith(2, 'lo ')
    expect(mockOnChunk).toHaveBeenNthCalledWith(3, 'World')
    expect(mockOnComplete).toHaveBeenCalledWith('Hello World')
  })

  it('should handle lines with extra whitespace around data: prefix', async () => {
    const sseData =
      'data:   {"choices":[{"delta":{"content":"Trimmed"}}]}\n'
    const response = createMockResponse(sseData)

    await parseSSEStream(
      response,
      {
        onChunk: mockOnChunk,
        onComplete: mockOnComplete,
        onError: mockOnError,
      },
      {
        extractContent: (data: unknown) => {
          const d = data as { choices?: Array<{ delta?: { content?: string } }> }
          return d.choices?.[0]?.delta?.content || ''
        },
      }
    )

    expect(mockOnChunk).toHaveBeenCalledWith('Trimmed')
  })

  it('should process partial lines that span multiple read() calls', async () => {
    // Manually inject remaining content via a mock reader
    const encoder = new TextEncoder()

    const fakeResponse = {
      ok: true,
      status: 200,
      body: {
        getReader: () => ({
          read: vi.fn()
            .mockResolvedValueOnce({ done: false, value: encoder.encode('data: {"choic') })
            .mockResolvedValueOnce({ done: false, value: encoder.encode('es":[{"delta":{"content":"Split"}}]}\n') })
            .mockResolvedValueOnce({ done: true, value: undefined }),
          releaseLock: vi.fn(),
        }),
      },
    } as unknown as Response

    await parseSSEStream(
      fakeResponse,
      {
        onChunk: mockOnChunk,
        onComplete: mockOnComplete,
        onError: mockOnError,
      },
      {
        extractContent: (data: unknown) => {
          const d = data as { choices?: Array<{ delta?: { content?: string } }> }
          return d.choices?.[0]?.delta?.content || ''
        },
      }
    )

    expect(mockOnChunk).toHaveBeenCalledWith('Split')
    expect(mockOnComplete).toHaveBeenCalledWith('Split')
  })

  it('should call onComplete with accumulated content', async () => {
    const sseData =
      'data: {"choices":[{"delta":{"content":"A"}}]}\n' +
      'data: {"choices":[{"delta":{"content":"B"}}]}\n' +
      'data: {"choices":[{"delta":{"content":"C"}}]}\n'
    const response = createMockResponse(sseData)

    await parseSSEStream(
      response,
      {
        onChunk: mockOnChunk,
        onComplete: mockOnComplete,
        onError: mockOnError,
      },
      {
        extractContent: (data: unknown) => {
          const d = data as { choices?: Array<{ delta?: { content?: string } }> }
          return d.choices?.[0]?.delta?.content || ''
        },
      }
    )

    expect(mockOnComplete).toHaveBeenCalledWith('ABC')
  })
})