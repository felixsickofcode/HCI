import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TagMarker, ReadingCard, FeedbackBanner } from '../../../components/common';
import { CatalogSkeleton } from '../../../components/reading/CatalogSkeleton';
import { useOpenArticle } from '../../../hooks/useOpenArticle';
import { loadCatalog } from '../../../lib/articles';
import type { ArticleSummary } from '../../../lib/articles';

const FEATURED_COUNT = 3;

export const CuratedReadingsSection: React.FC = () => {
  const navigate = useNavigate();
  const { open, openingId, error: openError } = useOpenArticle();
  const [articles, setArticles] = useState<ArticleSummary[] | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    loadCatalog(controller.signal)
      .then(catalog => {
        if (!controller.signal.aborted) setArticles(catalog.items.slice(0, FEATURED_COUNT));
      })
      // Bài tuyển chọn chỉ là lối tắt: lỗi tải thì ẩn danh sách, không chặn phần còn lại của trang.
      .catch(() => {
        if (!controller.signal.aborted) setArticles([]);
      });
    return () => controller.abort();
  }, []);

  return (
    <section className="max-w-7xl mx-auto px-6 lg:px-12 py-16 w-full">
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
        <div>
          <TagMarker label="Tủ sách tuyển chọn" />
          <h2 className="mt-4 font-headline text-3xl text-on-surface font-normal">
            Những áng văn xoa dịu tâm trí
          </h2>
        </div>
        <button
          type="button"
          onClick={() => navigate('/library')}
          className="inline-flex items-center gap-2 text-sm font-label text-primary hover:underline font-medium select-none"
        >
          <span>Xem toàn bộ thư viện</span>
          <span className="material-symbols-outlined text-[18px]">north_east</span>
        </button>
      </div>

      {openError && (
        <div className="mb-8">
          <FeedbackBanner message={openError} type="hint" />
        </div>
      )}

      {articles === null ? (
        <CatalogSkeleton count={FEATURED_COUNT} />
      ) : articles.length === 0 ? (
        <p className="text-sm text-on-surface-variant">
          Chưa tải được bài tuyển chọn. Bạn có thể mở{' '}
          <button type="button" onClick={() => navigate('/library')} className="text-primary underline">
            thư viện bài đọc
          </button>{' '}
          để chọn bài khác.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {articles.map(article => (
            <div key={article.id} className="relative">
              <ReadingCard
                category={article.category}
                readingTime={article.readingTime}
                comfortLevel={article.comfortLevel}
                title={article.title}
                excerpt={article.excerpt}
                author={article.author}
                imageSrc={article.imageSrc}
                imageAlt={article.imageAlt}
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
    </section>
  );
};
