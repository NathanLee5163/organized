import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Copy } from '@/constants/Brand';
import { Fonts } from '@/constants/Colors';
import { PressableScale } from '@/src/components/PressableScale';
import { useThemeColors } from '@/src/components/useThemeColors';
import { useAuth } from '@/src/auth/AuthContext';
import { useTodos } from '@/src/context/TodoContext';
import { relativeSyncLabel } from '@/src/utils/dates';

/** Compact sync / sign-in / error strip under the day header. */
export function SyncStatusBar() {
  const colors = useThemeColors();
  const router = useRouter();
  const { isSignedIn, clientConfigured } = useAuth();
  const { syncing, lastSyncAt, error, clearError, refresh } = useTodos();

  if (error) {
    return (
      <View style={[styles.row, { backgroundColor: colors.danger + '22' }]}>
        <Text style={[styles.text, { color: colors.danger, flex: 1 }]} numberOfLines={2}>
          {error}
        </Text>
        <PressableScale
          onPress={() => {
            clearError();
            void refresh();
          }}>
          <Text style={[styles.link, { color: colors.danger }]}>Retry</Text>
        </PressableScale>
      </View>
    );
  }

  if (!clientConfigured) {
    return (
      <PressableScale
        onPress={() => router.push('/settings/account')}
        style={[styles.row, { backgroundColor: colors.muted }]}>
        <Text style={[styles.text, { color: colors.textSecondary, flex: 1 }]}>
          Add Google OAuth keys to sync with Calendar.
        </Text>
        <Text style={[styles.link, { color: colors.tint }]}>Set up</Text>
      </PressableScale>
    );
  }

  if (!isSignedIn) {
    return (
      <PressableScale
        onPress={() => router.push('/settings/account')}
        style={[styles.row, { backgroundColor: colors.muted }]}>
        <Text style={[styles.text, { color: colors.textSecondary, flex: 1 }]}>
          {Copy.syncLocal} · Sign in to sync both ways.
        </Text>
        <Text style={[styles.link, { color: colors.tint }]}>Sign in</Text>
      </PressableScale>
    );
  }

  return (
    <Text style={[styles.quiet, { color: colors.textSecondary }]}>
      {syncing ? 'Syncing…' : relativeSyncLabel(lastSyncAt)}
    </Text>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    marginBottom: 12,
    marginTop: 8,
  },
  text: {
    fontFamily: Fonts.body,
    fontSize: 13,
    lineHeight: 18,
  },
  link: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 13,
  },
  quiet: {
    fontFamily: Fonts.body,
    fontSize: 12,
    marginBottom: 14,
    marginTop: 10,
  },
});
