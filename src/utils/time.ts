/**
 * Format a timestamp (ms) into a human-readable relative string.
 * e.g. "just now", "2m ago", "1h ago", "Jan 15"
 */
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 30) return 'just now';
  if (seconds < 90) return '1m ago';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 2) return '1h ago';
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d ago`;

  const d = new Date(timestamp);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}