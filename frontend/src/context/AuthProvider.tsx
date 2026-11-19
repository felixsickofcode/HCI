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
        if (!active || tokenStore.get() !== stored) return;
        setUser(currentUser);
        setToken(stored);
      })
      .catch(() => {
        if (!active || tokenStore.get() !== stored) return;
        tokenStore.clear();
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

  useEffect(() => {
    let active = true;
    const onStorage = (event: StorageEvent) => {
      if (event.key !== 'token' && event.key !== null) return;
      const stored = tokenStore.get();
      // Clear the previous account immediately, before loading a different account.
      setUser(null);
      setToken(stored);
      setIsLoading(Boolean(stored));
      if (!stored) return;
      getMe().then(currentUser => {
        if (active && tokenStore.get() === stored) setUser(currentUser);
      }).catch(() => {
        if (!active || tokenStore.get() !== stored) return;
        tokenStore.clear();
        setToken(null);
      }).finally(() => {
        if (active && (tokenStore.get() === stored || tokenStore.get() === null)) setIsLoading(false);
      });
    };
    window.addEventListener('storage', onStorage);
    return () => { active = false; window.removeEventListener('storage', onStorage); };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const response = await loginRequest(email, password);
    setUser(null);
    setIsLoading(true);
    tokenStore.set(response.access_token);
    setToken(response.access_token);
    try {
      const currentUser = await getMe();
      if (tokenStore.get() !== response.access_token) throw new DOMException('Account changed', 'AbortError');
      setUser(currentUser);
    } catch (error) {
      if (tokenStore.get() === response.access_token) {
        tokenStore.clear();
        setToken(null);
        setUser(null);
      }
      throw error;
    } finally {
      if (tokenStore.get() === response.access_token || tokenStore.get() === null) setIsLoading(false);
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
    setIsLoading(false);
  }, []);

  const value = useMemo(
    () => ({ user, token, isLoading, login, register, logout }),
    [user, token, isLoading, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
