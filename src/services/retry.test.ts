import { describe, it, expect, vi, beforeEach } from 'vitest'
import { calculateBackoff, withRetry } from './retry'

describe('calculateBackoff', () => {
  it('should return base delay for first attempt', () => {
    const delay = calculateBackoff(0, 1000, 30000)
    // With jitter, should be between 500-1500
    expect(delay).toBeGreaterThanOrEqual(500)
    expect(delay).toBeLessThanOrEqual(1500)
  })

  it('should double delay for each attempt', () => {
    // Without jitter (or using exact calculation)
    const base = 1000
    const max = 30000
    
    // For attempt 1: min(1000 * 2^1, 30000) = 2000
    // With jitter factor 0.5-1.5, should be 1000-3000
    const delay1 = calculateBackoff(1, base, max)
    expect(delay1).toBeGreaterThanOrEqual(1000)
    expect(delay1).toBeLessThanOrEqual(3000)
  })

  it('should respect max delay', () => {
    const delay = calculateBackoff(10, 1000, 5000)
    // Should cap at 5000 * 1.5 = 7500 max
    expect(delay).toBeLessThanOrEqual(7500)
  })
})

describe('withRetry', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  it('should return result on success', async () => {
    const fn = vi.fn().mockResolvedValue('success')
    
    const result = withRetry(fn, { maxRetries: 3 })
    
    // Advance timers to let the promise resolve
    await vi.runAllTimersAsync()
    
    await expect(result).resolves.toBe('success')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('should retry on failure', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('fail 1'))
      .mockRejectedValueOnce(new Error('fail 2'))
      .mockResolvedValue('success')
    
    const promise = withRetry(fn, { maxRetries: 3, baseDelay: 100 })
    
    // Run all pending timers
    await vi.runAllTimersAsync()
    
    const result = await promise
    expect(result).toBe('success')
    expect(fn).toHaveBeenCalledTimes(3)
  })

  it('should throw after max retries', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('always fails'))

    const promise = withRetry(fn, { maxRetries: 2, baseDelay: 100 })
    await vi.runAllTimersAsync()
    await expect(promise).rejects.toThrow('always fails')
    expect(fn).toHaveBeenCalledTimes(3) // initial + 2 retries
  })

  it('should not retry on abort', async () => {
    const err = new Error('AbortError')
    err.name = 'AbortError'
    const fn = vi.fn().mockImplementation(async () => {
      throw err
    })

    await expect(withRetry(fn, { maxRetries: 3, baseDelay: 100 })).rejects.toThrow('AbortError')
    expect(fn).toHaveBeenCalledTimes(1) // No retries on abort
  })
})