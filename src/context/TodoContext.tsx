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
  getTodoById,
  getTodosBetween,
  getTodosForDate,
  softDeleteTodo,
  upsertTodo,
  upsertTodos,
} from '@/src/db/todos';
import type { Todo, TodoKind } from '@/src/types/todo';
import { addDays, addMonths, startOfMonth, toDateKey } from '@/src/utils/dates';
import { createTodo, seedMockTodos } from '@/src/utils/todoFactory';

type TodoContextValue = {
  dateKey: string;
  setDateKey: (key: string) => void;
  todos: Todo[];
  schedule: Todo[];
  anytime: Todo[];
  markedDates: Record<string, number>;
  loading: boolean;
  syncing: boolean;
  lastSyncAt: string | null;
  error: string | null;
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
    calendarId?: string | null;
  }) => Promise<Todo>;
  updateTodo: (todo: Todo) => Promise<void>;
  toggleComplete: (id: string) => Promise<void>;
  removeTodo: (id: string) => Promise<void>;
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
  } = useCalendars();
  const isCategoryEnabledRef = useRef(isCategoryEnabled);
  isCategoryEnabledRef.current = isCategoryEnabled;
  const [dateKey, setDateKeyState] = useState(toDateKey(new Date()));
  const [todos, setTodos] = useState<Todo[]>([]);
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
          await syncDayNowRef.current(key, { showSpinner: true });
        })();
        return;
      }
      setDateKeyState(key);
    },
    [loadLocal, refreshMonthMarks]
  );

  const refresh = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      await ensureDb();
      if (!didSeed.current) {
        const existingCount = await countTodos();
        if (existingCount === 0) {
          await upsertTodos(seedMockTodos(toDateKey(new Date())));
        }
        didSeed.current = true;
      }

      syncedMonths.current.clear();
      const key = dateKeyRef.current;
      await loadLocal(key);
      await refreshMonthMarks(key);
      setLastSyncAt(await peekLastSync());
      setLoading(false);
      await ensureMonthSyncedRef.current(startOfMonth(key), { force: true });
      await syncDayNowRef.current(key, { showSpinner: true });
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Sync failed';
      setError(message);
      await loadLocal(dateKeyRef.current);
    } finally {
      setSyncing(false);
      setLoading(false);
    }
  }, [loadLocal, refreshMonthMarks]);

  // One-time DB seed when auth is ready.
  useEffect(() => {
    if (!authReady) return;
    void (async () => {
      await ensureDb();
      if (didSeed.current) return;
      const existingCount = await countTodos();
      if (existingCount === 0) {
        await upsertTodos(seedMockTodos(toDateKey(new Date())));
      }
      didSeed.current = true;
      setLastSyncAt(await peekLastSync());
    })();
  }, [authReady]);

  // Switching days (and first mount): local first, prefetch month, then refine the day.
  useEffect(() => {
    if (!authReady) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      await loadLocal(dateKey);
      await refreshMonthMarks(dateKey);
      if (cancelled) return;
      setLoading(false);
      await ensureMonthSyncedRef.current(startOfMonth(dateKey));
      if (cancelled) return;
      await syncDayNowRef.current(dateKey, { showSpinner: true });
    })();
    return () => {
      cancelled = true;
    };
  }, [authReady, dateKey, isSignedIn, loadLocal, refreshMonthMarks]);

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
      const viewing = dateKeyRef.current;
      setTodos((prev) => {
        if (op === 'delete') {
          return prev.filter((t) => t.id !== todo.id);
        }
        if (todo.date !== viewing && !todo.recurrence) {
          return prev.filter((t) => t.id !== todo.id);
        }
        const idx = prev.findIndex((t) => t.id === todo.id);
        if (idx === -1) {
          if (todo.date === viewing || todo.recurrence) {
            return [...prev, todo];
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
      // 1) Paint immediately
      applyOptimistic(todo, op);

      // 2) Persist on device (fast)
      if (op === 'delete') {
        await softDeleteTodo(todo.id, todo.updatedAt);
      } else {
        await upsertTodo(todo);
      }
      await enqueue(todo, op);
      void refreshMonthMarks(dateKeyRef.current);

      // 3) Google later — don’t block the UI
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
      const next = { ...todo, updatedAt: new Date().toISOString() };
      await persistAndMaybeQueue(next, next.googleEventId ? 'update' : 'create');
    },
    [persistAndMaybeQueue]
  );

  const toggleComplete = useCallback(
    async (id: string) => {
      const current =
        todos.find((t) => t.id === id) ??
        (await getTodoById(id));
      if (!current) return;
      const next = {
        ...current,
        completed: !current.completed,
        updatedAt: new Date().toISOString(),
      };
      await persistAndMaybeQueue(next, next.googleEventId ? 'update' : 'create');
    },
    [persistAndMaybeQueue, todos]
  );

  const removeTodo = useCallback(
    async (id: string) => {
      const current = (await getTodoById(id)) ?? todos.find((t) => t.id === id);
      if (!current) return;
      const next: Todo = {
        ...current,
        deletedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        completed: true,
      };
      await persistAndMaybeQueue(next, 'delete');
    },
    [persistAndMaybeQueue, todos]
  );

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
    () => visibleTodos.filter((t) => t.kind === 'anytime'),
    [visibleTodos]
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
      refresh,
      refreshMonthMarks,
      ensureMonthSynced,
      onCategoriesChanged,
      addTodo,
      updateTodo,
      toggleComplete,
      removeTodo,
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
      refresh,
      refreshMonthMarks,
      ensureMonthSynced,
      onCategoriesChanged,
      addTodo,
      updateTodo,
      toggleComplete,
      removeTodo,
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
