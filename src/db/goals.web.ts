import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Goal, GoalActivity } from '@/src/types/goal';
import { newId } from '@/src/utils/todoFactory';

const GOALS_KEY = 'web_goals_v1';
const ACTIVITIES_KEY = 'web_goal_activities_v1';

async function readGoals(): Promise<Goal[]> {
  const raw = await AsyncStorage.getItem(GOALS_KEY);
  if (!raw) return [];
  try {
    return (JSON.parse(raw) as Goal[]).map((g) => ({
      ...g,
      notes: g.notes ?? null,
      blockCount: g.blockCount ?? 0,
      status: g.status ?? 'active',
    }));
  } catch {
    return [];
  }
}

async function writeGoals(goals: Goal[]): Promise<void> {
  await AsyncStorage.setItem(GOALS_KEY, JSON.stringify(goals));
}

async function readActivities(): Promise<GoalActivity[]> {
  const raw = await AsyncStorage.getItem(ACTIVITIES_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as GoalActivity[];
  } catch {
    return [];
  }
}

async function writeActivities(list: GoalActivity[]): Promise<void> {
  await AsyncStorage.setItem(ACTIVITIES_KEY, JSON.stringify(list));
}

export async function upsertGoal(goal: Goal): Promise<void> {
  const goals = await readGoals();
  const idx = goals.findIndex((g) => g.id === goal.id);
  if (idx >= 0) goals[idx] = goal;
  else goals.push(goal);
  await writeGoals(goals);
}

export async function getGoals(): Promise<Goal[]> {
  return (await readGoals())
    .filter((g) => !g.deletedAt)
    .sort((a, b) => {
      const rank = (s: Goal['status']) =>
        s === 'active' ? 0 : s === 'parked' ? 1 : 2;
      const d = rank(a.status) - rank(b.status);
      if (d !== 0) return d;
      return b.updatedAt.localeCompare(a.updatedAt);
    });
}

export async function getGoalById(id: string): Promise<Goal | null> {
  return (await readGoals()).find((g) => g.id === id) ?? null;
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
  const list = await readActivities();
  list.push(activity);
  await writeActivities(list);
}

export async function getActivitiesForGoal(goalId: string): Promise<GoalActivity[]> {
  return (await readActivities())
    .filter((a) => a.goalId === goalId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getAllActivities(): Promise<GoalActivity[]> {
  return (await readActivities()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function totalMinutesForGoal(goalId: string): Promise<number> {
  const list = await getActivitiesForGoal(goalId);
  return list.reduce((sum, a) => sum + a.durationMinutes, 0);
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
