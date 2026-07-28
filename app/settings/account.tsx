import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import Constants from 'expo-constants';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Fonts } from '@/constants/Colors';
import { useAuth } from '@/src/auth/AuthContext';
import { useCalendars } from '@/src/calendar/CalendarContext';
import { SettingsRow } from '@/src/components/settings/SettingsRow';
import { SettingsScreenShell } from '@/src/components/settings/SettingsScreenShell';
import { SettingsSection } from '@/src/components/settings/SettingsSection';
import { useThemeColors } from '@/src/components/useThemeColors';
import { useTodos } from '@/src/context/TodoContext';
import type { GoogleCalendarListEntry } from '@/src/types/todo';
import { relativeSyncLabel } from '@/src/utils/dates';

function canRemoveCategory(cal: GoogleCalendarListEntry): boolean {
  return !cal.primary;
}

export default function AccountSettingsScreen() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const { isSignedIn, email, clientConfigured, signIn, signOut } = useAuth();
  const { refresh, lastSyncAt, syncing, onCategoriesChanged } = useTodos();
  const {
    calendars,
    readIds,
    writeCalendarId,
    loading: calendarsLoading,
    reload,
    toggleCategory,
    setWriteCalendar,
    createCategory,
    deleteCategory,
  } = useCalendars();
  const [busy, setBusy] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (isSignedIn) reload();
  }, [isSignedIn, reload]);

  const onSignIn = async () => {
    try {
      setBusy(true);
      await signIn();
      await refresh();
      await reload();
    } catch (e) {
      Alert.alert('Sign-in failed', e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setBusy(false);
    }
  };

  const onSignOut = () => {
    Alert.alert('Sign out', 'Disconnect Google Calendar from this device?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
        },
      },
    ]);
  };

  const onSyncNow = async () => {
    try {
      setBusy(true);
      await refresh();
      await reload();
    } catch (e) {
      Alert.alert('Sync failed', e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setBusy(false);
    }
  };

  const onToggleCategory = useCallback(
    async (id: string) => {
      await toggleCategory(id);
      await onCategoriesChanged();
    },
    [onCategoriesChanged, toggleCategory]
  );

  const onSelectWrite = async (id: string) => {
    await setWriteCalendar(id);
    await refresh();
  };

  const onCreateCategory = async () => {
    const name = newName.trim();
    if (!name) {
      Alert.alert('Name required', 'Enter a category name.');
      return;
    }
    try {
      setCreating(true);
      await createCategory(name);
      setNewName('');
      setCreateOpen(false);
      await refresh();
    } catch (e) {
      Alert.alert('Couldn’t create category', e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setCreating(false);
    }
  };

  const onDeleteCategory = (cal: GoogleCalendarListEntry) => {
    if (cal.primary) {
      Alert.alert('Can’t delete', 'Your primary Google calendar can’t be removed.');
      return;
    }

    const owned = cal.accessRole === 'owner';
    Alert.alert(
      owned ? 'Delete category?' : 'Remove category?',
      owned
        ? `“${cal.summary}” will be deleted from Google Calendar, including its events. This can’t be undone.`
        : `“${cal.summary}” will be removed from your account list. The shared calendar itself stays for other people.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: owned ? 'Delete' : 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              setBusy(true);
              await deleteCategory(cal.id);
              await refresh();
            } catch (e) {
              Alert.alert(
                'Couldn’t remove category',
                e instanceof Error ? e.message : 'Unknown error'
              );
            } finally {
              setBusy(false);
            }
          },
        },
      ]
    );
  };

  return (
    <SettingsScreenShell subtitle="Connect your account and choose which Google calendars to show.">
      <SettingsSection
        title="Account"
        footer={
          !clientConfigured
            ? 'Add EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID to .env, then restart Expo. See docs/SETUP.md.'
            : isSignedIn
              ? 'Tasks write to your default category and appear from enabled ones.'
              : 'Use a development build on iPhone — Expo Go blocks Google OAuth redirects.'
        }>
        {isSignedIn ? (
          <>
            <SettingsRow label="Signed in as" subtitle={email ?? 'Google account'} value="Connected" />
            <SettingsRow
              label="Last sync"
              value={lastSyncAt ? relativeSyncLabel(lastSyncAt) : 'Never'}
            />
            <SettingsRow
              label="Sync now"
              subtitle={syncing || busy ? 'Working…' : 'Refresh events from Google'}
              onPress={onSyncNow}
              disabled={busy || syncing}
            />
            <SettingsRow label="Sign out" destructive last onPress={onSignOut} />
          </>
        ) : (
          <Pressable
            onPress={onSignIn}
            disabled={busy || !clientConfigured}
            style={({ pressed }) => [
              styles.connectRow,
              { opacity: busy || !clientConfigured ? 0.55 : pressed ? 0.85 : 1 },
            ]}>
            {busy ? (
              <ActivityIndicator color={colors.tint} />
            ) : (
              <Text style={[styles.connectText, { color: colors.tint }]}>Connect Google</Text>
            )}
          </Pressable>
        )}
      </SettingsSection>

      {isSignedIn ? (
        <>
          <SettingsSection
            title="Categories"
            footer="Turn calendars on or off to show them in Runway and Anytime.">
            {calendars.length === 0 ? (
              <SettingsRow
                label={busy || calendarsLoading ? 'Loading…' : 'No calendars found'}
                last
              />
            ) : (
              calendars.map((cal, index) => {
                const tint = cal.backgroundColor ?? colors.tint;
                return (
                  <View
                    key={`cat-${cal.id}`}
                    style={[
                      styles.categoryRow,
                      index < calendars.length - 1 && {
                        borderBottomWidth: StyleSheet.hairlineWidth,
                        borderBottomColor: colors.hairline,
                      },
                    ]}>
                    <View style={[styles.dot, { backgroundColor: tint }]} />
                    <View style={styles.categoryCopy}>
                      <Text style={[styles.categoryName, { color: colors.text }]}>
                        {cal.summary}
                      </Text>
                      <Text style={{ color: colors.textSecondary, fontFamily: Fonts.body, fontSize: 12 }}>
                        {cal.primary ? 'Primary · ' : ''}
                        {writeCalendarId === cal.id ? 'Default for new tasks' : 'Google calendar'}
                      </Text>
                    </View>
                    <Switch
                      value={readIds.includes(cal.id)}
                      onValueChange={() => onToggleCategory(cal.id)}
                      trackColor={{ true: tint, false: colors.border }}
                      thumbColor="#F7F8FA"
                    />
                  </View>
                );
              })
            )}
          </SettingsSection>

          <SettingsSection title="Default for new tasks" footer="New tasks you create are saved here.">
            {calendars.length === 0 ? (
              <SettingsRow label="No calendars found" last />
            ) : (
              calendars.map((cal, index) => (
                <SettingsRow
                  key={`write-${cal.id}`}
                  label={cal.summary}
                  subtitle={cal.primary ? 'Primary calendar' : undefined}
                  value={writeCalendarId === cal.id ? 'Selected' : undefined}
                  last={index === calendars.length - 1}
                  onPress={() => onSelectWrite(cal.id)}
                />
              ))
            )}
          </SettingsSection>

          <SettingsSection
            title="Manage categories"
            footer="Create or permanently remove Google calendars. Kept here so it isn’t easy to do by accident.">
            <SettingsRow
              label="New category"
              subtitle="Creates a calendar in Google"
              onPress={() => {
                setNewName('');
                setCreateOpen(true);
              }}
              disabled={busy}
            />
            {calendars.filter(canRemoveCategory).length === 0 ? (
              <SettingsRow
                label="No removable categories"
                subtitle="Primary calendar stays; shared ones may be removable"
                last
              />
            ) : (
              calendars.filter(canRemoveCategory).map((cal, index, list) => (
                <SettingsRow
                  key={`del-${cal.id}`}
                  label={cal.summary}
                  subtitle={
                    cal.accessRole === 'owner'
                      ? 'Deletes calendar + events in Google'
                      : 'Removes from your list only'
                  }
                  destructive
                  last={index === list.length - 1}
                  onPress={() => onDeleteCategory(cal)}
                  disabled={busy}
                />
              ))
            )}
          </SettingsSection>
        </>
      ) : null}

      <SettingsSection title="App identity">
        <SettingsRow
          label="Bundle ID"
          value={Constants.expoConfig?.ios?.bundleIdentifier ?? 'app.nathanlee.todocalendar'}
          last
        />
      </SettingsSection>

      <Modal
        visible={createOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setCreateOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setCreateOpen(false)} />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.timelineCard,
              borderColor: colors.hairline,
              paddingBottom: Math.max(insets.bottom, 16),
            },
          ]}>
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
          <Text style={[styles.sheetTitle, { color: colors.text }]}>New category</Text>
          <Text style={[styles.sheetHint, { color: colors.textSecondary }]}>
            This creates a real Google Calendar with this name.
          </Text>
          <TextInput
            value={newName}
            onChangeText={setNewName}
            placeholder="e.g. Family, Work, Gym"
            placeholderTextColor={colors.textSecondary}
            autoFocus
            style={[
              styles.input,
              {
                backgroundColor: colors.bubble,
                borderColor: colors.hairline,
                color: colors.text,
              },
            ]}
            onSubmitEditing={onCreateCategory}
            returnKeyType="done"
          />
          <Pressable
            onPress={onCreateCategory}
            disabled={creating || !newName.trim()}
            style={[
              styles.createBtn,
              {
                backgroundColor: colors.tint,
                opacity: creating || !newName.trim() ? 0.45 : 1,
              },
            ]}>
            {creating ? (
              <ActivityIndicator color={colors.onTint} />
            ) : (
              <Text style={[styles.createBtnText, { color: colors.onTint }]}>Create</Text>
            )}
          </Pressable>
          <Pressable onPress={() => setCreateOpen(false)} style={styles.cancelBtn}>
            <Text style={{ color: colors.textSecondary, fontFamily: Fonts.bodyMedium }}>Cancel</Text>
          </Pressable>
        </View>
      </Modal>
    </SettingsScreenShell>
  );
}

const styles = StyleSheet.create({
  connectRow: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  connectText: {
    fontFamily: Fonts.bodySemi,
    fontSize: 16,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 10,
    minHeight: 54,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  categoryCopy: {
    flex: 1,
    gap: 2,
    paddingVertical: 10,
  },
  categoryName: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 16,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: 14,
  },
  sheetTitle: {
    fontFamily: Fonts.display,
    fontSize: 22,
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  sheetHint: {
    fontFamily: Fonts.body,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 14,
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontFamily: Fonts.body,
    fontSize: 16,
    marginBottom: 14,
  },
  createBtn: {
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
  },
  createBtnText: {
    fontFamily: Fonts.bodySemi,
    fontSize: 16,
  },
  cancelBtn: {
    alignItems: 'center',
    paddingVertical: 14,
  },
});
