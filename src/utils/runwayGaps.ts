import type { Todo } from '@/src/types/todo';
import { minutesToLabel } from '@/src/utils/dates';

export type RunwayGap = {
  startMinutes: number;
  endMinutes: number;
  /** How long the open window is. */
  openMinutes: number;
  label: string;
  detail: string;
};

/** End of calendar day (midnight), exclusive of next day. */
const MIDNIGHT = 24 * 60;

function roundUp(minutes: number, step = 5): number {
  return Math.ceil(minutes / step) * step;
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

function mergeBlocks(
  timed: Todo[]
): { start: number; end: number; title: string }[] {
  const blocks = timed
    .filter((t) => t.kind === 'timed' && t.startMinutes != null && !t.completed)
    .map((t) => ({
      start: t.startMinutes!,
      end: Math.min(MIDNIGHT, t.startMinutes! + Math.max(15, t.durationMinutes)),
      title: t.title,
    }))
    .sort((a, b) => a.start - b.start);

  const merged: { start: number; end: number; title: string }[] = [];
  for (const b of blocks) {
    const last = merged[merged.length - 1];
    if (last && b.start <= last.end) {
      last.end = Math.max(last.end, b.end);
    } else {
      merged.push({ ...b });
    }
  }
  return merged;
}

/**
 * Open slots on a day’s runway that can fit `durationMinutes`.
 * Scans from “now” (or morning) through midnight.
 */
export function findRunwayGaps(
  timed: Todo[],
  opts: {
    durationMinutes: number;
    /** Minutes from midnight — ignore gaps that end before this (e.g. now). */
    fromMinutes?: number;
    dayStartMinutes?: number;
    /** Defaults to midnight so late-night docking still works. */
    dayEndMinutes?: number;
    limit?: number;
  }
): RunwayGap[] {
  const duration = Math.max(15, opts.durationMinutes);
  const dayStart = opts.dayStartMinutes ?? 0;
  const dayEnd = Math.min(MIDNIGHT, opts.dayEndMinutes ?? MIDNIGHT);
  const rawFrom = opts.fromMinutes ?? dayStart;
  // Don’t clamp up to 8am when the user is docking late — use real “now”.
  const from = Math.min(dayEnd, roundUp(Math.max(dayStart, rawFrom)));

  if (dayEnd - from < duration) {
    return [];
  }

  const blocks = mergeBlocks(timed).filter((b) => b.end > from && b.start < dayEnd);
  const gaps: RunwayGap[] = [];

  let cursor = from;
  let prevTitle: string | null = null;

  for (const block of blocks) {
    if (block.end <= cursor) {
      prevTitle = block.title;
      continue;
    }
    const gapStart = cursor;
    const gapEnd = Math.min(block.start, dayEnd);
    const open = gapEnd - gapStart;
    if (open >= duration) {
      gaps.push(makeGap(gapStart, gapEnd, duration, prevTitle));
    }
    cursor = Math.max(cursor, block.end);
    prevTitle = block.title;
    if (cursor >= dayEnd) break;
  }

  if (dayEnd - cursor >= duration) {
    gaps.push(
      makeGap(
        cursor,
        dayEnd,
        duration,
        prevTitle,
        prevTitle ? `After “${prevTitle}” · until midnight` : `Clear through midnight`
      )
    );
  }

  return gaps.slice(0, opts.limit ?? 8);
}

function makeGap(
  gapStart: number,
  gapEnd: number,
  duration: number,
  prevTitle: string | null,
  detailOverride?: string
): RunwayGap {
  const open = gapEnd - gapStart;
  return {
    startMinutes: gapStart,
    endMinutes: gapEnd,
    openMinutes: open,
    label: `${minutesToLabel(gapStart)} · ${formatDuration(duration)}`,
    detail:
      detailOverride ??
      (prevTitle
        ? `After “${prevTitle}” · ${formatDuration(open)} open`
        : `Open runway · ${formatDuration(open)} clear`),
  };
}
