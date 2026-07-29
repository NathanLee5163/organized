export type TodoKind = 'timed' | 'anytime';

export type Todo = {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD (series start / first occurrence / created day for inbox)
  kind: TodoKind;
  /** Minutes from midnight when kind === 'timed' */
  startMinutes: number | null;
  /** Duration in minutes when kind === 'timed' */
  durationMinutes: number;
  /** Google-style RRULE string, e.g. RRULE:FREQ=WEEKLY;BYDAY=MO,WE — null = does not repeat */
  recurrence: string | null;
  /** Dates skipped from a repeating series (YYYY-MM-DD) */
  exdates: string[];
  /**
   * Open-ended todo with no day on the runway.
   * Lives on the Loose tab until done; not shown on day schedules.
   */
  inbox: boolean;
  /**
   * Landed from Loose via Dock — wrap-up asks finished vs still working.
   */
  dockedFromLoose: boolean;
  /** How many times this item has been docked onto the runway. */
  dockCount: number;
  completed: boolean;
  calendarId: string | null;
  googleEventId: string | null;
  updatedAt: string; // ISO
  deletedAt: string | null;
};

export type RecurrenceScope = 'occurrence' | 'series';

export type QueueOp = 'create' | 'update' | 'delete';

export type SyncQueueItem = {
  id: string;
  todoId: string;
  op: QueueOp;
  payload: string; // JSON Todo snapshot
  createdAt: string;
};

export type GoogleCalendarListEntry = {
  id: string;
  summary: string;
  primary?: boolean;
  selected?: boolean;
  accessRole?: string;
  backgroundColor?: string;
  foregroundColor?: string;
  colorId?: string;
};

export type GoogleEventDateTime = {
  dateTime?: string;
  date?: string;
  timeZone?: string;
};

export type GoogleCalendarEvent = {
  id: string;
  status?: string;
  summary?: string;
  description?: string;
  start?: GoogleEventDateTime;
  end?: GoogleEventDateTime;
  updated?: string;
  recurrence?: string[];
  recurringEventId?: string;
  extendedProperties?: {
    private?: Record<string, string>;
  };
};
