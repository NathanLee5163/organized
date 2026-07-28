import type { Todo } from '@/src/types/todo';

const FALLBACK_CHIPS = ['#E8E8EC', '#C4A8FF', '#FF9F6B', '#6EE7A8', '#7EC8FF', '#FF7A8A'] as const;

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function taskChipColor(todo: Todo, chipColors?: readonly string[], anytimeAccent?: string): string {
  if (todo.kind === 'anytime') return anytimeAccent ?? '#A0A0AA';
  const palette = chipColors?.length ? chipColors : FALLBACK_CHIPS;
  return palette[hash(todo.id) % palette.length];
}

export function taskMonogram(title: string): string {
  const t = title.trim();
  if (!t) return '·';
  const word = t.split(/\s+/)[0];
  return word.slice(0, 1).toUpperCase();
}

export function isEveningBlock(todo: Todo): boolean {
  const m = todo.startMinutes ?? 12 * 60;
  return m >= 18 * 60 || m < 5 * 60;
}

export function gapWhisper(prev: Todo | undefined, next: Todo): string | null {
  if (!prev?.startMinutes || next.startMinutes == null) return null;
  const gap = next.startMinutes - (prev.startMinutes + prev.durationMinutes);
  if (gap < 25) return null;
  if (gap < 55) return `${gap}m to breathe`;
  const h = Math.floor(gap / 60);
  const m = gap % 60;
  if (m === 0) return `${h}h wide open`;
  return `${h}h ${m}m between`;
}
