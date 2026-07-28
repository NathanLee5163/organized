import { StyleSheet, Text, View } from 'react-native';
import { Fonts } from '@/constants/Colors';
import { useThemeColors } from '@/src/components/useThemeColors';

type Props = {
  title: string;
  subtitle?: string;
};

export function SectionHeader({ title, subtitle }: Props) {
  const colors = useThemeColors();
  return (
    <View style={styles.wrap}>
      <View style={[styles.chip, { backgroundColor: colors.muted }]}>
        <Text style={[styles.title, { color: colors.tint }]}>{title}</Text>
      </View>
      {subtitle ? (
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 22,
    marginBottom: 12,
    gap: 8,
  },
  chip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  title: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 13,
  },
  subtitle: {
    fontFamily: Fonts.body,
    fontSize: 13,
    lineHeight: 18,
    paddingHorizontal: 4,
  },
});
