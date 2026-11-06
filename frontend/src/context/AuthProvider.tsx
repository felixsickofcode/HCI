import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  getMe,
  login as loginRequest,
  register as registerRequest,
  tokenStore,
} from '../lib/api';
import type { AuthUser } from '../lib/api';
import { AuthContext } from './auth-context';

export interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(() => tokenStore.get());
  const [isLoading, setIsLoading] = useState<boolean>(() => Boolean(tokenStore.get()));

  useEffect(() => {
    let active = true;
    const stored = tokenStore.get();

    if (!stored) return;

    getMe()
      .then((currentUser) => {
        if (!active) return;
        setUser(currentUser);
        setToken(stored);
      })
      .catch(() => {
        tokenStore.clear();
        if (!active) return;
        setUser(null);
        setToken(null);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const response = await loginRequest(email, password);
    tokenStore.set(response.access_token);
    setToken(response.access_token);
    try {
      const currentUser = await getMe();
      setUser(currentUser);
    } catch (error) {
      tokenStore.clear();
      setToken(null);
      setUser(null);
      throw error;
    }
  }, []);

  const register = useCallback(async (email: string, fullName: string, password: string) => {
    await registerRequest(email, fullName, password);
    await login(email, password);
  }, [login]);

  const logout = useCallback(() => {
    tokenStore.clear();
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, token, isLoading, login, register, logout }),
    [user, token, isLoading, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
