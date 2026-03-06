import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { apiFetch } from '../lib/api.ts';
import {
  clearStoredAuthToken,
  getStoredAuthToken,
  setStoredAuthToken,
} from './authStorage.ts';

export type AuthUser = {
  id: number;
  email: string;
  display_name: string;
  role: 'admin' | 'member';
  status: string;
  created_at: string;
  updated_at: string;
};

export type AuthContextValue = {
  token: string | null;
  user: AuthUser | null;
  isInitializing: boolean;
  isAuthenticated: boolean;
  login(email: string, password: string): Promise<void>;
  logout(): void;
  refreshMe(): Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function readResponseError(response: Response): Promise<string> {
  try {
    const payload = await response.json();
    if (typeof payload?.error === 'string' && payload.error.trim() !== '') {
      return payload.error;
    }
  } catch {
    // ignore parse errors and use fallback message
  }

  return `Request failed (${response.status})`;
}

export function AuthProvider({ children }: { children: ReactNode }): JSX.Element {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  const clearAuthState = useCallback(() => {
    clearStoredAuthToken();
    setToken(null);
    setUser(null);
  }, []);

  const refreshMe = useCallback(async () => {
    const activeToken = getStoredAuthToken();

    if (!activeToken) {
      setToken(null);
      setUser(null);
      return;
    }

    setToken(activeToken);

    try {
      const response = await apiFetch('/api/auth/me');

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          clearAuthState();
          return;
        }

        throw new Error(await readResponseError(response));
      }

      const safeUser = (await response.json()) as AuthUser;
      setUser(safeUser);
    } catch {
      clearAuthState();
    }
  }, [clearAuthState]);

  useEffect(() => {
    let cancelled = false;

    async function bootstrapAuth() {
      const storedToken = getStoredAuthToken();
      if (!storedToken) {
        if (!cancelled) {
          setIsInitializing(false);
        }
        return;
      }

      setToken(storedToken);

      try {
        const response = await apiFetch('/api/auth/me');

        if (!response.ok) {
          if (!cancelled) {
            clearAuthState();
          }
          return;
        }

        const safeUser = (await response.json()) as AuthUser;
        if (!cancelled) {
          setUser(safeUser);
        }
      } catch {
        if (!cancelled) {
          clearAuthState();
        }
      } finally {
        if (!cancelled) {
          setIsInitializing(false);
        }
      }
    }

    void bootstrapAuth();

    return () => {
      cancelled = true;
    };
  }, [clearAuthState]);

  const login = useCallback(async (email: string, password: string) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
      }),
    });

    if (!response.ok) {
      throw new Error(await readResponseError(response));
    }

    const payload = await response.json();
    const nextToken = typeof payload?.token === 'string' ? payload.token : '';

    if (!nextToken || !payload?.user) {
      throw new Error('Invalid login response');
    }

    setStoredAuthToken(nextToken);
    setToken(nextToken);
    setUser(payload.user as AuthUser);
  }, []);

  const logout = useCallback(() => {
    clearAuthState();
  }, [clearAuthState]);

  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      user,
      isInitializing,
      isAuthenticated: Boolean(token && user),
      login,
      logout,
      refreshMe,
    }),
    [token, user, isInitializing, login, logout, refreshMe],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }

  return context;
}
