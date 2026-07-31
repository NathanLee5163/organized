import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Fonts } from '@/constants/Colors';
import { DockResolveSheet } from '@/src/components/DockResolveSheet';
import { DockSheet } from '@/src/components/DockSheet';
import { FlowBoard } from '@/src/components/FlowBoard';
import { MonthBoard } from '@/src/components/MonthBoard';
import { PressableScale } from '@/src/components/PressableScale';
import { ScreenBackground } from '@/src/components/ScreenBackground';
import { useThemeColors } from '@/src/components/useThemeColors';
import { useTodos } from '@/src/context/TodoContext';
import type { Todo } from '@/src/types/todo';
import {
  addDays,
  formatDisplayDate,
  parseDateKey,
  startOfMonth,
  toDateKey,
} from '@/src/utils/dates';
import { hapticLight } from '@/src/utils/haptics';

type MonthView = 'month' | 'day';

function weekdayLong(dateKey: string): string {
  return parseDateKey(dateKey).toLocaleDateString(undefined, { weekday: 'long' });
}

function monthDayLong(dateKey: string): string {
  return parseDateKey(dateKey).toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Month tab — full calendar, then drill into a day without leaving the tab.
 * Kept deliberately un-animated so chips / lists don’t flicker on sync.
 */
export default function CalendarScreen() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const {
    dateKey,
    setDateKey,
    todos,
    monthTodosByDate,
    loading,
    refresh,
    ensureMonthSynced,
    toggleComplete,
  } = useTodos();
  const [pulling, setPulling] = useState(false);
  const [view, setView] = useState<MonthView>('month');
  const [monthCursor, setMonthCursor] = useState(startOfMonth(dateKey));
  const [focusDate, setFocusDate] = useState(dateKey);
  const [resolveTodo, setResolveTodo] = useState<Todo | null>(null);
  const [rescheduleTodo, setRescheduleTodo] = useState<Todo | null>(null);
  const monthSyncKey = useRef<string | null>(null);

  const todayKey = toDateKey(new Date());
  const isToday = focusDate === todayKey;

  // Sync only the visible month — neighbor prefetch used to replace the chip
  // map and make half the grid vanish after load.
  useEffect(() => {
    if (monthSyncKey.current === monthCursor) return;
    monthSyncKey.current = monthCursor;
    void ensureMonthSynced(monthCursor);
  }, [monthCursor, ensureMonthSynced]);

  const openDay = (key: string) => {
    hapticLight();
    setFocusDate(key);
    setView('day');
    // Seed from month chips so the day paints before SQLite/Google finish.
    setDateKey(key, { seed: monthTodosByDate[key] ?? [] });
  };

  const backToMonth = () => {
    hapticLight();
    setMonthCursor(startOfMonth(focusDate));
    setView('month');
  };

  const jumpToday = () => {
    hapticLight();
    const today = toDateKey(new Date());
    setFocusDate(today);
    setMonthCursor(startOfMonth(today));
    if (view === 'day') setDateKey(today, { seed: monthTodosByDate[today] ?? [] });
  };

  const shiftDay = (delta: number) => {
    hapticLight();
    const next = addDays(focusDate, delta);
    setFocusDate(next);
    setDateKey(next, { seed: monthTodosByDate[next] ?? [] });
  };

  const openMenu = () => {
    const today = toDateKey(new Date());
    const add = () =>
      router.push({ pathname: '/edit', params: { date: focusDate || today } });
    const sync = () => {
      monthSyncKey.current = null;
      void refresh();
    };

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Go to today', 'Add on selected day', 'Sync'],
          cancelButtonIndex: 0,
        },
        (i) => {
          if (i === 1) jumpToday();
          if (i === 2) add();
          if (i === 3) sync();
        }
      );
      return;
    }

    Alert.alert('Month', undefined, [
      { text: 'Go to today', onPress: jumpToday },
      { text: 'Add on selected day', onPress: add },
      { text: 'Sync', onPress: sync },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const onToggleTodo = (id: string) => {
    const todo = dayTodos.find((t) => t.id === id);
    if ((todo?.dockedFromLoose || todo?.goalId) && !todo.completed) {
      setResolveTodo(todo);
      return;
    }
    void toggleComplete(id);
  };

  // Prefer live day list once loaded; fall back to month cache so the day doesn’t blank.
  // TodoContext keeps a seeded list from shrinking on a thin SQLite read.
  const dayTodos = useMemo(() => {
    const live = todos.filter((t) => !t.inbox);
    if (live.length > 0) return live;
    return (monthTodosByDate[focusDate] ?? []).filter((t) => !t.inbox);
  }, [todos, monthTodosByDate, focusDate]);

  const openCount = dayTodos.filter((t) => !t.completed).length;
  const showDaySpinner = loading && dayTodos.length === 0 && view === 'day';

  return (
    <ScreenBackground>
      {view === 'month' ? (
        <View style={styles.flex}>
          <ScrollView
            contentContainerStyle={[
              styles.content,
              {
                paddingTop: insets.top + 6,
                paddingBottom: insets.bottom + 110,
                flexGrow: 1,
              },
            ]}
            refreshControl={
              <RefreshControl
                refreshing={pulling}
                onRefresh={() => {
                  setPulling(true);
                  monthSyncKey.current = null;
                  void refresh().finally(() => setPulling(false));
                }}
                tintColor={colors.tint}
              />
            }
            showsVerticalScrollIndicator={false}>
            <MonthBoard
              selectedDate={focusDate}
              onSelectDate={openDay}
              monthCursor={monthCursor}
              onMonthChange={setMonthCursor}
              todosByDate={monthTodosByDate}
              onPressMore={openMenu}
              onJumpToday={jumpToday}
            />
          </ScrollView>
        </View>
      ) : (
        <View style={styles.flex}>
          <ScrollView
            contentContainerStyle={[
              styles.dayContent,
              {
                paddingTop: insets.top + 6,
                paddingBottom: insets.bottom + 110,
              },
            ]}
            refreshControl={
              <RefreshControl
                refreshing={pulling}
                onRefresh={() => {
                  setPulling(true);
                  void refresh().finally(() => setPulling(false));
                }}
                tintColor={colors.tint}
              />
            }
            showsVerticalScrollIndicator={false}>
            <View style={styles.dayHeader}>
              <PressableScale
                onPress={backToMonth}
                style={[
                  styles.backBtn,
                  { backgroundColor: colors.bubble, borderColor: colors.hairline },
                ]}
                scaleTo={0.94}>
                <Text style={[styles.backChevron, { color: colors.text }]}>‹</Text>
                <Text style={[styles.backLabel, { color: colors.text }]}>Month</Text>
              </PressableScale>

              <View style={styles.dayNav}>
                <PressableScale
                  onPress={() => shiftDay(-1)}
                  style={[
                    styles.dayArrow,
                    { backgroundColor: colors.bubble, borderColor: colors.hairline },
                  ]}
                  scaleTo={0.9}>
                  <Text style={{ color: colors.text, fontSize: 18 }}>‹</Text>
                </PressableScale>
                <PressableScale
                  onPress={() => shiftDay(1)}
                  style={[
                    styles.dayArrow,
                    { backgroundColor: colors.bubble, borderColor: colors.hairline },
                  ]}
                  scaleTo={0.9}>
                  <Text style={{ color: colors.text, fontSize: 18 }}>›</Text>
                </PressableScale>
              </View>
            </View>

            <View
              style={[
                styles.dayHero,
                { backgroundColor: colors.muted, borderColor: colors.hairline },
              ]}>
              <LinearGradient
                pointerEvents="none"
                colors={[colors.tintSoft + '66', 'transparent']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.dayHeroTop}>
                <Text style={[styles.dayEyebrow, { color: colors.textSecondary }]}>
                  {weekdayLong(focusDate)}
                </Text>
                {isToday ? (
                  <View style={[styles.todayBadge, { backgroundColor: colors.tint }]}>
                    <Text style={[styles.todayBadgeText, { color: colors.onTint }]}>Today</Text>
                  </View>
                ) : (
                  <PressableScale onPress={jumpToday} hitSlop={8}>
                    <Text style={[styles.jumpToday, { color: colors.tint }]}>Jump to today</Text>
                  </PressableScale>
                )}
              </View>
              <Text style={[styles.dayTitle, { color: colors.text }]}>
                {formatDisplayDate(focusDate) === 'Today' ||
                formatDisplayDate(focusDate) === 'Tomorrow'
                  ? monthDayLong(focusDate)
                  : formatDisplayDate(focusDate)}
              </Text>
              <Text style={[styles.dayMeta, { color: colors.textSecondary }]}>
                {openCount === 0
                  ? 'Nothing scheduled yet'
                  : openCount === 1
                    ? '1 open block on this day'
                    : `${openCount} open blocks on this day`}
              </Text>
            </View>

            {showDaySpinner ? (
              <ActivityIndicator color={colors.tint} style={{ marginTop: 36 }} />
            ) : (
              <FlowBoard
                mode="day"
                eyebrow="Schedule"
                addLabel="+ Add"
                emptyTitle="Open runway"
                emptyMessage="This day is clear. Add a timed block, or flip back to the month."
                emptyCta="Add task"
                todos={dayTodos}
                animateEnter={false}
                onPressTodo={(todo) =>
                  router.push({
                    pathname: '/edit',
                    params: { id: todo.id, date: focusDate },
                  })
                }
                onToggleTodo={onToggleTodo}
                onAdd={() => router.push({ pathname: '/edit', params: { date: focusDate } })}
              />
            )}

            <Pressable
              onPress={backToMonth}
              style={[styles.footBack, { borderColor: colors.hairline }]}
              hitSlop={8}>
              <Text style={{ color: colors.textSecondary, fontFamily: Fonts.bodyMedium }}>
                ← Back to month
              </Text>
            </Pressable>
          </ScrollView>
        </View>
      )}

      <DockResolveSheet
        todo={resolveTodo}
        visible={Boolean(resolveTodo)}
        onClose={() => setResolveTodo(null)}
        onReturnedToLoose={() => router.push('/anytime')}
        onReturnedToGoals={() => router.push('/anytime')}
        onReschedule={(todo) => {
          setResolveTodo(null);
          setRescheduleTodo(todo);
        }}
      />
      <DockSheet
        todo={rescheduleTodo}
        visible={Boolean(rescheduleTodo)}
        mode="reschedule"
        onClose={() => setRescheduleTodo(null)}
        onDocked={(date) => {
          setFocusDate(date);
          setDateKey(date);
          setView('day');
        }}
      />
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    paddingBottom: 24,
  },
  dayContent: {
    paddingHorizontal: 18,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    borderRadius: 999,
    paddingLeft: 10,
    paddingRight: 14,
    paddingVertical: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  backChevron: {
    fontFamily: Fonts.bodySemi,
    fontSize: 22,
    lineHeight: 24,
    marginTop: -1,
  },
  backLabel: {
    fontFamily: Fonts.bodySemi,
    fontSize: 15,
  },
  dayNav: {
    flexDirection: 'row',
    gap: 8,
  },
  dayArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  dayHero: {
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 18,
    marginBottom: 20,
    overflow: 'hidden',
  },
  dayHeroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  dayEyebrow: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 12,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  todayBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  todayBadgeText: {
    fontFamily: Fonts.bodySemi,
    fontSize: 11,
  },
  jumpToday: {
    fontFamily: Fonts.bodySemi,
    fontSize: 13,
  },
  dayTitle: {
    fontFamily: Fonts.display,
    fontSize: 34,
    letterSpacing: -0.7,
    marginBottom: 6,
  },
  dayMeta: {
    fontFamily: Fonts.body,
    fontSize: 14,
    lineHeight: 20,
  },
  footBack: {
    alignItems: 'center',
    paddingVertical: 16,
    marginTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
