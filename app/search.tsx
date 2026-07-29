import { useNavigation, useRouter } from 'expo-router';
import { useEffect, useLayoutEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Fonts } from '@/constants/Colors';
import { EmptyState } from '@/src/components/EmptyState';
import { PressableScale } from '@/src/components/PressableScale';
import { useThemeColors } from '@/src/components/useThemeColors';
import { useTodos } from '@/src/context/TodoContext';
import type { Todo } from '@/src/types/todo';
import { formatDisplayDate } from '@/src/utils/dates';

export default function SearchScreen() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const navigation = useNavigation();
  const { searchTodos, setDateKey } = useTodos();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Todo[]>([]);
  const [searching, setSearching] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: 'Search',
      headerStyle: { backgroundColor: colors.background },
      headerTintColor: colors.text,
      headerTitleStyle: { fontFamily: Fonts.bodyMedium, color: colors.text },
    });
  }, [colors.background, colors.text, navigation]);

  useEffect(() => {
    let cancelled = false;
    const q = query.trim();
    if (!q) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const timer = setTimeout(() => {
      void (async () => {
        const rows = await searchTodos(q);
        if (!cancelled) {
          setResults(rows);
          setSearching(false);
        }
      })();
    }, 180);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, searchTodos]);

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: 8 }]}>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Find a task by title"
        placeholderTextColor={colors.textSecondary}
        autoFocus
        clearButtonMode="while-editing"
        style={[
          styles.input,
          {
            backgroundColor: colors.bubble,
            borderColor: colors.hairline,
            color: colors.text,
          },
        ]}
      />

      {searching ? (
        <ActivityIndicator color={colors.tint} style={{ marginTop: 28 }} />
      ) : query.trim() && results.length === 0 ? (
        <View style={{ marginTop: 20, paddingHorizontal: 4 }}>
          <EmptyState
            title="No matches"
            message={`Nothing titled like “${query.trim()}”. Try another word.`}
          />
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <PressableScale
              onPress={() => {
                setDateKey(item.date);
                router.replace({
                  pathname: '/edit',
                  params: { id: item.id, date: item.date },
                });
              }}
              style={[styles.row, { borderBottomColor: colors.hairline }]}>
              <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
                {item.title}
              </Text>
              <Text style={[styles.meta, { color: colors.textSecondary }]}>
                {formatDisplayDate(item.date)}
                {item.recurrence ? ' · repeats' : ''}
                {item.kind === 'anytime' ? ' · anytime' : ''}
              </Text>
            </PressableScale>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: 18,
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: Fonts.body,
    fontSize: 17,
    marginBottom: 8,
  },
  row: {
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 16,
    marginBottom: 4,
  },
  meta: {
    fontFamily: Fonts.body,
    fontSize: 13,
  },
});
