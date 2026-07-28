export function pad2(n: number): string {
  return n.toString().padStart(2, '0');
}

export function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function parseDateKey(dateKey: string): Date {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(dateKey: string, days: number): string {
  const d = parseDateKey(dateKey);
  d.setDate(d.getDate() + days);
  return toDateKey(d);
}

export function formatDisplayDate(dateKey: string): string {
  const d = parseDateKey(dateKey);
  const today = toDateKey(new Date());
  const tomorrow = addDays(today, 1);
  if (dateKey === today) return 'Today';
  if (dateKey === tomorrow) return 'Tomorrow';
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export function minutesToLabel(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${pad2(m)} ${period}`;
}

export function labelToMinutes(hour24: number, minute: number): number {
  return hour24 * 60 + minute;
}

export function dateKeyAndMinutesToIso(dateKey: string, minutes: number, timeZone?: string): string {
  const d = parseDateKey(dateKey);
  d.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return d.toISOString();
}

/** Local wall-clock ISO without Z, for Google Calendar dateTime + timeZone. */
export function toLocalDateTimeString(dateKey: string, minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${dateKey}T${pad2(h)}:${pad2(m)}:00`;
}

export function deviceTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}

export function isoToMinutes(iso: string): number {
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes();
}

export function relativeSyncLabel(iso: string | null): string {
  if (!iso) return 'Not synced yet';
  const then = new Date(iso).getTime();
  const diffSec = Math.max(0, Math.round((Date.now() - then) / 1000));
  if (diffSec < 15) return 'Synced just now';
  if (diffSec < 60) return `Synced ${diffSec}s ago`;
  const mins = Math.round(diffSec / 60);
  if (mins < 60) return `Synced ${mins}m ago`;
  const hours = Math.round(mins / 60);
  return `Synced ${hours}h ago`;
}

export function startOfMonth(dateKey: string): string {
  const d = parseDateKey(dateKey);
  return toDateKey(new Date(d.getFullYear(), d.getMonth(), 1));
}

export function addMonths(dateKey: string, months: number): string {
  const d = parseDateKey(dateKey);
  return toDateKey(new Date(d.getFullYear(), d.getMonth() + months, 1));
}

export function monthLabel(dateKey: string): string {
  const d = parseDateKey(dateKey);
  return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

export type CalendarCell = {
  dateKey: string | null;
  day: number | null;
  inMonth: boolean;
};

/** Sunday-start month grid (6 weeks). */
export function buildMonthGrid(monthKey: string): CalendarCell[] {
  const first = parseDateKey(startOfMonth(monthKey));
  const year = first.getFullYear();
  const month = first.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startWeekday = first.getDay(); // 0 Sun

  const cells: CalendarCell[] = [];
  for (let i = 0; i < startWeekday; i++) {
    cells.push({ dateKey: null, day: null, inMonth: false });
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const dateKey = `${year}-${pad2(month + 1)}-${pad2(day)}`;
    cells.push({ dateKey, day, inMonth: true });
  }
  while (cells.length % 7 !== 0) {
    cells.push({ dateKey: null, day: null, inMonth: false });
  }
  while (cells.length < 42) {
    cells.push({ dateKey: null, day: null, inMonth: false });
  }
  return cells;
}

export const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

