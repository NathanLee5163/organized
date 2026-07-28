import AsyncStorage from '@react-native-async-storage/async-storage';

const META_PREFIX = 'web_meta_';

export async function ensureDb(): Promise<void> {
  // AsyncStorage needs no schema bootstrap.
}

export async function getMeta(key: string): Promise<string | null> {
  return AsyncStorage.getItem(`${META_PREFIX}${key}`);
}

export async function setMeta(key: string, value: string): Promise<void> {
  await AsyncStorage.setItem(`${META_PREFIX}${key}`, value);
}
