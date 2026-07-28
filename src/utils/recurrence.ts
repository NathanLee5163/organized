import { parseDateKey, toDateKey } from '@/src/utils/dates';

/** Google Calendar BYDAY tokens, Sunday-first to match JS getDay(). */
export const BYDAY = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'] as const;
export type ByDay = (typeof BYDAY)[number];

export type RepeatPreset =
  | 'none'
  | 'daily'
  | 'weekdays'
  | 'weekly'
  | 'monthly'
  | 'yearly'
  | 'custom';

export type Recurrence = {
  preset: RepeatPreset;
  /** Weekdays for weekly / custom (0=Sun … 6=Sat). */
  daysOfWeek: number[];
  interval: number;
};

export const NO_REPEAT: Recurrence = {
  preset: 'none',
  daysOfWeek: [],
  interval: 1,
};

export function weekdayFromDateKey(dateKey: string): number {
  return parseDateKey(dateKey).getDay();
}

export function defaultWeeklyDays(dateKey: string): number[] {
  return [weekdayFromDateKey(dateKey)];
}

export function recurrenceFromPreset(preset: RepeatPreset, dateKey: string): Recurrence {
  switch (preset) {
    case 'none':
      return NO_REPEAT;
    case 'daily':
      return { preset: 'daily', daysOfWeek: [], interval: 1 };
    case 'weekdays':
      return { preset: 'weekdays', daysOfWeek: [1, 2, 3, 4, 5], interval: 1 };
    case 'weekly':
      return { preset: 'weekly', daysOfWeek: defaultWeeklyDays(dateKey), interval: 1 };
    case 'monthly':
      return { preset: 'monthly', daysOfWeek: [], interval: 1 };
    case 'yearly':
      return { preset: 'yearly', daysOfWeek: [], interval: 1 };
    case 'custom':
      return {
        preset: 'custom',
        daysOfWeek: defaultWeeklyDays(dateKey),
        interval: 1,
      };
  }
}

function sortDays(days: number[]): number[] {
  return Array.from(new Set(days)).filter((d) => d >= 0 && d <= 6).sort((a, b) => a - b);
}

export function recurrenceToRRule(recurrence: Recurrence | null | undefined): string | null {
  if (!recurrence || recurrence.preset === 'none') return null;
  const interval = Math.max(1, recurrence.interval || 1);

  switch (recurrence.preset) {
    case 'daily':
      return interval === 1 ? 'RRULE:FREQ=DAILY' : `RRULE:FREQ=DAILY;INTERVAL=${interval}`;
    case 'weekdays':
      return 'RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR';
    case 'weekly':
    case 'custom': {
      const days = sortDays(
        recurrence.daysOfWeek.length ? recurrence.daysOfWeek : []
      );
      if (days.length === 0) return 'RRULE:FREQ=WEEKLY';
      const byday = days.map((d) => BYDAY[d]).join(',');
      const intervalPart = interval === 1 ? '' : `;INTERVAL=${interval}`;
      return `RRULE:FREQ=WEEKLY${intervalPart};BYDAY=${byday}`;
    }
    case 'monthly':
      return interval === 1 ? 'RRULE:FREQ=MONTHLY' : `RRULE:FREQ=MONTHLY;INTERVAL=${interval}`;
    case 'yearly':
      return interval === 1 ? 'RRULE:FREQ=YEARLY' : `RRULE:FREQ=YEARLY;INTERVAL=${interval}`;
    default:
      return null;
  }
}

export function rruleToRecurrence(rrule: string | null | undefined, dateKey: string): Recurrence {
  if (!rrule) return NO_REPEAT;
  const rule = rrule.replace(/^RRULE:/i, '').toUpperCase();
  const parts = Object.fromEntries(
    rule.split(';').map((chunk) => {
      const [k, v] = chunk.split('=');
      return [k, v];
    })
  ) as Record<string, string>;

  const freq = parts.FREQ;
  const interval = Math.max(1, Number(parts.INTERVAL || 1));
  const byday = (parts.BYDAY || '')
    .split(',')
    .map((token) => token.replace(/^-?\d+/, ''))
    .filter(Boolean)
    .map((token) => BYDAY.indexOf(token as ByDay))
    .filter((n) => n >= 0);

  if (freq === 'DAILY') {
    return { preset: 'daily', daysOfWeek: [], interval };
  }
  if (freq === 'MONTHLY') {
    return { preset: 'monthly', daysOfWeek: [], interval };
  }
  if (freq === 'YEARLY') {
    return { preset: 'yearly', daysOfWeek: [], interval };
  }
  if (freq === 'WEEKLY') {
    const days = sortDays(byday.length ? byday : defaultWeeklyDays(dateKey));
    const isWeekdays =
      days.length === 5 && [1, 2, 3, 4, 5].every((d) => days.includes(d));
    if (isWeekdays && interval === 1) {
      return { preset: 'weekdays', daysOfWeek: days, interval: 1 };
    }
    const startDay = weekdayFromDateKey(dateKey);
    if (days.length === 1 && days[0] === startDay && interval === 1) {
      return { preset: 'weekly', daysOfWeek: days, interval: 1 };
    }
    return { preset: 'custom', daysOfWeek: days, interval };
  }
  return NO_REPEAT;
}

export function serializeRecurrence(recurrence: Recurrence | null | undefined): string | null {
  return recurrenceToRRule(recurrence);
}

export function parseRecurrence(stored: string | null | undefined, dateKey: string): Recurrence {
  if (!stored) return NO_REPEAT;
  if (stored.startsWith('{')) {
    try {
      const parsed = JSON.parse(stored) as Recurrence;
      if (parsed?.preset) {
        return {
          preset: parsed.preset,
          daysOfWeek: sortDays(parsed.daysOfWeek ?? []),
          interval: Math.max(1, parsed.interval || 1),
        };
      }
    } catch {
      // fall through to RRULE parse
    }
  }
  return rruleToRecurrence(stored.startsWith('RRULE:') ? stored : `RRULE:${stored}`, dateKey);
}

const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function recurrenceLabel(recurrence: Recurrence | null | undefined, dateKey: string): string {
  const r = recurrence ?? NO_REPEAT;
  switch (r.preset) {
    case 'none':
      return 'Does not repeat';
    case 'daily':
      return r.interval === 1 ? 'Every day' : `Every ${r.interval} days`;
    case 'weekdays':
      return 'Every weekday (Mon–Fri)';
    case 'weekly': {
      const day = WEEKDAY_SHORT[r.daysOfWeek[0] ?? weekdayFromDateKey(dateKey)];
      return `Weekly on ${day}`;
    }
    case 'monthly': {
      const d = parseDateKey(dateKey).getDate();
      return `Monthly on day ${d}`;
    }
    case 'yearly': {
      const d = parseDateKey(dateKey);
      return `Annually on ${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
    }
    case 'custom': {
      const days = sortDays(r.daysOfWeek).map((d) => WEEKDAY_SHORT[d]);
      if (days.length === 0) return 'Custom';
      if (days.length === 7) return 'Every day';
      return `Weekly on ${days.join(', ')}`;
    }
  }
}

export function occursOnDate(
  startDateKey: string,
  recurrence: Recurrence | null | undefined,
  dateKey: string
): boolean {
  if (dateKey < startDateKey) return false;
  const r = recurrence ?? NO_REPEAT;
  if (r.preset === 'none') return dateKey === startDateKey;

  const start = parseDateKey(startDateKey);
  const day = parseDateKey(dateKey);
  const startUtc = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
  const dayUtc = Date.UTC(day.getFullYear(), day.getMonth(), day.getDate());
  const dayDiff = Math.round((dayUtc - startUtc) / 86400000);
  const interval = Math.max(1, r.interval || 1);

  switch (r.preset) {
    case 'daily':
      return dayDiff % interval === 0;
    case 'weekdays':
      return day.getDay() >= 1 && day.getDay() <= 5;
    case 'weekly':
    case 'custom': {
      const days = sortDays(
        r.daysOfWeek.length ? r.daysOfWeek : [weekdayFromDateKey(startDateKey)]
      );
      if (!days.includes(day.getDay())) return false;
      if (interval === 1) return true;
      const startWeek = Math.floor(startUtc / 604800000);
      const dayWeek = Math.floor(dayUtc / 604800000);
      return (dayWeek - startWeek) % interval === 0;
    }
    case 'monthly':
      if (day.getDate() !== start.getDate()) return false;
      {
        const months =
          (day.getFullYear() - start.getFullYear()) * 12 + (day.getMonth() - start.getMonth());
        return months >= 0 && months % interval === 0;
      }
    case 'yearly':
      if (day.getMonth() !== start.getMonth() || day.getDate() !== start.getDate()) return false;
      {
        const years = day.getFullYear() - start.getFullYear();
        return years >= 0 && years % interval === 0;
      }
    default:
      return dateKey === startDateKey;
  }
}

export function presetOptions(dateKey: string): { preset: RepeatPreset; label: string }[] {
  const weekly = recurrenceLabel(recurrenceFromPreset('weekly', dateKey), dateKey);
  const monthly = recurrenceLabel(recurrenceFromPreset('monthly', dateKey), dateKey);
  const yearly = recurrenceLabel(recurrenceFromPreset('yearly', dateKey), dateKey);
  return [
    { preset: 'none', label: 'Does not repeat' },
    { preset: 'daily', label: 'Every day' },
    { preset: 'weekdays', label: 'Every weekday (Mon–Fri)' },
    { preset: 'weekly', label: weekly },
    { preset: 'monthly', label: monthly },
    { preset: 'yearly', label: yearly },
    { preset: 'custom', label: 'Custom…' },
  ];
}

export function occurrenceDateKeys(
  startDateKey: string,
  recurrence: Recurrence | null | undefined,
  fromDateKey: string,
  toDateKeyInclusive: string
): string[] {
  if (!recurrence || recurrence.preset === 'none') {
    return startDateKey >= fromDateKey && startDateKey <= toDateKeyInclusive
      ? [startDateKey]
      : [];
  }
  const keys: string[] = [];
  let cursor = parseDateKey(fromDateKey < startDateKey ? startDateKey : fromDateKey);
  const end = parseDateKey(toDateKeyInclusive);
  while (cursor <= end) {
    const key = toDateKey(cursor);
    if (occursOnDate(startDateKey, recurrence, key)) keys.push(key);
    cursor = new Date(cursor);
    cursor.setDate(cursor.getDate() + 1);
  }
  return keys;
}
