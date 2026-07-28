import { StyleSheet, Text, View } from 'react-native';

import { Fonts } from '@/constants/Colors';
import { SettingsScreenShell } from '@/src/components/settings/SettingsScreenShell';
import { SettingsSection } from '@/src/components/settings/SettingsSection';
import { ThemePicker } from '@/src/components/ThemePicker';
import { useThemeColors } from '@/src/components/useThemeColors';
import { useAppTheme } from '@/src/theme/ThemeContext';

export default function CustomizationScreen() {
  const colors = useThemeColors();
  const { themeId, theme, themes, setThemeId } = useAppTheme();

  return (
    <SettingsScreenShell subtitle="Pick a look for Runway, calendars, and the rest of the app.">
      <SettingsSection title="Theme" footer="Saved on this device.">
        <View style={styles.themeBlock}>
          <Text style={[styles.active, { color: colors.textSecondary }]}>
            Current · {theme.name}
          </Text>
          <Text style={[styles.blurb, { color: colors.textSecondary }]}>{theme.blurb}</Text>
          <ThemePicker themes={themes} selectedId={themeId} onSelect={setThemeId} />
        </View>
      </SettingsSection>
    </SettingsScreenShell>
  );
}

const styles = StyleSheet.create({
  themeBlock: {
    padding: 14,
    gap: 10,
  },
  active: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 12,
    letterSpacing: 0.2,
  },
  blurb: {
    fontFamily: Fonts.body,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 4,
  },
});
