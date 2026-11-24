import React, { useEffect } from 'react';
import type { GlyphFontStyle } from '../../data/phonics/glyphData';

const BLUE_PALETTES = [
  { id: 'sapphire', hex: '#094cb2', label: 'Sapphire đậm' },
  { id: 'azure', hex: '#0284c7', label: 'Xanh da trời' },
  { id: 'deep_ocean', hex: '#0f2e5c', label: 'Xanh biển sâu' },
  { id: 'soft_blue', hex: '#3b82f6', label: 'Xanh lam tươi' },
  { id: 'teal', hex: '#0d9488', label: 'Xanh ngọc bích' },
];

export interface StrokeCustomizerProps {
  isOpen: boolean;
  onClose: () => void;
  strokeColor: string;
  onChangeColor: (color: string) => void;
  speed: number; // 0.5, 1.0, 2.0
  onChangeSpeed: (speed: number) => void;
  strokeWidth: number; // 8 .. 24
  onChangeStrokeWidth: (width: number) => void;
  fontStyle: GlyphFontStyle;
  onChangeFontStyle: (style: GlyphFontStyle) => void;
}

export const StrokeCustomizerModal: React.FC<StrokeCustomizerProps> = ({
  isOpen,
  onClose,
  strokeColor,
  onChangeColor,
  speed,
  onChangeSpeed,
  strokeWidth,
  onChangeStrokeWidth,
  fontStyle,
  onChangeFontStyle,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="stroke-customizer-title"
      className="flex-1 bg-surface-container-lowest p-4 rounded-2xl shadow-md flex flex-col justify-between overflow-hidden select-none"
    >
      {/* Tiêu đề & Nút đóng */}
      <div className="flex items-center justify-between pb-2 border-b border-surface-container">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary-fixed flex items-center justify-center text-primary">
            <span className="material-symbols-outlined text-[17px]">palette</span>
          </div>
          <h3 id="stroke-customizer-title" className="font-headline font-bold text-sm text-on-surface">
            Tuỳ chỉnh nét vẽ
          </h3>
        </div>
        <button
          onClick={onClose}
          type="button"
          aria-label="Đóng bảng tuỳ chỉnh nét"
          className="w-6 h-6 rounded-full hover:bg-surface-container text-secondary flex items-center justify-center transition-colors"
        >
          <span className="material-symbols-outlined text-[16px]">close</span>
        </button>
      </div>

      <div className="space-y-3.5 my-2 text-xs">
        {/* A. 5 Ô TRÒN CHỌN MÀU NÉT */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-label font-semibold text-[11px] text-on-surface-variant uppercase tracking-wider">
              Màu sắc nét
            </span>
            <span className="text-[10px] font-label font-bold text-primary">
              {BLUE_PALETTES.find((p) => p.hex.toLowerCase() === strokeColor.toLowerCase())?.label || 'Tùy chỉnh'}
            </span>
          </div>
          <div className="flex items-center justify-between px-1" role="radiogroup" aria-label="Màu sắc nét vẽ">
            {BLUE_PALETTES.map((palette) => {
              const isSelected = palette.hex.toLowerCase() === strokeColor.toLowerCase();
              return (
                <button
                  key={palette.id}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => onChangeColor(palette.hex)}
                  title={palette.label}
                  style={{ backgroundColor: palette.hex }}
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-white transition-transform ${
                    isSelected
                      ? 'shadow-xs ring-2 ring-primary ring-offset-2 ring-offset-surface-container-lowest scale-105'
                      : 'hover:scale-110 opacity-90'
                  }`}
                >
                  {isSelected && (
                    <span className="material-symbols-outlined text-[14px] font-bold">check</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* B. THANH TRƯỢT TỐC ĐỘ VẼ */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="font-label font-semibold text-[11px] text-on-surface-variant uppercase tracking-wider">
              Tốc độ vẽ mẫu
            </span>
            <span className="font-label text-[11px] font-bold text-primary">
              {speed === 0.5 ? '0.5x Chậm' : speed === 2.0 ? '2.0x Nhanh' : '1.0x Chuẩn'}
            </span>
          </div>
          <div className="relative py-1">
            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.5"
              value={speed}
              onChange={(e) => onChangeSpeed(parseFloat(e.target.value))}
              className="w-full accent-primary h-1.5 bg-surface-container-high rounded-lg cursor-pointer"
              aria-label="Tốc độ vẽ mẫu"
            />
            <div className="flex justify-between text-[10px] font-label text-outline pt-1">
              <span>0.5x Chậm</span>
              <span className="font-semibold text-primary">1.0x Chuẩn</span>
              <span>2.0x Nhanh</span>
            </div>
          </div>
        </div>

        {/* C. THANH TRƯỢT ĐỘ DÀY NÉT */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="font-label font-semibold text-[11px] text-on-surface-variant uppercase tracking-wider">
              Độ dày nét bút
            </span>
            <span className="font-label text-[11px] font-bold text-primary">{strokeWidth}px</span>
          </div>
          <div className="relative py-1">
            <input
              type="range"
              min="8"
              max="24"
              step="1"
              value={strokeWidth}
              onChange={(e) => onChangeStrokeWidth(parseInt(e.target.value, 10))}
              className="w-full accent-primary h-1.5 bg-surface-container-high rounded-lg cursor-pointer"
              aria-label="Độ dày nét bút"
            />
            <div className="flex justify-between text-[10px] font-label text-outline pt-1">
              <span>Mảnh 8px</span>
              <span className="font-semibold text-primary">Vừa 14px</span>
              <span>Đậm 24px</span>
            </div>
          </div>
        </div>

        {/* D. MENU 4 KIỂU FONT */}
        <div>
          <span className="font-label font-semibold text-[11px] text-on-surface-variant uppercase tracking-wider block mb-1.5">
            Kiểu hiển thị chữ mẫu
          </span>
          <div className="grid grid-cols-2 gap-1.5" role="radiogroup" aria-label="Kiểu hiển thị chữ">
            {/* 1. Sans Hiện Đại (mặc định) */}
            <button
              type="button"
              role="radio"
              aria-checked={fontStyle === 'sans' || fontStyle === 'arial'}
              onClick={() => onChangeFontStyle('sans')}
              className={`p-1.5 rounded-lg flex items-center justify-between transition-colors text-left ${
                fontStyle === 'sans' || fontStyle === 'arial'
                  ? 'bg-primary-fixed/40 text-primary font-bold'
                  : 'bg-surface-container-low hover:bg-surface-container text-on-surface-variant'
              }`}
            >
              <span className="text-[11px]">Sans Hiện Đại</span>
              {(fontStyle === 'sans' || fontStyle === 'arial') && (
                <span className="material-symbols-outlined text-[14px]">check</span>
              )}
            </button>

            {/* 2. Script Bay Bổng */}
            <button
              type="button"
              role="radio"
              aria-checked={fontStyle === 'script' || fontStyle === 'lexend'}
              onClick={() => onChangeFontStyle('script')}
              className={`p-1.5 rounded-lg flex items-center justify-between transition-colors text-left ${
                fontStyle === 'script' || fontStyle === 'lexend'
                  ? 'bg-primary-fixed/40 text-primary font-bold'
                  : 'bg-surface-container-low hover:bg-surface-container text-on-surface-variant'
              }`}
            >
              <span className="text-[11px] italic font-headline">Script Bay Bổng</span>
              {(fontStyle === 'script' || fontStyle === 'lexend') && (
                <span className="material-symbols-outlined text-[14px]">check</span>
              )}
            </button>

            {/* 3. Italic Nghiêng */}
            <button
              type="button"
              role="radio"
              aria-checked={fontStyle === 'italic'}
              onClick={() => onChangeFontStyle('italic')}
              className={`p-1.5 rounded-lg flex items-center justify-between transition-colors text-left ${
                fontStyle === 'italic'
                  ? 'bg-primary-fixed/40 text-primary font-bold'
                  : 'bg-surface-container-low hover:bg-surface-container text-on-surface-variant'
              }`}
            >
              <span className="text-[11px] italic font-medium">Italic Nghiêng</span>
              {fontStyle === 'italic' && (
                <span className="material-symbols-outlined text-[14px]">check</span>
              )}
            </button>

            {/* 4. Mono Kỹ Thuật */}
            <button
              type="button"
              role="radio"
              aria-checked={fontStyle === 'mono' || fontStyle === 'verdana'}
              onClick={() => onChangeFontStyle('mono')}
              className={`p-1.5 rounded-lg flex items-center justify-between transition-colors text-left ${
                fontStyle === 'mono' || fontStyle === 'verdana'
                  ? 'bg-primary-fixed/40 text-primary font-bold'
                  : 'bg-surface-container-low hover:bg-surface-container text-on-surface-variant'
              }`}
            >
              <span className="text-[11px] font-mono">Mono Kỹ Thuật</span>
              {(fontStyle === 'mono' || fontStyle === 'verdana') && (
                <span className="material-symbols-outlined text-[14px]">check</span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* NÚT HOÀN TẤT TUỲ CHỈNH */}
      <button
        onClick={onClose}
        type="button"
        className="w-full py-2.5 px-4 rounded-xl bg-primary text-on-primary font-semibold text-xs shadow-xs hover:brightness-105 active:scale-[0.99] transition-all flex items-center justify-center gap-1.5"
      >
        <span className="material-symbols-outlined text-[16px]">check_circle</span>
        <span>Hoàn tất tuỳ chỉnh nét</span>
      </button>
    </div>
  );
};
