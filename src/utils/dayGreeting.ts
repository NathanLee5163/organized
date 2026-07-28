import { parseDateKey, toDateKey } from '@/src/utils/dates';

export function dayGreeting(dateKey: string): string {
  const today = toDateKey(new Date());
  const d = parseDateKey(dateKey);
  const diff =
    (d.getTime() - parseDateKey(today).getTime()) / (1000 * 60 * 60 * 24);

  if (diff === 0) {
    const h = new Date().getHours();
    if (h < 5) return 'Still up?';
    if (h < 12) return 'Morning runway';
    if (h < 17) return 'Afternoon flow';
    if (h < 21) return 'Evening lane';
    return 'Night shift';
  }
  if (diff === 1) return 'Tomorrow’s sketch';
  if (diff === -1) return 'Yesterday’s trail';
  if (diff > 1 && diff < 7) return 'Coming up';
  if (diff < -1 && diff > -7) return 'Looking back';
  return d.toLocaleDateString(undefined, { weekday: 'long' });
}
