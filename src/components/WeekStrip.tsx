import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Fonts } from '@/constants/Colors';
import { useThemeColors } from '@/src/components/useThemeColors';
import { usePreferences } from '@/src/preferences/PreferencesContext';
import { addDays, parseDateKey, toDateKey } from '@/src/utils/dates';

type Props = {
  selectedDate: string;
  onSelectDate: (dateKey: string) => void;
  markedDates?: Record<string, number>;
  /** Hides the big month headline (secondary tabs). */
  compact?: boolean;
};

function weekDates(around: string, weekStartsOn: 0 | 1): string[] {
  const d = parseDateKey(around);
  const start = new Date(d);
  const day = d.getDay();
  const diff = weekStartsOn === 1 ? (day + 6) % 7 : day;
  start.setDate(d.getDate() - diff);
  return Array.from({ length: 7 }, (_, i) => {
    const next = new Date(start);
    next.setDate(start.getDate() + i);
    return toDateKey(next);
  });
}

export function WeekStrip({ selectedDate, onSelectDate, markedDates = {}, compact }: Props) {
  const colors = useThemeColors();
  const { weekStartsOn } = usePreferences();
  const days = weekDates(selectedDate, weekStartsOn);
  const today = toDateKey(new Date());
  const selected = parseDateKey(selectedDate);
  const dayNames =
    weekStartsOn === 1 ? ['M', 'T', 'W', 'T', 'F', 'S', 'S'] : ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  return (
    <View style={styles.wrap}>
      {!compact ? (
        <>
          <Text style={[styles.headline, { color: colors.text }]}>
            {selected.toLocaleDateString(undefined, { month: 'long' })}
            <Text style={{ color: colors.night }}> {selected.getDate()}</Text>
          </Text>
          <Text style={[styles.year, { color: colors.textSecondary }]}>{selected.getFullYear()}</Text>
        </>
      ) : null}

      <View style={[styles.track, { backgroundColor: colors.muted }]}>
        {days.map((key, i) => {
          const d = parseDateKey(key);
          const selectedDay = key === selectedDate;
          const isToday = key === today;
          const load = Math.min((markedDates[key] ?? 0) / 4, 1);

          return (
            <Pressable key={key} onPress={() => onSelectDate(key)} style={styles.dayCol}>
              <Text
                style={[
                  styles.dayName,
                  { color: selectedDay ? colors.tint : colors.textSecondary },
                ]}>
                {dayNames[i]}
              </Text>
              <View
                style={[
                  styles.dayShell,
                  selectedDay && {
                    borderColor: colors.tint,
                    backgroundColor: colors.backgroundAlt,
                  },
                  isToday && !selectedDay && { borderColor: colors.night + '88' },
                ]}>
                <Text
                  style={[
                    styles.dayNum,
                    {
                      color: selectedDay ? colors.tint : colors.text,
                      fontFamily: selectedDay ? Fonts.bodySemi : Fonts.body,
                    },
                  ]}>
                  {d.getDate()}
                </Text>
              </View>
              <View style={[styles.loadTrack, { backgroundColor: colors.border }]}>
                <View
                  style={[
                    styles.loadFill,
                    {
                      width: `${Math.max(load * 100, load > 0 ? 18 : 0)}%`,
                      backgroundColor: selectedDay ? colors.tint : colors.night,
                    },
                  ]}
                />
              </View>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.weekNav}>
        <Pressable
          onPress={() => onSelectDate(addDays(selectedDate, -7))}
          hitSlop={12}
          style={[styles.navBtn, { backgroundColor: colors.muted }]}>
          <Text style={{ color: colors.text, fontFamily: Fonts.bodySemi }}>‹</Text>
        </Pressable>
        <Text style={[styles.range, { color: colors.textSecondary }]}>{rangeLabel(days)}</Text>
        <Pressable
          onPress={() => onSelectDate(addDays(selectedDate, 7))}
          hitSlop={12}
          style={[styles.navBtn, { backgroundColor: colors.muted }]}>
          <Text style={{ color: colors.text, fontFamily: Fonts.bodySemi }}>›</Text>
        </Pressable>
      </View>
    </View>
  );
}

function rangeLabel(days: string[]): string {
  const a = parseDateKey(days[0]);
  const b = parseDateKey(days[6]);
  return `${a.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${b.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 10,
  },
  headline: {
    fontFamily: Fonts.display,
    fontSize: 34,
    letterSpacing: -0.8,
    lineHeight: 38,
  },
  year: {
    fontFamily: Fonts.body,
    fontSize: 14,
    marginTop: 2,
    marginBottom: 16,
  },
  track: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderRadius: 22,
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  dayCol: {
    alignItems: 'center',
    width: 40,
    gap: 6,
  },
  dayName: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 11,
  },
  dayShell: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayNum: {
    fontSize: 15,
  },
  loadTrack: {
    width: 28,
    height: 3,
    borderRadius: 2,
    overflow: 'hidden',
  },
  loadFill: {
    height: '100%',
    borderRadius: 2,
  },
  weekNav: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  range: {
    fontFamily: Fonts.body,
    fontSize: 13,
  },
});
