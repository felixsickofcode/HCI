import { Route, Routes } from 'react-router-dom';
import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import { DocumentProvider } from '../../context/DocumentProvider';
import { AuthContext } from '../../context/auth-context';
import { useDocument } from '../../context';
import { Library } from './Library';
import { sampleArticles } from '../../lib/articles';

const guest = { user: null, token: null, isLoading: false, login: async () => {}, register: async () => {}, logout: () => {} };

const ReadingProbe = () => {
  const { document } = useDocument();
  return <p data-testid="probe">{document ? `${document.sourceLabel}: ${document.title}` : 'empty'}</p>;
};

const renderLibrary = () => render(
  <MemoryRouter initialEntries={['/library']}>
    <AuthContext.Provider value={guest}>
      <DocumentProvider>
        <Routes>
          <Route path="/library" element={<Library />} />
          <Route path="/reading" element={<ReadingProbe />} />
        </Routes>
      </DocumentProvider>
    </AuthContext.Provider>
  </MemoryRouter>,
);

const respond = (status: number, body: unknown) =>
  Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }));

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

it('falls back to the built-in catalog when the articles endpoint is missing, then opens a sample into the reader', async () => {
  const fetchMock = vi.fn(() => respond(404, { detail: 'Not Found' }));
  vi.stubGlobal('fetch', fetchMock);
  const user = userEvent.setup();
  renderLibrary();

  expect(await screen.findByText(`${sampleArticles.length} bài đọc · dùng bộ bài đọc mẫu trên thiết bị`)).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: sampleArticles[0].title })).toBeInTheDocument();

  await user.type(screen.getByLabelText('Tìm bài đọc'), 'giấy cũ');
  expect(screen.getByText('1 bài đọc · dùng bộ bài đọc mẫu trên thiết bị')).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: sampleArticles[0].title })).not.toBeInTheDocument();

  await user.click(screen.getByRole('button', { name: 'Đọc tiếp tác phẩm' }));
  expect(await screen.findByTestId('probe')).toHaveTextContent(
    `Bài đọc: ${sampleArticles.find(article => article.id === 'mui-giay-cu')!.title}`,
  );
});

it('shows the retry state when the catalog request fails for a reason other than a missing endpoint', async () => {
  const fetchMock = vi.fn()
    .mockImplementationOnce(() => respond(500, { detail: 'Máy chủ lỗi' }))
    .mockImplementationOnce(() => respond(200, {
      items: [{
        id: 'api-1',
        title: 'Bài từ máy chủ',
        excerpt: 'Nội dung tóm tắt',
        category: 'Khoa học Nhận thức',
        author: 'Nhóm biên tập',
        readingTime: '4 phút đọc',
        wordCount: 700,
      }],
      total: 1,
    }));
  vi.stubGlobal('fetch', fetchMock);
  const user = userEvent.setup();
  renderLibrary();

  expect(await screen.findByText('Chưa tải được thư viện')).toBeInTheDocument();
  expect(screen.getByText('Máy chủ lỗi')).toBeInTheDocument();

  await user.click(screen.getByRole('button', { name: 'Thử lại' }));
  expect(await screen.findByRole('heading', { name: 'Bài từ máy chủ' })).toBeInTheDocument();
  expect(screen.getByText('1 bài đọc')).toBeInTheDocument();
});

it('filters by category and clears the filters when nothing matches', async () => {
  vi.stubGlobal('fetch', vi.fn(() => respond(404, { detail: 'Not Found' })));
  const user = userEvent.setup();
  renderLibrary();

  await screen.findByText(`${sampleArticles.length} bài đọc · dùng bộ bài đọc mẫu trên thiết bị`);
  await user.click(screen.getByRole('button', { name: 'Văn học & Nghệ thuật' }));
  expect(screen.getByText('1 bài đọc · dùng bộ bài đọc mẫu trên thiết bị')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Văn học & Nghệ thuật' })).toHaveAttribute('aria-pressed', 'true');

  await user.type(screen.getByLabelText('Tìm bài đọc'), 'không tồn tại');
  expect(screen.getByText('Không có bài đọc phù hợp')).toBeInTheDocument();

  await user.click(screen.getByRole('button', { name: 'Xóa bộ lọc' }));
  expect(screen.getByText(`${sampleArticles.length} bài đọc · dùng bộ bài đọc mẫu trên thiết bị`)).toBeInTheDocument();
});
