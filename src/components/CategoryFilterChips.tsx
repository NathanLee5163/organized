import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Fonts } from '@/constants/Colors';
import { useAuth } from '@/src/auth/AuthContext';
import { useCalendars } from '@/src/calendar/CalendarContext';
import { useThemeColors } from '@/src/components/useThemeColors';
import { useTodos } from '@/src/context/TodoContext';

export function CategoryFilterChips() {
  const colors = useThemeColors();
  const { isSignedIn } = useAuth();
  const { calendars, readIds, toggleCategory } = useCalendars();
  const { onCategoriesChanged } = useTodos();

  if (!isSignedIn || calendars.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>Categories</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}>
        {calendars.map((cal) => {
          const on = readIds.includes(cal.id);
          const tint = cal.backgroundColor ?? colors.tint;
          return (
            <Pressable
              key={cal.id}
              onPress={() => {
                void (async () => {
                  await toggleCategory(cal.id);
                  await onCategoriesChanged();
                })();
              }}
              style={[
                styles.chip,
                {
                  borderColor: on ? tint : colors.hairline,
                  backgroundColor: on ? tint + '33' : colors.muted,
                },
              ]}>
              <View style={[styles.dot, { backgroundColor: tint }]} />
              <Text
                style={[
                  styles.chipText,
                  {
                    color: on ? colors.text : colors.textSecondary,
                    fontFamily: on ? Fonts.bodySemi : Fonts.body,
                  },
                ]}
                numberOfLines={1}>
                {cal.summary}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 12,
    gap: 8,
  },
  label: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 12,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  row: {
    gap: 8,
    paddingRight: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    maxWidth: 180,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  chipText: {
    fontSize: 13,
  },
});
