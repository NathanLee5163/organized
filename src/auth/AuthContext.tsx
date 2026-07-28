import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import {
  clearTokens,
  loadTokens,
  saveTokens,
  type TokenBundle,
} from '@/src/auth/storage';
import {
  fetchGoogleEmail,
  getGoogleClientIds,
  hasGoogleClientConfigured,
  refreshAccessToken,
} from '@/src/calendar/api';

WebBrowser.maybeCompleteAuthSession();

const SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/userinfo.email',
  'openid',
];

/** Satisfies Google.useAuthRequest's required clientId invariant before .env is filled in. */
const PLACEHOLDER_CLIENT_ID =
  '000000000000-unconfigured.apps.googleusercontent.com';

type AuthContextValue = {
  ready: boolean;
  isSignedIn: boolean;
  email: string | null;
  accessToken: string | null;
  clientConfigured: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  getValidAccessToken: () => Promise<string | null>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const clientIds = getGoogleClientIds();
  const clientConfigured = hasGoogleClientConfigured();
  const [ready, setReady] = useState(false);
  const [bundle, setBundle] = useState<TokenBundle | null>(null);

  const [request, response, promptAsync] = Google.useAuthRequest({
    // iOS-only is fine — Web client is optional (Expo Go / some refresh paths).
    iosClientId: clientIds.iosClientId || PLACEHOLDER_CLIENT_ID,
    ...(clientIds.androidClientId
      ? { androidClientId: clientIds.androidClientId }
      : {}),
    ...(clientIds.webClientId ? { webClientId: clientIds.webClientId } : {}),
    scopes: SCOPES,
    shouldAutoExchangeCode: true,
    extraParams: {
      access_type: 'offline',
      prompt: 'consent',
    },
  });

  useEffect(() => {
    (async () => {
      const stored = await loadTokens();
      setBundle(stored);
      setReady(true);
    })();
  }, []);

  useEffect(() => {
    if (response?.type !== 'success') return;
    const auth = response.authentication;
    if (!auth?.accessToken) return;

    (async () => {
      const email = await fetchGoogleEmail(auth.accessToken);
      const previous = await loadTokens();
      const next: TokenBundle = {
        accessToken: auth.accessToken,
        refreshToken: auth.refreshToken ?? previous?.refreshToken ?? null,
        expiresAt: Date.now() + (auth.expiresIn ?? 3600) * 1000,
        email,
      };
      await saveTokens(next);
      setBundle(next);
    })();
  }, [response]);

  const getValidAccessToken = useCallback(async () => {
    if (!bundle?.accessToken) return null;
    const skew = 60_000;
    if (bundle.expiresAt > Date.now() + skew) {
      return bundle.accessToken;
    }
    if (!bundle.refreshToken) {
      return bundle.accessToken;
    }
    try {
      const refreshed = await refreshAccessToken(bundle.refreshToken);
      const next: TokenBundle = {
        ...bundle,
        accessToken: refreshed.accessToken,
        expiresAt: Date.now() + refreshed.expiresIn * 1000,
      };
      await saveTokens(next);
      setBundle(next);
      return next.accessToken;
    } catch (error) {
      console.warn('Refresh failed', error);
      return null;
    }
  }, [bundle]);

  const signIn = useCallback(async () => {
    if (!clientConfigured) {
      throw new Error(
        'Add EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID / EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID in .env — see docs/SETUP.md'
      );
    }
    if (!request) {
      throw new Error('Auth request not ready yet');
    }
    await promptAsync();
  }, [clientConfigured, promptAsync, request]);

  const signOut = useCallback(async () => {
    await clearTokens();
    setBundle(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      ready,
      isSignedIn: Boolean(bundle?.accessToken),
      email: bundle?.email ?? null,
      accessToken: bundle?.accessToken ?? null,
      clientConfigured,
      signIn,
      signOut,
      getValidAccessToken,
    }),
    [ready, bundle, clientConfigured, signIn, signOut, getValidAccessToken]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function authPlatformHint(): string {
  return Platform.OS === 'ios' ? 'iOS OAuth client' : 'Web / Android OAuth client';
}
