import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { useCalendars } from '@/src/calendar/CalendarContext';
import { ensureDb, getMeta, setMeta } from '@/src/db/database';
import {
  createActivity,
  createGoal,
  getActivitiesForGoal,
  getGoalById,
  getGoals,
  insertActivity,
  softDeleteGoal,
  totalMinutesForGoal,
  upsertGoal,
} from '@/src/db/goals';
import { enqueue } from '@/src/db/queue';
import {
  getInboxTodos,
  getOpenGoalBlocks,
  getTodoById,
  softDeleteTodo,
  upsertTodo,
} from '@/src/db/todos';
import { useTodos } from '@/src/context/TodoContext';
import type { Goal, GoalActivity, GoalStatus } from '@/src/types/goal';
import type { Todo } from '@/src/types/todo';
import { createTodo } from '@/src/utils/todoFactory';
import { soundComplete } from '@/src/utils/sounds';

const MIGRATE_KEY = 'goals_from_loose_v1';
const CLEAR_SESSION_KEY = 'active_goal_session_v1';

type GoalContextValue = {
  goals: Goal[];
  activeGoals: Goal[];
  /** Incomplete runway blocks keyed by goal id (one in-progress block per goal). */
  openBlockByGoalId: Record<string, Todo>;
  loading: boolean;
  refreshGoals: () => Promise<void>;
  addGoal: (title: string, notes?: string | null) => Promise<Goal>;
  setGoalStatus: (id: string, status: GoalStatus) => Promise<void>;
  removeGoal: (id: string) => Promise<void>;
  /** Reserve a runway slot for this goal — goal stays open. */
  scheduleGoalBlock: (
    goalId: string,
    opts: { date: string; startMinutes: number; durationMinutes: number }
  ) => Promise<void>;
  /**
   * Wrap-up Finished: check off the runway block and append a work log
   * under the goal (date + time range from the block).
   */
  finishGoalBlock: (todo: Todo) => Promise<void>;
  /**
   * Partial wrap-up: log actual minutes worked, drop the runway block,
   * keep the goal open.
   */
  logPartialGoalBlock: (todo: Todo, durationMinutes: number) => Promise<void>;
  getGoalActivities: (goalId: string) => Promise<GoalActivity[]>;
  getGoalTotalMinutes: (goalId: string) => Promise<number>;
  goalById: (id: string) => Goal | undefined;
};

const GoalContext = createContext<GoalContextValue | null>(null);

export function GoalProvider({ children }: { children: React.ReactNode }) {
  const { writeCalendarId } = useCalendars();
  const { refresh, dateKey, setDateKey, removeTodo } = useTodos();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [openBlocks, setOpenBlocks] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshGoals = useCallback(async () => {
    await ensureDb();
    const [list, blocks] = await Promise.all([getGoals(), getOpenGoalBlocks()]);
    setGoals(list);
    setOpenBlocks(blocks);
  }, []);

  const migrateLooseOnce = useCallback(async () => {
    const done = await getMeta(MIGRATE_KEY);
    if (done === '1') return;
    const inbox = await getInboxTodos();
    const existing = await getGoals();
    if (existing.length === 0 && inbox.length > 0) {
      for (const item of inbox) {
        if (item.completed) continue;
        const goal = createGoal({ title: item.title });
        await upsertGoal(goal);
        await softDeleteTodo(item.id, new Date().toISOString());
      }
    }
    await setMeta(MIGRATE_KEY, '1');
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      await ensureDb();
      await setMeta(CLEAR_SESSION_KEY, '');
      await migrateLooseOnce();
      const [list, blocks] = await Promise.all([getGoals(), getOpenGoalBlocks()]);
      if (cancelled) return;
      setGoals(list);
      setOpenBlocks(blocks);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [migrateLooseOnce]);

  const addGoal = useCallback(
    async (title: string, notes?: string | null) => {
      const goal = createGoal({ title, notes });
      await upsertGoal(goal);
      await refreshGoals();
      return goal;
    },
    [refreshGoals]
  );

  const setGoalStatus = useCallback(
    async (id: string, status: GoalStatus) => {
      const current = (await getGoalById(id)) ?? goals.find((g) => g.id === id);
      if (!current) return;
      await upsertGoal({
        ...current,
        status,
        updatedAt: new Date().toISOString(),
      });
      await refreshGoals();
    },
    [goals, refreshGoals]
  );

  const removeGoal = useCallback(
    async (id: string) => {
      await softDeleteGoal(id);
      await refreshGoals();
    },
    [refreshGoals]
  );

  const scheduleGoalBlock = useCallback(
    async (
      goalId: string,
      opts: { date: string; startMinutes: number; durationMinutes: number }
    ) => {
      const goal = (await getGoalById(goalId)) ?? goals.find((g) => g.id === goalId);
      if (!goal) return;

      // One open runway block per goal — no spamming the same task.
      const existingOpen = (await getOpenGoalBlocks()).find((t) => t.goalId === goalId);
      if (existingOpen) {
        throw new Error('This goal already has a block on the runway.');
      }

      const block = createTodo({
        title: goal.title,
        date: opts.date,
        kind: 'timed',
        startMinutes: opts.startMinutes,
        durationMinutes: Math.max(15, opts.durationMinutes),
        inbox: false,
        calendarId: writeCalendarId,
        goalId: goal.id,
        dockCount: goal.blockCount + 1,
      });
      // Same wrap-up path as Loose docks (Finished / Still working / …).
      block.dockedFromLoose = true;

      await upsertTodo(block);
      await enqueue(block, 'create');

      await upsertGoal({
        ...goal,
        blockCount: goal.blockCount + 1,
        updatedAt: new Date().toISOString(),
      });
      await refreshGoals();
      await refresh();
      if (dateKey !== opts.date) setDateKey(opts.date);
    },
    [dateKey, goals, refresh, refreshGoals, setDateKey, writeCalendarId]
  );

  const finishGoalBlock = useCallback(
    async (todo: Todo) => {
      if (!todo.goalId) return;
      const start = todo.startMinutes ?? 0;
      const duration = Math.max(15, todo.durationMinutes);
      const activity = createActivity({
        goalId: todo.goalId,
        date: todo.date,
        startMinutes: start,
        endMinutes: start + duration,
        durationMinutes: duration,
        todoId: todo.id,
      });
      await insertActivity(activity);

      const master = (await getTodoById(todo.id)) ?? todo;
      const next: Todo = {
        ...master,
        completed: true,
        dockedFromLoose: false,
        updatedAt: new Date().toISOString(),
        deletedAt: null,
      };
      await upsertTodo(next);
      await enqueue(next, next.googleEventId ? 'update' : 'create');

      const goal =
        (await getGoalById(todo.goalId)) ?? goals.find((g) => g.id === todo.goalId);
      if (goal) {
        await upsertGoal({ ...goal, updatedAt: new Date().toISOString() });
      }

      await refreshGoals();
      await refresh();
      soundComplete();
    },
    [goals, refresh, refreshGoals]
  );

  const logPartialGoalBlock = useCallback(
    async (todo: Todo, durationMinutes: number) => {
      if (!todo.goalId) return;
      const start = todo.startMinutes ?? 0;
      const duration = Math.max(15, durationMinutes);
      const activity = createActivity({
        goalId: todo.goalId,
        date: todo.date,
        startMinutes: start,
        endMinutes: start + duration,
        durationMinutes: duration,
        todoId: todo.id,
      });
      await insertActivity(activity);

      await removeTodo(todo.id);

      const goal =
        (await getGoalById(todo.goalId)) ?? goals.find((g) => g.id === todo.goalId);
      if (goal) {
        await upsertGoal({ ...goal, updatedAt: new Date().toISOString() });
      }

      await refreshGoals();
      await refresh();
      soundComplete();
    },
    [goals, refresh, refreshGoals, removeTodo]
  );

  const getGoalActivities = useCallback(
    async (goalId: string) => getActivitiesForGoal(goalId),
    []
  );

  const getGoalTotalMinutes = useCallback(
    async (goalId: string) => totalMinutesForGoal(goalId),
    []
  );

  const goalById = useCallback(
    (id: string) => goals.find((g) => g.id === id),
    [goals]
  );

  const openBlockByGoalId = useMemo(() => {
    const map: Record<string, Todo> = {};
    for (const block of openBlocks) {
      if (!block.goalId) continue;
      // Keep the soonest block if somehow more than one exists.
      if (!map[block.goalId]) map[block.goalId] = block;
    }
    return map;
  }, [openBlocks]);

  const activeGoals = useMemo(
    () => goals.filter((g) => g.status === 'active'),
    [goals]
  );

  const value = useMemo<GoalContextValue>(
    () => ({
      goals,
      activeGoals,
      openBlockByGoalId,
      loading,
      refreshGoals,
      addGoal,
      setGoalStatus,
      removeGoal,
      scheduleGoalBlock,
      finishGoalBlock,
      logPartialGoalBlock,
      getGoalActivities,
      getGoalTotalMinutes,
      goalById,
    }),
    [
      goals,
      activeGoals,
      openBlockByGoalId,
      loading,
      refreshGoals,
      addGoal,
      setGoalStatus,
      removeGoal,
      scheduleGoalBlock,
      finishGoalBlock,
      logPartialGoalBlock,
      getGoalActivities,
      getGoalTotalMinutes,
      goalById,
    ]
  );

  return <GoalContext.Provider value={value}>{children}</GoalContext.Provider>;
}

export function useGoals(): GoalContextValue {
  const ctx = useContext(GoalContext);
  if (!ctx) throw new Error('useGoals must be used within GoalProvider');
  return ctx;
}

export function formatDurationMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}
