import { StyleSheet, Text, View } from 'react-native';
import { Fonts } from '@/constants/Colors';
import { useThemeColors } from '@/src/components/useThemeColors';

export function EmptyState({ message }: { message: string }) {
  const colors = useThemeColors();
  return (
    <View style={[styles.box, { backgroundColor: colors.muted }]}>
      <Text style={[styles.text, { color: colors.textSecondary }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    paddingVertical: 18,
    paddingHorizontal: 18,
    borderRadius: 22,
  },
  text: {
    fontFamily: Fonts.body,
    fontSize: 14,
    lineHeight: 21,
  },
});
