import { useEffect } from 'react';
import { Platform } from 'react-native';

import { ensureDb } from '@/src/db/database';
import { getInboxTodos, getTodosBetween } from '@/src/db/todos';
import {
  getNotificationPermissionStatus,
  rescheduleNotifications,
} from '@/src/notifications/schedule';
import { usePreferences } from '@/src/preferences/PreferencesContext';
import { useTodos } from '@/src/context/TodoContext';
import { addDays, toDateKey } from '@/src/utils/dates';

/** Keeps local notification schedules in sync with todos + prefs. */
export function NotificationScheduler() {
  const {
    ready,
    taskRemindersEnabled,
    reminderLeadMinutes,
    morningBriefingEnabled,
  } = usePreferences();
  const { todos, anytime, dateKey, loading } = useTodos();

  useEffect(() => {
    if (!ready || loading || Platform.OS === 'web') return;

    let cancelled = false;
    (async () => {
      const permission = await getNotificationPermissionStatus();
      if (cancelled || permission !== 'granted') return;

      await ensureDb();
      const start = toDateKey(new Date());
      const end = addDays(start, 14);
      // Prefer a fresh window from DB so reminders cover days beyond the selected date.
      const windowTodos = await getTodosBetween(start, end);
      const inbox = await getInboxTodos();
      const scheduleTodos = windowTodos.length > 0 ? windowTodos : todos;
      const merged = [...scheduleTodos, ...inbox];

      await rescheduleNotifications(merged, {
        taskRemindersEnabled,
        reminderLeadMinutes,
        morningBriefingEnabled,
      });
    })().catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [
    ready,
    loading,
    todos,
    anytime,
    dateKey,
    taskRemindersEnabled,
    reminderLeadMinutes,
    morningBriefingEnabled,
  ]);

  return null;
}
