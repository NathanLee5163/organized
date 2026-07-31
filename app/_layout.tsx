import {
  Fraunces_500Medium,
  Fraunces_600SemiBold,
  Fraunces_600SemiBold_Italic,
} from '@expo-google-fonts/fraunces';
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { useFonts } from 'expo-font';
import { DarkTheme, Stack, ThemeProvider as NavThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useMemo } from 'react';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { Fonts } from '@/constants/Colors';
import { AuthProvider } from '@/src/auth/AuthContext';
import { CalendarProvider } from '@/src/calendar/CalendarContext';
import { GoalProvider } from '@/src/context/GoalContext';
import { TodoProvider } from '@/src/context/TodoContext';
import { ThemeProvider, useAppTheme } from '@/src/theme/ThemeContext';
import { PreferencesProvider } from '@/src/preferences/PreferencesContext';
import { NotificationScheduler } from '@/src/notifications/NotificationScheduler';
import { prepareSounds } from '@/src/utils/sounds';
export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Fraunces_500Medium,
    Fraunces_600SemiBold,
    Fraunces_600SemiBold_Italic,
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
      void prepareSounds();
    }
  }, [loaded]);

  if (!loaded) return null;

  return (
    <ThemeProvider>
      <PreferencesProvider>
        <AuthProvider>
          <CalendarProvider>
            <TodoProvider>
              <GoalProvider>
                <NotificationScheduler />
                <RootLayoutNav />
              </GoalProvider>
            </TodoProvider>
          </CalendarProvider>
        </AuthProvider>
      </PreferencesProvider>
    </ThemeProvider>
  );
}

function RootLayoutNav() {
  const { colors } = useAppTheme();

  const navTheme = useMemo(
    () => ({
      ...DarkTheme,
      colors: {
        ...DarkTheme.colors,
        primary: colors.tint,
        background: colors.background,
        card: colors.surfaceSolid,
        text: colors.text,
        border: colors.border,
      },
      fonts: {
        regular: { fontFamily: Fonts.body, fontWeight: '400' as const },
        medium: { fontFamily: Fonts.bodyMedium, fontWeight: '500' as const },
        bold: { fontFamily: Fonts.bodySemi, fontWeight: '600' as const },
        heavy: { fontFamily: Fonts.bodySemi, fontWeight: '700' as const },
      },
    }),
    [colors]
  );

  return (
    <NavThemeProvider value={navTheme}>
      <StatusBar style="light" />
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="edit"
          options={{
            presentation: 'modal',
            title: 'Dock this',
            headerShadowVisible: false,
            headerStyle: { backgroundColor: colors.surfaceSolid },
            headerTintColor: colors.tint,
            headerTitleStyle: {
              fontFamily: Fonts.bodyMedium,
              color: colors.text,
            },
          }}
        />
        <Stack.Screen
          name="search"
          options={{
            presentation: 'modal',
            title: 'Search',
            headerShadowVisible: false,
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.tint,
            headerTitleStyle: {
              fontFamily: Fonts.bodyMedium,
              color: colors.text,
            },
          }}
        />
        <Stack.Screen
          name="settings/customization"
          options={{
            title: 'Customization',
            headerShadowVisible: false,
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.tint,
            headerTitleStyle: { fontFamily: Fonts.bodyMedium, color: colors.text },
          }}
        />
        <Stack.Screen
          name="settings/notifications"
          options={{
            title: 'Notifications',
            headerShadowVisible: false,
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.tint,
            headerTitleStyle: { fontFamily: Fonts.bodyMedium, color: colors.text },
          }}
        />
        <Stack.Screen
          name="settings/advanced"
          options={{
            title: 'Advanced',
            headerShadowVisible: false,
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.tint,
            headerTitleStyle: { fontFamily: Fonts.bodyMedium, color: colors.text },
          }}
        />
        <Stack.Screen
          name="settings/account"
          options={{
            title: 'Google Calendar',
            headerShadowVisible: false,
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.tint,
            headerTitleStyle: { fontFamily: Fonts.bodyMedium, color: colors.text },
          }}
        />
        <Stack.Screen
          name="settings/privacy"
          options={{
            title: 'Privacy',
            headerShadowVisible: false,
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.tint,
            headerTitleStyle: { fontFamily: Fonts.bodyMedium, color: colors.text },
          }}
        />
      </Stack>
    </NavThemeProvider>
  );
}
