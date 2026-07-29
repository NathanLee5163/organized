import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { setHapticsEnabledGate } from '@/src/utils/haptics';
import { setSoundsEnabledGate } from '@/src/utils/sounds';

const KEYS = {
  haptics: 'prefs_haptics',
  sounds: 'prefs_sounds',
  defaultDuration: 'prefs_default_duration',
  weekStartsOn: 'prefs_week_starts_on',
  taskReminders: 'prefs_task_reminders',
  reminderLead: 'prefs_reminder_lead',
  morningBriefing: 'prefs_morning_briefing',
} as const;

export type WeekStartsOn = 0 | 1;
export type DefaultDuration = 15 | 30 | 45 | 60;
export type ReminderLead = 5 | 10 | 15 | 30;

type Preferences = {
  hapticsEnabled: boolean;
  soundsEnabled: boolean;
  defaultDuration: DefaultDuration;
  weekStartsOn: WeekStartsOn;
  taskRemindersEnabled: boolean;
  reminderLeadMinutes: ReminderLead;
  morningBriefingEnabled: boolean;
};

type PreferencesContextValue = Preferences & {
  ready: boolean;
  setHapticsEnabled: (value: boolean) => void;
  setSoundsEnabled: (value: boolean) => void;
  setDefaultDuration: (value: DefaultDuration) => void;
  setWeekStartsOn: (value: WeekStartsOn) => void;
  setTaskRemindersEnabled: (value: boolean) => void;
  setReminderLeadMinutes: (value: ReminderLead) => void;
  setMorningBriefingEnabled: (value: boolean) => void;
  cycleDefaultDuration: () => void;
  cycleWeekStartsOn: () => void;
  cycleReminderLead: () => void;
};

const DEFAULTS: Preferences = {
  hapticsEnabled: true,
  soundsEnabled: true,
  defaultDuration: 30,
  weekStartsOn: 0,
  taskRemindersEnabled: false,
  reminderLeadMinutes: 10,
  morningBriefingEnabled: false,
};

const DURATIONS: DefaultDuration[] = [15, 30, 45, 60];
const LEADS: ReminderLead[] = [5, 10, 15, 30];

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<Preferences>(DEFAULTS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [haptics, sounds, duration, week, reminders, lead, morning] = await Promise.all([
          AsyncStorage.getItem(KEYS.haptics),
          AsyncStorage.getItem(KEYS.sounds),
          AsyncStorage.getItem(KEYS.defaultDuration),
          AsyncStorage.getItem(KEYS.weekStartsOn),
          AsyncStorage.getItem(KEYS.taskReminders),
          AsyncStorage.getItem(KEYS.reminderLead),
          AsyncStorage.getItem(KEYS.morningBriefing),
        ]);
        if (cancelled) return;
        const hapticsEnabled = haptics == null ? DEFAULTS.hapticsEnabled : haptics === '1';
        const soundsEnabled = sounds == null ? DEFAULTS.soundsEnabled : sounds === '1';
        setPrefs({
          hapticsEnabled,
          soundsEnabled,
          defaultDuration: ([15, 30, 45, 60].includes(Number(duration))
            ? Number(duration)
            : DEFAULTS.defaultDuration) as DefaultDuration,
          weekStartsOn: week === '1' ? 1 : 0,
          taskRemindersEnabled: reminders === '1',
          reminderLeadMinutes: ([5, 10, 15, 30].includes(Number(lead))
            ? Number(lead)
            : DEFAULTS.reminderLeadMinutes) as ReminderLead,
          morningBriefingEnabled: morning === '1',
        });
        setHapticsEnabledGate(hapticsEnabled);
        setSoundsEnabledGate(soundsEnabled);
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setHapticsEnabledGate(prefs.hapticsEnabled);
  }, [prefs.hapticsEnabled]);

  useEffect(() => {
    setSoundsEnabledGate(prefs.soundsEnabled);
  }, [prefs.soundsEnabled]);

  const setHapticsEnabled = useCallback((value: boolean) => {
    setPrefs((prev) => ({ ...prev, hapticsEnabled: value }));
    setHapticsEnabledGate(value);
    AsyncStorage.setItem(KEYS.haptics, value ? '1' : '0').catch(() => undefined);
  }, []);

  const setSoundsEnabled = useCallback((value: boolean) => {
    setPrefs((prev) => ({ ...prev, soundsEnabled: value }));
    setSoundsEnabledGate(value);
    AsyncStorage.setItem(KEYS.sounds, value ? '1' : '0').catch(() => undefined);
  }, []);

  const setDefaultDuration = useCallback((value: DefaultDuration) => {
    setPrefs((prev) => ({ ...prev, defaultDuration: value }));
    AsyncStorage.setItem(KEYS.defaultDuration, String(value)).catch(() => undefined);
  }, []);

  const setWeekStartsOn = useCallback((value: WeekStartsOn) => {
    setPrefs((prev) => ({ ...prev, weekStartsOn: value }));
    AsyncStorage.setItem(KEYS.weekStartsOn, String(value)).catch(() => undefined);
  }, []);

  const setTaskRemindersEnabled = useCallback((value: boolean) => {
    setPrefs((prev) => ({ ...prev, taskRemindersEnabled: value }));
    AsyncStorage.setItem(KEYS.taskReminders, value ? '1' : '0').catch(() => undefined);
  }, []);

  const setReminderLeadMinutes = useCallback((value: ReminderLead) => {
    setPrefs((prev) => ({ ...prev, reminderLeadMinutes: value }));
    AsyncStorage.setItem(KEYS.reminderLead, String(value)).catch(() => undefined);
  }, []);

  const setMorningBriefingEnabled = useCallback((value: boolean) => {
    setPrefs((prev) => ({ ...prev, morningBriefingEnabled: value }));
    AsyncStorage.setItem(KEYS.morningBriefing, value ? '1' : '0').catch(() => undefined);
  }, []);

  const cycleDefaultDuration = useCallback(() => {
    setPrefs((prev) => {
      const idx = DURATIONS.indexOf(prev.defaultDuration);
      const next = DURATIONS[(idx + 1) % DURATIONS.length];
      AsyncStorage.setItem(KEYS.defaultDuration, String(next)).catch(() => undefined);
      return { ...prev, defaultDuration: next };
    });
  }, []);

  const cycleWeekStartsOn = useCallback(() => {
    setPrefs((prev) => {
      const next: WeekStartsOn = prev.weekStartsOn === 0 ? 1 : 0;
      AsyncStorage.setItem(KEYS.weekStartsOn, String(next)).catch(() => undefined);
      return { ...prev, weekStartsOn: next };
    });
  }, []);

  const cycleReminderLead = useCallback(() => {
    setPrefs((prev) => {
      const idx = LEADS.indexOf(prev.reminderLeadMinutes);
      const next = LEADS[(idx + 1) % LEADS.length];
      AsyncStorage.setItem(KEYS.reminderLead, String(next)).catch(() => undefined);
      return { ...prev, reminderLeadMinutes: next };
    });
  }, []);

  const value = useMemo(
    () => ({
      ...prefs,
      ready,
      setHapticsEnabled,
      setSoundsEnabled,
      setDefaultDuration,
      setWeekStartsOn,
      setTaskRemindersEnabled,
      setReminderLeadMinutes,
      setMorningBriefingEnabled,
      cycleDefaultDuration,
      cycleWeekStartsOn,
      cycleReminderLead,
    }),
    [
      prefs,
      ready,
      setHapticsEnabled,
      setSoundsEnabled,
      setDefaultDuration,
      setWeekStartsOn,
      setTaskRemindersEnabled,
      setReminderLeadMinutes,
      setMorningBriefingEnabled,
      cycleDefaultDuration,
      cycleWeekStartsOn,
      cycleReminderLead,
    ]
  );

  return (
    <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>
  );
}

export function usePreferences(): PreferencesContextValue {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error('usePreferences must be used within PreferencesProvider');
  return ctx;
}
