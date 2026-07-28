import { useCallback, useEffect, useState } from 'react';
import { Alert, Linking, Platform } from 'react-native';

import { SettingsRow } from '@/src/components/settings/SettingsRow';
import { SettingsScreenShell } from '@/src/components/settings/SettingsScreenShell';
import { SettingsSection } from '@/src/components/settings/SettingsSection';
import { useTodos } from '@/src/context/TodoContext';
import {
  getNotificationPermissionStatus,
  requestNotificationPermission,
  rescheduleNotifications,
  sendTestNotification,
} from '@/src/notifications/schedule';
import { usePreferences } from '@/src/preferences/PreferencesContext';
import { getTodosBetween } from '@/src/db/todos';
import { ensureDb } from '@/src/db/database';
import { addDays, toDateKey } from '@/src/utils/dates';

export default function NotificationsSettingsScreen() {
  const {
    taskRemindersEnabled,
    setTaskRemindersEnabled,
    reminderLeadMinutes,
    cycleReminderLead,
    morningBriefingEnabled,
    setMorningBriefingEnabled,
  } = usePreferences();
  const { dateKey } = useTodos();
  const [permission, setPermission] = useState<
    'granted' | 'denied' | 'undetermined' | 'unavailable'
  >('undetermined');
  const [busy, setBusy] = useState(false);

  const refreshPermission = useCallback(async () => {
    setPermission(await getNotificationPermissionStatus());
  }, []);

  useEffect(() => {
    refreshPermission();
  }, [refreshPermission]);

  const syncSchedules = useCallback(async () => {
    await ensureDb();
    const start = toDateKey(new Date());
    const end = addDays(start, 14);
    const todos = await getTodosBetween(start, end);
    await rescheduleNotifications(todos, {
      taskRemindersEnabled,
      reminderLeadMinutes,
      morningBriefingEnabled,
    });
  }, [morningBriefingEnabled, reminderLeadMinutes, taskRemindersEnabled]);

  useEffect(() => {
    if (permission === 'granted') {
      syncSchedules().catch(() => undefined);
    }
  }, [permission, syncSchedules, dateKey]);

  const ensurePermission = async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Not available', 'Notifications work on iPhone and Android builds.');
      return false;
    }
    if (permission === 'granted') return true;
    const granted = await requestNotificationPermission();
    await refreshPermission();
    if (!granted) {
      Alert.alert(
        'Permission needed',
        'Enable notifications for Todo Calendar in iOS Settings to get alerts.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Open Settings',
            onPress: () => Linking.openSettings().catch(() => undefined),
          },
        ]
      );
      return false;
    }
    return true;
  };

  const onToggleReminders = async (next: boolean) => {
    if (next) {
      const ok = await ensurePermission();
      if (!ok) return;
    }
    setTaskRemindersEnabled(next);
  };

  const onToggleMorning = async (next: boolean) => {
    if (next) {
      const ok = await ensurePermission();
      if (!ok) return;
    }
    setMorningBriefingEnabled(next);
  };

  const onTest = async () => {
    try {
      setBusy(true);
      const ok = await ensurePermission();
      if (!ok) return;
      await sendTestNotification();
      Alert.alert('Sent', 'You should see a test alert in a couple of seconds.');
    } catch (e) {
      Alert.alert('Could not send', e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setBusy(false);
    }
  };

  const permissionLabel =
    permission === 'granted'
      ? 'Allowed'
      : permission === 'denied'
        ? 'Denied'
        : permission === 'unavailable'
          ? 'Unavailable on web'
          : 'Not set';

  return (
    <SettingsScreenShell subtitle="Local reminders on this device — no push server required.">
      <SettingsSection
        title="Permission"
        footer="iOS must allow alerts for reminders to fire when the app is closed.">
        <SettingsRow label="System permission" value={permissionLabel} />
        <SettingsRow
          label="Request access"
          subtitle="Prompt for notification permission"
          onPress={() => ensurePermission()}
          disabled={permission === 'granted' || permission === 'unavailable'}
        />
        <SettingsRow
          label="Send test alert"
          subtitle="Fires in about 2 seconds"
          last
          onPress={onTest}
          disabled={busy || permission === 'unavailable'}
        />
      </SettingsSection>

      <SettingsSection
        title="Reminders"
        footer="Timed tasks get a local notification before they start.">
        <SettingsRow
          kind="toggle"
          label="Task reminders"
          subtitle="Alert before each timed task"
          value={taskRemindersEnabled}
          onValueChange={onToggleReminders}
        />
        <SettingsRow
          label="Remind me"
          subtitle="How early to notify"
          value={`${reminderLeadMinutes} min before`}
          onPress={cycleReminderLead}
          disabled={!taskRemindersEnabled}
        />
        <SettingsRow
          kind="toggle"
          label="Morning briefing"
          subtitle="Daily summary at 8:00 AM"
          value={morningBriefingEnabled}
          onValueChange={onToggleMorning}
          last
        />
      </SettingsSection>
    </SettingsScreenShell>
  );
}
