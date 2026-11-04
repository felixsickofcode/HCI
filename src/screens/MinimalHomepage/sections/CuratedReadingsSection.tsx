import React from 'react';
import { useNavigate } from 'react-router-dom';
import { TagMarker, ReadingCard } from '../../../components/common';
import { mockCuratedArticles } from '../../../mocks';

export const CuratedReadingsSection: React.FC = () => {
  const navigate = useNavigate();

  const handleOpenReading = () => {
    navigate('/reading');
  };

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
          onClick={handleOpenReading}
          className="inline-flex items-center gap-2 text-sm font-label text-primary hover:underline font-medium select-none"
        >
          <span>Xem toàn bộ thư viện</span>
          <span className="material-symbols-outlined text-[18px]">north_east</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {mockCuratedArticles.map((article) => (
          <ReadingCard
            key={article.id}
            category={article.category}
            readingTime={article.readingTime}
            comfortLevel={article.comfortLevel}
            title={article.title}
            excerpt={article.excerpt}
            author={article.author}
            imageSrc={article.imageSrc}
            imageAlt={article.imageAlt}
            onReadClick={handleOpenReading}
          />
        ))}
      </div>
    </section>
  );
};
