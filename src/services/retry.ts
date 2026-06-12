/**
 * Retry utility with exponential backoff for failed API requests.
 */

export interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  onRetry?: (attempt: number, error: Error) => void;
}

/**
 * Sleep for a given number of milliseconds.
 */
const sleep = (ms: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms));

/**
 * Calculate delay with exponential backoff and jitter.
 */
export const calculateBackoff = (
  attempt: number,
  baseDelay: number = 1000,
  maxDelay: number = 30000
): number => {
  const exponentialDelay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
  // Add jitter (0.5 to 1.5 of the delay)
  const jitter = exponentialDelay * (0.5 + Math.random());
  return Math.floor(jitter);
};

/**
 * Retry a function with exponential backoff.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 30000,
    onRetry,
  } = options;

  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry on last attempt
      if (attempt === maxRetries) break;

      // Don't retry on abort
      if (lastError.name === 'AbortError') throw lastError;

      const delay = calculateBackoff(attempt, baseDelay, maxDelay);
      onRetry?.(attempt + 1, lastError);

      console.warn(`Retry ${attempt + 1}/${maxRetries} after ${delay}ms:`, lastError.message);
      await sleep(delay);
    }
  }

  throw lastError!;
}