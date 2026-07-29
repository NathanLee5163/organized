import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Fonts } from '@/constants/Colors';
import { CategoryFilterChips } from '@/src/components/CategoryFilterChips';
import { DockResolveSheet } from '@/src/components/DockResolveSheet';
import { DockSheet } from '@/src/components/DockSheet';
import { PressableScale } from '@/src/components/PressableScale';
import { ScreenBackground } from '@/src/components/ScreenBackground';
import { BrandMark } from '@/src/components/BrandMark';
import { SyncStatusBar } from '@/src/components/SyncStatusBar';
import { TimelineBoard } from '@/src/components/TimelineBoard';
import { WeekStrip } from '@/src/components/WeekStrip';
import { useThemeColors } from '@/src/components/useThemeColors';
import { useTodos } from '@/src/context/TodoContext';
import type { Todo } from '@/src/types/todo';
import { dayGreeting } from '@/src/utils/dayGreeting';

export default function TodayScreen() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const {
    dateKey,
    setDateKey,
    schedule,
    markedDates,
    loading,
    refresh,
    toggleComplete,
  } = useTodos();
  const [pulling, setPulling] = useState(false);
  const [resolveTodo, setResolveTodo] = useState<Todo | null>(null);
  const [rescheduleTodo, setRescheduleTodo] = useState<Todo | null>(null);

  const onToggleTodo = (id: string) => {
    const todo = schedule.find((t) => t.id === id);
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
          { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 110 },
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
          <View style={styles.brandRow}>
            <View style={{ flex: 1 }}>
              <BrandMark subtitle={dayGreeting(dateKey)} />
            </View>
            <PressableScale
              onPress={() => router.push({ pathname: '/search' })}
              style={[styles.searchBtn, { borderColor: colors.hairline, backgroundColor: colors.bubble }]}>
              <Text style={[styles.searchLabel, { color: colors.text }]}>Search</Text>
            </PressableScale>
          </View>
          <WeekStrip
            selectedDate={dateKey}
            onSelectDate={setDateKey}
            markedDates={markedDates}
          />
          <SyncStatusBar />
          <CategoryFilterChips />
        </View>

        {loading && schedule.length === 0 ? (
          <ActivityIndicator color={colors.tint} style={{ marginTop: 40 }} />
        ) : (
          <TimelineBoard
            todos={schedule}
            onPressTodo={(todo) =>
              router.push({
                pathname: '/edit',
                params: { id: todo.id, date: dateKey },
              })
            }
            onToggleTodo={onToggleTodo}
            onAdd={() => router.push({ pathname: '/edit', params: { date: dateKey } })}
          />
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
  brandRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 12,
  },
  searchBtn: {
    marginTop: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchLabel: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 13,
  },
});
