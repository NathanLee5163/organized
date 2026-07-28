import { useRouter } from 'expo-router';
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
import { BrandMark } from '@/src/components/BrandMark';
import { CategoryFilterChips } from '@/src/components/CategoryFilterChips';
import { EmptyState } from '@/src/components/EmptyState';
import { PressableScale } from '@/src/components/PressableScale';
import { ScreenBackground } from '@/src/components/ScreenBackground';
import { TodoRow } from '@/src/components/TodoRow';
import { WeekStrip } from '@/src/components/WeekStrip';
import { useThemeColors } from '@/src/components/useThemeColors';
import { useAuth } from '@/src/auth/AuthContext';
import { useTodos } from '@/src/context/TodoContext';
import { relativeSyncLabel } from '@/src/utils/dates';

export default function AnytimeScreen() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const {
    dateKey,
    setDateKey,
    anytime,
    markedDates,
    loading,
    syncing,
    lastSyncAt,
    error,
    refresh,
    toggleComplete,
  } = useTodos();

  return (
    <ScreenBackground>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 110 },
        ]}
        refreshControl={
          <RefreshControl refreshing={syncing} onRefresh={refresh} tintColor={colors.tint} />
        }
        showsVerticalScrollIndicator={false}>
        <View>
          <BrandMark subtitle={Brand.tabs.anytime} compact />
          <Text style={[styles.lead, { color: colors.textSecondary }]}>{Copy.anytimeLead}</Text>
          <WeekStrip
            compact
            selectedDate={dateKey}
            onSelectDate={setDateKey}
            markedDates={markedDates}
          />
          <Text style={[styles.sync, { color: colors.textSecondary }]}>
            {isSignedIn ? relativeSyncLabel(lastSyncAt) : Copy.syncLocal}
          </Text>
          <CategoryFilterChips />
        </View>

        {error ? (
          <Text style={[styles.error, { color: colors.danger }]}>{error}</Text>
        ) : null}

        <View style={[styles.sheet, { backgroundColor: colors.timelineCard }]}>
          {loading && anytime.length === 0 ? (
            <ActivityIndicator color={colors.tint} style={{ marginTop: 24 }} />
          ) : (
            <View>
              {anytime.length === 0 ? (
                <EmptyState message="Nothing loose on this day." />
              ) : (
                anytime.map((todo) => (
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

          <PressableScale
            onPress={() =>
              router.push({ pathname: '/edit', params: { date: dateKey, kind: 'anytime' } })
            }
            style={[styles.addBtn, { borderColor: colors.night }]}>
            <Text style={[styles.addText, { color: colors.night }]}>{Copy.dockAnytime}</Text>
          </PressableScale>
        </View>
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 18,
  },
  lead: {
    fontFamily: Fonts.body,
    fontSize: 13,
    marginTop: 4,
    marginBottom: 14,
  },
  sync: {
    fontFamily: Fonts.body,
    fontSize: 12,
    marginBottom: 14,
  },
  sheet: {
    borderRadius: 28,
    padding: 14,
    paddingBottom: 20,
  },
  error: {
    fontFamily: Fonts.body,
    fontSize: 13,
    marginBottom: 8,
  },
  addBtn: {
    marginTop: 12,
    alignSelf: 'center',
    borderWidth: 1.5,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  addText: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 14,
  },
});
