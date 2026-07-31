import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Todo } from '@/src/types/todo';
import { occursOnDate, parseRecurrence } from '@/src/utils/recurrence';
import { addDays } from '@/src/utils/dates';

const TODOS_KEY = 'web_todos_v1';

async function readTodos(): Promise<Todo[]> {
  const raw = await AsyncStorage.getItem(TODOS_KEY);
  if (!raw) return [];
  try {
    return (JSON.parse(raw) as Todo[]).map((t) => ({
      ...t,
      recurrence: t.recurrence ?? null,
      exdates: Array.isArray(t.exdates) ? t.exdates : [],
      // Promote legacy undated anytime into the Loose inbox.
      inbox: t.inbox ?? t.kind === 'anytime',
      dockedFromLoose: t.dockedFromLoose ?? false,
      dockCount: t.dockCount ?? 0,
      goalId: t.goalId ?? null,
    }));
  } catch {
    return [];
  }
}

async function writeTodos(todos: Todo[]): Promise<void> {
  await AsyncStorage.setItem(TODOS_KEY, JSON.stringify(todos));
}

function occurrenceView(todo: Todo, dateKey: string): Todo {
  if (todo.date === dateKey) return todo;
  return { ...todo, date: dateKey };
}

function sortDay(todos: Todo[]): Todo[] {
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

export async function upsertTodo(todo: Todo): Promise<void> {
  const todos = await readTodos();
  const idx = todos.findIndex((t) => t.id === todo.id);
  if (idx >= 0) todos[idx] = todo;
  else todos.push(todo);
  await writeTodos(todos);
}

export async function upsertTodos(list: Todo[]): Promise<void> {
  const todos = await readTodos();
  const byId = new Map(todos.map((t) => [t.id, t]));
  for (const todo of list) byId.set(todo.id, todo);
  await writeTodos(Array.from(byId.values()));
}

export async function getTodosForDate(date: string): Promise<Todo[]> {
  const todos = (await readTodos()).filter((t) => !t.deletedAt && !t.inbox);
  const expanded: Todo[] = [];
  const seen = new Set<string>();
  for (const todo of todos) {
    const recurrence = parseRecurrence(todo.recurrence, todo.date);
    if (!occursOnDate(todo.date, recurrence, date, todo.exdates ?? [])) continue;
    const view = occurrenceView(todo, date);
    if (seen.has(view.id)) continue;
    seen.add(view.id);
    expanded.push(view);
  }
  return sortDay(expanded);
}

export async function getTodoById(id: string): Promise<Todo | null> {
  return (await readTodos()).find((t) => t.id === id) ?? null;
}

export async function getTodoByGoogleEventId(eventId: string): Promise<Todo | null> {
  return (
    (await readTodos()).find((t) => t.googleEventId === eventId && !t.deletedAt) ?? null
  );
}

export async function softDeleteTodo(id: string, updatedAt: string): Promise<void> {
  const todos = await readTodos();
  const idx = todos.findIndex((t) => t.id === id);
  if (idx < 0) return;
  todos[idx] = {
    ...todos[idx],
    deletedAt: updatedAt,
    updatedAt,
    completed: true,
  };
  await writeTodos(todos);
}

export async function hardDeleteTodo(id: string): Promise<void> {
  await writeTodos((await readTodos()).filter((t) => t.id !== id));
}

export async function countTodos(): Promise<number> {
  return (await readTodos()).filter((t) => !t.deletedAt).length;
}

export async function getTodosBetween(startDate: string, endDate: string): Promise<Todo[]> {
  const todos = (await readTodos()).filter((t) => !t.deletedAt && !t.inbox);
  const expanded: Todo[] = [];
  for (const todo of todos) {
    if (!todo.recurrence) {
      if (todo.date >= startDate && todo.date <= endDate) {
        expanded.push(todo);
      }
      continue;
    }
    const recurrence = parseRecurrence(todo.recurrence, todo.date);
    let cursor = startDate;
    while (cursor <= endDate) {
      if (occursOnDate(todo.date, recurrence, cursor, todo.exdates ?? [])) {
        expanded.push(occurrenceView(todo, cursor));
      }
      cursor = addDays(cursor, 1);
    }
  }
  return expanded.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return (a.startMinutes ?? 0) - (b.startMinutes ?? 0);
  });
}

export async function searchTodos(query: string, limit = 40): Promise<Todo[]> {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const todos = (await readTodos()).filter((t) => !t.deletedAt);
  return todos
    .filter((t) => t.title.toLowerCase().includes(q))
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, limit);
}

export async function getInboxTodos(): Promise<Todo[]> {
  return (await readTodos())
    .filter((t) => !t.deletedAt && t.inbox)
    .sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      return b.updatedAt.localeCompare(a.updatedAt);
    });
}

/** Incomplete runway blocks tied to a Goal. */
export async function getOpenGoalBlocks(): Promise<Todo[]> {
  return (await readTodos())
    .filter(
      (t) =>
        !t.deletedAt &&
        !t.inbox &&
        !t.completed &&
        Boolean(t.goalId)
    )
    .sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return (a.startMinutes ?? 0) - (b.startMinutes ?? 0);
    });
}
