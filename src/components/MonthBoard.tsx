import { LinearGradient } from 'expo-linear-gradient';
import { memo, useMemo } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { Fonts } from '@/constants/Colors';
import { useCalendars } from '@/src/calendar/CalendarContext';
import { PressableScale } from '@/src/components/PressableScale';
import { useThemeColors } from '@/src/components/useThemeColors';
import type { Todo } from '@/src/types/todo';
import {
  addMonths,
  buildMonthGrid,
  monthLabel,
  parseDateKey,
  startOfMonth,
  toDateKey,
  WEEKDAY_LABELS,
} from '@/src/utils/dates';
import { taskChipColor } from '@/src/utils/taskFlavor';

const MAX_CHIPS = 3;

type Props = {
  selectedDate: string;
  onSelectDate: (dateKey: string) => void;
  monthCursor: string;
  onMonthChange: (monthKey: string) => void;
  todosByDate: Record<string, Todo[]>;
  onPressMore?: () => void;
  onJumpToday?: () => void;
};

function chipLabel(todo: Todo): string {
  const t = todo.title.trim();
  if (t.length <= 11) return t;
  return `${t.slice(0, 10)}…`;
}

function softFill(hex: string, alpha = '33'): string {
  if (hex.length === 9) return hex;
  if (hex.length === 7) return `${hex}${alpha}`;
  return hex;
}

function MonthBoardComponent({
  selectedDate,
  onSelectDate,
  monthCursor,
  onMonthChange,
  todosByDate,
  onPressMore,
  onJumpToday,
}: Props) {
  const colors = useThemeColors();
  const { calendarById, colorForCalendar, isCategoryEnabled, readIds } = useCalendars();
  const { width } = useWindowDimensions();
  const monthKey = startOfMonth(monthCursor);
  const cells = useMemo(() => buildMonthGrid(monthKey, { adjacent: true }), [monthKey]);
  const todayKey = toDateKey(new Date());
  const thisMonth = startOfMonth(todayKey);
  const showingOtherMonth = monthKey !== thisMonth;
  const pad = 14;
  const gap = 2;
  const cellW = (width - pad * 2 - gap * 6) / 7;
  const weeks = Math.ceil(cells.length / 7);
  const cellH = Math.max(74, Math.min(110, (width * 1.05) / weeks));

  const label = monthLabel(monthKey);
  const monthName = label.replace(/ \d{4}$/, '');
  const year = String(parseDateKey(monthKey).getFullYear());

  const visibleByDate = useMemo(() => {
    const out: Record<string, Todo[]> = {};
    for (const [date, list] of Object.entries(todosByDate)) {
      const visible = list.filter(
        (t) => !t.completed && isCategoryEnabled(t.calendarId)
      );
      if (visible.length) out[date] = visible;
    }
    return out;
  }, [todosByDate, isCategoryEnabled, readIds]);

  const openInMonth = useMemo(() => {
    let n = 0;
    for (const cell of cells) {
      if (!cell.dateKey || !cell.inMonth) continue;
      n += (visibleByDate[cell.dateKey] ?? []).length;
    }
    return n;
  }, [cells, visibleByDate]);
  return (
    <View style={[styles.wrap, { paddingHorizontal: pad }]}>
      <View style={styles.hero}>
        <LinearGradient
          pointerEvents="none"
          colors={[colors.tintSoft + '55', 'transparent']}
          start={{ x: 0.15, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.header}>
          <PressableScale
            onPress={() => onMonthChange(addMonths(monthKey, -1))}
            style={[styles.nav, { backgroundColor: colors.bubble, borderColor: colors.hairline }]}
            scaleTo={0.92}>
            <Text style={{ color: colors.text, fontSize: 20, lineHeight: 22 }}>‹</Text>
          </PressableScale>

          <View style={styles.titleBlock}>
            <Text style={[styles.monthTitle, { color: colors.text }]} numberOfLines={1}>
              {monthName}
            </Text>
            <Text style={[styles.year, { color: colors.textSecondary }]}>{year}</Text>
          </View>

          <View style={styles.headerRight}>
            <PressableScale
              onPress={() => onMonthChange(addMonths(monthKey, 1))}
              style={[styles.nav, { backgroundColor: colors.bubble, borderColor: colors.hairline }]}
              scaleTo={0.92}>
              <Text style={{ color: colors.text, fontSize: 20, lineHeight: 22 }}>›</Text>
            </PressableScale>
            {onPressMore ? (
              <PressableScale
                onPress={onPressMore}
                style={[
                  styles.nav,
                  {
                    backgroundColor: colors.bubble,
                    borderColor: colors.hairline,
                    marginLeft: 8,
                  },
                ]}
                scaleTo={0.92}>
                <Text style={{ color: colors.text, fontSize: 18, fontFamily: Fonts.bodySemi }}>
                  ···
                </Text>
              </PressableScale>
            ) : null}
          </View>
        </View>

        <View style={styles.metaRow}>
          <Text style={[styles.meta, { color: colors.textSecondary }]}>
            {openInMonth === 0
              ? 'Clear month'
              : openInMonth === 1
                ? '1 open block'
                : `${openInMonth} open blocks`}
          </Text>
          {showingOtherMonth && onJumpToday ? (
            <PressableScale
              onPress={onJumpToday}
              style={[styles.todayPill, { backgroundColor: colors.tint }]}
              scaleTo={0.96}>
              <Text style={[styles.todayPillText, { color: colors.onTint }]}>Today</Text>
            </PressableScale>
          ) : (
            <View style={[styles.liveDot, { backgroundColor: colors.tint }]} />
          )}
        </View>
      </View>

      <View style={[styles.weekRow, { borderBottomColor: colors.hairline }]}>
        {WEEKDAY_LABELS.map((labelDay, i) => {
          const weekend = i === 0 || i === 6;
          return (
            <Text
              key={`${labelDay}-${i}`}
              style={[
                styles.weekday,
                {
                  color: colors.textSecondary,
                  width: cellW,
                  opacity: weekend ? 0.55 : 1,
                },
              ]}>
              {labelDay}
            </Text>
          );
        })}
      </View>

      <View style={styles.grid}>
        {cells.map((cell, index) => {
          if (!cell.dateKey || cell.day == null) {
            return <View key={`empty-${index}`} style={{ width: cellW, height: cellH }} />;
          }

          const selected = cell.dateKey === selectedDate;
          const isTodayCell = cell.dateKey === todayKey;
          const dayTodos = visibleByDate[cell.dateKey] ?? [];
          const shown = dayTodos.slice(0, MAX_CHIPS);
          const extra = dayTodos.length - shown.length;

          return (
            <Pressable
              key={cell.dateKey}
              onPress={() => onSelectDate(cell.dateKey!)}
              style={[
                styles.cell,
                {
                  width: cellW,
                  height: cellH,
                  backgroundColor: selected ? colors.muted : 'transparent',
                  borderRadius: 12,
                },
              ]}>
              <View
                style={[
                  styles.dayBadge,
                  selected && { backgroundColor: colors.tint },
                  !selected && isTodayCell && { borderColor: colors.tint, borderWidth: 1.5 },
                ]}>
                <Text
                  style={[
                    styles.dayNum,
                    {
                      color: selected
                        ? colors.onTint
                        : !cell.inMonth
                          ? colors.textSecondary
                          : isTodayCell
                            ? colors.tint
                            : colors.text,
                      opacity: cell.inMonth ? 1 : 0.4,
                      fontFamily: selected || isTodayCell ? Fonts.bodySemi : Fonts.bodyMedium,
                    },
                  ]}>
                  {cell.day}
                </Text>
              </View>

              <View style={styles.chips}>
                {shown.map((todo) => {
                  const cal = calendarById(todo.calendarId);
                  const accent = cal
                    ? colorForCalendar(todo.calendarId, colors.tint)
                    : taskChipColor(todo, colors.chipColors, colors.anytimeAccent);
                  return (
                    <View
                      key={`${todo.id}-${todo.date}`}
                      style={[styles.chip, { backgroundColor: softFill(accent, '40') }]}>
                      <View style={[styles.chipRail, { backgroundColor: accent }]} />
                      <Text
                        style={[styles.chipText, { color: colors.text }]}
                        numberOfLines={1}>
                        {chipLabel(todo)}
                      </Text>
                    </View>
                  );
                })}
                {extra > 0 ? (
                  <Text style={[styles.more, { color: colors.textSecondary }]}>+{extra}</Text>
                ) : null}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export const MonthBoard = memo(MonthBoardComponent);

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
  },
  hero: {
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 14,
    paddingTop: 8,
    paddingBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  titleBlock: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 8,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  nav: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  monthTitle: {
    fontFamily: Fonts.display,
    fontSize: 36,
    letterSpacing: -1,
  },
  year: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 13,
    letterSpacing: 0.6,
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  meta: {
    fontFamily: Fonts.body,
    fontSize: 13,
  },
  todayPill: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  todayPillText: {
    fontFamily: Fonts.bodySemi,
    fontSize: 12,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  weekday: {
    textAlign: 'center',
    fontFamily: Fonts.bodyMedium,
    fontSize: 12,
    letterSpacing: 0.5,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  cell: {
    paddingTop: 4,
    paddingHorizontal: 3,
    paddingBottom: 3,
    marginBottom: 2,
  },
  dayBadge: {
    alignSelf: 'center',
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  dayNum: {
    fontSize: 14,
    letterSpacing: -0.2,
  },
  chips: {
    gap: 2,
    flex: 1,
  },
  chip: {
    borderRadius: 5,
    paddingRight: 3,
    paddingVertical: 2,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  chipRail: {
    width: 2,
    alignSelf: 'stretch',
    borderRadius: 1,
    marginRight: 3,
  },
  chipText: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 9,
    letterSpacing: -0.1,
    flexShrink: 1,
  },
  more: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 9,
    marginTop: 1,
    paddingLeft: 2,
  },
});
