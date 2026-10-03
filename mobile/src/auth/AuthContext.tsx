import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import * as authApi from '../api/auth';
import { invalidateAuthGeneration, setSessionExpiredHandler } from '../api/client';
import { clearTokens, getAccessToken, setTokens } from './tokenStorage';

type AuthContextValue = {
  isLoading: boolean;
  isSignedIn: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (householdName: string, name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSignedIn, setIsSignedIn] = useState(false);

  useEffect(() => {
    getAccessToken()
      .then((token) => setIsSignedIn(token !== null))
      .finally(() => setIsLoading(false));

    // When the API client's refresh attempt is rejected (expired/invalidated refresh
    // token), fall back to the signed-out stack instead of leaving the app stuck on an
    // authenticated screen where every request just 401s again.
    setSessionExpiredHandler(() => setIsSignedIn(false));
    return () => setSessionExpiredHandler(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      isLoading,
      isSignedIn,
      async login(email, password) {
        const tokens = await authApi.login(email, password);
        await setTokens(tokens.access_token, tokens.refresh_token);
        setIsSignedIn(true);
      },
      async signup(householdName, name, email, password) {
        const tokens = await authApi.signup(householdName, name, email, password);
        await setTokens(tokens.access_token, tokens.refresh_token);
        setIsSignedIn(true);
      },
      async logout() {
        invalidateAuthGeneration();
        await clearTokens();
        setIsSignedIn(false);
      },
    }),
    [isLoading, isSignedIn],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
