import { StyleSheet, Text, View, type ViewProps } from 'react-native';

import { Fonts } from '@/constants/Colors';
import { useThemeColors } from '@/src/components/useThemeColors';

type Props = ViewProps & {
  title: string;
  footer?: string;
  children: React.ReactNode;
};

export function SettingsSection({ title, footer, children, style, ...rest }: Props) {
  const colors = useThemeColors();

  return (
    <View style={[styles.wrap, style]} {...rest}>
      <Text style={[styles.title, { color: colors.textSecondary }]}>{title}</Text>
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.timelineCard,
            borderColor: colors.hairline,
          },
        ]}>
        {children}
      </View>
      {footer ? (
        <Text style={[styles.footer, { color: colors.textSecondary }]}>{footer}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 22,
  },
  title: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 12,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  footer: {
    fontFamily: Fonts.body,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 8,
    marginHorizontal: 4,
  },
});
