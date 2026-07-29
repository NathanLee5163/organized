import { Platform } from 'react-native';

type AudioPlayerLike = {
  volume: number;
  seekTo: (seconds: number) => Promise<void> | void;
  play: () => void;
};

type AudioModule = {
  createAudioPlayer: (
    source: number,
    options?: { keepAudioSessionActive?: boolean; updateInterval?: number }
  ) => AudioPlayerLike;
  setAudioModeAsync: (mode: Record<string, unknown>) => Promise<void>;
};

const COMPLETE_SOURCE = require('../../assets/sounds/complete.wav');

let enabled = true;
let modeConfigured = false;
let audioUnavailable = false;
let player: AudioPlayerLike | null = null;

export function setSoundsEnabledGate(value: boolean) {
  enabled = value;
}

function loadAudioModule(): AudioModule | null {
  if (Platform.OS === 'web' || audioUnavailable) return null;
  try {
    // Avoid crashing older dev clients that were built before expo-audio.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { requireOptionalNativeModule } = require('expo-modules-core') as {
      requireOptionalNativeModule: (name: string) => unknown;
    };
    if (!requireOptionalNativeModule('ExpoAudio')) {
      audioUnavailable = true;
      return null;
    }
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-audio') as AudioModule;
  } catch {
    audioUnavailable = true;
    return null;
  }
}

async function ensureMode(audio: AudioModule) {
  if (modeConfigured) return;
  modeConfigured = true;
  try {
    await audio.setAudioModeAsync({
      playsInSilentMode: false,
      interruptionMode: 'mixWithOthers',
      shouldPlayInBackground: false,
      allowsRecording: false,
    });
  } catch {
    modeConfigured = false;
  }
}

function getPlayer(audio: AudioModule): AudioPlayerLike | null {
  if (!player) {
    try {
      player = audio.createAudioPlayer(COMPLETE_SOURCE, {
        keepAudioSessionActive: true,
        updateInterval: 500,
      });
      player.volume = 0.45;
    } catch {
      return null;
    }
  }
  return player;
}

/** Warm the check-off sound. No-ops on builds without ExpoAudio. */
export async function prepareSounds(): Promise<void> {
  const audio = loadAudioModule();
  if (!audio) return;
  await ensureMode(audio);
  getPlayer(audio);
}

/** Soft cue only when marking a task done. */
export function soundComplete(): void {
  if (!enabled || Platform.OS === 'web') return;
  const audio = loadAudioModule();
  if (!audio) return;
  void (async () => {
    try {
      await ensureMode(audio);
      const p = getPlayer(audio);
      if (!p) return;
      await p.seekTo(0);
      p.play();
    } catch {
      // Ignore — sound should never break UI.
    }
  })();
}
