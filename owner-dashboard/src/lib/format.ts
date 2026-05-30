export function asNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

export function formatDate(value: unknown): string {
  if (!value) return '-';
  const maybeTimestamp = value as { toDate?: () => Date; seconds?: number };
  if (typeof maybeTimestamp.toDate === 'function') {
    return maybeTimestamp.toDate().toLocaleString();
  }
  if (typeof maybeTimestamp.seconds === 'number') {
    return new Date(maybeTimestamp.seconds * 1000).toLocaleString();
  }
  if (value instanceof Date) return value.toLocaleString();
  if (typeof value === 'string') return value;
  return '-';
}

export function dateKeyToday(): string {
  const now = new Date();
  return [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('');
}

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}
