import { StyleSheet, Text, View } from 'react-native';
import { Fonts } from '@/constants/Colors';
import { PressableScale } from '@/src/components/PressableScale';
import { useThemeColors } from '@/src/components/useThemeColors';

type EmptyStateProps = {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function EmptyState({ title, message, actionLabel, onAction }: EmptyStateProps) {
  const colors = useThemeColors();
  return (
    <View style={[styles.box, { backgroundColor: colors.muted }]}>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.text, { color: colors.textSecondary }]}>{message}</Text>
      {actionLabel && onAction ? (
        <PressableScale onPress={onAction} style={[styles.action, { borderColor: colors.hairline }]}>
          <Text style={[styles.actionText, { color: colors.tint }]}>{actionLabel}</Text>
        </PressableScale>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    paddingVertical: 20,
    paddingHorizontal: 18,
    borderRadius: 22,
  },
  title: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 16,
    marginBottom: 6,
  },
  text: {
    fontFamily: Fonts.body,
    fontSize: 14,
    lineHeight: 21,
  },
  action: {
    alignSelf: 'flex-start',
    marginTop: 14,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  actionText: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 14,
  },
});
