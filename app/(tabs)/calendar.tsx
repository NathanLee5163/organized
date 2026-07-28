import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Brand, Copy } from '@/constants/Brand';
import { Fonts } from '@/constants/Colors';
import { useAuth } from '@/src/auth/AuthContext';
import { BrandMark } from '@/src/components/BrandMark';
import { EmptyState } from '@/src/components/EmptyState';
import { MiniMonthCalendar } from '@/src/components/MiniMonthCalendar';
import { ScreenBackground } from '@/src/components/ScreenBackground';
import { TodoRow } from '@/src/components/TodoRow';
import { useThemeColors } from '@/src/components/useThemeColors';
import { useTodos } from '@/src/context/TodoContext';
import { formatDisplayDate, relativeSyncLabel, startOfMonth } from '@/src/utils/dates';

export default function CalendarScreen() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const {
    dateKey,
    setDateKey,
    todos,
    markedDates,
    loading,
    syncing,
    lastSyncAt,
    error,
    refresh,
    ensureMonthSynced,
    toggleComplete,
  } = useTodos();

  const [monthCursor, setMonthCursor] = useState(startOfMonth(dateKey));

  useEffect(() => {
    setMonthCursor(startOfMonth(dateKey));
  }, [dateKey]);

  useEffect(() => {
    void ensureMonthSynced(monthCursor);
  }, [monthCursor, ensureMonthSynced]);

  return (
    <ScreenBackground>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 10, paddingBottom: insets.bottom + 110 },
        ]}
        refreshControl={
          <RefreshControl refreshing={syncing} onRefresh={refresh} tintColor={colors.tint} />
        }
        showsVerticalScrollIndicator={false}>
        <View>
          <BrandMark subtitle={Brand.tabs.calendar} compact />
          <Text style={[styles.lead, { color: colors.textSecondary }]}>
            {isSignedIn ? relativeSyncLabel(lastSyncAt) : Copy.syncLocal}
          </Text>
          <MiniMonthCalendar
            selectedDate={dateKey}
            onSelectDate={setDateKey}
            monthCursor={monthCursor}
            onMonthChange={setMonthCursor}
            markedDates={markedDates}
          />
        </View>

        {error ? (
          <Text style={[styles.error, { color: colors.danger }]}>{error}</Text>
        ) : null}

        <Text style={[styles.dayTitle, { color: colors.text }]}>
          {formatDisplayDate(dateKey)}
        </Text>

        {loading && todos.length === 0 ? (
          <ActivityIndicator color={colors.tint} style={{ marginTop: 24 }} />
        ) : (
          <View>
            {todos.length === 0 ? (
              <EmptyState message="Nothing on this day yet." />
            ) : (
              todos.map((todo) => (
                <TodoRow
                  key={todo.id}
                  todo={todo}
                  onPress={() => router.push({ pathname: '/edit', params: { id: todo.id } })}
                  onToggle={() => toggleComplete(todo.id)}
                />
              ))
            )}
          </View>
        )}
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 18,
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: 30,
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  lead: {
    fontFamily: Fonts.body,
    fontSize: 13,
    marginBottom: 16,
  },
  dayTitle: {
    fontFamily: Fonts.bodySemi,
    fontSize: 18,
    marginTop: 22,
    marginBottom: 12,
  },
  error: {
    fontFamily: Fonts.body,
    fontSize: 13,
    marginTop: 12,
  },
});
