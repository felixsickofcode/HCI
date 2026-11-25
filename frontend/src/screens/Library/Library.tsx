import React, { useEffect, useMemo, useState } from 'react';
import { Footer, Header } from '../../components/layout';
import { FeedbackBanner, ReadingCard, TagMarker } from '../../components/common';
import { CatalogSkeleton } from '../../components/reading/CatalogSkeleton';
import { useOpenArticle } from '../../hooks/useOpenArticle';
import { loadCatalog } from '../../lib/articles';
import type { ArticleCatalog, ArticleSummary } from '../../lib/articles';

const ALL = 'Tất cả';

type SortKey = 'default' | 'short' | 'long';

const SORT_LABEL: Record<SortKey, string> = {
  default: 'Thứ tự tuyển chọn',
  short: 'Bài ngắn trước',
  long: 'Bài dài trước',
};

const normalize = (value: string) => value.normalize('NFC').toLowerCase();

const matches = (article: ArticleSummary, query: string) => {
  if (!query) return true;
  const needle = normalize(query);
  return [article.title, article.excerpt, article.author, article.category]
    .some(field => normalize(field).includes(needle));
};

export const Library: React.FC = () => {
  const { open, openingId, error: openError } = useOpenArticle();
  const [catalog, setCatalog] = useState<ArticleCatalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState(ALL);
  const [sort, setSort] = useState<SortKey>('default');

  useEffect(() => {
    const controller = new AbortController();
    loadCatalog(controller.signal)
      .then(next => {
        if (controller.signal.aborted) return;
        setCatalog(next);
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return;
        setError(cause instanceof Error ? cause.message : 'Không tải được thư viện bài đọc.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [attempt]);

  const retry = () => {
    setLoading(true);
    setError('');
    setAttempt(value => value + 1);
  };

  const items = useMemo(() => catalog?.items ?? [], [catalog]);
  const categories = useMemo(
    () => [ALL, ...Array.from(new Set(items.map(article => article.category)))],
    [items],
  );

  const visible = useMemo(() => {
    const filtered = items.filter(article =>
      (category === ALL || article.category === category) && matches(article, query.trim()));
    if (sort === 'short') return [...filtered].sort((a, b) => a.wordCount - b.wordCount);
    if (sort === 'long') return [...filtered].sort((a, b) => b.wordCount - a.wordCount);
    return filtered;
  }, [items, category, query, sort]);

  const filtered = Boolean(query.trim()) || category !== ALL;

  return (
    <div className="min-h-screen bg-[#FAF7F0] font-body text-on-surface flex flex-col">
      <Header />
      <main className="w-full flex-1 mx-auto max-w-6xl px-4 pb-20 pt-28 sm:px-8">
        <header className="flex flex-col gap-6">
          <div>
            <TagMarker label="Tủ sách tuyển chọn" />
            <h1 className="mt-5 font-headline text-3xl sm:text-4xl tracking-tight">
              Thư viện bài đọc
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-on-surface-variant">
              Chọn một bài đọc mẫu để mở ngay trong chế độ đọc tập trung. Bài đọc giữ nguyên
              tiêu đề, độ dài và các công cụ hỗ trợ đọc bạn đã thiết lập.
            </p>
          </div>

          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="w-full lg:max-w-sm">
              <label htmlFor="library-search" className="text-xs font-label font-medium text-on-surface-variant">
                Tìm bài đọc
              </label>
              <div className="mt-2 flex items-center gap-2 rounded-full border border-outline-variant/60 bg-[#FFFDF8] px-4 py-2.5">
                <span className="material-symbols-outlined text-[20px] text-outline" aria-hidden="true">search</span>
                <input
                  id="library-search"
                  type="search"
                  value={query}
                  onChange={event => setQuery(event.target.value)}
                  placeholder="Tên bài, tác giả hoặc chủ đề"
                  className="w-full bg-transparent text-sm focus:outline-none"
                />
              </div>
            </div>

            <div className="w-full sm:w-56">
              <label htmlFor="library-sort" className="text-xs font-label font-medium text-on-surface-variant">
                Sắp xếp
              </label>
              <select
                id="library-sort"
                value={sort}
                onChange={event => setSort(event.target.value as SortKey)}
                className="mt-2 w-full rounded-full border border-outline-variant/60 bg-[#FFFDF8] px-4 py-2.5 text-sm focus:outline-primary"
              >
                {(Object.keys(SORT_LABEL) as SortKey[]).map(key => (
                  <option key={key} value={key}>{SORT_LABEL[key]}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap gap-2" role="group" aria-label="Lọc theo chủ đề">
            {categories.map(name => (
              <button
                key={name}
                type="button"
                aria-pressed={category === name}
                onClick={() => setCategory(name)}
                className={`rounded-full px-4 py-1.5 text-xs font-label transition-colors ${
                  category === name
                    ? 'bg-primary text-on-primary'
                    : 'bg-surface-container-low text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {name}
              </button>
            ))}
          </div>

          <p className="text-xs text-outline" role="status" aria-live="polite">
            {loading ? 'Đang tải thư viện…' : `${visible.length} bài đọc`}
            {!loading && catalog?.source === 'sample' && ' · dùng bộ bài đọc mẫu trên thiết bị'}
          </p>
        </header>

        {openError && (
          <div className="mt-8">
            <FeedbackBanner message={openError} type="hint" />
          </div>
        )}

        <div className="mt-8">
          {loading ? (
            <CatalogSkeleton />
          ) : error ? (
            <div className="rounded-3xl border border-outline-variant/40 bg-[#FFFDF8] p-8 text-center">
              <p className="font-headline text-lg">Chưa tải được thư viện</p>
              <p className="mt-2 text-sm text-on-surface-variant">{error}</p>
              <button
                type="button"
                onClick={retry}
                className="mt-5 rounded-full bg-primary px-5 py-2.5 text-sm font-label text-on-primary"
              >
                Thử lại
              </button>
            </div>
          ) : visible.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-outline-variant/60 bg-[#FFFDF8] p-10 text-center">
              <p className="font-headline text-lg">Không có bài đọc phù hợp</p>
              <p className="mt-2 text-sm text-on-surface-variant">
                Thử từ khóa khác hoặc bỏ bộ lọc chủ đề.
              </p>
              {filtered && (
                <button
                  type="button"
                  onClick={() => { setQuery(''); setCategory(ALL); }}
                  className="mt-5 rounded-full bg-surface-container-low px-5 py-2.5 text-sm font-label text-on-surface"
                >
                  Xóa bộ lọc
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {visible.map(article => (
                <div key={article.id} className="relative">
                  <ReadingCard
                    imageSrc={article.imageSrc}
                    imageAlt={article.imageAlt}
                    category={article.category}
                    readingTime={article.readingTime}
                    comfortLevel={article.comfortLevel}
                    title={article.title}
                    excerpt={article.excerpt}
                    author={article.author}
                    onReadClick={() => { void open(article); }}
                    className={openingId === article.id ? 'opacity-70' : ''}
                  />
                  {openingId === article.id && (
                    <p className="absolute inset-0 grid place-items-center rounded-3xl bg-[#FFFDF8]/80 text-sm font-label text-primary">
                      Đang mở bài đọc…
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};
