import { format, isPast, parseISO, differenceInDays, isValid } from 'date-fns';

export function formatDate(date?: string | null): string {
  if (!date) return '—';
  try {
    const parsed = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(parsed)) return '—';
    return format(parsed, 'dd MMM yyyy');
  } catch {
    return '—';
  }
}

export function formatDateInput(date?: string | null): string {
  if (!date) return '';
  try {
    const parsed = parseISO(date);
    if (!isValid(parsed)) return '';
    return format(parsed, 'yyyy-MM-dd');
  } catch {
    return '';
  }
}

export function isOverdue(
  expectedDate?: string | null,
  receivedDate?: string | null
): boolean {
  if (!expectedDate) return false;
  if (receivedDate) return false;
  try {
    const expected = parseISO(expectedDate);
    if (!isValid(expected)) return false;
    return isPast(expected);
  } catch {
    return false;
  }
}

export function daysOverdue(expectedDate: string): number {
  try {
    const expected = parseISO(expectedDate);
    if (!isValid(expected)) return 0;
    const today = new Date();
    const diff = differenceInDays(today, expected);
    return diff > 0 ? diff : 0;
  } catch {
    return 0;
  }
}

export function formatRelativeTime(dateStr: string): string {
  try {
    const date = parseISO(dateStr);
    if (!isValid(date)) return dateStr;
    const now = new Date();
    const diffMins = Math.floor((now.getTime() - date.getTime()) / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return format(date, 'dd MMM yyyy');
  } catch {
    return dateStr;
  }
}
