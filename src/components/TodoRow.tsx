import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { Fonts } from '@/constants/Colors';
import { useCalendars } from '@/src/calendar/CalendarContext';
import type { Todo } from '@/src/types/todo';
import { minutesToLabel } from '@/src/utils/dates';
import { hapticLight } from '@/src/utils/haptics';
import { taskChipColor } from '@/src/utils/taskFlavor';
import { useThemeColors } from '@/src/components/useThemeColors';

type Props = {
  todo: Todo;
  onPress: () => void;
  onToggle: () => void;
  index?: number;
};

export function TodoRow({ todo, onPress, onToggle }: Props) {
  const colors = useThemeColors();
  const { calendarById, colorForCalendar } = useCalendars();
  const press = useSharedValue(1);
  const check = useSharedValue(todo.completed ? 1 : 0);
  const cal = calendarById(todo.calendarId);
  const accent =
    todo.kind === 'anytime'
      ? colorForCalendar(todo.calendarId, colors.night)
      : cal
        ? colorForCalendar(todo.calendarId, colors.tint)
        : taskChipColor(todo, colors.chipColors, colors.anytimeAccent);

  useEffect(() => {
    check.value = withTiming(todo.completed ? 1 : 0, { duration: 200 });
  }, [check, todo.completed]);

  const timeLabel =
    todo.kind === 'timed' && todo.startMinutes != null
      ? minutesToLabel(todo.startMinutes)
      : null;

  const rowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: press.value }],
  }));

  const checkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 0.9 + check.value * 0.1 }],
    backgroundColor: interpolateColor(check.value, [0, 1], ['transparent', accent]),
    borderColor: interpolateColor(check.value, [0, 1], [accent, accent]),
  }));

  const titleStyle = useAnimatedStyle(() => ({
    opacity: 1 - check.value * 0.55,
  }));

  return (
    <View style={styles.wrap}>
      <Animated.View style={rowStyle}>
        <Pressable
          onPress={onPress}
          onPressIn={() => {
            press.value = withSpring(0.975, { damping: 16, stiffness: 280 });
          }}
          onPressOut={() => {
            press.value = withSpring(1, { damping: 12, stiffness: 220 });
          }}
          style={[
            styles.row,
            {
              backgroundColor: colors.bubble,
              borderColor: colors.hairline,
            },
          ]}>
          <View style={[styles.stripe, { backgroundColor: accent }]} />
          <Pressable
            onPress={() => {
              hapticLight();
              onToggle();
            }}
            hitSlop={12}
            style={styles.checkHit}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: todo.completed }}>
            <Animated.View style={[styles.check, checkStyle]} />
          </Pressable>
          <View style={styles.body}>
            <Animated.View style={titleStyle}>
              <Text
                style={[
                  styles.title,
                  {
                    color: colors.text,
                    textDecorationLine: todo.completed ? 'line-through' : 'none',
                  },
                ]}
                numberOfLines={2}>
                {todo.title}
              </Text>
            </Animated.View>
            <View style={[styles.metaPill, { backgroundColor: colors.muted }]}>
              <Text style={[styles.meta, { color: colors.textSecondary }]}>
                {timeLabel
                  ? `${timeLabel}${todo.durationMinutes ? ` · ${todo.durationMinutes} min` : ''}`
                  : 'Anytime'}
                {todo.recurrence ? ' · repeats' : ''}
                {cal ? ` · ${cal.summary}` : ''}
              </Text>
            </View>
          </View>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  stripe: {
    position: 'absolute',
    left: 0,
    top: 10,
    bottom: 10,
    width: 3,
    borderRadius: 2,
  },
  checkHit: {
    padding: 2,
  },
  check: {
    width: 22,
    height: 22,
    borderRadius: 8,
    borderWidth: 2,
  },
  body: {
    flex: 1,
    gap: 8,
  },
  title: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 16,
    letterSpacing: -0.2,
  },
  metaPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  meta: {
    fontFamily: Fonts.body,
    fontSize: 12,
  },
});
