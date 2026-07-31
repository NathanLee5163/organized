import type { Goal, GoalActivity, GoalStatus } from '@/src/types/goal';
import { getDb } from '@/src/db/database';
import { newId } from '@/src/utils/todoFactory';

type GoalRow = {
  id: string;
  title: string;
  notes: string | null;
  status: string;
  block_count: number | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

type ActivityRow = {
  id: string;
  goal_id: string;
  date: string;
  start_minutes: number;
  end_minutes: number;
  duration_minutes: number;
  note: string | null;
  todo_id: string | null;
  created_at: string;
};

function rowToGoal(row: GoalRow): Goal {
  return {
    id: row.id,
    title: row.title,
    notes: row.notes,
    status: row.status as GoalStatus,
    blockCount: row.block_count ?? 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

function rowToActivity(row: ActivityRow): GoalActivity {
  return {
    id: row.id,
    goalId: row.goal_id,
    date: row.date,
    startMinutes: row.start_minutes,
    endMinutes: row.end_minutes,
    durationMinutes: row.duration_minutes,
    note: row.note,
    todoId: row.todo_id,
    createdAt: row.created_at,
  };
}

export async function upsertGoal(goal: Goal): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO goals (
      id, title, notes, status, block_count, created_at, updated_at, deleted_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      notes = excluded.notes,
      status = excluded.status,
      block_count = excluded.block_count,
      updated_at = excluded.updated_at,
      deleted_at = excluded.deleted_at`,
    [
      goal.id,
      goal.title,
      goal.notes,
      goal.status,
      goal.blockCount,
      goal.createdAt,
      goal.updatedAt,
      goal.deletedAt,
    ]
  );
}

export async function getGoals(): Promise<Goal[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<GoalRow>(
    `SELECT * FROM goals WHERE deleted_at IS NULL
     ORDER BY
       CASE status WHEN 'active' THEN 0 WHEN 'parked' THEN 1 ELSE 2 END,
       updated_at DESC`
  );
  return rows.map(rowToGoal);
}

export async function getGoalById(id: string): Promise<Goal | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<GoalRow>('SELECT * FROM goals WHERE id = ?', [id]);
  return row ? rowToGoal(row) : null;
}

export async function softDeleteGoal(id: string): Promise<void> {
  const existing = await getGoalById(id);
  if (!existing) return;
  await upsertGoal({
    ...existing,
    deletedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
}

export async function insertActivity(activity: GoalActivity): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO goal_activities (
      id, goal_id, date, start_minutes, end_minutes, duration_minutes, note, todo_id, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      activity.id,
      activity.goalId,
      activity.date,
      activity.startMinutes,
      activity.endMinutes,
      activity.durationMinutes,
      activity.note,
      activity.todoId,
      activity.createdAt,
    ]
  );
}

export async function getActivitiesForGoal(goalId: string): Promise<GoalActivity[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<ActivityRow>(
    `SELECT * FROM goal_activities WHERE goal_id = ?
     ORDER BY created_at DESC`,
    [goalId]
  );
  return rows.map(rowToActivity);
}

export async function getAllActivities(): Promise<GoalActivity[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<ActivityRow>(
    `SELECT * FROM goal_activities ORDER BY created_at DESC`
  );
  return rows.map(rowToActivity);
}

export async function totalMinutesForGoal(goalId: string): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ total: number | null }>(
    `SELECT SUM(duration_minutes) as total FROM goal_activities WHERE goal_id = ?`,
    [goalId]
  );
  return row?.total ?? 0;
}

export function createGoal(input: { title: string; notes?: string | null }): Goal {
  const now = new Date().toISOString();
  return {
    id: newId(),
    title: input.title.trim(),
    notes: input.notes?.trim() || null,
    status: 'active',
    blockCount: 0,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };
}

export function createActivity(input: {
  goalId: string;
  date: string;
  startMinutes: number;
  endMinutes: number;
  durationMinutes: number;
  note?: string | null;
  todoId?: string | null;
}): GoalActivity {
  return {
    id: newId(),
    goalId: input.goalId,
    date: input.date,
    startMinutes: input.startMinutes,
    endMinutes: input.endMinutes,
    durationMinutes: Math.max(1, input.durationMinutes),
    note: input.note?.trim() || null,
    todoId: input.todoId ?? null,
    createdAt: new Date().toISOString(),
  };
}
