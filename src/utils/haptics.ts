import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

let enabled = true;

export function setHapticsEnabledGate(value: boolean) {
  enabled = value;
}

export function hapticSelection() {
  if (!enabled || Platform.OS === 'web') return;
  Haptics.selectionAsync().catch(() => undefined);
}

export function hapticLight() {
  if (!enabled || Platform.OS === 'web') return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
}
