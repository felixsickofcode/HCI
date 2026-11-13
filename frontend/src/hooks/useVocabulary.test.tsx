import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { AuthContext } from '../context/auth-context';
import type { AuthContextValue } from '../context/auth-context';
import { useVocabulary } from './useVocabulary';
import { readGuestVocabulary, saveGuestVocabulary } from '../lib/vocabulary';

const draft = { term: 'sinh học', contextText: 'Em học sinh học.' };
const user = (id: number) => ({ id, email: `user${id}@example.com`, fullName: 'Test', isActive: true, createdAt: '' });
const emptyAuth: AuthContextValue = { user: null, token: null, isLoading: false, login: async () => {}, register: async () => {}, logout: () => {} };
let auth = emptyAuth;
const Wrapper = ({ children }: { children: ReactNode }) => <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
const page = (term: string) => ({ items: [{ ...draft, term, id: 1, createdAt: '2026-11-13T00:00:00Z' }], total: 1, skip: 0, limit: 20 });
beforeEach(() => { localStorage.clear(); auth = { ...emptyAuth }; });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it('does not load guest data while authentication is pending or import it after login', async () => {
  saveGuestVocabulary(draft);
  auth = { ...emptyAuth, token: 'alice', isLoading: true };
  localStorage.setItem('token', 'alice');
  const fetchMock = vi.fn().mockImplementation(async (url: string) => new Response(JSON.stringify(
    url.includes('/sources') ? [] : { items: [], total: 0, skip: 0, limit: 20 })));
  vi.stubGlobal('fetch', fetchMock);
  const { result, rerender } = renderHook(() => useVocabulary({}), { wrapper: Wrapper });
  expect(result.current.loading).toBe(true);
  expect(result.current.page).toBeUndefined();
  expect(fetchMock).not.toHaveBeenCalled();
  auth = { ...auth, user: user(1), isLoading: false };
  rerender();
  await waitFor(() => expect(result.current.page?.total).toBe(0));
  expect(readGuestVocabulary()).toHaveLength(1);
  expect(fetchMock.mock.calls.every(([, init]) => !init.method)).toBe(true);
});

it('hides old account data immediately and ignores a late response after switching accounts', async () => {
  auth = { ...emptyAuth, user: user(1), token: 'alice' };
  localStorage.setItem('token', 'alice');
  let resolveOld!: (response: Response) => void;
  const old = new Promise<Response>(resolve => { resolveOld = resolve; });
  const fetchMock = vi.fn().mockImplementation((url: string, init: RequestInit) => {
    if (url.includes('/sources')) return Promise.resolve(new Response('[]'));
    return new Headers(init.headers).get('Authorization') === 'Bearer alice'
      ? old : Promise.resolve(new Response(JSON.stringify(page('từ của Bob'))));
  });
  vi.stubGlobal('fetch', fetchMock);
  const { result, rerender } = renderHook(() => useVocabulary({}), { wrapper: Wrapper });
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  auth = { ...emptyAuth, user: user(2), token: 'bob' };
  localStorage.setItem('token', 'bob');
  rerender();
  expect(result.current.page).toBeUndefined();
  await waitFor(() => expect(result.current.page?.items[0].term).toBe('từ của Bob'));
  await act(async () => { resolveOld(new Response(JSON.stringify(page('bí mật của Alice')))); await old; });
  expect(result.current.page?.items[0].term).toBe('từ của Bob');
});

it('reports an expired session without falling back to guest storage', async () => {
  auth = { ...emptyAuth, user: user(1), token: 'expired' };
  localStorage.setItem('token', 'expired');
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{"detail":"expired"}', { status: 401 })));
  const { result } = renderHook(() => useVocabulary(), { wrapper: Wrapper });
  await act(async () => { expect(await result.current.save(draft)).toBeNull(); });
  expect(result.current.error).toContain('hết hạn');
  expect(readGuestVocabulary()).toEqual([]);
});

it('does not report a save as successful after logout', async () => {
  auth = { ...emptyAuth, user: user(1), token: 'alice' };
  localStorage.setItem('token', 'alice');
  let resolveSave!: (response: Response) => void;
  vi.stubGlobal('fetch', vi.fn().mockImplementation(() => new Promise<Response>(r => { resolveSave = r; })));
  const { result, rerender } = renderHook(() => useVocabulary(), { wrapper: Wrapper });
  let pending!: ReturnType<typeof result.current.save>;
  act(() => { pending = result.current.save(draft); });
  auth = { ...emptyAuth }; localStorage.removeItem('token'); rerender();
  await act(async () => {
    resolveSave(new Response(JSON.stringify(page('sinh học').items[0])));
    expect(await pending).toBeNull();
  });
  expect(result.current.busy).toBe(false);
  expect(readGuestVocabulary()).toEqual([]);
});
