import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { Fonts } from '@/constants/Colors';
import { useCalendars } from '@/src/calendar/CalendarContext';
import { PressableScale } from '@/src/components/PressableScale';
import { useThemeColors } from '@/src/components/useThemeColors';
import type { Todo } from '@/src/types/todo';
import { minutesToLabel } from '@/src/utils/dates';
import { gapWhisper, taskChipColor } from '@/src/utils/taskFlavor';

export type FlowMode = 'runway' | 'loose' | 'day';

type Props = {
  mode: FlowMode;
  todos: Todo[];
  onPressTodo: (todo: Todo) => void;
  onToggleTodo: (id: string) => void;
  onAdd: () => void;
  /** Section eyebrow, e.g. Runway / Loose / Day */
  eyebrow: string;
  addLabel?: string;
  emptyTitle: string;
  emptyMessage: string;
  emptyCta: string;
};

function durationLabel(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

function endLabel(todo: Todo): string {
  if (todo.startMinutes == null) return '';
  return minutesToLabel(todo.startMinutes + todo.durationMinutes);
}

function headlineFor(mode: FlowMode, openCount: number): string {
  if (openCount === 0) return 'All clear';
  if (mode === 'loose') {
    return openCount === 1 ? '1 loose end' : `${openCount} loose ends`;
  }
  if (mode === 'day') {
    return openCount === 1 ? '1 on the day' : `${openCount} on the day`;
  }
  return openCount === 1 ? '1 open block' : `${openCount} open blocks`;
}

export function FlowBoard({
  mode,
  todos,
  onPressTodo,
  onToggleTodo,
  onAdd,
  eyebrow,
  addLabel = '+ Dock',
  emptyTitle,
  emptyMessage,
  emptyCta,
}: Props) {
  const colors = useThemeColors();
  const { calendarById, colorForCalendar } = useCalendars();
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const nowLabel = minutesToLabel(nowMinutes);
  const openCount = todos.filter((t) => !t.completed).length;
  const showClock = mode === 'runway' || mode === 'day';
  const showGaps = mode === 'runway';
  const showNow = mode === 'runway' || mode === 'day';

  if (todos.length === 0) {
    return (
      <Animated.View entering={FadeIn.duration(280)} style={styles.emptyWrap}>
        <Text style={[styles.emptyEyebrow, { color: colors.textSecondary }]}>{eyebrow}</Text>
        <Text style={[styles.emptyTitle, { color: colors.text }]}>{emptyTitle}</Text>
        <Text style={[styles.emptyCopy, { color: colors.textSecondary }]}>{emptyMessage}</Text>
        <PressableScale
          onPress={onAdd}
          style={[styles.emptyCta, { backgroundColor: colors.tint }]}>
          <Text style={[styles.emptyCtaText, { color: colors.onTint }]}>{emptyCta}</Text>
        </PressableScale>
      </Animated.View>
    );
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <View style={{ flex: 1, paddingRight: 12 }}>
          <Text style={[styles.eyebrow, { color: colors.textSecondary }]}>{eyebrow}</Text>
          <Text style={[styles.headline, { color: colors.text }]}>
            {headlineFor(mode, openCount)}
          </Text>
        </View>
        <PressableScale onPress={onAdd} hitSlop={10} style={styles.addLink}>
          <Text style={[styles.addLinkText, { color: colors.tint }]}>{addLabel}</Text>
        </PressableScale>
      </View>

      <View style={styles.rail}>
        {todos.map((todo, index) => {
          const cal = calendarById(todo.calendarId);
          const accent =
            todo.kind === 'anytime'
              ? colorForCalendar(todo.calendarId, colors.night)
              : cal
                ? colorForCalendar(todo.calendarId, colors.tint)
                : taskChipColor(todo, colors.chipColors, colors.anytimeAccent);

          const timed = todo.kind === 'timed' && todo.startMinutes != null;
          const time = timed ? minutesToLabel(todo.startMinutes!) : mode === 'loose' ? '·' : 'Loose';
          const prev = todos[index - 1];
          const whisper = showGaps ? gapWhisper(prev, todo) : null;
          const isLast = index === todos.length - 1;
          const happeningNow =
            showNow &&
            timed &&
            nowMinutes >= todo.startMinutes! &&
            nowMinutes < todo.startMinutes! + todo.durationMinutes;
          const past =
            timed && nowMinutes >= todo.startMinutes! + todo.durationMinutes && !todo.completed;

          return (
            <Animated.View
              key={`${todo.id}-${todo.date}`}
              entering={FadeInDown.delay(Math.min(index * 45, 220)).duration(320)}>
              {whisper ? (
                <View style={styles.gapRow}>
                  <View style={styles.timeGutter} />
                  <View style={styles.gapRail}>
                    <View style={[styles.gapDash, { borderColor: colors.hairline }]} />
                  </View>
                  <Text style={[styles.gapText, { color: colors.textSecondary }]}>{whisper}</Text>
                </View>
              ) : null}

              {happeningNow ? (
                <View style={styles.nowRow}>
                  <View style={styles.timeGutter} />
                  <View style={[styles.nowPip, { backgroundColor: colors.tint }]} />
                  <View style={[styles.nowLine, { backgroundColor: colors.tint }]} />
                  <Text style={[styles.nowLabel, { color: colors.tint }]}>Now · {nowLabel}</Text>
                </View>
              ) : null}

              <View style={styles.block}>
                <View style={styles.timeGutter}>
                  <Text
                    style={[
                      styles.timeStart,
                      {
                        color: happeningNow
                          ? colors.tint
                          : todo.kind === 'anytime'
                            ? colors.textSecondary
                            : colors.text,
                        opacity: todo.completed ? 0.4 : 1,
                        fontFamily:
                          todo.kind === 'anytime' ? Fonts.displayItalic : Fonts.bodySemi,
                        fontSize: todo.kind === 'anytime' && mode === 'day' ? 12 : 13,
                      },
                    ]}>
                    {time}
                  </Text>
                  {timed && todo.durationMinutes >= 30 ? (
                    <Text style={[styles.timeEnd, { color: colors.textSecondary }]}>
                      {endLabel(todo)}
                    </Text>
                  ) : null}
                </View>

                <View style={styles.spine}>
                  <View
                    style={[
                      styles.dot,
                      {
                        borderColor: accent,
                        backgroundColor: happeningNow
                          ? accent
                          : todo.kind === 'anytime'
                            ? accent + '44'
                            : colors.backgroundAlt,
                        borderRadius: todo.kind === 'anytime' ? 4 : 6,
                      },
                    ]}
                  />
                  {!isLast ? (
                    <View style={[styles.spineLine, { backgroundColor: colors.hairline }]} />
                  ) : null}
                </View>

                <PressableScale
                  onPress={() => onPressTodo(todo)}
                  style={[
                    styles.blockBody,
                    happeningNow && {
                      backgroundColor: colors.muted,
                      borderRadius: 18,
                      marginHorizontal: -10,
                      paddingHorizontal: 10,
                      paddingVertical: 10,
                      marginVertical: -4,
                    },
                  ]}>
                  <View style={styles.blockTop}>
                    <Text
                      style={[
                        styles.title,
                        {
                          color: colors.text,
                          textDecorationLine: todo.completed ? 'line-through' : 'none',
                          opacity: todo.completed ? 0.45 : past ? 0.7 : 1,
                        },
                      ]}
                      numberOfLines={2}>
                      {todo.title}
                    </Text>
                    <Pressable
                      onPress={() => onToggleTodo(todo.id)}
                      hitSlop={14}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: todo.completed }}
                      style={[
                        styles.check,
                        {
                          borderColor: todo.completed ? accent : colors.border,
                          backgroundColor: todo.completed ? accent : 'transparent',
                        },
                      ]}>
                      {todo.completed ? (
                        <Text style={[styles.checkMark, { color: colors.onTint }]}>✓</Text>
                      ) : todo.dockedFromLoose ? (
                        <Text style={[styles.checkMark, { color: colors.textSecondary }]}>?</Text>
                      ) : null}
                    </Pressable>
                  </View>

                  <View style={styles.metaRow}>
                    <View style={[styles.accentTick, { backgroundColor: accent }]} />
                    <Text style={[styles.meta, { color: colors.textSecondary }]}>
                      {todo.kind === 'anytime'
                        ? 'Anytime'
                        : durationLabel(todo.durationMinutes)}
                      {todo.dockedFromLoose ? ' · from Loose' : null}
                      {(todo.dockCount ?? 0) > 0 ? ` · docked ${todo.dockCount}×` : null}
                      {todo.recurrence ? ' · repeats' : null}
                      {cal ? ` · ${cal.summary}` : null}
                    </Text>
                  </View>
                </PressableScale>
              </View>
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 4,
    paddingBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 22,
    paddingHorizontal: 2,
  },
  eyebrow: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  headline: {
    fontFamily: Fonts.display,
    fontSize: 26,
    letterSpacing: -0.6,
    lineHeight: 30,
  },
  addLink: {
    paddingBottom: 4,
    paddingHorizontal: 4,
  },
  addLinkText: {
    fontFamily: Fonts.bodySemi,
    fontSize: 14,
  },
  rail: {
    paddingLeft: 2,
  },
  gapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 36,
    marginBottom: 4,
  },
  gapRail: {
    width: 22,
    alignItems: 'center',
  },
  gapDash: {
    width: 0,
    height: 22,
    borderLeftWidth: 1.5,
    borderStyle: 'dashed',
  },
  gapText: {
    fontFamily: Fonts.displayItalic,
    fontSize: 13,
    letterSpacing: -0.1,
    flex: 1,
    paddingLeft: 4,
  },
  nowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 2,
  },
  nowPip: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 7,
    marginRight: 8,
  },
  nowLine: {
    width: 28,
    height: 2,
    borderRadius: 1,
    opacity: 0.7,
    marginRight: 8,
  },
  nowLabel: {
    fontFamily: Fonts.bodySemi,
    fontSize: 12,
    letterSpacing: 0.2,
  },
  block: {
    flexDirection: 'row',
    alignItems: 'stretch',
    minHeight: 64,
    marginBottom: 2,
  },
  timeGutter: {
    width: 52,
    paddingTop: 2,
    paddingRight: 6,
    alignItems: 'flex-end',
  },
  timeStart: {
    fontFamily: Fonts.bodySemi,
    fontSize: 13,
    letterSpacing: -0.2,
  },
  timeEnd: {
    fontFamily: Fonts.body,
    fontSize: 11,
    marginTop: 2,
  },
  spine: {
    width: 22,
    alignItems: 'center',
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    marginTop: 5,
    zIndex: 1,
  },
  spineLine: {
    width: 2,
    flex: 1,
    marginTop: 4,
    borderRadius: 1,
    minHeight: 28,
  },
  blockBody: {
    flex: 1,
    paddingLeft: 10,
    paddingBottom: 18,
    paddingTop: 0,
  },
  blockTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  title: {
    flex: 1,
    fontFamily: Fonts.bodySemi,
    fontSize: 17,
    letterSpacing: -0.35,
    lineHeight: 23,
  },
  check: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkMark: {
    fontFamily: Fonts.bodySemi,
    fontSize: 12,
    marginTop: -1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  accentTick: {
    width: 3,
    height: 12,
    borderRadius: 2,
  },
  meta: {
    fontFamily: Fonts.body,
    fontSize: 12,
    letterSpacing: 0.1,
  },
  emptyWrap: {
    paddingTop: 28,
    paddingBottom: 40,
    paddingHorizontal: 8,
    alignItems: 'flex-start',
  },
  emptyEyebrow: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  emptyTitle: {
    fontFamily: Fonts.display,
    fontSize: 28,
    letterSpacing: -0.5,
    marginBottom: 10,
  },
  emptyCopy: {
    fontFamily: Fonts.body,
    fontSize: 15,
    lineHeight: 22,
    maxWidth: 300,
    marginBottom: 22,
  },
  emptyCta: {
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  emptyCtaText: {
    fontFamily: Fonts.bodySemi,
    fontSize: 15,
  },
});
