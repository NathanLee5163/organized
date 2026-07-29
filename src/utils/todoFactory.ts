import * as Crypto from 'expo-crypto';
import type { Todo, TodoKind } from '@/src/types/todo';
import { toDateKey } from '@/src/utils/dates';

export function newId(): string {
  return Crypto.randomUUID();
}

export function createTodo(input: {
  title: string;
  date?: string;
  kind?: TodoKind;
  startMinutes?: number | null;
  durationMinutes?: number;
  completed?: boolean;
  recurrence?: string | null;
  exdates?: string[];
  inbox?: boolean;
  calendarId?: string | null;
  dockCount?: number;
}): Todo {
  const kind = input.kind ?? (input.startMinutes != null ? 'timed' : 'anytime');
  const now = new Date().toISOString();
  const inbox = input.inbox ?? kind === 'anytime';
  return {
    id: newId(),
    title: input.title.trim(),
    date: input.date ?? toDateKey(new Date()),
    kind,
    startMinutes: kind === 'timed' ? (input.startMinutes ?? 9 * 60) : null,
    durationMinutes: input.durationMinutes ?? 30,
    recurrence: inbox ? null : input.recurrence ?? null,
    exdates: input.exdates ?? [],
    inbox,
    dockedFromLoose: false,
    dockCount: input.dockCount ?? 0,
    completed: input.completed ?? false,
    calendarId: input.calendarId ?? null,
    googleEventId: null,
    updatedAt: now,
    deletedAt: null,
  };
}

/** Demo tasks — only used in __DEV__ when the DB is empty. */
export function seedMockTodos(date: string): Todo[] {
  return [
    createTodo({
      title: 'Team standup',
      date,
      kind: 'timed',
      startMinutes: 9 * 60 + 30,
      durationMinutes: 30,
    }),
    createTodo({
      title: 'Deep work block',
      date,
      kind: 'timed',
      startMinutes: 11 * 60,
      durationMinutes: 90,
    }),
    createTodo({
      title: 'Get groceries',
      date,
      kind: 'anytime',
    }),
    createTodo({
      title: 'Reply to emails',
      date,
      kind: 'anytime',
    }),
  ];
}
