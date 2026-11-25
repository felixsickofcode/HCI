import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import { AuthContext } from '../../../context/auth-context';
import { DocumentProvider } from '../../../context/DocumentProvider';
import { useDocument } from '../../../context';
import { CuratedReadingsSection } from './CuratedReadingsSection';
import { sampleArticles } from '../../../lib/articles';

const guest = { user: null, token: null, isLoading: false, login: async () => {}, register: async () => {}, logout: () => {} };

const ReadingProbe = () => {
  const { document } = useDocument();
  return <p data-testid="probe">{document ? `${document.sourceLabel}: ${document.title}` : 'empty'}</p>;
};

const respond = (status: number, body: unknown) =>
  Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }));

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

it('opens the article of the clicked card instead of only moving to the reader', async () => {
  vi.stubGlobal('fetch', vi.fn(() => respond(404, { detail: 'Not Found' })));
  const user = userEvent.setup();
  render(
    <MemoryRouter>
      <AuthContext.Provider value={guest}>
        <DocumentProvider>
          <Routes>
            <Route path="/" element={<CuratedReadingsSection />} />
            <Route path="/reading" element={<ReadingProbe />} />
          </Routes>
        </DocumentProvider>
      </AuthContext.Provider>
    </MemoryRouter>,
  );

  const second = sampleArticles[1];
  expect(await screen.findByRole('heading', { name: second.title })).toBeInTheDocument();
  const cards = screen.getAllByRole('button', { name: 'Đọc tiếp tác phẩm' });
  await user.click(cards[1]);

  expect(await screen.findByTestId('probe')).toHaveTextContent(`Bài đọc: ${second.title}`);
});
