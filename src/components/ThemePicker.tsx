import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Fonts } from '@/constants/Colors';
import type { AppTheme, ThemeId } from '@/constants/themes';
import { useThemeColors } from '@/src/components/useThemeColors';

type Props = {
  themes: AppTheme[];
  selectedId: ThemeId;
  onSelect: (id: ThemeId) => void;
};

export function ThemePicker({ themes, selectedId, onSelect }: Props) {
  const colors = useThemeColors();

  return (
    <View style={styles.grid}>
      {themes.map((theme) => {
        const selected = theme.id === selectedId;
        return (
          <Pressable
            key={theme.id}
            onPress={() => onSelect(theme.id)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            style={[
              styles.card,
              {
                backgroundColor: selected ? colors.muted : colors.bubble,
                borderColor: selected ? colors.tint : colors.hairline,
              },
            ]}>
            <View style={styles.swatchRow}>
              {theme.swatches.map((hex) => (
                <View key={`${theme.id}-${hex}`} style={[styles.swatch, { backgroundColor: hex }]} />
              ))}
            </View>
            <Text
              style={[
                styles.name,
                {
                  color: colors.text,
                  fontFamily: selected ? Fonts.bodySemi : Fonts.bodyMedium,
                },
              ]}>
              {theme.name}
            </Text>
            <Text style={[styles.blurb, { color: colors.textSecondary }]} numberOfLines={2}>
              {theme.blurb}
            </Text>
            {selected ? (
              <Text style={[styles.active, { color: colors.tint }]}>Active</Text>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  card: {
    width: '47.5%',
    borderRadius: 18,
    borderWidth: 1.5,
    padding: 12,
    minHeight: 108,
  },
  swatchRow: {
    flexDirection: 'row',
    gap: 5,
    marginBottom: 10,
  },
  swatch: {
    width: 16,
    height: 16,
    borderRadius: 6,
  },
  name: {
    fontSize: 15,
    marginBottom: 2,
  },
  blurb: {
    fontFamily: Fonts.body,
    fontSize: 11,
    lineHeight: 15,
  },
  active: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 11,
    marginTop: 8,
  },
});
