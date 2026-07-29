import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Brand } from '@/constants/Brand';
import { BrandMark } from '@/src/components/BrandMark';
import { DockResolveSheet } from '@/src/components/DockResolveSheet';
import { DockSheet } from '@/src/components/DockSheet';
import { FlowBoard } from '@/src/components/FlowBoard';
import { MiniMonthCalendar } from '@/src/components/MiniMonthCalendar';
import { ScreenBackground } from '@/src/components/ScreenBackground';
import { SyncStatusBar } from '@/src/components/SyncStatusBar';
import { useThemeColors } from '@/src/components/useThemeColors';
import { useTodos } from '@/src/context/TodoContext';
import type { Todo } from '@/src/types/todo';
import { formatDisplayDate, startOfMonth } from '@/src/utils/dates';

export default function CalendarScreen() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const {
    dateKey,
    setDateKey,
    todos,
    markedDates,
    loading,
    refresh,
    ensureMonthSynced,
    toggleComplete,
  } = useTodos();
  const [pulling, setPulling] = useState(false);
  const [resolveTodo, setResolveTodo] = useState<Todo | null>(null);
  const [rescheduleTodo, setRescheduleTodo] = useState<Todo | null>(null);

  const [monthCursor, setMonthCursor] = useState(startOfMonth(dateKey));

  useEffect(() => {
    setMonthCursor(startOfMonth(dateKey));
  }, [dateKey]);

  useEffect(() => {
    void ensureMonthSynced(monthCursor);
  }, [monthCursor, ensureMonthSynced]);

  const onToggleTodo = (id: string) => {
    const todo = todos.find((t) => t.id === id);
    if (todo?.dockedFromLoose && !todo.completed) {
      setResolveTodo(todo);
      return;
    }
    void toggleComplete(id);
  };

  return (
    <ScreenBackground>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 10, paddingBottom: insets.bottom + 110 },
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
        <View>
          <BrandMark subtitle={Brand.tabs.calendar} compact />
          <SyncStatusBar />
          <MiniMonthCalendar
            selectedDate={dateKey}
            onSelectDate={setDateKey}
            monthCursor={monthCursor}
            onMonthChange={setMonthCursor}
            markedDates={markedDates}
          />
        </View>

        {loading && todos.length === 0 ? (
          <ActivityIndicator color={colors.tint} style={{ marginTop: 28 }} />
        ) : (
          <View style={styles.flow}>
            <FlowBoard
              mode="day"
              eyebrow={formatDisplayDate(dateKey)}
              addLabel="+ Dock"
              emptyTitle="Nothing on this day"
              emptyMessage="Dock a task for this date, or pull to refresh after signing in."
              emptyCta="Add task"
              todos={todos}
              onPressTodo={(todo) =>
                router.push({
                  pathname: '/edit',
                  params: { id: todo.id, date: dateKey },
                })
              }
              onToggleTodo={onToggleTodo}
              onAdd={() => router.push({ pathname: '/edit', params: { date: dateKey } })}
            />
          </View>
        )}
      </ScrollView>

      <DockResolveSheet
        todo={resolveTodo}
        visible={Boolean(resolveTodo)}
        onClose={() => setResolveTodo(null)}
        onReturnedToLoose={() => router.push('/anytime')}
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
        onDocked={(date) => setDateKey(date)}
      />
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 18,
  },
  flow: {
    marginTop: 18,
  },
});
