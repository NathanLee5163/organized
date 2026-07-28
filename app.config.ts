import { ExpoConfig, ConfigContext } from 'expo/config';

const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '';
const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '';
const GOOGLE_ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? '';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Todo Calendar',
  slug: 'todo-calendar',
  owner: 'nathanlee5163',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'todocalendar',
  userInterfaceStyle: 'dark',
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'app.nathanlee.todocalendar',
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      CFBundleURLTypes: [
        {
          CFBundleURLSchemes: [
            // Reversed iOS client ID is used by Google Sign-In; set after creating the OAuth client.
            // Format: com.googleusercontent.apps.CLIENT_ID_PREFIX
            process.env.EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME ?? 'todocalendar',
          ],
        },
      ],
    },
  },
  android: {
    package: 'app.nathanlee.todocalendar',
    adaptiveIcon: {
      backgroundColor: '#B8F24A',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
  },
  web: {
    bundler: 'metro',
    // SPA output avoids SSR bundling of expo-sqlite's WASM worker (breaks `w` in Expo).
    output: 'single',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    [
      'expo-router',
      {
        headers: {
          'Cross-Origin-Embedder-Policy': 'credentialless',
          'Cross-Origin-Opener-Policy': 'same-origin',
        },
      },
    ],
    [
      'expo-splash-screen',
      {
        image: './assets/images/splash-icon.png',
        resizeMode: 'contain',
        backgroundColor: '#0E0D12',
      },
    ],
    'expo-secure-store',
    'expo-sqlite',
    'expo-web-browser',
    [
      'expo-notifications',
      {
        iconColor: '#E8836F',
        sounds: [],
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    eas: {
      projectId: 'ff02af16-64f8-450b-ad6a-68bc530be47f',
    },
    googleIosClientId: GOOGLE_IOS_CLIENT_ID,
    googleWebClientId: GOOGLE_WEB_CLIENT_ID,
    googleAndroidClientId: GOOGLE_ANDROID_CLIENT_ID,
  },
});
