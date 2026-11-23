import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { PhonicsPracticeView } from './PhonicsPracticeView';
import { GLYPH_FONT_LABELS, GLYPHS } from '../../data/phonics/glyphData';
import { StrokeGuide } from '../../components/phonics/StrokeGuide';

describe('PhonicsPracticeView', () => {
  it('renders four Elkonin exercises and the Step 3 footer controls', () => {
    render(
      <MemoryRouter initialEntries={['/phonics/bai-01']}>
        <Routes>
          <Route path="/phonics/:lessonId" element={<PhonicsPracticeView />} />
        </Routes>
      </MemoryRouter>,
    );

    for (let tab = 0; tab < 6; tab += 1) {
      fireEvent.click(screen.getByRole('button', { name: /Tiếp tục|Bài tập tiếp theo/ }));
    }

    expect(screen.getByText('Bài tập thực hành:', { exact: false })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Bài tập trước' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Kiểm tra' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Bài tập tiếp theo' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Nghe lại âm thanh mẫu' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Chip c' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Chip a' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Chip c' }));
    fireEvent.click(screen.getByRole('button', { name: 'Ô phụ âm' }));
    fireEvent.click(screen.getByRole('button', { name: 'Chip a' }));
    fireEvent.click(screen.getByRole('button', { name: 'Ô nguyên âm' }));
    fireEvent.click(screen.getByRole('button', { name: 'huyền' }));

    expect(screen.getByRole('button', { name: 'Kiểm tra' })).toBeEnabled();
  });

  it('renders the Step 2 guided blending grid with four audio cards', () => {
    render(
      <MemoryRouter initialEntries={['/phonics/bai-01']}>
        <Routes>
          <Route path="/phonics/:lessonId" element={<PhonicsPracticeView />} />
        </Routes>
      </MemoryRouter>,
    );

    for (let tab = 0; tab < 5; tab += 1) {
      fireEvent.click(screen.getByRole('button', { name: /Tiếp tục/ }));
    }

    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Nghe' })).toHaveLength(4);
    expect(screen.getByLabelText('ca')).toBeInTheDocument();
    expect(screen.getByLabelText('co')).toBeInTheDocument();
    expect(screen.getByLabelText('cô')).toBeInTheDocument();
    expect(screen.getByLabelText('cà')).toBeInTheDocument();
  });

  it('renders the Bai 01 four-step shell', () => {
    render(
      <MemoryRouter initialEntries={['/phonics/bai-01']}>
        <Routes>
          <Route path="/phonics/:lessonId" element={<PhonicsPracticeView />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Bài 01 – Âm và chữ')).toBeInTheDocument();
    expect(screen.getAllByText('Học đa giác quan').length).toBeGreaterThan(0);
    expect(screen.getByText('Xem và nghe cách ghép')).toBeInTheDocument();
    expect(screen.getByText('Nghe và tự ghép')).toBeInTheDocument();
    expect(screen.getByText('Tự đọc')).toBeInTheDocument();
  });

  it('shows the coming-soon state for another lesson', () => {
    render(
      <MemoryRouter initialEntries={['/phonics/bai-28']}>
        <Routes>
          <Route path="/phonics/:lessonId" element={<PhonicsPracticeView />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Bài này sắp có')).toBeInTheDocument();
  });

  it('offers the three stroke fonts and no acceleration control', () => {
    render(
      <MemoryRouter initialEntries={['/phonics/bai-01']}>
        <Routes>
          <Route path="/phonics/:lessonId" element={<PhonicsPracticeView />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Tuỳ chỉnh nét')).toBeInTheDocument();
    expect(screen.getByText('Lexend')).toBeInTheDocument();
    expect(screen.queryByText('Gia tốc')).not.toBeInTheDocument();
  });

  it('renders Step 1 sub-navigation with 5 tabs and switches to ToneCardsDisplay', () => {
    render(
      <MemoryRouter initialEntries={['/phonics/bai-01']}>
        <Routes>
          <Route path="/phonics/:lessonId" element={<PhonicsPracticeView />} />
        </Routes>
      </MemoryRouter>,
    );

    // Kiểm tra đủ 5 tab
    expect(screen.getByRole('tab', { name: /Âm c/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Âm a/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Âm o/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Âm ô/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Dấu thanh/i })).toBeInTheDocument();

    // Chuyển sang tab Dấu thanh
    fireEvent.click(screen.getByRole('tab', { name: /Dấu thanh/i }));

    // Kiểm tra 4 thẻ thanh điệu theo spec
    expect(screen.getByText('Làm quen 4 dấu thanh tiếng Việt')).toBeInTheDocument();
    expect(screen.getByText('huyền')).toBeInTheDocument();
    expect(screen.getByText('sắc')).toBeInTheDocument();
    expect(screen.getByText('hỏi')).toBeInTheDocument();
    expect(screen.getByText('nặng')).toBeInTheDocument();
    expect(screen.getByText('cà')).toBeInTheDocument();
    expect(screen.getByText('cá')).toBeInTheDocument();
    expect(screen.getByText('cỏ')).toBeInTheDocument();
    expect(screen.getByText('cọ')).toBeInTheDocument();
  });

  it('opens and closes the stroke customizer modal', () => {
    render(
      <MemoryRouter initialEntries={['/phonics/bai-01']}>
        <Routes>
          <Route path="/phonics/:lessonId" element={<PhonicsPracticeView />} />
        </Routes>
      </MemoryRouter>,
    );

    // Mở bảng tuỳ chỉnh
    const openBtn = screen.getByRole('button', { name: /Mở bảng tuỳ chỉnh nét/i });
    fireEvent.click(openBtn);

    // Bảng tuỳ chỉnh hiện ra
    expect(screen.getByText('Màu sắc nét')).toBeInTheDocument();
    expect(screen.getByText('Tốc độ vẽ mẫu')).toBeInTheDocument();
    expect(screen.getByText('Độ dày nét bút')).toBeInTheDocument();
    expect(screen.getByText('Kiểu hiển thị chữ mẫu')).toBeInTheDocument();

    // Đóng bằng nút Hoàn tất
    const closeBtn = screen.getByRole('button', { name: /Hoàn tất tuỳ chỉnh nét/i });
    fireEvent.click(closeBtn);

    // Bảng đóng lại, quay về nút mở
    expect(screen.getByRole('button', { name: /Mở bảng tuỳ chỉnh nét/i })).toBeInTheDocument();
  });

  it('renders the sidebar curriculum and supports search and collapse', () => {
    render(
      <MemoryRouter initialEntries={['/phonics/bai-01']}>
        <Routes>
          <Route path="/phonics/:lessonId" element={<PhonicsPracticeView />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole('searchbox', { name: 'Tìm kiếm bài học' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Chương 1: Âm và chữ cơ bản/i })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('button', { name: /Chương 2 \(4 bài\)/i })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByText('Bài tiếp theo')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Đăng xuất' })).toBeInTheDocument();

    fireEvent.change(screen.getByRole('searchbox', { name: 'Tìm kiếm bài học' }), {
      target: { value: 'oay' },
    });
    expect(screen.getByRole('button', { name: /Bài 28: oai, oay, uây và vần ít gặp/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Thu gọn thanh bên' }));
    expect(screen.getByRole('button', { name: 'Mở rộng thanh bên' })).toBeInTheDocument();
  });
});

describe('glyph stroke data', () => {
  it('provides corrected a, c, o, and ô glyph sets for all requested fonts', () => {
    expect(Object.keys(GLYPH_FONT_LABELS)).toEqual(['lexend', 'arial', 'verdana']);
    for (const font of Object.keys(GLYPH_FONT_LABELS) as Array<keyof typeof GLYPHS>) {
      expect(GLYPHS[font].a?.strokes.length).toBeGreaterThan(0);
      expect(GLYPHS[font].c?.strokes.length).toBeGreaterThan(0);
      expect(GLYPHS[font].o?.strokes.length).toBeGreaterThan(0);
      expect(GLYPHS[font].ô?.strokes.length).toBeGreaterThan(0);
    }
  });

  describe('StrokeGuide actions', () => {
    it('does not render an audio action', () => {
      render(<StrokeGuide symbol="a" />);

      fireEvent.click(screen.getByRole('button', { name: 'Phát lại' }));

      expect(screen.queryByRole('button', { name: /^nghe$/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Xóa nét' })).not.toBeInTheDocument();
    });

    it('updates the drawn string when symbol changes', () => {
      const { rerender } = render(<StrokeGuide symbol="a" />);
      rerender(<StrokeGuide symbol="c" />);

      expect(screen.getByRole('img', { name: 'Hoạt hình hướng dẫn vẽ nét chữ c' })).toBeInTheDocument();
    });
  });
});
