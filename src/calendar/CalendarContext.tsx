import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { useAuth } from '@/src/auth/AuthContext';
import {
  getReadCalendarIds,
  getWriteCalendarId,
  setReadCalendarIds,
  setWriteCalendarId,
} from '@/src/auth/storage';
import { createCalendar, deleteCalendar, listCalendars } from '@/src/calendar/api';
import type { GoogleCalendarListEntry } from '@/src/types/todo';

const CALENDARS_CACHE_KEY = 'google_calendars_cache_v1';

type CalendarContextValue = {
  calendars: GoogleCalendarListEntry[];
  readIds: string[];
  writeCalendarId: string | null;
  loading: boolean;
  reload: () => Promise<void>;
  toggleCategory: (id: string) => Promise<void>;
  setWriteCalendar: (id: string) => Promise<void>;
  createCategory: (name: string) => Promise<GoogleCalendarListEntry>;
  deleteCategory: (id: string) => Promise<void>;
  isCategoryEnabled: (id: string | null | undefined) => boolean;
  calendarById: (id: string | null | undefined) => GoogleCalendarListEntry | null;
  colorForCalendar: (id: string | null | undefined, fallback?: string) => string;
};

const CalendarContext = createContext<CalendarContextValue | null>(null);

const FALLBACK_COLORS = [
  '#E8836F',
  '#7BA3C4',
  '#B8F24A',
  '#C4A8FF',
  '#FF9F6B',
  '#3DD6C3',
  '#E86B8A',
  '#5B8DEF',
];

function hashColor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return FALLBACK_COLORS[h % FALLBACK_COLORS.length];
}

export function CalendarProvider({ children }: { children: React.ReactNode }) {
  const { isSignedIn, getValidAccessToken } = useAuth();
  const [calendars, setCalendars] = useState<GoogleCalendarListEntry[]>([]);
  const [readIds, setReadIds] = useState<string[]>([]);
  const [writeCalendarId, setWriteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Hydrate category prefs before the network reload so the first paint
  // already filters — never “show all then drop half”.
  useEffect(() => {
    void (async () => {
      const [ids, writeId] = await Promise.all([
        getReadCalendarIds(),
        getWriteCalendarId(),
      ]);
      if (ids.length) setReadIds(ids);
      if (writeId) setWriteId(writeId);
    })();
  }, []);

  const reload = useCallback(async () => {
    if (!isSignedIn) {
      setCalendars([]);
      setReadIds([]);
      setWriteId(null);
      return;
    }
    setLoading(true);
    try {
      const cached = await AsyncStorage.getItem(CALENDARS_CACHE_KEY);
      if (cached) {
        try {
          const parsed = JSON.parse(cached) as GoogleCalendarListEntry[];
          if (Array.isArray(parsed) && parsed.length) setCalendars(parsed);
        } catch {
          // ignore bad cache
        }
      }

      const token = await getValidAccessToken();
      if (!token) return;
      const items = await listCalendars(token);
      setCalendars(items);
      await AsyncStorage.setItem(CALENDARS_CACHE_KEY, JSON.stringify(items));

      let nextRead = await getReadCalendarIds();
      const primaryId = items.find((c) => c.primary)?.id ?? null;
      nextRead = nextRead.map((id) => (id === 'primary' && primaryId ? primaryId : id));

      // Don't clobber a bootstrapped full list with an empty/stale read from a race.
      if (nextRead.length === 0 && items.length > 0) {
        nextRead = items.filter((c) => c.selected !== false).map((c) => c.id);
        if (nextRead.length === 0) nextRead = items.map((c) => c.id);
      }

      setReadIds(nextRead);
      await setReadCalendarIds(nextRead);
      setWriteId(await getWriteCalendarId());
    } finally {
      setLoading(false);
    }
  }, [getValidAccessToken, isSignedIn]);

  useEffect(() => {
    reload();
  }, [reload]);

  const toggleCategory = useCallback(
    async (id: string) => {
      const prev = readIds;
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      const ensured =
        next.length === 0
          ? writeCalendarId
            ? [writeCalendarId]
            : calendars[0]
              ? [calendars[0].id]
              : []
          : next;
      // Update React state first so lists/chips re-filter immediately.
      setReadIds(ensured);
      await setReadCalendarIds(ensured);
    },
    [calendars, readIds, writeCalendarId]
  );

  const setWriteCalendar = useCallback(
    async (id: string) => {
      await setWriteCalendarId(id);
      setWriteId(id);
      if (!readIds.includes(id)) {
        const next = [...readIds, id];
        await setReadCalendarIds(next);
        setReadIds(next);
      }
    },
    [readIds]
  );

  const createCategory = useCallback(
    async (name: string) => {
      const token = await getValidAccessToken();
      if (!token) throw new Error('Sign in to Google first');
      const created = await createCalendar(token, name);
      const nextRead = Array.from(new Set([...readIds, created.id]));
      await setReadCalendarIds(nextRead);
      setReadIds(nextRead);
      await reload();
      return created;
    },
    [getValidAccessToken, readIds, reload]
  );

  const deleteCategory = useCallback(
    async (id: string) => {
      const token = await getValidAccessToken();
      if (!token) throw new Error('Sign in to Google first');
      const cal = calendars.find((c) => c.id === id);
      if (!cal) throw new Error('Category not found');
      await deleteCalendar(token, cal);

      const nextRead = readIds.filter((x) => x !== id);
      await setReadCalendarIds(nextRead);
      setReadIds(nextRead);

      if (writeCalendarId === id) {
        const primary = calendars.find((c) => c.primary && c.id !== id);
        const fallback = primary?.id ?? calendars.find((c) => c.id !== id)?.id ?? null;
        if (fallback) {
          await setWriteCalendarId(fallback);
          setWriteId(fallback);
        } else {
          await AsyncStorage.removeItem('write_calendar_id').catch(() => undefined);
          setWriteId(null);
        }
      }

      await reload();
    },
    [calendars, getValidAccessToken, readIds, reload, writeCalendarId]
  );

  const isCategoryEnabled = useCallback(
    (id: string | null | undefined) => {
      if (!isSignedIn) return true;
      if (!id) return true;
      // Never ignore known readIds during a reload — that painted every chip
      // then wiped half when loading flipped false.
      if (readIds.length === 0) return true;
      return readIds.includes(id);
    },
    [isSignedIn, readIds]
  );

  const calendarById = useCallback(
    (id: string | null | undefined) => {
      if (!id) return null;
      return calendars.find((c) => c.id === id) ?? null;
    },
    [calendars]
  );

  const colorForCalendar = useCallback(
    (id: string | null | undefined, fallback = '#8A8A93') => {
      if (!id) return fallback;
      const cal = calendars.find((c) => c.id === id);
      return cal?.backgroundColor ?? hashColor(id);
    },
    [calendars]
  );

  const value = useMemo<CalendarContextValue>(
    () => ({
      calendars,
      readIds,
      writeCalendarId,
      loading,
      reload,
      toggleCategory,
      setWriteCalendar,
      createCategory,
      deleteCategory,
      isCategoryEnabled,
      calendarById,
      colorForCalendar,
    }),
    [
      calendars,
      readIds,
      writeCalendarId,
      loading,
      reload,
      toggleCategory,
      setWriteCalendar,
      createCategory,
      deleteCategory,
      isCategoryEnabled,
      calendarById,
      colorForCalendar,
    ]
  );

  return <CalendarContext.Provider value={value}>{children}</CalendarContext.Provider>;
}

export function useCalendars(): CalendarContextValue {
  const ctx = useContext(CalendarContext);
  if (!ctx) throw new Error('useCalendars must be used within CalendarProvider');
  return ctx;
}
