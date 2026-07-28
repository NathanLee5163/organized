import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Todo } from '@/src/types/todo';
import { occursOnDate, parseRecurrence } from '@/src/utils/recurrence';

const TODOS_KEY = 'web_todos_v1';

async function readTodos(): Promise<Todo[]> {
  const raw = await AsyncStorage.getItem(TODOS_KEY);
  if (!raw) return [];
  try {
    return (JSON.parse(raw) as Todo[]).map((t) => ({
      ...t,
      recurrence: t.recurrence ?? null,
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
  const todos = (await readTodos()).filter((t) => !t.deletedAt);
  const expanded: Todo[] = [];
  const seen = new Set<string>();
  for (const todo of todos) {
    const recurrence = parseRecurrence(todo.recurrence, todo.date);
    if (!occursOnDate(todo.date, recurrence, date)) continue;
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
  const todos = (await readTodos()).filter((t) => !t.deletedAt);
  const expanded: Todo[] = [];
  for (const todo of todos) {
    const recurrence = parseRecurrence(todo.recurrence, todo.date);
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
