import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Copy } from '@/constants/Brand';
import { Fonts } from '@/constants/Colors';
import { useCalendars } from '@/src/calendar/CalendarContext';
import type { Todo } from '@/src/types/todo';
import { minutesToLabel } from '@/src/utils/dates';
import {
  gapWhisper,
  isEveningBlock,
  taskChipColor,
  taskMonogram,
} from '@/src/utils/taskFlavor';
import { useThemeColors } from '@/src/components/useThemeColors';

type Props = {
  todos: Todo[];
  onPressTodo: (todo: Todo) => void;
  onToggleTodo: (id: string) => void;
  onAdd: () => void;
};

function endLabel(todo: Todo): string {
  if (todo.startMinutes == null) return '';
  return minutesToLabel(todo.startMinutes + todo.durationMinutes);
}

export function TimelineBoard({ todos, onPressTodo, onToggleTodo, onAdd }: Props) {
  const colors = useThemeColors();
  const { calendarById, colorForCalendar } = useCalendars();
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const nowLabel = minutesToLabel(nowMinutes);

  return (
    <View style={[styles.card, { backgroundColor: colors.timelineCard, borderColor: colors.hairline }]}>
      <LinearGradient
        pointerEvents="none"
        colors={['transparent', colors.tint + '18', 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.cardSheen}
      />
      <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Runway</Text>

      {todos.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>{Copy.emptyRunway}</Text>
          <Text style={[styles.emptyCopy, { color: colors.textSecondary }]}>{Copy.emptyRunwayHint}</Text>
          <Pressable
            onPress={onAdd}
            style={[styles.addInline, { borderColor: colors.tint, backgroundColor: colors.muted }]}>
            <Text style={[styles.addInlineText, { color: colors.tint }]}>{Copy.dockTask}</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.list}>
          {todos.map((todo, index) => {
            const evening = isEveningBlock(todo);
            const cal = calendarById(todo.calendarId);
            const calColor = colorForCalendar(todo.calendarId, colors.tint);
            const chip = cal
              ? calColor
              : taskChipColor(todo, colors.chipColors, colors.anytimeAccent);
            const accent = evening ? colors.night : chip;
            const time = todo.startMinutes != null ? minutesToLabel(todo.startMinutes) : '';
            const prev = todos[index - 1];
            const whisper = gapWhisper(prev, todo);
            const showNow =
              todo.startMinutes != null &&
              nowMinutes >= todo.startMinutes &&
              nowMinutes < todo.startMinutes + todo.durationMinutes;

            return (
              <View key={todo.id}>
                {whisper ? (
                  <Text style={[styles.whisper, { color: colors.textSecondary }]}>{whisper}</Text>
                ) : null}
                {showNow ? (
                  <View style={styles.nowRow}>
                    <View style={[styles.nowPip, { backgroundColor: colors.tint }]} />
                    <Text style={[styles.nowLabel, { color: colors.tint }]}>Now · {nowLabel}</Text>
                    <View style={[styles.nowLine, { backgroundColor: colors.tint }]} />
                  </View>
                ) : null}

                <View style={styles.row}>
                  <Text style={[styles.timeCol, { color: colors.textSecondary }]}>{time}</Text>

                  <View style={styles.spineCol}>
                    <LinearGradient
                      colors={[colors.spineFade, accent, colors.spineFade]}
                      style={styles.spineGlow}
                    />
                    <View style={[styles.node, { borderColor: accent, backgroundColor: colors.background }]}>
                      <Text style={[styles.mono, { color: accent }]}>{taskMonogram(todo.title)}</Text>
                    </View>
                  </View>

                  <Pressable
                    onPress={() => onPressTodo(todo)}
                    style={[
                      styles.taskCard,
                      {
                        backgroundColor: colors.bubble,
                        borderColor: accent + '55',
                      },
                    ]}>
                    <Text style={[styles.taskMeta, { color: accent }]}>
                      {time}
                      {todo.durationMinutes >= 30 ? ` → ${endLabel(todo)}` : ''}
                      {todo.recurrence ? ' · repeats' : ''}
                      {cal ? ` · ${cal.summary}` : ''}
                    </Text>
                    <Text
                      style={[
                        styles.taskTitle,
                        {
                          color: colors.text,
                          textDecorationLine: todo.completed ? 'line-through' : 'none',
                          opacity: todo.completed ? 0.5 : 1,
                        },
                      ]}
                      numberOfLines={2}>
                      {todo.title}
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => onToggleTodo(todo.id)}
                    hitSlop={12}
                    style={[
                      styles.check,
                      {
                        borderColor: accent,
                        backgroundColor: todo.completed ? accent : 'transparent',
                      },
                    ]}
                  />
                </View>
              </View>
            );
          })}

          <Pressable
            onPress={onAdd}
            style={[styles.addInline, { borderColor: colors.tint, alignSelf: 'center', marginTop: 16 }]}>
            <Text style={[styles.addInlineText, { color: colors.tint }]}>{Copy.dockTask}</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 26,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 24,
    minHeight: 360,
    overflow: 'hidden',
  },
  cardSheen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  sectionLabel: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 14,
  },
  list: {
    gap: 6,
  },
  whisper: {
    fontFamily: Fonts.body,
    fontSize: 11,
    marginLeft: 52,
    marginBottom: 4,
    fontStyle: 'italic',
  },
  nowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
    paddingLeft: 4,
  },
  nowPip: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  nowLabel: {
    fontFamily: Fonts.bodySemi,
    fontSize: 12,
  },
  nowLine: {
    flex: 1,
    height: 2,
    borderRadius: 1,
    opacity: 0.5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  timeCol: {
    width: 44,
    fontFamily: Fonts.body,
    fontSize: 11,
    textAlign: 'right',
  },
  spineCol: {
    width: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spineGlow: {
    position: 'absolute',
    width: 3,
    top: -8,
    bottom: -8,
    borderRadius: 2,
    opacity: 0.35,
  },
  node: {
    width: 34,
    height: 34,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mono: {
    fontFamily: Fonts.display,
    fontSize: 16,
  },
  taskCard: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 4,
  },
  taskMeta: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 11,
    letterSpacing: 0.3,
  },
  taskTitle: {
    fontFamily: Fonts.bodySemi,
    fontSize: 16,
    letterSpacing: -0.25,
  },
  check: {
    width: 22,
    height: 22,
    borderRadius: 8,
    borderWidth: 2,
  },
  emptyWrap: {
    paddingVertical: 36,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 10,
  },
  emptyTitle: {
    fontFamily: Fonts.display,
    fontSize: 24,
    letterSpacing: -0.3,
  },
  emptyCopy: {
    fontFamily: Fonts.body,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    maxWidth: 280,
  },
  addInline: {
    marginTop: 4,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 11,
  },
  addInlineText: {
    fontFamily: Fonts.bodySemi,
    fontSize: 14,
  },
});
