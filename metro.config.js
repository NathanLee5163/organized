const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Required for expo-sqlite on web (wa-sqlite.wasm)
config.resolver.assetExts.push('wasm');

// Worklets/Reanimated need inlineRequires — Expo disables it by default and
// that can break worklet init after upgrades.
const originalGetTransformOptions = config.transformer?.getTransformOptions;
config.transformer = {
  ...config.transformer,
  async getTransformOptions() {
    const base = originalGetTransformOptions
      ? await originalGetTransformOptions()
      : {};
    return {
      ...base,
      transform: {
        ...(base.transform ?? {}),
        inlineRequires: true,
      },
    };
  },
};

module.exports = config;
