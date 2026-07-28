import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const ACCESS_TOKEN_KEY = 'google_access_token';
const REFRESH_TOKEN_KEY = 'google_refresh_token';
const EXPIRES_AT_KEY = 'google_expires_at';
const EMAIL_KEY = 'google_email';
const WRITE_CALENDAR_KEY = 'write_calendar_id';
const READ_CALENDARS_KEY = 'read_calendar_ids';
const LAST_SYNC_KEY = 'last_sync_at';

async function setSecure(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    await AsyncStorage.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function getSecure(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    return AsyncStorage.getItem(key);
  }
  return SecureStore.getItemAsync(key);
}

async function deleteSecure(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    await AsyncStorage.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

export type TokenBundle = {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: number;
  email: string | null;
};

export async function saveTokens(bundle: TokenBundle): Promise<void> {
  await setSecure(ACCESS_TOKEN_KEY, bundle.accessToken);
  if (bundle.refreshToken) {
    await setSecure(REFRESH_TOKEN_KEY, bundle.refreshToken);
  }
  await setSecure(EXPIRES_AT_KEY, String(bundle.expiresAt));
  if (bundle.email) {
    await setSecure(EMAIL_KEY, bundle.email);
  }
}

export async function loadTokens(): Promise<TokenBundle | null> {
  const accessToken = await getSecure(ACCESS_TOKEN_KEY);
  if (!accessToken) return null;
  const refreshToken = await getSecure(REFRESH_TOKEN_KEY);
  const expiresAtRaw = await getSecure(EXPIRES_AT_KEY);
  const email = await getSecure(EMAIL_KEY);
  return {
    accessToken,
    refreshToken,
    expiresAt: expiresAtRaw ? Number(expiresAtRaw) : 0,
    email,
  };
}

export async function clearTokens(): Promise<void> {
  await deleteSecure(ACCESS_TOKEN_KEY);
  await deleteSecure(REFRESH_TOKEN_KEY);
  await deleteSecure(EXPIRES_AT_KEY);
  await deleteSecure(EMAIL_KEY);
}

export async function getWriteCalendarId(): Promise<string | null> {
  return AsyncStorage.getItem(WRITE_CALENDAR_KEY);
}

export async function setWriteCalendarId(id: string): Promise<void> {
  await AsyncStorage.setItem(WRITE_CALENDAR_KEY, id);
}

export async function getReadCalendarIds(): Promise<string[]> {
  const raw = await AsyncStorage.getItem(READ_CALENDARS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function setReadCalendarIds(ids: string[]): Promise<void> {
  await AsyncStorage.setItem(READ_CALENDARS_KEY, JSON.stringify(ids));
}

export async function getLastSyncAt(): Promise<string | null> {
  return AsyncStorage.getItem(LAST_SYNC_KEY);
}

export async function setLastSyncAt(iso: string): Promise<void> {
  await AsyncStorage.setItem(LAST_SYNC_KEY, iso);
}
