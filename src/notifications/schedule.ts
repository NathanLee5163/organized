import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { Todo } from '@/src/types/todo';
import { addDays, minutesToLabel, parseDateKey, toDateKey } from '@/src/utils/dates';

const TASK_PREFIX = 'task-reminder:';
const MORNING_ID = 'morning-briefing';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export type NotificationPrefs = {
  taskRemindersEnabled: boolean;
  reminderLeadMinutes: number;
  morningBriefingEnabled: boolean;
};

export async function getNotificationPermissionStatus(): Promise<
  'granted' | 'denied' | 'undetermined' | 'unavailable'
> {
  if (Platform.OS === 'web') return 'unavailable';
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return 'granted';
  if (current.status === 'undetermined') return 'undetermined';
  return 'denied';
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted;
}

export async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('default', {
    name: 'Todo Calendar',
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 250, 250, 250],
  });
}

function taskTriggerDate(todo: Todo, leadMinutes: number): Date | null {
  if (todo.kind !== 'timed' || todo.startMinutes == null || todo.completed) return null;
  const day = parseDateKey(todo.date);
  const fire = new Date(day);
  fire.setHours(0, 0, 0, 0);
  fire.setMinutes(todo.startMinutes - leadMinutes);
  if (fire.getTime() <= Date.now() + 15_000) return null;
  return fire;
}

export async function rescheduleNotifications(
  todos: Todo[],
  prefs: NotificationPrefs
): Promise<void> {
  if (Platform.OS === 'web') return;

  await ensureAndroidChannel();
  await Notifications.cancelAllScheduledNotificationsAsync();

  const permission = await getNotificationPermissionStatus();
  if (permission !== 'granted') return;

  if (prefs.taskRemindersEnabled) {
    for (const todo of todos) {
      const when = taskTriggerDate(todo, prefs.reminderLeadMinutes);
      if (!when || todo.startMinutes == null) continue;
      await Notifications.scheduleNotificationAsync({
        identifier: `${TASK_PREFIX}${todo.id}`,
        content: {
          title: 'Upcoming task',
          body: `${todo.title} · ${minutesToLabel(todo.startMinutes)}`,
          sound: true,
          data: { todoId: todo.id, date: todo.date },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: when,
        },
      });
    }
  }

  if (prefs.morningBriefingEnabled) {
    const todayKey = toDateKey(new Date());
    const todayTodos = todos.filter((t) => t.date === todayKey && !t.completed);
    const timed = todayTodos.filter((t) => t.kind === 'timed').length;
    const anytime = todayTodos.filter((t) => t.kind === 'anytime').length;

    await Notifications.scheduleNotificationAsync({
      identifier: MORNING_ID,
      content: {
        title: 'Morning runway',
        body:
          todayTodos.length === 0
            ? 'Open day — nothing docked yet.'
            : `${timed} timed · ${anytime} loose for today.`,
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 8,
        minute: 0,
      },
    });
  }
}

/** Collect todos for the next several days for reminder scheduling. */
export function upcomingWindow(fromDateKey: string, days = 14): { start: string; end: string } {
  return { start: fromDateKey, end: addDays(fromDateKey, days) };
}

export async function sendTestNotification(): Promise<void> {
  if (Platform.OS === 'web') {
    throw new Error('Notifications are not available on web.');
  }
  const granted = await requestNotificationPermission();
  if (!granted) {
    throw new Error('Notification permission was not granted.');
  }
  await ensureAndroidChannel();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Todo Calendar',
      body: 'Alerts are working. You’ll get reminders before timed tasks.',
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 2,
    },
  });
}
