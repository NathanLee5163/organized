import type { Todo, TodoKind } from '@/src/types/todo';
import { getDb } from '@/src/db/database';
import { occursOnDate, parseRecurrence } from '@/src/utils/recurrence';

type TodoRow = {
  id: string;
  title: string;
  date: string;
  kind: string;
  start_minutes: number | null;
  duration_minutes: number;
  completed: number;
  calendar_id: string | null;
  google_event_id: string | null;
  updated_at: string;
  deleted_at: string | null;
  recurrence: string | null;
};

function rowToTodo(row: TodoRow): Todo {
  return {
    id: row.id,
    title: row.title,
    date: row.date,
    kind: row.kind as TodoKind,
    startMinutes: row.start_minutes,
    durationMinutes: row.duration_minutes,
    recurrence: row.recurrence ?? null,
    completed: row.completed === 1,
    calendarId: row.calendar_id,
    googleEventId: row.google_event_id,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

export async function upsertTodo(todo: Todo): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO todos (
      id, title, date, kind, start_minutes, duration_minutes, completed,
      calendar_id, google_event_id, updated_at, deleted_at, recurrence
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      date = excluded.date,
      kind = excluded.kind,
      start_minutes = excluded.start_minutes,
      duration_minutes = excluded.duration_minutes,
      completed = excluded.completed,
      calendar_id = excluded.calendar_id,
      google_event_id = excluded.google_event_id,
      updated_at = excluded.updated_at,
      deleted_at = excluded.deleted_at,
      recurrence = excluded.recurrence`,
    [
      todo.id,
      todo.title,
      todo.date,
      todo.kind,
      todo.startMinutes,
      todo.durationMinutes,
      todo.completed ? 1 : 0,
      todo.calendarId,
      todo.googleEventId,
      todo.updatedAt,
      todo.deletedAt,
      todo.recurrence,
    ]
  );
}

export async function upsertTodos(todos: Todo[]): Promise<void> {
  for (const todo of todos) {
    await upsertTodo(todo);
  }
}

function sortTodos(todos: Todo[]): Todo[] {
  return todos.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === 'timed' ? -1 : 1;
    if (a.startMinutes == null && b.startMinutes == null) {
      return a.title.localeCompare(b.title);
    }
    if (a.startMinutes == null) return 1;
    if (b.startMinutes == null) return -1;
    if (a.startMinutes !== b.startMinutes) return a.startMinutes - b.startMinutes;
    return a.title.localeCompare(b.title);
  });
}

/** Expand a series master onto a concrete day for display. */
function occurrenceView(todo: Todo, dateKey: string): Todo {
  if (todo.date === dateKey) return todo;
  return {
    ...todo,
    // Keep stable id so toggles/edits hit the series master.
    date: dateKey,
  };
}

export async function getTodosForDate(date: string): Promise<Todo[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<TodoRow>(
    `SELECT * FROM todos
     WHERE deleted_at IS NULL
       AND (
         date = ?
         OR (recurrence IS NOT NULL AND recurrence != '' AND date <= ?)
       )`,
    [date, date]
  );

  const expanded: Todo[] = [];
  const seen = new Set<string>();

  for (const row of rows) {
    const todo = rowToTodo(row);
    const recurrence = parseRecurrence(todo.recurrence, todo.date);
    if (!occursOnDate(todo.date, recurrence, date)) continue;
    const view = occurrenceView(todo, date);
    if (seen.has(view.id)) continue;
    seen.add(view.id);
    expanded.push(view);
  }

  return sortTodos(expanded);
}

export async function getTodoById(id: string): Promise<Todo | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<TodoRow>('SELECT * FROM todos WHERE id = ?', [id]);
  return row ? rowToTodo(row) : null;
}

export async function getTodoByGoogleEventId(eventId: string): Promise<Todo | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<TodoRow>(
    'SELECT * FROM todos WHERE google_event_id = ? AND deleted_at IS NULL',
    [eventId]
  );
  return row ? rowToTodo(row) : null;
}

export async function softDeleteTodo(id: string, updatedAt: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'UPDATE todos SET deleted_at = ?, updated_at = ?, completed = 1 WHERE id = ?',
    [updatedAt, updatedAt, id]
  );
}

export async function hardDeleteTodo(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM todos WHERE id = ?', [id]);
}

export async function countTodos(): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ c: number }>(
    'SELECT COUNT(*) as c FROM todos WHERE deleted_at IS NULL'
  );
  return row?.c ?? 0;
}

export async function getTodosBetween(startDate: string, endDate: string): Promise<Todo[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<TodoRow>(
    `SELECT * FROM todos
     WHERE deleted_at IS NULL
       AND (
         (date >= ? AND date <= ?)
         OR (recurrence IS NOT NULL AND recurrence != '' AND date <= ?)
       )`,
    [startDate, endDate, endDate]
  );

  const expanded: Todo[] = [];
  for (const row of rows) {
    const todo = rowToTodo(row);
    const recurrence = parseRecurrence(todo.recurrence, todo.date);
    // Walk each day in range
    let cursor = startDate;
    while (cursor <= endDate) {
      if (occursOnDate(todo.date, recurrence, cursor)) {
        expanded.push(occurrenceView(todo, cursor));
      }
      const d = new Date(
        Number(cursor.slice(0, 4)),
        Number(cursor.slice(5, 7)) - 1,
        Number(cursor.slice(8, 10))
      );
      d.setDate(d.getDate() + 1);
      const y = d.getFullYear();
      const m = `${d.getMonth() + 1}`.padStart(2, '0');
      const day = `${d.getDate()}`.padStart(2, '0');
      cursor = `${y}-${m}-${day}`;
    }
  }

  return expanded.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return (a.startMinutes ?? 0) - (b.startMinutes ?? 0);
  });
}
