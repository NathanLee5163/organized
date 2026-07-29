import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createEvent,
  deleteEventFromCalendars,
  ensureTodoCalendar,
  listCalendars,
  listEvents,
  listEventsInRange,
  todoToGoogleEventBody,
  updateEvent,
} from '@/src/calendar/api';
import { googleEventToTodo, preferNewer } from '@/src/calendar/mappers';
import { listQueue, removeQueueItem } from '@/src/db/queue';
import {
  getTodoByGoogleEventId,
  getTodoById,
  getTodosForDate,
  hardDeleteTodo,
  upsertTodo,
} from '@/src/db/todos';
import {
  getLastSyncAt,
  getReadCalendarIds,
  getWriteCalendarId,
  setLastSyncAt,
  setReadCalendarIds,
  setWriteCalendarId,
} from '@/src/auth/storage';
import type { Todo } from '@/src/types/todo';
import { addMonths, startOfMonth } from '@/src/utils/dates';

const READ_CALENDARS_BOOTSTRAP_KEY = 'read_calendars_bootstrapped_v2';

export type SyncResult = {
  todos: Todo[];
  lastSyncAt: string;
};

function remoteStillHasLocal(
  local: Todo,
  remoteEventIds: Set<string>,
  remoteRecurringMasters: Set<string>
): boolean {
  const eventId = local.googleEventId;
  if (!eventId) return true;

  if (remoteEventIds.has(eventId)) return true;
  if (remoteRecurringMasters.has(eventId)) return true;

  // Expanded instance ids look like `${masterId}_YYYYMMDD…`
  for (const remoteId of remoteEventIds) {
    if (remoteId.startsWith(`${eventId}_`)) return true;
  }
  // Local might be an instance; master still exists remotely.
  const master = eventId.includes('_') ? eventId.split('_')[0] : null;
  if (master && (remoteEventIds.has(master) || remoteRecurringMasters.has(master))) {
    return true;
  }

  return false;
}

async function resolveReadCalendarIds(
  accessToken: string,
  writeCalendarId: string
): Promise<string[]> {
  const calendars = await listCalendars(accessToken);
  const primaryId = calendars.find((c) => c.primary)?.id ?? null;

  let readIds = await getReadCalendarIds();
  // Google's API accepts "primary", but list entries use the real id (usually email).
  readIds = readIds.map((id) => (id === 'primary' && primaryId ? primaryId : id));

  const bootstrapped = await AsyncStorage.getItem(READ_CALENDARS_BOOTSTRAP_KEY);
  if (!bootstrapped || readIds.length === 0) {
    const preferred = calendars.filter((c) => c.selected !== false);
    readIds = (preferred.length > 0 ? preferred : calendars).map((c) => c.id);
    await AsyncStorage.setItem(READ_CALENDARS_BOOTSTRAP_KEY, '1');
  }

  if (!readIds.includes(writeCalendarId)) {
    readIds = [...readIds, writeCalendarId];
  }

  await setReadCalendarIds(readIds);
  return readIds;
}

async function flushQueue(
  accessToken: string,
  writeCalendarId: string,
  calendarCandidates: string[]
): Promise<void> {
  const queue = await listQueue();
  for (const item of queue) {
    const todo = JSON.parse(item.payload) as Todo;
    try {
      // Open-ended Loose items stay on-device (no calendar day to mirror).
      if (todo.inbox && item.op !== 'delete') {
        await removeQueueItem(item.id);
        continue;
      }
      if (todo.inbox && item.op === 'delete' && !todo.googleEventId) {
        await hardDeleteTodo(todo.id);
        await removeQueueItem(item.id);
        continue;
      }

      // Drop poisoned payloads that can never succeed (avoids endless 400 spam).
      if (item.op !== 'delete') {
        try {
          todoToGoogleEventBody(todo);
        } catch (bodyError) {
          console.warn('Dropping invalid queue item', item.id, bodyError);
          await removeQueueItem(item.id);
          continue;
        }
      }

      if (item.op === 'delete') {
        if (todo.googleEventId) {
          await deleteEventFromCalendars(accessToken, todo.googleEventId, [
            todo.calendarId ?? '',
            writeCalendarId,
            ...calendarCandidates,
          ]);
        }
        await hardDeleteTodo(todo.id);
        await removeQueueItem(item.id);
        continue;
      }

      if (item.op === 'create' || !todo.googleEventId) {
        const targetCalendar = todo.calendarId ?? writeCalendarId;
        const created = await createEvent(accessToken, targetCalendar, todo);
        const linked: Todo = {
          ...todo,
          deletedAt: null,
          calendarId: targetCalendar,
          googleEventId: created.id,
          updatedAt: created.updated ?? todo.updatedAt,
        };
        await upsertTodo(linked);
        await removeQueueItem(item.id);
        continue;
      }

      const calendarId = todo.calendarId ?? writeCalendarId;
      const updated = await updateEvent(accessToken, calendarId, todo.googleEventId, todo);
      await upsertTodo({
        ...todo,
        deletedAt: null,
        calendarId,
        updatedAt: updated.updated ?? todo.updatedAt,
      });
      await removeQueueItem(item.id);
    } catch (error) {
      console.warn('Failed queue item', item.id, error);
      // Leave item in queue for next sync.
    }
  }
}

export async function syncDay(accessToken: string, dateKey: string): Promise<SyncResult> {
  let writeCalendarId = await getWriteCalendarId();
  writeCalendarId = await ensureTodoCalendar(accessToken, writeCalendarId);
  await setWriteCalendarId(writeCalendarId);

  const readIds = await resolveReadCalendarIds(accessToken, writeCalendarId);

  await flushQueue(accessToken, writeCalendarId, readIds);

  const uniqueCalendars = Array.from(new Set(readIds));
  const remoteByEventId = new Map<string, Todo>();
  const remoteEventIds = new Set<string>();
  const remoteRecurringMasters = new Set<string>();
  const fetchedCalendars = new Set<string>();
  const pendingDeleteIds = new Set(
    (await listQueue()).filter((item) => item.op === 'delete').map((item) => item.todoId)
  );

  for (const calendarId of uniqueCalendars) {
    try {
      const events = await listEvents(accessToken, calendarId, dateKey);
      fetchedCalendars.add(calendarId);
      for (const event of events) {
        if (event.id) remoteEventIds.add(event.id);
        if (event.recurringEventId) remoteRecurringMasters.add(event.recurringEventId);

        if (event.status === 'cancelled') {
          const existing =
            (await getTodoByGoogleEventId(event.id)) ??
            (event.extendedProperties?.private?.todoAppId
              ? await getTodoById(event.extendedProperties.private.todoAppId)
              : null);
          if (existing && !pendingDeleteIds.has(existing.id)) {
            await hardDeleteTodo(existing.id);
          }
          continue;
        }

        const existing =
          (await getTodoByGoogleEventId(event.id)) ??
          (event.extendedProperties?.private?.todoAppId
            ? await getTodoById(event.extendedProperties.private.todoAppId)
            : null);
        const mapped = googleEventToTodo(event, calendarId, existing);
        if (!mapped || mapped.date !== dateKey) continue;

        // Don't let expanded series instances overwrite the local series master.
        if (event.recurringEventId && existing?.recurrence) {
          continue;
        }

        // Soft-deleted locally but still on Google — keep deleted unless Google wins later.
        if (existing?.deletedAt) continue;

        const prev = remoteByEventId.get(event.id);
        remoteByEventId.set(event.id, prev ? preferNewer(prev, mapped) : mapped);
      }
    } catch (error) {
      console.warn(`Failed fetching calendar ${calendarId}`, error);
    }
  }

  const local = await getTodosForDate(dateKey);
  const localByEvent = new Map(
    local.filter((t) => t.googleEventId).map((t) => [t.googleEventId as string, t])
  );
  const localUnlinked = local.filter(
    (t) =>
      !t.inbox &&
      !t.googleEventId &&
      !t.deletedAt &&
      !pendingDeleteIds.has(t.id)
  );

  for (const remote of remoteByEventId.values()) {
    if (pendingDeleteIds.has(remote.id)) continue;
    const localMatch = remote.googleEventId
      ? localByEvent.get(remote.googleEventId)
      : null;
    if (localMatch) {
      const merged = preferNewer(localMatch, remote);
      await upsertTodo({ ...merged, deletedAt: null });
    } else {
      await upsertTodo({ ...remote, deletedAt: null });
    }
  }

  // Google deleted (or moved off this day): drop linked local copies.
  // Only when we successfully read at least one calendar — otherwise keep local.
  if (fetchedCalendars.size > 0) {
    for (const todo of local) {
      if (!todo.googleEventId || pendingDeleteIds.has(todo.id)) continue;
      // Don't assume deleted if we never successfully read that calendar this pass.
      if (todo.calendarId && !fetchedCalendars.has(todo.calendarId)) continue;
      if (remoteStillHasLocal(todo, remoteEventIds, remoteRecurringMasters)) continue;
      await hardDeleteTodo(todo.id);
    }
  }

  // Push unlinked local items created offline.
  for (const todo of localUnlinked) {
    try {
      const targetCalendar = todo.calendarId ?? writeCalendarId;
      const created = await createEvent(accessToken, targetCalendar, todo);
      await upsertTodo({
        ...todo,
        calendarId: targetCalendar,
        googleEventId: created.id,
        updatedAt: created.updated ?? todo.updatedAt,
        deletedAt: null,
      });
    } catch (error) {
      console.warn('Failed creating unlinked todo', todo.id, error);
    }
  }

  const lastSyncAt = new Date().toISOString();
  await setLastSyncAt(lastSyncAt);
  const todos = await getTodosForDate(dateKey);
  return { todos, lastSyncAt };
}

/**
 * Pull every event in a calendar month into local storage (for dots + browsing).
 * Much cheaper than syncing day-by-day when flipping months.
 */
export async function syncMonth(accessToken: string, monthKey: string): Promise<string> {
  let writeCalendarId = await getWriteCalendarId();
  writeCalendarId = await ensureTodoCalendar(accessToken, writeCalendarId);
  await setWriteCalendarId(writeCalendarId);

  const readIds = await resolveReadCalendarIds(accessToken, writeCalendarId);
  await flushQueue(accessToken, writeCalendarId, readIds);

  const start = startOfMonth(monthKey);
  const endExclusive = addMonths(start, 1);
  const pendingDeleteIds = new Set(
    (await listQueue()).filter((item) => item.op === 'delete').map((item) => item.todoId)
  );

  for (const calendarId of Array.from(new Set(readIds))) {
    try {
      const events = await listEventsInRange(accessToken, calendarId, start, endExclusive);
      for (const event of events) {
        if (event.status === 'cancelled') {
          const existing =
            (await getTodoByGoogleEventId(event.id)) ??
            (event.extendedProperties?.private?.todoAppId
              ? await getTodoById(event.extendedProperties.private.todoAppId)
              : null);
          if (existing && !pendingDeleteIds.has(existing.id)) {
            await hardDeleteTodo(existing.id);
          }
          continue;
        }

        const existing =
          (await getTodoByGoogleEventId(event.id)) ??
          (event.extendedProperties?.private?.todoAppId
            ? await getTodoById(event.extendedProperties.private.todoAppId)
            : null);

        if (event.recurringEventId && existing?.recurrence) {
          continue;
        }
        if (existing?.deletedAt) continue;

        const mapped = googleEventToTodo(event, calendarId, existing);
        if (!mapped) continue;
        if (pendingDeleteIds.has(mapped.id)) continue;

        if (existing) {
          await upsertTodo({ ...preferNewer(existing, mapped), deletedAt: null });
        } else {
          await upsertTodo({ ...mapped, deletedAt: null });
        }
      }
    } catch (error) {
      console.warn(`Failed fetching month for calendar ${calendarId}`, error);
    }
  }

  const lastSyncAt = new Date().toISOString();
  await setLastSyncAt(lastSyncAt);
  return lastSyncAt;
}

export async function peekLastSync(): Promise<string | null> {
  return getLastSyncAt();
}
