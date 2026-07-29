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

import { Brand, Copy } from '@/constants/Brand';
import { Fonts } from '@/constants/Colors';
import { BrandMark } from '@/src/components/BrandMark';
import { DockSheet } from '@/src/components/DockSheet';
import { InboxBoard } from '@/src/components/InboxBoard';
import { ScreenBackground } from '@/src/components/ScreenBackground';
import { useThemeColors } from '@/src/components/useThemeColors';
import { useTodos } from '@/src/context/TodoContext';
import type { Todo } from '@/src/types/todo';

export default function AnytimeScreen() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { anytime, loading, refresh, toggleComplete } = useTodos();
  const [pulling, setPulling] = useState(false);
  const [docking, setDocking] = useState<Todo | null>(null);

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
        <View style={styles.top}>
          <BrandMark subtitle={Brand.tabs.anytime} compact />
          <Text style={[styles.lead, { color: colors.textSecondary }]}>{Copy.anytimeLead}</Text>
        </View>

        {loading && anytime.length === 0 ? (
          <ActivityIndicator color={colors.tint} style={{ marginTop: 28 }} />
        ) : (
          <InboxBoard
            todos={anytime}
            onPressTodo={(todo) =>
              router.push({
                pathname: '/edit',
                params: { id: todo.id, inbox: '1' },
              })
            }
            onToggleTodo={toggleComplete}
            onDockTodo={(todo) => setDocking(todo)}
            onAdd={() =>
              router.push({
                pathname: '/edit',
                params: { kind: 'anytime', inbox: '1' },
              })
            }
          />
        )}
      </ScrollView>

      <DockSheet
        todo={docking}
        visible={Boolean(docking)}
        onClose={() => setDocking(null)}
        onDocked={() => {
          router.push('/');
        }}
      />
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 18,
  },
  top: {
    marginBottom: 8,
  },
  lead: {
    fontFamily: Fonts.body,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
    marginBottom: 6,
  },
});
