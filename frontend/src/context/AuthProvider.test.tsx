import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { AuthProvider } from './AuthProvider';
import { useAuth } from './auth-context';

beforeEach(() => localStorage.clear());
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
const alice = { id: 1, email: 'a@example.com', fullName: 'A', isActive: true, createdAt: '' };
it('clears authenticated state when another tab logs out', async () => {
  localStorage.setItem('token', 'alice');
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(alice))));
  const { result } = renderHook(useAuth, { wrapper: AuthProvider });
  await waitFor(() => expect(result.current.user?.id).toBe(1));
  act(() => {
    localStorage.removeItem('token');
    window.dispatchEvent(new StorageEvent('storage', { key: 'token', newValue: null }));
  });
  expect(result.current.user).toBeNull();
  expect(result.current.token).toBeNull();
});

it('does not restore the previous user from a delayed bootstrap response after logout', async () => {
  localStorage.setItem('token', 'alice');
  let resolve!: (value: Response) => void;
  vi.stubGlobal('fetch', vi.fn().mockImplementation(() => new Promise<Response>(r => { resolve = r; })));
  const { result } = renderHook(useAuth, { wrapper: AuthProvider });
  act(() => result.current.logout());
  await act(async () => { resolve(new Response(JSON.stringify(alice))); });
  expect(result.current.user).toBeNull();
  expect(localStorage.getItem('token')).toBeNull();
});
