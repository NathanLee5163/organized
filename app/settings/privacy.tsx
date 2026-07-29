import { useNavigation } from 'expo-router';
import { useLayoutEffect } from 'react';
import { Linking, ScrollView, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Brand } from '@/constants/Brand';
import { Fonts } from '@/constants/Colors';
import { PressableScale } from '@/src/components/PressableScale';
import { useThemeColors } from '@/src/components/useThemeColors';

export default function PrivacyScreen() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  useLayoutEffect(() => {
    navigation.setOptions({
      title: 'Privacy',
      headerStyle: { backgroundColor: colors.background },
      headerTintColor: colors.text,
      headerTitleStyle: { fontFamily: Fonts.bodyMedium, color: colors.text },
    });
  }, [colors.background, colors.text, navigation]);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[
        styles.content,
        { paddingBottom: insets.bottom + 40 },
      ]}
      showsVerticalScrollIndicator={false}>
      <Text style={[styles.h1, { color: colors.text }]}>{Brand.short} privacy</Text>
      <Text style={[styles.p, { color: colors.textSecondary }]}>
        {Brand.short} stores your tasks on this device. When you sign in with Google, we sync
        those tasks with Google Calendar using OAuth. Calendar event titles, times, and
        completion state are sent so your day stays mirrored.
      </Text>
      <Text style={[styles.h2, { color: colors.text }]}>What we access</Text>
      <Text style={[styles.p, { color: colors.textSecondary }]}>
        With your permission: Google account email and Calendar events on calendars you choose.
        We do not sell your data. Tokens stay on device; sync traffic goes to Google’s APIs.
      </Text>
      <Text style={[styles.h2, { color: colors.text }]}>Local data</Text>
      <Text style={[styles.p, { color: colors.textSecondary }]}>
        Tasks, preferences, and sync queue live in on-device storage (SQLite / AsyncStorage).
        Uninstalling the app removes local copies. Google Calendar keeps events already synced
        unless you delete them there or from the app.
      </Text>
      <Text style={[styles.h2, { color: colors.text }]}>Google’s policies</Text>
      <Text style={[styles.p, { color: colors.textSecondary }]}>
        Google Calendar data is also subject to Google’s privacy policy.
      </Text>
      <PressableScale
        onPress={() =>
          Linking.openURL('https://policies.google.com/privacy').catch(() => undefined)
        }>
        <Text style={[styles.link, { color: colors.tint }]}>Google Privacy Policy</Text>
      </PressableScale>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 22,
    paddingTop: 8,
  },
  h1: {
    fontFamily: Fonts.display,
    fontSize: 28,
    letterSpacing: -0.4,
    marginBottom: 12,
  },
  h2: {
    fontFamily: Fonts.bodySemi,
    fontSize: 16,
    marginTop: 22,
    marginBottom: 8,
  },
  p: {
    fontFamily: Fonts.body,
    fontSize: 15,
    lineHeight: 23,
  },
  link: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 15,
    marginTop: 10,
  },
});
