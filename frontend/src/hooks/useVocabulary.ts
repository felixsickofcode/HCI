import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/auth-context';
import { tokenStore } from '../lib/api';
import {
  CorruptGuestShelfError, VOCABULARY_CHANGED, VOCABULARY_KEY, deleteGuestVocabulary, deleteVocabulary,
  fetchSources, fetchVocabulary, filterGuestVocabulary, guestSources, mutateGuest,
  queryString, readGuestShelf, quickSaveGuest, restoreGuestWord, restoreWord, updateGuestNote, updateNote, saveVocabulary, vocabularyError,
} from '../lib/vocabulary';
import type { SaveResult, VocabularyDraft, VocabularyEntry, VocabularyFilters, VocabularyPage, VocabularySource } from '../lib/vocabulary';

export function useVocabulary(filters?: VocabularyFilters) {
  const { user, token, isLoading } = useAuth();
  const ready = !isLoading && (!token || !!user);
  const scope = !ready ? 'pending' : user ? `user:${user.id}:${token}` : 'guest';
  const query = filters === undefined ? undefined : queryString(filters);
  const [revision, setRevision] = useState(0);
  const key = JSON.stringify([scope, query]);
  const [loaded, setLoaded] = useState<{ key: string; corruptShelf?: boolean; page?: VocabularyPage; sources?: VocabularySource[]; error?: string }>();
  const [mutation, setMutation] = useState<{ scope: string; busy: boolean; error?: string }>();
  const requests = useRef(new Set<AbortController>());
  const busy = useRef(false);
  const refresh = useCallback(() => { setRevision(value => value + 1); setMutation(undefined); }, [setRevision]);

  useEffect(() => {
    const controllers = requests.current;
    return () => { controllers.forEach(c => c.abort()); controllers.clear(); busy.current = false; };
  }, [scope]);

  useEffect(() => {
    const changed = () => refresh();
    const storage = (e: StorageEvent) => { if (e.key === VOCABULARY_KEY || e.key === null) refresh(); };
    window.addEventListener(VOCABULARY_CHANGED, changed);
    window.addEventListener('storage', storage);
    return () => {
      window.removeEventListener(VOCABULARY_CHANGED, changed);
      window.removeEventListener('storage', storage);
    };
  }, [refresh]);

  useEffect(() => {
    if (!ready || query === undefined) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        let page: VocabularyPage, sources: VocabularySource[];
        if (token) [page, sources] = await Promise.all([
          fetchVocabulary(query, token, controller.signal), fetchSources(token, controller.signal),
        ]);
        else {
          const { entries, lastRemoved } = readGuestShelf();
          const params = new URLSearchParams(query);
          const localFilters: VocabularyFilters = Object.fromEntries(params);
          localFilters.skip = Number(params.get('skip') ?? 0);
          localFilters.limit = Number(params.get('limit') ?? 20);
          page = filterGuestVocabulary(entries, localFilters, lastRemoved);
          sources = guestSources(entries);
        }
        if (!controller.signal.aborted) setLoaded({ key, page, sources });
      } catch (error) {
        if (!controller.signal.aborted) setLoaded({ key, error: vocabularyError(error), corruptShelf: error instanceof CorruptGuestShelfError });
      }
    }, 180);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [key, query, ready, token, revision]);

  const mutate = useCallback(async <T,>(operation: (signal: AbortSignal, assertScope: () => void) => Promise<T>): Promise<T | null> => {
    if (!ready || busy.current) return null;
    const controller = new AbortController();
    requests.current.add(controller);
    busy.current = true;
    setMutation({ scope, busy: true });
    const assertScope = () => {
      if (controller.signal.aborted || tokenStore.get() !== token) throw new DOMException('Account changed', 'AbortError');
    };
    try {
      assertScope();
      const result = await operation(controller.signal, assertScope);
      assertScope();
      window.dispatchEvent(new Event(VOCABULARY_CHANGED));
      setMutation({ scope, busy: false });
      return result;
    } catch (error) {
      if (!controller.signal.aborted && !(error instanceof DOMException && error.name === 'AbortError')) {
        setMutation({ scope, busy: false, error: vocabularyError(error) });
      }
      return null;
    } finally {
      requests.current.delete(controller);
      if (!controller.signal.aborted) busy.current = false;
    }
  }, [ready, scope, token]);

  const save = useCallback((draft: VocabularyDraft) => mutate<SaveResult>(async (signal, assertScope) => {
    if (token) return saveVocabulary(draft, token, signal);
    return mutateGuest(() => { assertScope(); return quickSaveGuest(draft); });
  }), [mutate, token]);
  const edit = useCallback((id: VocabularyEntry['id'], meaning: string | null) => mutate(async (signal, assertScope) => {
    if (token) return updateNote(id, meaning, token, signal);
    return mutateGuest(() => { assertScope(); return updateGuestNote(id, meaning); });
  }), [mutate, token]);
  const restore = useCallback((id: VocabularyEntry['id']) => mutate(async (signal, assertScope) => {
    if (token) await restoreWord(id, token, signal);
    else await mutateGuest(() => { assertScope(); restoreGuestWord(id); });
    return true;
  }), [mutate, token]);
  const remove = useCallback((id?: string | number, expectedTotal?: number) => mutate(async (signal, assertScope) => {
    if (token) await deleteVocabulary(token, signal, id, expectedTotal);
    else await mutateGuest(() => { assertScope(); deleteGuestVocabulary(id, expectedTotal); });
    return true;
  }), [mutate, token]);

  const current = loaded?.key === key ? loaded : undefined;
  return {
    scope, ready, signedIn: !!user, save, edit, remove, restore, refresh,
    page: current?.page, sources: current?.sources ?? [],
    corruptShelf: current?.corruptShelf === true,
    loading: !ready || (query !== undefined && !current),
    error: (mutation?.scope === scope ? mutation.error : undefined) || current?.error,
    busy: mutation?.scope === scope && mutation.busy,
  };
}
