/**
 * URL Summarizer is intentionally disabled.
 *
 * The previous implementation accepted arbitrary user-supplied URLs and fetched
 * them server-side. Even with SSRF guardrails, GitHub CodeQL correctly treats
 * this pattern as high-risk. The UI entry point is hidden in MINIMAL_MODE, and
 * the backend now fails closed instead of performing network requests.
 */

export interface SummarizeResult {
  title: string;
  siteName: string | null;
  text: string;
  url: string;
}

export async function summarizeUrl(_rawUrl: string): Promise<SummarizeResult> {
  throw new Error('URL summarization is disabled.');
}
