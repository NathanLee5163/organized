import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Fonts } from '@/constants/Colors';
import { PressableScale } from '@/src/components/PressableScale';
import { useThemeColors } from '@/src/components/useThemeColors';
import {
  addMonths,
  buildMonthGrid,
  monthLabel,
  startOfMonth,
  toDateKey,
  WEEKDAY_LABELS,
} from '@/src/utils/dates';

type Props = {
  selectedDate: string;
  onSelectDate: (dateKey: string) => void;
  /** YYYY-MM-DD of any day in the visible month */
  monthCursor: string;
  onMonthChange: (monthKey: string) => void;
  /** dateKey -> count of events/todos */
  markedDates?: Record<string, number>;
  compact?: boolean;
};

export function MiniMonthCalendar({
  selectedDate,
  onSelectDate,
  monthCursor,
  onMonthChange,
  markedDates = {},
  compact = false,
}: Props) {
  const colors = useThemeColors();
  const monthKey = startOfMonth(monthCursor);
  const cells = buildMonthGrid(monthKey);
  const todayKey = toDateKey(new Date());
  const cellSize = compact ? 36 : 42;

  return (
    <View
      style={[
        styles.wrap,
        {
          backgroundColor: colors.timelineCard,
          borderColor: colors.hairline,
          padding: compact ? 12 : 14,
        },
      ]}>
      <View style={styles.header}>
        <PressableScale
          onPress={() => onMonthChange(addMonths(monthKey, -1))}
          style={[styles.nav, { backgroundColor: colors.muted }]}
          scaleTo={0.9}>
          <Text style={{ color: colors.text, fontSize: 18 }}>‹</Text>
        </PressableScale>
        <Text style={[styles.monthTitle, { color: colors.text }]}>{monthLabel(monthKey)}</Text>
        <PressableScale
          onPress={() => onMonthChange(addMonths(monthKey, 1))}
          style={[styles.nav, { backgroundColor: colors.muted }]}
          scaleTo={0.9}>
          <Text style={{ color: colors.text, fontSize: 18 }}>›</Text>
        </PressableScale>
      </View>

      <View style={styles.weekRow}>
        {WEEKDAY_LABELS.map((label, i) => (
          <Text
            key={`${label}-${i}`}
            style={[styles.weekday, { color: colors.textSecondary, width: cellSize }]}>
            {label}
          </Text>
        ))}
      </View>

      <View style={styles.grid}>
        {cells.map((cell, index) => {
          if (!cell.dateKey || cell.day == null) {
            return <View key={`empty-${index}`} style={{ width: cellSize, height: cellSize }} />;
          }
          const selected = cell.dateKey === selectedDate;
          const isToday = cell.dateKey === todayKey;
          const marks = markedDates[cell.dateKey] ?? 0;

          return (
            <Pressable
              key={cell.dateKey}
              onPress={() => onSelectDate(cell.dateKey!)}
              style={[
                styles.day,
                {
                  width: cellSize,
                  height: cellSize,
                  borderRadius: cellSize / 2,
                  backgroundColor: selected ? colors.tint : 'transparent',
                },
              ]}>
              <Text
                style={[
                  styles.dayText,
                  {
                    color: selected ? colors.onTint : isToday ? colors.tint : colors.text,
                    fontFamily: selected || isToday ? Fonts.bodySemi : Fonts.body,
                  },
                ]}>
                {cell.day}
              </Text>
              {marks > 0 ? (
                <View
                  style={[
                    styles.dot,
                    {
                      backgroundColor: selected ? colors.onTint : colors.tint,
                    },
                  ]}
                />
              ) : (
                <View style={styles.dotSpacer} />
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  nav: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthTitle: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 16,
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  weekday: {
    textAlign: 'center',
    fontFamily: Fonts.bodyMedium,
    fontSize: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  day: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 2,
  },
  dayText: {
    fontSize: 15,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 2,
  },
  dotSpacer: {
    width: 4,
    height: 4,
    marginTop: 2,
  },
});
