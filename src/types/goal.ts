export type GoalStatus = 'active' | 'done' | 'parked';

export type Goal = {
  id: string;
  title: string;
  notes: string | null;
  status: GoalStatus;
  /** Times a runway block was reserved for this goal. */
  blockCount: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

/** One finished runway installment logged under a goal. */
export type GoalActivity = {
  id: string;
  goalId: string;
  date: string; // YYYY-MM-DD
  startMinutes: number;
  endMinutes: number;
  durationMinutes: number;
  note: string | null;
  /** Runway block this log came from, if any. */
  todoId: string | null;
  createdAt: string;
};
