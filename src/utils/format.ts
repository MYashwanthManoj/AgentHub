/**
 * format.ts — display formatting helpers.
 * No side effects, no imports from feature modules.
 */

/** Format ALGO amount with 4 decimal places. */
export function formatAlgo(amount: number): string {
  return `${amount.toFixed(4)} ALGO`;
}

/** Format micro-ALGO as ALGO string. */
export function formatMicroAlgo(microAlgo: number): string {
  return formatAlgo(microAlgo / 1_000_000);
}

/** Format a Unix timestamp as a readable date-time string. */
export function formatTimestamp(ts: number): string {
  return new Date(ts).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

/** Format milliseconds as a human-readable duration. */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

/** Format a timestamp as a compact relative label (e.g. "2 hours ago"). */
export function timeAgo(ts: number, now: number = Date.now()): string {
  const diff = Math.max(0, now - ts);
  const min = Math.floor(diff / 60_000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min} min${min === 1 ? '' : 's'} ago`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? '' : 's'} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

/** Truncate a hash for compact display. */
export function truncateHash(hash: string, chars = 12): string {
  if (hash.length <= chars * 2 + 3) return hash;
  return `${hash.slice(0, chars)}...${hash.slice(-chars)}`;
}

/** Format a reputation score as a string with label. */
export function formatReputation(score: number): string {
  if (score >= 95) return `${score} ★ Elite`;
  if (score >= 85) return `${score} ★ Trusted`;
  return `${score} ★`;
}
