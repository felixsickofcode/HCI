import { ApiError, apiFetch, apiRequest } from './api';
import type { DocumentSource } from './document';

export interface VocabularyDraft {
  term: string;
  meaning?: string | null;
  example?: string | null;
  contextText: string;
  sourceDocumentId?: string | null;
  sourceTitle?: string | null;
  sourceKind?: DocumentSource | null;
  contentVersion?: string | null;
  segmentId?: string | null;
  start?: number | null;
  end?: number | null;
}
export interface VocabularyEntry extends VocabularyDraft {
  id: number | string;
  createdAt: string;
}
export interface VocabularyFilters {
  q?: string;
  sourceDocumentId?: string;
  from?: string;
  to?: string;
  skip?: number;
  limit?: number;
}
export interface SaveResult { entry: VocabularyEntry; created: boolean }
export interface VocabularyPage {
  libraryTotal: number;
  lastRemoved: Pick<VocabularyEntry, 'id' | 'term'> | null;
  items: VocabularyEntry[]; total: number; skip: number; limit: number }
export interface VocabularySource { sourceDocumentId: string; sourceTitle: string }
export const VOCABULARY_KEY = 'lexiease:vocabulary:guest:v1';
export const VOCABULARY_CHANGED = 'lexiease:vocabulary-changed';
const MAX_GUEST_ENTRIES = 1000;
const endpoint = '/me/vocabulary';

export const normalizeTerm = (text: string) => text.normalize('NFC').toLowerCase().trim().replace(/\s+/gu, ' ');
export function validateDraft(draft: VocabularyDraft): void {
  if (typeof draft?.term !== 'string' || !draft.term.trim() || draft.term.length > 120 ||
      typeof draft.contextText !== 'string' || !draft.contextText.trim() || draft.contextText.length > 4000) {
    throw new Error('Chọn từ/cụm từ tối đa 120 ký tự trong đoạn ngữ cảnh tối đa 4.000 ký tự.');
  }
  const limits = { meaning: 2000, example: 2000, sourceDocumentId: 200, sourceTitle: 300, segmentId: 100 } as const;
  for (const [key, max] of Object.entries(limits)) {
    const value = draft[key as keyof typeof limits];
    if (value != null && (typeof value !== 'string' || value.length > max ||
        (!['meaning', 'example'].includes(key) && !value.length))) throw new Error('Dữ liệu từ đã lưu không hợp lệ.');
  }
  for (const value of Object.values(draft)) {
    if (typeof value === 'string' && (value.includes('\0') || (/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/u.test(value)))) {
      throw new Error('Văn bản chứa ký tự không hợp lệ.');
    }
  }
  if (draft.sourceKind != null && !['paste', 'pdf', 'image'].includes(draft.sourceKind)) throw new Error('Nguồn không hợp lệ.');
  if (draft.contentVersion != null && !/^[a-f0-9]{64}$/.test(draft.contentVersion)) throw new Error('Phiên bản nội dung không hợp lệ.');
  if ([draft.segmentId, draft.start, draft.end].some(v => v != null)) {
    const { start, end } = draft;
    if (!draft.segmentId || !Number.isInteger(start) || !Number.isInteger(end) ||
        start! < 0 || end! <= start! || end! > draft.contextText.length ||
        draft.contextText.slice(start!, end!) !== draft.term) throw new Error('Vị trí từ không khớp đoạn văn.');
  }
}

function identity(draft: VocabularyDraft): string {
  return JSON.stringify([normalizeTerm(draft.term), normalizeTerm(draft.contextText),
    draft.sourceDocumentId ?? null, draft.contentVersion ?? null,
    draft.segmentId ?? null, draft.start ?? null, draft.end ?? null]);
}

export class CorruptGuestShelfError extends Error {}

interface GuestShelf {
  entries: VocabularyEntry[];
  lastRemoved: VocabularyEntry | null;
}
export function readGuestShelf(): GuestShelf {
  let raw: string | null;
  try { raw = localStorage.getItem(VOCABULARY_KEY); }
  catch { throw new Error('Trình duyệt đang chặn bộ nhớ. Hãy cho phép lưu dữ liệu trang này.'); }
  if (!raw) return { entries: [], lastRemoved: null };
  try {
    const value = JSON.parse(raw);
    if (value.version !== 1 || !Array.isArray(value.entries) || value.entries.length > MAX_GUEST_ENTRIES) throw new Error();
    const ids = new Set<string>();
    for (const entry of [...value.entries, ...(value.lastRemoved == null ? [] : [value.lastRemoved])]) {
      validateDraft(entry);
      if (typeof entry.id !== 'string' || !entry.id || ids.has(entry.id) ||
          typeof entry.createdAt !== 'string' || !Number.isFinite(Date.parse(entry.createdAt))) throw new Error();
      ids.add(entry.id);
    }
    return { entries: value.entries, lastRemoved: value.lastRemoved ?? null };
  } catch {
    throw new CorruptGuestShelfError('Không đọc được thư viện trên máy. Dữ liệu được giữ nguyên; bạn có thể xóa thư viện này để bắt đầu lại.');
  }
}

export function readGuestVocabulary() { return readGuestShelf().entries; }

function writeGuestShelf(shelf: GuestShelf): void {
  try { localStorage.setItem(VOCABULARY_KEY, JSON.stringify({ version: 1, ...shelf })); }
  catch { throw new Error('Chưa lưu được: bộ nhớ trình duyệt đã đầy hoặc bị chặn.'); }
}

// Serialize mutations across tabs where Web Locks are available; never silently overwrite corrupt data.
export async function mutateGuest<T>(action: () => T): Promise<T> {
  if (typeof navigator !== 'undefined' && navigator.locks) return navigator.locks.request(VOCABULARY_KEY, action);
  return action();
}
export function quickSaveGuest(draft: VocabularyDraft): SaveResult {
  validateDraft(draft);
  const { entries, lastRemoved } = readGuestShelf();
  const existing = entries.find(entry => identity(entry) === identity(draft));
  if (existing) return { entry: existing, created: false };
  if (entries.length >= MAX_GUEST_ENTRIES) throw new Error('Thư viện đã có 1.000 mục. Hãy xóa bớt từ trước khi lưu thêm.');
  const entry = { ...draft, meaning: draft.meaning?.trim() || null, example: draft.example?.trim() || null,
    id: crypto.randomUUID(), createdAt: new Date().toISOString() };
  writeGuestShelf({ entries: [entry, ...entries],
    lastRemoved: lastRemoved && identity(lastRemoved) === identity(draft) ? null : lastRemoved });
  return { entry, created: true };
}

export function saveGuestVocabulary(draft: VocabularyDraft) { return quickSaveGuest(draft).entry; }

export function updateGuestNote(id: VocabularyEntry['id'], meaning: string | null) {
  const shelf = readGuestShelf();
  const entry = shelf.entries.find(word => word.id === id);
  if (!entry) throw new Error('Không tìm thấy từ đã lưu.');
  entry.meaning = meaning?.trim() || null;
  validateDraft(entry);
  writeGuestShelf(shelf);
  return entry;
}

export function restoreGuestWord(id: VocabularyEntry['id']) {
  const shelf = readGuestShelf();
  if (shelf.entries.some(entry => entry.id === id)) return;
  if (shelf.lastRemoved?.id !== id) throw new Error('Từ này không còn để hoàn tác.');
  if (shelf.entries.length >= MAX_GUEST_ENTRIES) throw new Error('Thư viện đã đầy.');
  writeGuestShelf({ entries: [...shelf.entries, shelf.lastRemoved], lastRemoved: null });
}

export function deleteGuestVocabulary(id?: string | number, expectedTotal?: number): void {
  if (id === undefined) {
    if (expectedTotal !== undefined && readGuestVocabulary().length !== expectedTotal)
      throw new Error('Số từ đã thay đổi. Hãy mở lại xác nhận xóa.');
    try { localStorage.removeItem(VOCABULARY_KEY); }
    catch { throw new Error('Không thể xóa dữ liệu trên trình duyệt này.'); }
    return;
  }
  const shelf = readGuestShelf();
  if (shelf.lastRemoved?.id === id) return;
  const entry = shelf.entries.find(word => word.id === id);
  if (!entry) throw new Error('Không tìm thấy từ đã lưu.');
  writeGuestShelf({ entries: shelf.entries.filter(word => word.id !== id), lastRemoved: entry });
}
export function filterGuestVocabulary(entries: VocabularyEntry[], filters: VocabularyFilters, lastRemoved: VocabularyEntry | null = null): VocabularyPage {
  const q = normalizeTerm(filters.q ?? '');
  const filtered = entries.filter(entry => (!q || normalizeTerm(entry.term).includes(q)) &&
    (!filters.sourceDocumentId || entry.sourceDocumentId === filters.sourceDocumentId) &&
    (!filters.from || Date.parse(entry.createdAt) >= Date.parse(filters.from)) &&
    (!filters.to || Date.parse(entry.createdAt) < Date.parse(filters.to)))
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt) || String(b.id).localeCompare(String(a.id)));
  const skip = filters.skip ?? 0, limit = filters.limit ?? 20;
  return { libraryTotal: entries.length, lastRemoved, items: filtered.slice(skip, skip + limit), total: filtered.length, skip, limit };
}
export function guestSources(entries: VocabularyEntry[]): VocabularySource[] {
  return [...new Map(entries.filter(e => e.sourceDocumentId).map(e => [e.sourceDocumentId!, {
    sourceDocumentId: e.sourceDocumentId!, sourceTitle: e.sourceTitle || 'Tài liệu không có tên',
  }])).values()];
}

export function queryString(filters: VocabularyFilters): string {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => { if (value !== '' && value != null) params.set(key, String(value)); });
  return params.toString();
}
const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
export const fetchVocabulary = (query: string, token: string, signal: AbortSignal) =>
  apiFetch<VocabularyPage>(`${endpoint}?${query}`, { headers: auth(token), signal });
export const fetchSources = (token: string, signal: AbortSignal) =>
  apiFetch<VocabularySource[]>(`${endpoint}/sources`, { headers: auth(token), signal });
export async function saveVocabulary(draft: VocabularyDraft, token: string, signal: AbortSignal): Promise<SaveResult> {
  const response = await apiRequest(endpoint, { method: 'POST', headers: auth(token), body: JSON.stringify(draft), signal });
  return { entry: await response.json(), created: response.status === 201 };
}
export const updateNote = (id: VocabularyEntry['id'], meaning: string | null, token: string, signal: AbortSignal) =>
  apiFetch<VocabularyEntry>(`${endpoint}/${encodeURIComponent(id)}`, {
    method: 'PATCH', headers: auth(token), body: JSON.stringify({ meaning }), signal,
  });
export const restoreWord = (id: VocabularyEntry['id'], token: string, signal: AbortSignal) =>
  apiFetch<VocabularyEntry>(`${endpoint}/${encodeURIComponent(id)}/restore`, { method: 'POST', headers: auth(token), signal });
export function deleteVocabulary(token: string, signal: AbortSignal, id?: string | number, expectedTotal?: number) {
  const target = id === undefined ? endpoint : `${endpoint}/${encodeURIComponent(id)}?undoable=true`;
  const path = expectedTotal === undefined ? target : `${target}?expectedTotal=${expectedTotal}`;
  return apiFetch<void>(path, { method: 'DELETE', headers: auth(token), signal });
}

export function vocabularyError(error: unknown): string {
  if (error instanceof ApiError && error.status === 401) return 'Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại để tiếp tục.';
  if (error instanceof ApiError && error.status >= 500) return 'Máy chủ chưa xử lý được thư viện. Hãy thử lại sau.';
  if (error instanceof TypeError) return 'Không kết nối được máy chủ. Thao tác chưa được xác nhận; hãy thử lại.';
  return error instanceof Error ? error.message : 'Không thực hiện được thao tác. Hãy thử lại.';
}

// End date is inclusive in the UI, exclusive in the API, using the user's local timezone.
export function dateBounds(from: string, to: string): Pick<VocabularyFilters, 'from' | 'to'> {
  const start = from ? new Date(`${from}T00:00:00`) : undefined;
  const end = to ? new Date(`${to}T00:00:00`) : undefined;
  if (end) end.setDate(end.getDate() + 1);
  if ((start && !Number.isFinite(+start)) || (end && !Number.isFinite(+end)) || (start && end && start >= end)) {
    throw new Error('Khoảng ngày không hợp lệ. Ngày kết thúc phải từ ngày bắt đầu trở đi.');
  }
  return { from: start?.toISOString(), to: end?.toISOString() };
}
