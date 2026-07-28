import { ScrollView, StyleSheet, Text, type ViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Fonts } from '@/constants/Colors';
import { ScreenBackground } from '@/src/components/ScreenBackground';
import { useThemeColors } from '@/src/components/useThemeColors';

type Props = ViewProps & {
  /** Shown under the nav bar title */
  subtitle?: string;
  children: React.ReactNode;
};

export function SettingsScreenShell({ subtitle, children, style, ...rest }: Props) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();

  return (
    <ScreenBackground>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: 12, paddingBottom: insets.bottom + 40 },
          style,
        ]}
        showsVerticalScrollIndicator={false}
        {...rest}>
        {subtitle ? (
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
        ) : null}
        {children}
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 18,
  },
  subtitle: {
    fontFamily: Fonts.body,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 18,
  },
});
