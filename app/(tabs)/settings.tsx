import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, Platform, ScrollView, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Brand } from '@/constants/Brand';
import { Fonts } from '@/constants/Colors';
import { useAuth } from '@/src/auth/AuthContext';
import { ScreenBackground } from '@/src/components/ScreenBackground';
import { SettingsRow } from '@/src/components/settings/SettingsRow';
import { SettingsSection } from '@/src/components/settings/SettingsSection';
import { useThemeColors } from '@/src/components/useThemeColors';
import { getNotificationPermissionStatus } from '@/src/notifications/schedule';
import { usePreferences } from '@/src/preferences/PreferencesContext';
import { useAppTheme } from '@/src/theme/ThemeContext';

export default function SettingsHomeScreen() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { theme } = useAppTheme();
  const { isSignedIn, email, clientConfigured } = useAuth();
  const { taskRemindersEnabled, morningBriefingEnabled } = usePreferences();
  const [notifStatus, setNotifStatus] = useState('…');

  useEffect(() => {
    getNotificationPermissionStatus().then((status) => {
      if (status === 'granted') {
        setNotifStatus(
          taskRemindersEnabled || morningBriefingEnabled ? 'On' : 'Permission on'
        );
      } else if (status === 'denied') setNotifStatus('Off');
      else if (status === 'unavailable') setNotifStatus('Unavailable');
      else setNotifStatus('Set Up');
    });
  }, [taskRemindersEnabled, morningBriefingEnabled]);

  const accountValue = !clientConfigured
    ? 'Configure'
    : isSignedIn
      ? 'Connected'
      : 'Set Up';

  return (
    <ScreenBackground>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 10, paddingBottom: insets.bottom + 120 },
        ]}
        showsVerticalScrollIndicator={false}>
        <Text style={[styles.pageTitle, { color: colors.text }]}>Settings</Text>
        <Text style={[styles.pageLead, { color: colors.textSecondary }]}>
          General preferences and integrations for {Brand.short}.
        </Text>

        <SettingsSection title="General">
          <SettingsRow
            label="Notifications & Alerts"
            subtitle="Reminders before timed tasks"
            value={notifStatus}
            icon={{ ios: 'bell.fill', android: 'notifications', web: 'notifications' }}
            iconColor="#7DAB90"
            onPress={() => router.push('/settings/notifications')}
          />
          <SettingsRow
            label="Customization"
            subtitle="Themes and visual style"
            value={theme.name}
            icon={{ ios: 'paintbrush.fill', android: 'brush', web: 'brush' }}
            iconColor="#E8836F"
            onPress={() => router.push('/settings/customization')}
          />
          <SettingsRow
            label="Advanced"
            subtitle="Defaults, week start, haptics"
            icon={{ ios: 'gearshape.2.fill', android: 'tune', web: 'tune' }}
            iconColor="#5B8DEF"
            last
            onPress={() => router.push('/settings/advanced')}
          />
        </SettingsSection>

        <SettingsSection title="Integrations">
          <SettingsRow
            label="Google Calendar"
            subtitle={isSignedIn ? email ?? 'Connected' : 'Sync tasks both ways'}
            value={accountValue}
            icon={{ ios: 'calendar', android: 'calendar_month', web: 'calendar_month' }}
            iconColor="#E86B8A"
            last
            onPress={() => router.push('/settings/account')}
          />
        </SettingsSection>

        <SettingsSection title="About">
          <SettingsRow label="Version" value={Constants.expoConfig?.version ?? '1.0.0'} />
          <SettingsRow
            label="Privacy"
            subtitle="How calendar data is handled"
            last
            onPress={() =>
              Linking.openURL('https://policies.google.com/privacy').catch(() => undefined)
            }
          />
        </SettingsSection>

        {Platform.OS === 'web' ? (
          <Text style={[styles.hint, { color: colors.textSecondary }]}>
            Alerts need iOS or Android — web can still change themes and account settings.
          </Text>
        ) : null}
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 18,
  },
  pageTitle: {
    fontFamily: Fonts.display,
    fontSize: 32,
    letterSpacing: -0.6,
    marginBottom: 6,
  },
  pageLead: {
    fontFamily: Fonts.body,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 22,
  },
  hint: {
    fontFamily: Fonts.body,
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
    marginTop: 8,
  },
});
