import { StyleSheet, Text, View } from 'react-native';

import { Brand } from '@/constants/Brand';
import { Fonts } from '@/constants/Colors';
import { useThemeColors } from '@/src/components/useThemeColors';

type Props = {
  subtitle?: string;
  compact?: boolean;
};

export function BrandMark({ subtitle, compact }: Props) {
  const colors = useThemeColors();

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <View style={[styles.dot, { backgroundColor: colors.tint }]} />
        <Text
          style={[
            styles.word,
            { color: colors.text, fontSize: compact ? 18 : 22 },
          ]}>
          {Brand.short}
        </Text>
      </View>
      {subtitle ? (
        <Text style={[styles.sub, { color: colors.textSecondary }]} numberOfLines={1}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  word: {
    fontFamily: Fonts.display,
    letterSpacing: -0.4,
  },
  sub: {
    fontFamily: Fonts.body,
    fontSize: 13,
    marginLeft: 16,
  },
});
