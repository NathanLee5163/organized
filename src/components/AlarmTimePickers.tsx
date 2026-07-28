import { StyleSheet, Text, View } from 'react-native';

import { Fonts } from '@/constants/Colors';
import { WheelPicker } from '@/src/components/WheelPicker';
import { useThemeColors } from '@/src/components/useThemeColors';
import { minutesToLabel } from '@/src/utils/dates';

const HOUR_ITEMS = Array.from({ length: 12 }, (_, i) => {
  const hour = i + 1;
  return { label: String(hour), value: hour };
});

const MINUTE_ITEMS = Array.from({ length: 60 }, (_, i) => ({
  label: i.toString().padStart(2, '0'),
  value: i,
}));

const PERIOD_ITEMS = [
  { label: 'AM', value: 'am' },
  { label: 'PM', value: 'pm' },
];

function formatDurationLabel(mins: number): string {
  if (mins < 60) return `${mins} min`;
  if (mins % 60 === 0) return `${mins / 60} hr`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

/** 5–55 every 5 min, then every 15 min through 23h 45m. */
const DURATION_ITEMS = (() => {
  const mins: number[] = [];
  for (let m = 5; m < 60; m += 5) mins.push(m);
  for (let m = 60; m <= 23 * 60 + 45; m += 15) mins.push(m);
  return mins.map((value) => ({ label: formatDurationLabel(value), value }));
})();

function to12Hour(hour24: number): { hour12: number; period: 'am' | 'pm' } {
  const period = hour24 >= 12 ? 'pm' : 'am';
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return { hour12, period };
}

function to24Hour(hour12: number, period: 'am' | 'pm'): number {
  if (period === 'am') return hour12 === 12 ? 0 : hour12;
  return hour12 === 12 ? 12 : hour12 + 12;
}

type Props = {
  hour24: number;
  minute: number;
  duration: number;
  onHourChange: (hour24: number) => void;
  onMinuteChange: (minute: number) => void;
  onDurationChange: (duration: number) => void;
};

export function AlarmTimePickers({
  hour24,
  minute,
  duration,
  onHourChange,
  onMinuteChange,
  onDurationChange,
}: Props) {
  const colors = useThemeColors();
  const { hour12, period } = to12Hour(hour24);
  const nearestDuration =
    DURATION_ITEMS.find((item) => item.value === duration)?.value ??
    DURATION_ITEMS.reduce((best, item) =>
      Math.abs(item.value - duration) < Math.abs(best.value - duration) ? item : best
    ).value;

  // No entering FadeIn — modal presentation often leaves it stuck at opacity 0
  // until a remount (e.g. toggling Anytime), which looked like "blank pickers".
  return (
    <View>
      <Text style={[styles.label, { color: colors.textSecondary }]}>
        Time · {minutesToLabel(hour24 * 60 + minute)}
      </Text>
      <View style={styles.row}>
        <WheelPicker
          items={HOUR_ITEMS}
          value={hour12}
          width={70}
          onChange={(value) => onHourChange(to24Hour(Number(value), period))}
        />
        <Text style={[styles.colon, { color: colors.text }]}>:</Text>
        <WheelPicker
          items={MINUTE_ITEMS}
          value={minute}
          width={70}
          onChange={(value) => onMinuteChange(Number(value))}
        />
        <WheelPicker
          items={PERIOD_ITEMS}
          value={period}
          width={70}
          onChange={(value) => onHourChange(to24Hour(hour12, value as 'am' | 'pm'))}
        />
      </View>

      <Text style={[styles.label, { color: colors.textSecondary }]}>Duration</Text>
      <View style={styles.durationWrap}>
        <WheelPicker
          items={DURATION_ITEMS}
          value={nearestDuration}
          width={148}
          onChange={(value) => onDurationChange(Number(value))}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 13,
    letterSpacing: 0.4,
    marginBottom: 10,
    marginTop: 22,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  colon: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 22,
    marginBottom: 2,
  },
  durationWrap: {
    alignItems: 'center',
  },
});
