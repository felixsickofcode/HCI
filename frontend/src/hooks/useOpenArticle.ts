import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDocument } from '../context';
import { loadArticle } from '../lib/articles';
import type { ArticleSummary } from '../lib/articles';

/** Mở một bài đọc vào trình đọc hiện tại, giữ trạng thái đang mở và lỗi cho nút bấm. */
export function useOpenArticle() {
  const navigate = useNavigate();
  const { submitArticle } = useDocument();
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const open = async (article: ArticleSummary) => {
    setOpeningId(article.id);
    setError('');
    try {
      const detail = await loadArticle(article.id);
      submitArticle(detail.title, detail.body);
      navigate('/reading');
    } catch (cause) {
      setError(
        cause instanceof Error && cause.message
          ? `Không mở được “${article.title}”: ${cause.message}`
          : `Không mở được “${article.title}”. Vui lòng thử lại.`,
      );
    } finally {
      setOpeningId(null);
    }
  };

  return { open, openingId, error };
}
