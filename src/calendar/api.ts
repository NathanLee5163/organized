import Constants from 'expo-constants';
import type { GoogleCalendarEvent, GoogleCalendarListEntry, Todo } from '@/src/types/todo';
import {
  addDays,
  deviceTimeZone,
  parseDateKey,
  toLocalDateTimeString,
} from '@/src/utils/dates';

const CALENDAR_BASE = 'https://www.googleapis.com/calendar/v3';

function clientIds() {
  const extra = Constants.expoConfig?.extra ?? {};
  return {
    iosClientId: (extra.googleIosClientId as string) || process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '',
    webClientId: (extra.googleWebClientId as string) || process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '',
    androidClientId:
      (extra.googleAndroidClientId as string) || process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || '',
  };
}

export function getGoogleClientIds() {
  return clientIds();
}

export function hasGoogleClientConfigured(): boolean {
  const ids = clientIds();
  // iOS client alone is enough for device / TestFlight / App Store.
  return Boolean(ids.iosClientId || ids.webClientId);
}

async function calendarFetch<T>(
  accessToken: string,
  path: string,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(`${CALENDAR_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Calendar API ${res.status}: ${body}`);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return (await res.json()) as T;
}

export async function listCalendars(accessToken: string): Promise<GoogleCalendarListEntry[]> {
  const data = await calendarFetch<{ items?: GoogleCalendarListEntry[] }>(
    accessToken,
    '/users/me/calendarList?minAccessRole=reader'
  );
  return data.items ?? [];
}

export async function ensureTodoCalendar(
  accessToken: string,
  existingId: string | null
): Promise<string> {
  const calendars = await listCalendars(accessToken);
  if (existingId && calendars.some((c) => c.id === existingId)) {
    return existingId;
  }

  const named = calendars.find((c) => c.summary === 'Todo App');
  if (named) return named.id;

  const created = await createCalendar(accessToken, 'Todo App');
  return created.id;
}

/** Create a secondary Google Calendar (shows up as a category). */
export async function createCalendar(
  accessToken: string,
  summary: string
): Promise<GoogleCalendarListEntry> {
  const name = summary.trim();
  if (!name) throw new Error('Category name is required');

  const created = await calendarFetch<{
    id: string;
    summary?: string;
    timeZone?: string;
  }>(accessToken, '/calendars', {
    method: 'POST',
    body: JSON.stringify({ summary: name, timeZone: deviceTimeZone() }),
  });

  // Insert into calendarList so it appears selected with a color.
  try {
    await calendarFetch(accessToken, '/users/me/calendarList', {
      method: 'POST',
      body: JSON.stringify({ id: created.id, selected: true }),
    });
  } catch {
    // Already on the list for the owner in most cases.
  }

  const calendars = await listCalendars(accessToken);
  return (
    calendars.find((c) => c.id === created.id) ?? {
      id: created.id,
      summary: created.summary ?? name,
      accessRole: 'owner',
      selected: true,
    }
  );
}

/**
 * Delete a secondary calendar you own, or unsubscribe from a shared one.
 * Primary calendar cannot be removed.
 */
export async function deleteCalendar(
  accessToken: string,
  calendar: GoogleCalendarListEntry
): Promise<void> {
  if (calendar.primary) {
    throw new Error('Your primary calendar can’t be deleted.');
  }

  if (calendar.accessRole === 'owner') {
    await calendarFetch<void>(
      accessToken,
      `/calendars/${encodeURIComponent(calendar.id)}`,
      { method: 'DELETE' }
    );
    return;
  }

  // Shared / subscribed — remove from this account’s list only.
  await calendarFetch<void>(
    accessToken,
    `/users/me/calendarList/${encodeURIComponent(calendar.id)}`,
    { method: 'DELETE' }
  );
}

export async function listEventsInRange(
  accessToken: string,
  calendarId: string,
  startDateKey: string,
  endDateKeyExclusive: string
): Promise<GoogleCalendarEvent[]> {
  const rangeStart = parseDateKey(startDateKey);
  const rangeEnd = parseDateKey(endDateKeyExclusive);
  const params = new URLSearchParams({
    singleEvents: 'true',
    orderBy: 'startTime',
    timeMin: rangeStart.toISOString(),
    timeMax: rangeEnd.toISOString(),
    maxResults: '2500',
  });

  const data = await calendarFetch<{ items?: GoogleCalendarEvent[] }>(
    accessToken,
    `/calendars/${encodeURIComponent(calendarId)}/events?${params.toString()}`
  );
  return data.items ?? [];
}

export async function listEvents(
  accessToken: string,
  calendarId: string,
  dateKey: string
): Promise<GoogleCalendarEvent[]> {
  return listEventsInRange(accessToken, calendarId, dateKey, addDays(dateKey, 1));
}

export function todoToGoogleEventBody(todo: Todo): Record<string, unknown> {
  const timeZone = deviceTimeZone();
  const base: Record<string, unknown> = {
    summary: todo.title,
    description: todo.completed ? '[Done] Synced from Todo Calendar' : 'Synced from Todo Calendar',
    extendedProperties: {
      private: {
        todoAppId: todo.id,
        todoKind: todo.kind,
        todoCompleted: todo.completed ? '1' : '0',
        todoRecurrence: todo.recurrence ?? '',
      },
    },
  };

  if (todo.recurrence) {
    const isInstance = Boolean(todo.googleEventId && todo.googleEventId.includes('_'));
    if (!isInstance) {
      base.recurrence = [
        todo.recurrence.startsWith('RRULE:') ? todo.recurrence : `RRULE:${todo.recurrence}`,
      ];
    }
  }

  if (todo.kind === 'anytime' || todo.startMinutes == null) {
    return {
      ...base,
      start: { date: todo.date },
      end: { date: addDays(todo.date, 1) },
    };
  }

  const start = toLocalDateTimeString(todo.date, todo.startMinutes);
  const end = toLocalDateTimeString(todo.date, todo.startMinutes + todo.durationMinutes);
  return {
    ...base,
    start: { dateTime: start, timeZone },
    end: { dateTime: end, timeZone },
  };
}

export async function createEvent(
  accessToken: string,
  calendarId: string,
  todo: Todo
): Promise<GoogleCalendarEvent> {
  return calendarFetch<GoogleCalendarEvent>(
    accessToken,
    `/calendars/${encodeURIComponent(calendarId)}/events`,
    {
      method: 'POST',
      body: JSON.stringify(todoToGoogleEventBody(todo)),
    }
  );
}

export async function updateEvent(
  accessToken: string,
  calendarId: string,
  eventId: string,
  todo: Todo
): Promise<GoogleCalendarEvent> {
  return calendarFetch<GoogleCalendarEvent>(
    accessToken,
    `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    {
      method: 'PUT',
      body: JSON.stringify(todoToGoogleEventBody(todo)),
    }
  );
}

export async function deleteEvent(
  accessToken: string,
  calendarId: string,
  eventId: string
): Promise<void> {
  try {
    await calendarFetch<void>(
      accessToken,
      `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
      { method: 'DELETE' }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    // Already gone — treat as success so the queue can clear.
    if (
      message.includes('404') ||
      message.includes('410') ||
      /not\s*found/i.test(message) ||
      /Resource has been deleted/i.test(message)
    ) {
      return;
    }
    throw error;
  }
}

/** Try the known calendar first, then others — event may live outside the write calendar. */
export async function deleteEventFromCalendars(
  accessToken: string,
  eventId: string,
  calendarIds: string[]
): Promise<void> {
  const unique = Array.from(new Set(calendarIds.filter(Boolean)));
  if (unique.length === 0) return;

  let lastError: unknown = null;
  for (const calendarId of unique) {
    try {
      await deleteEvent(accessToken, calendarId, eventId);
      return;
    } catch (error) {
      lastError = error;
    }
  }
  if (lastError) throw lastError;
}

export async function refreshAccessToken(refreshToken: string): Promise<{
  accessToken: string;
  expiresIn: number;
}> {
  const { webClientId, iosClientId } = clientIds();
  const clientId = webClientId || iosClientId;
  if (!clientId) {
    throw new Error('Missing Google client ID for token refresh');
  }

  const body = new URLSearchParams({
    client_id: clientId,
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  });

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token refresh failed: ${text}`);
  }

  const json = (await res.json()) as { access_token: string; expires_in: number };
  return { accessToken: json.access_token, expiresIn: json.expires_in };
}

export async function fetchGoogleEmail(accessToken: string): Promise<string | null> {
  const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return null;
  const json = (await res.json()) as { email?: string };
  return json.email ?? null;
}
