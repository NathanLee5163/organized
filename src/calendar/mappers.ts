import type { GoogleCalendarEvent, Todo } from '@/src/types/todo';
import { isoToMinutes, toDateKey } from '@/src/utils/dates';
import { newId } from '@/src/utils/todoFactory';

function eventDateKey(event: GoogleCalendarEvent): string | null {
  if (event.start?.date) return event.start.date;
  if (event.start?.dateTime) {
    return toDateKey(new Date(event.start.dateTime));
  }
  return null;
}

export function googleEventToTodo(
  event: GoogleCalendarEvent,
  calendarId: string,
  existing?: Todo | null
): Todo | null {
  if (event.status === 'cancelled') return null;
  const date = eventDateKey(event);
  if (!date) return null;

  const title = (event.summary || 'Untitled').trim();
  const isAllDay = Boolean(event.start?.date && !event.start?.dateTime);
  const completed =
    event.extendedProperties?.private?.todoCompleted === '1' ||
    /^\[Done\]/i.test(event.description ?? '') ||
    existing?.completed === true;

  const appId = event.extendedProperties?.private?.todoAppId || existing?.id || newId();
  const recurrenceRule =
    event.recurrence?.find((r) => r.startsWith('RRULE:')) ??
    event.extendedProperties?.private?.todoRecurrence ??
    existing?.recurrence ??
    null;
  // Expanded instances inherit series via recurringEventId — keep existing rule if any.
  const recurrence =
    recurrenceRule && recurrenceRule.length > 0
      ? recurrenceRule.startsWith('RRULE:')
        ? recurrenceRule
        : `RRULE:${recurrenceRule}`
      : event.recurringEventId
        ? existing?.recurrence ?? null
        : null;

  if (isAllDay) {
    return {
      id: appId,
      title,
      date,
      kind: 'anytime',
      startMinutes: null,
      durationMinutes: 30,
      recurrence,
      completed,
      calendarId,
      googleEventId: event.id,
      updatedAt: event.updated ?? new Date().toISOString(),
      deletedAt: null,
    };
  }

  const startIso = event.start?.dateTime;
  const endIso = event.end?.dateTime;
  const startMinutes = startIso ? isoToMinutes(startIso) : 9 * 60;
  let durationMinutes = 30;
  if (startIso && endIso) {
    durationMinutes = Math.max(
      15,
      Math.round((new Date(endIso).getTime() - new Date(startIso).getTime()) / 60000)
    );
  }

  return {
    id: appId,
    title,
    date,
    kind: 'timed',
    startMinutes,
    durationMinutes,
    recurrence,
    completed,
    calendarId,
    googleEventId: event.id,
    updatedAt: event.updated ?? new Date().toISOString(),
    deletedAt: null,
  };
}

/** Prefer the newer updatedAt; ties keep local. */
export function preferNewer(local: Todo, remote: Todo): Todo {
  const localTs = new Date(local.updatedAt).getTime();
  const remoteTs = new Date(remote.updatedAt).getTime();
  if (remoteTs > localTs) {
    return { ...remote, id: local.id };
  }
  return {
    ...local,
    googleEventId: remote.googleEventId ?? local.googleEventId,
    calendarId: remote.calendarId ?? local.calendarId,
    recurrence: remote.recurrence ?? local.recurrence,
  };
}
