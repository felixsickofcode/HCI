import React from 'react';

/** Khung chờ cho danh sách thẻ bài đọc, dùng chung cho thư viện và trang chủ. */
export const CatalogSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8" aria-hidden="true">
    {Array.from({ length: count }, (_, index) => (
      <div key={index} className="rounded-3xl bg-surface-container-lowest shadow-card-subtle overflow-hidden">
        <div className="h-56 bg-surface-container-low animate-pulse" />
        <div className="p-7 space-y-3">
          <div className="h-3 w-24 rounded-full bg-surface-container-low animate-pulse" />
          <div className="h-5 w-full rounded-full bg-surface-container-low animate-pulse" />
          <div className="h-3 w-4/5 rounded-full bg-surface-container-low animate-pulse" />
        </div>
      </div>
    ))}
  </div>
);
