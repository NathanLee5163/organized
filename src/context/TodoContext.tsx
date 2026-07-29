import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useAuth } from '@/src/auth/AuthContext';
import { useCalendars } from '@/src/calendar/CalendarContext';
import { peekLastSync, syncDay, syncMonth } from '@/src/calendar/sync';
import { ensureDb } from '@/src/db/database';
import { enqueue } from '@/src/db/queue';
import {
  countTodos,
  getInboxTodos,
  getTodoById,
  getTodosBetween,
  getTodosForDate,
  searchTodos as searchTodosDb,
  softDeleteTodo,
  upsertTodo,
  upsertTodos,
} from '@/src/db/todos';
import type { RecurrenceScope, Todo, TodoKind } from '@/src/types/todo';
import { addDays, addMonths, startOfMonth, toDateKey } from '@/src/utils/dates';
import { addExdate } from '@/src/utils/recurrence';
import { findRunwayGaps, type RunwayGap } from '@/src/utils/runwayGaps';
import { createTodo, seedMockTodos } from '@/src/utils/todoFactory';
import { soundComplete } from '@/src/utils/sounds';

type TodoContextValue = {
  dateKey: string;
  setDateKey: (key: string) => void;
  todos: Todo[];
  schedule: Todo[];
  /** Open-ended Loose list (not tied to a day). */
  anytime: Todo[];
  markedDates: Record<string, number>;
  loading: boolean;
  syncing: boolean;
  lastSyncAt: string | null;
  error: string | null;
  clearError: () => void;
  refresh: () => Promise<void>;
  refreshMonthMarks: (monthKey?: string) => Promise<void>;
  /** Prefetch a whole month from Google (dots + browsing without tapping every day). */
  ensureMonthSynced: (monthKey: string) => Promise<void>;
  /** Call after category chips / settings toggles so lists + marks + Google catch up. */
  onCategoriesChanged: () => Promise<void>;
  addTodo: (input: {
    title: string;
    date: string;
    kind: TodoKind;
    startMinutes: number | null;
    durationMinutes: number;
    recurrence?: string | null;
    inbox?: boolean;
    calendarId?: string | null;
  }) => Promise<Todo>;
  updateTodo: (todo: Todo) => Promise<void>;
  /** Save edits to one day of a series (splits off a one-off) or the whole series. */
  updateTodoScoped: (
    todo: Todo,
    scope: RecurrenceScope,
    occurrenceDate: string
  ) => Promise<void>;
  toggleComplete: (id: string) => Promise<void>;
  removeTodo: (id: string, opts?: { scope?: RecurrenceScope; occurrenceDate?: string }) => Promise<void>;
  /** Open gaps on a day’s timed runway that fit a duration. */
  previewRunwayGaps: (
    dateKey: string,
    durationMinutes: number,
    fromMinutes?: number,
    excludeTodoId?: string
  ) => Promise<RunwayGap[]>;
  /** Move a Loose item onto the runway as a timed block (or reschedule a docked one). */
  dockToRunway: (
    id: string,
    opts: { date: string; startMinutes: number; durationMinutes: number }
  ) => Promise<void>;
  /** Dock wrap-up: mark the session done. */
  finishDockedSession: (id: string) => Promise<void>;
  /** Dock wrap-up: still working — send back to Loose. */
  returnDockedToLoose: (id: string) => Promise<void>;
  searchTodos: (query: string) => Promise<Todo[]>;
  getTodo: (id: string) => Promise<Todo | null>;
};

const TodoContext = createContext<TodoContextValue | null>(null);

export function TodoProvider({ children }: { children: React.ReactNode }) {
  const { ready: authReady, isSignedIn, getValidAccessToken } = useAuth();
  const {
    isCategoryEnabled,
    readIds,
    calendars,
    loading: calendarsLoading,
    writeCalendarId,
  } = useCalendars();
  const isCategoryEnabledRef = useRef(isCategoryEnabled);
  isCategoryEnabledRef.current = isCategoryEnabled;
  const [dateKey, setDateKeyState] = useState(toDateKey(new Date()));
  const [todos, setTodos] = useState<Todo[]>([]);
  const [inbox, setInbox] = useState<Todo[]>([]);
  const [markedDates, setMarkedDates] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const dateKeyRef = useRef(dateKey);
  dateKeyRef.current = dateKey;

  const backgroundTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const backgroundChain = useRef(Promise.resolve());
  const pendingSyncKey = useRef<string | null>(null);
  const didSeed = useRef(false);
  const monthSyncInFlight = useRef<string | null>(null);
  const syncedMonths = useRef(new Set<string>());

  const loadLocal = useCallback(async (key: string) => {
    await ensureDb();
    const rows = await getTodosForDate(key);
    if (key === dateKeyRef.current) {
      setTodos(rows);
    }
    return rows;
  }, []);

  const loadInbox = useCallback(async () => {
    await ensureDb();
    setInbox(await getInboxTodos());
  }, []);

  const refreshMonthMarks = useCallback(async (monthKey?: string) => {
    await ensureDb();
    const start = startOfMonth(monthKey ?? dateKeyRef.current);
    const endDate = addDays(addMonths(start, 1), -1);
    const rows = await getTodosBetween(start, endDate);
    const counts: Record<string, number> = {};
    for (const row of rows) {
      if (!isCategoryEnabledRef.current(row.calendarId)) continue;
      counts[row.date] = (counts[row.date] ?? 0) + 1;
    }
    setMarkedDates(counts);
  }, []);

  const syncDayNow = useCallback(
    async (key: string, opts?: { showSpinner?: boolean }) => {
      if (!isSignedIn) return;
      const showSpinner = opts?.showSpinner ?? false;
      try {
        if (showSpinner) setSyncing(true);
        const token = await getValidAccessToken();
        if (!token) return;
        const result = await syncDay(token, key);
        if (key === dateKeyRef.current) {
          setTodos(result.todos);
        }
        setLastSyncAt(result.lastSyncAt);
        await refreshMonthMarks(dateKeyRef.current);
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Sync failed';
        setError(message);
      } finally {
        if (showSpinner) setSyncing(false);
      }
    },
    [getValidAccessToken, isSignedIn, refreshMonthMarks]
  );

  const syncDayNowRef = useRef(syncDayNow);
  syncDayNowRef.current = syncDayNow;

  const ensureMonthSynced = useCallback(
    async (monthKey: string, opts?: { force?: boolean }) => {
      if (!isSignedIn) {
        await refreshMonthMarks(monthKey);
        return;
      }
      const key = startOfMonth(monthKey);
      if (!opts?.force && syncedMonths.current.has(key)) {
        await refreshMonthMarks(key);
        return;
      }
      if (monthSyncInFlight.current === key) return;
      monthSyncInFlight.current = key;
      try {
        const token = await getValidAccessToken();
        if (!token) {
          await refreshMonthMarks(key);
          return;
        }
        const last = await syncMonth(token, key);
        syncedMonths.current.add(key);
        setLastSyncAt(last);
        await refreshMonthMarks(key);
        // If we're looking at a day in this month, refresh that day's list too.
        if (startOfMonth(dateKeyRef.current) === key) {
          await loadLocal(dateKeyRef.current);
        }
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Sync failed';
        setError(message);
        await refreshMonthMarks(key);
      } finally {
        if (monthSyncInFlight.current === key) monthSyncInFlight.current = null;
      }
    },
    [getValidAccessToken, isSignedIn, loadLocal, refreshMonthMarks]
  );

  const ensureMonthSyncedRef = useRef(ensureMonthSynced);
  ensureMonthSyncedRef.current = ensureMonthSynced;

  /** Quiet Google sync — does not flip RefreshControl / block taps. */
  const scheduleBackgroundSync = useCallback(
    (syncKey: string) => {
      if (!isSignedIn) return;
      pendingSyncKey.current = syncKey;
      if (backgroundTimer.current) clearTimeout(backgroundTimer.current);

      backgroundTimer.current = setTimeout(() => {
        const key = pendingSyncKey.current ?? dateKeyRef.current;
        pendingSyncKey.current = null;
        backgroundChain.current = backgroundChain.current
          .then(() => syncDayNowRef.current(key, { showSpinner: false }))
          .catch(() => undefined);
      }, 280);
    },
    [isSignedIn]
  );

  useEffect(() => {
    return () => {
      if (backgroundTimer.current) clearTimeout(backgroundTimer.current);
    };
  }, []);

  /** Always load + sync the selected day (even if you tap the same day again). */
  const setDateKey = useCallback(
    (key: string) => {
      if (key === dateKeyRef.current) {
        void (async () => {
          await loadLocal(key);
          await refreshMonthMarks(key);
          // Quiet — never trip pull-to-refresh chrome on a day tap.
          await syncDayNowRef.current(key, { showSpinner: false });
        })();
        return;
      }
      setDateKeyState(key);
    },
    [loadLocal, refreshMonthMarks]
  );

  const clearError = useCallback(() => setError(null), []);

  const refresh = useCallback(async () => {
    setError(null);
    setLoading(true);
    setSyncing(true);
    try {
      await ensureDb();
      // Demo seed only in development — never ship fake tasks to real users.
      if (__DEV__ && !didSeed.current) {
        const existingCount = await countTodos();
        if (existingCount === 0) {
          await upsertTodos(seedMockTodos(toDateKey(new Date())));
        }
        didSeed.current = true;
      }

      syncedMonths.current.clear();
      const key = dateKeyRef.current;
      await loadLocal(key);
      await loadInbox();
      await refreshMonthMarks(key);
      setLastSyncAt(await peekLastSync());
      setLoading(false);
      await ensureMonthSyncedRef.current(startOfMonth(key), { force: true });
      await syncDayNowRef.current(key, { showSpinner: false });
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Sync failed';
      setError(message);
      await loadLocal(dateKeyRef.current);
      await loadInbox();
    } finally {
      setSyncing(false);
      setLoading(false);
    }
  }, [loadInbox, loadLocal, refreshMonthMarks]);

  // One-time DB seed when auth is ready (dev only).
  useEffect(() => {
    if (!authReady) return;
    void (async () => {
      await ensureDb();
      if (didSeed.current) return;
      if (__DEV__) {
        const existingCount = await countTodos();
        if (existingCount === 0) {
          await upsertTodos(seedMockTodos(toDateKey(new Date())));
        }
      }
      didSeed.current = true;
      setLastSyncAt(await peekLastSync());
    })();
  }, [authReady]);

  // Switching days (and first mount): local first, prefetch month, then refine the day.
  const didInitialLoad = useRef(false);
  useEffect(() => {
    if (!authReady) return;
    let cancelled = false;
    (async () => {
      // Only blank the runway on the very first load — day taps should feel instant.
      const first = !didInitialLoad.current;
      if (first) setLoading(true);
      await loadLocal(dateKey);
      await loadInbox();
      await refreshMonthMarks(dateKey);
      if (cancelled) return;
      setLoading(false);
      didInitialLoad.current = true;
      await ensureMonthSyncedRef.current(startOfMonth(dateKey));
      if (cancelled) return;
      // Background Google sync — do not drive RefreshControl (that shifts the page down).
      await syncDayNowRef.current(dateKey, { showSpinner: false });
    })();
    return () => {
      cancelled = true;
    };
  }, [authReady, dateKey, isSignedIn, loadInbox, loadLocal, refreshMonthMarks]);

  // Calendars often finish after the first sync — pull again so the day isn’t empty.
  useEffect(() => {
    if (!authReady || !isSignedIn || calendarsLoading) return;
    if (calendars.length === 0) return;
    scheduleBackgroundSync(dateKeyRef.current);
  }, [authReady, isSignedIn, calendarsLoading, calendars.length, scheduleBackgroundSync]);

  // Recompute month dots whenever category visibility changes.
  useEffect(() => {
    if (!authReady) return;
    void refreshMonthMarks(dateKeyRef.current);
  }, [authReady, readIds, refreshMonthMarks]);

  const onCategoriesChanged = useCallback(async () => {
    syncedMonths.current.clear();
    await refreshMonthMarks(dateKeyRef.current);
    await ensureMonthSyncedRef.current(startOfMonth(dateKeyRef.current), { force: true });
    await syncDayNowRef.current(dateKeyRef.current, { showSpinner: false });
  }, [refreshMonthMarks]);

  const applyOptimistic = useCallback(
    (todo: Todo, op: 'create' | 'update' | 'delete') => {
      if (todo.inbox) {
        setInbox((prev) => {
          if (op === 'delete') return prev.filter((t) => t.id !== todo.id);
          const idx = prev.findIndex((t) => t.id === todo.id);
          if (idx === -1) return [todo, ...prev];
          const next = [...prev];
          next[idx] = todo;
          return next.sort((a, b) => {
            if (a.completed !== b.completed) return a.completed ? 1 : -1;
            return b.updatedAt.localeCompare(a.updatedAt);
          });
        });
        return;
      }

      const viewing = dateKeyRef.current;
      setTodos((prev) => {
        if (op === 'delete') {
          return prev.filter((t) => t.id !== todo.id);
        }
        // Skipped this day via EXDATE — drop from today's list.
        if ((todo.exdates ?? []).includes(viewing)) {
          return prev.filter((t) => t.id !== todo.id);
        }
        if (todo.date !== viewing && !todo.recurrence) {
          return prev.filter((t) => t.id !== todo.id);
        }
        const idx = prev.findIndex((t) => t.id === todo.id);
        if (idx === -1) {
          if (todo.date === viewing || todo.recurrence) {
            return [...prev, { ...todo, date: viewing }];
          }
          return prev;
        }
        const next = [...prev];
        next[idx] = { ...todo, date: viewing };
        return next;
      });
    },
    []
  );

  const persistAndMaybeQueue = useCallback(
    async (todo: Todo, op: 'create' | 'update' | 'delete') => {
      applyOptimistic(todo, op);

      if (op === 'delete') {
        await softDeleteTodo(todo.id, todo.updatedAt);
      } else {
        await upsertTodo(todo);
      }

      // Inbox stays local unless we're deleting something that already lived on Google.
      if (todo.inbox) {
        if (op === 'delete' && todo.googleEventId) {
          await enqueue(todo, op);
          scheduleBackgroundSync(dateKeyRef.current);
        }
        return;
      }

      await enqueue(todo, op);
      void refreshMonthMarks(dateKeyRef.current);
      scheduleBackgroundSync(todo.date || dateKeyRef.current);
    },
    [applyOptimistic, refreshMonthMarks, scheduleBackgroundSync]
  );

  const addTodo = useCallback(
    async (input: {
      title: string;
      date: string;
      kind: TodoKind;
      startMinutes: number | null;
      durationMinutes: number;
      recurrence?: string | null;
      inbox?: boolean;
      calendarId?: string | null;
    }) => {
      const todo = createTodo(input);
      await persistAndMaybeQueue(todo, 'create');
      return todo;
    },
    [persistAndMaybeQueue]
  );

  const updateTodo = useCallback(
    async (todo: Todo) => {
      const next = {
        ...todo,
        exdates: todo.exdates ?? [],
        updatedAt: new Date().toISOString(),
      };
      await persistAndMaybeQueue(next, next.googleEventId ? 'update' : 'create');
    },
    [persistAndMaybeQueue]
  );

  const updateTodoScoped = useCallback(
    async (todo: Todo, scope: RecurrenceScope, occurrenceDate: string) => {
      const master = (await getTodoById(todo.id)) ?? todo;
      if (!master.recurrence || scope === 'series') {
        await updateTodo({
          ...todo,
          date: scope === 'series' ? master.date : todo.date,
          exdates: master.exdates ?? [],
          googleEventId: master.googleEventId,
        });
        return;
      }

      // This day only: skip the occurrence on the series, create a one-off with edits.
      const seriesNext: Todo = {
        ...master,
        exdates: addExdate(master.exdates ?? [], occurrenceDate),
        updatedAt: new Date().toISOString(),
      };
      await persistAndMaybeQueue(seriesNext, seriesNext.googleEventId ? 'update' : 'create');

      const split = createTodo({
        title: todo.title,
        date: occurrenceDate,
        kind: todo.kind,
        startMinutes: todo.startMinutes,
        durationMinutes: todo.durationMinutes,
        recurrence: null,
        calendarId: todo.calendarId,
        completed: todo.completed,
        inbox: false,
      });
      await persistAndMaybeQueue(split, 'create');
    },
    [persistAndMaybeQueue, updateTodo]
  );

  const toggleComplete = useCallback(
    async (id: string) => {
      const current =
        inbox.find((t) => t.id === id) ??
        todos.find((t) => t.id === id) ??
        (await getTodoById(id));
      if (!current) return;
      const master = (await getTodoById(id)) ?? current;
      const nextCompleted = !current.completed;
      const next = {
        ...master,
        completed: nextCompleted,
        updatedAt: new Date().toISOString(),
        date: master.date,
        exdates: master.exdates ?? [],
        inbox: master.inbox,
      };
      await persistAndMaybeQueue(next, next.googleEventId ? 'update' : 'create');
      if (nextCompleted) soundComplete();
    },
    [inbox, persistAndMaybeQueue, todos]
  );

  const removeTodo = useCallback(
    async (id: string, opts?: { scope?: RecurrenceScope; occurrenceDate?: string }) => {
      const current =
        (await getTodoById(id)) ??
        inbox.find((t) => t.id === id) ??
        todos.find((t) => t.id === id);
      if (!current) return;

      const scope = opts?.scope ?? 'series';
      const occurrenceDate = opts?.occurrenceDate;

      if (current.recurrence && scope === 'occurrence' && occurrenceDate) {
        const next: Todo = {
          ...current,
          exdates: addExdate(current.exdates ?? [], occurrenceDate),
          updatedAt: new Date().toISOString(),
          deletedAt: null,
        };
        await persistAndMaybeQueue(next, next.googleEventId ? 'update' : 'create');
        return;
      }

      const next: Todo = {
        ...current,
        deletedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        completed: true,
      };
      await persistAndMaybeQueue(next, 'delete');
    },
    [inbox, persistAndMaybeQueue, todos]
  );

  const previewRunwayGaps = useCallback(
    async (
      day: string,
      durationMinutes: number,
      fromMinutes?: number,
      excludeTodoId?: string
    ) => {
      await ensureDb();
      const dayTodos = await getTodosForDate(day);
      const timed = dayTodos.filter(
        (t) =>
          t.kind === 'timed' &&
          t.id !== excludeTodoId &&
          isCategoryEnabledRef.current(t.calendarId)
      );
      return findRunwayGaps(timed, { durationMinutes, fromMinutes });
    },
    []
  );

  const dockToRunway = useCallback(
    async (
      id: string,
      opts: { date: string; startMinutes: number; durationMinutes: number }
    ) => {
      const current =
        (await getTodoById(id)) ??
        inbox.find((t) => t.id === id) ??
        todos.find((t) => t.id === id);
      if (!current) return;

      const next: Todo = {
        ...current,
        inbox: false,
        kind: 'timed',
        date: opts.date,
        startMinutes: opts.startMinutes,
        durationMinutes: Math.max(15, opts.durationMinutes),
        recurrence: null,
        exdates: [],
        dockedFromLoose: true,
        dockCount: (current.dockCount ?? 0) + 1,
        calendarId: current.calendarId ?? writeCalendarId,
        completed: false,
        updatedAt: new Date().toISOString(),
        deletedAt: null,
      };

      // Leave Loose immediately, then land on the day board.
      setInbox((prev) => prev.filter((t) => t.id !== next.id));
      applyOptimistic(next, next.googleEventId ? 'update' : 'create');
      await upsertTodo(next);
      await enqueue(next, next.googleEventId ? 'update' : 'create');
      void refreshMonthMarks(opts.date);
      scheduleBackgroundSync(opts.date);

      if (dateKeyRef.current !== opts.date) {
        setDateKeyState(opts.date);
      } else {
        await loadLocal(opts.date);
      }
    },
    [
      applyOptimistic,
      inbox,
      loadLocal,
      refreshMonthMarks,
      scheduleBackgroundSync,
      todos,
      writeCalendarId,
    ]
  );

  const finishDockedSession = useCallback(
    async (id: string) => {
      const current =
        todos.find((t) => t.id === id) ??
        (await getTodoById(id)) ??
        inbox.find((t) => t.id === id);
      if (!current) return;
      const master = (await getTodoById(id)) ?? current;
      const next: Todo = {
        ...master,
        completed: true,
        dockedFromLoose: false,
        updatedAt: new Date().toISOString(),
        deletedAt: null,
      };
      await persistAndMaybeQueue(next, next.googleEventId ? 'update' : 'create');
      soundComplete();
    },
    [inbox, persistAndMaybeQueue, todos]
  );

  const returnDockedToLoose = useCallback(
    async (id: string) => {
      const current =
        todos.find((t) => t.id === id) ??
        (await getTodoById(id)) ??
        inbox.find((t) => t.id === id);
      if (!current) return;

      const title = current.title;
      const durationMinutes = current.durationMinutes;
      const dockCount = current.dockCount ?? 0;

      // Drop the timed runway block (and its Google event), then re-open on Loose.
      await removeTodo(id);
      const loose = createTodo({
        title,
        date: toDateKey(new Date()),
        kind: 'anytime',
        startMinutes: null,
        durationMinutes,
        inbox: true,
        calendarId: null,
        dockCount,
      });
      await persistAndMaybeQueue(loose, 'create');
    },
    [inbox, persistAndMaybeQueue, removeTodo, todos]
  );

  const searchTodos = useCallback(async (query: string) => searchTodosDb(query), []);

  const getTodo = useCallback(async (id: string) => getTodoById(id), []);

  const visibleTodos = useMemo(
    () => todos.filter((t) => isCategoryEnabled(t.calendarId)),
    [todos, isCategoryEnabled, readIds]
  );

  const schedule = useMemo(
    () =>
      visibleTodos
        .filter((t) => t.kind === 'timed')
        .sort((a, b) => (a.startMinutes ?? 0) - (b.startMinutes ?? 0)),
    [visibleTodos]
  );

  const anytime = useMemo(
    () => inbox.filter((t) => isCategoryEnabled(t.calendarId)),
    [inbox, isCategoryEnabled, readIds]
  );

  const value = useMemo<TodoContextValue>(
    () => ({
      dateKey,
      setDateKey,
      // Always expose category-filtered todos so every screen stays in sync.
      todos: visibleTodos,
      schedule,
      anytime,
      markedDates,
      loading,
      syncing,
      lastSyncAt,
      error,
      clearError,
      refresh,
      refreshMonthMarks,
      ensureMonthSynced,
      onCategoriesChanged,
      addTodo,
      updateTodo,
      updateTodoScoped,
      toggleComplete,
      removeTodo,
      previewRunwayGaps,
      dockToRunway,
      finishDockedSession,
      returnDockedToLoose,
      searchTodos,
      getTodo,
    }),
    [
      dateKey,
      setDateKey,
      visibleTodos,
      schedule,
      anytime,
      markedDates,
      loading,
      syncing,
      lastSyncAt,
      error,
      clearError,
      refresh,
      refreshMonthMarks,
      ensureMonthSynced,
      onCategoriesChanged,
      addTodo,
      updateTodo,
      updateTodoScoped,
      toggleComplete,
      removeTodo,
      previewRunwayGaps,
      dockToRunway,
      finishDockedSession,
      returnDockedToLoose,
      searchTodos,
      getTodo,
    ]
  );

  return <TodoContext.Provider value={value}>{children}</TodoContext.Provider>;
}

export function useTodos(): TodoContextValue {
  const ctx = useContext(TodoContext);
  if (!ctx) throw new Error('useTodos must be used within TodoProvider');
  return ctx;
}
