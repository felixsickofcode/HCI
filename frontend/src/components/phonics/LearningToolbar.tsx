import React from 'react';

export interface LearningToolbarProps {
  isOpen?: boolean;
  onToggleOpen?: () => void;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
  // Controls
  playbackSpeed: number; // 0.75 or 1.0
  onSpeedChange: (speed: number) => void;
  openDyslexic: boolean;
  onToggleOpenDyslexic: () => void;
  readingRuler: boolean;
  onToggleReadingRuler: () => void;
  warmBackground: boolean;
  onToggleWarmBackground: () => void;
  hapticFeedback: boolean;
  onToggleHapticFeedback: () => void;
  metronome: boolean;
  onToggleMetronome: () => void;
  notes: string;
  onNotesChange: (notes: string) => void;
  className?: string;
}

export const LearningToolbar: React.FC<LearningToolbarProps> = ({
  isOpen = true,
  onToggleOpen,
  mobileOpen = false,
  onCloseMobile,
  playbackSpeed,
  onSpeedChange,
  openDyslexic,
  onToggleOpenDyslexic,
  readingRuler,
  onToggleReadingRuler,
  warmBackground,
  onToggleWarmBackground,
  hapticFeedback,
  onToggleHapticFeedback,
  metronome,
  onToggleMetronome,
  notes,
  onNotesChange,
  className = '',
}) => {
  const content = (
    <aside
      className={`w-72 shrink-0 bg-[#F7F5F0] border-l border-[#E8E4DD] flex flex-col h-full overflow-y-auto select-none transition-all duration-300 ${
        !isOpen ? 'w-16 overflow-hidden' : 'w-72'
      } ${className}`}
    >
      <div className="p-4 flex flex-col gap-5 flex-1">
        {/* Header Thanh Công Cụ */}
        <div className="flex items-center justify-between pb-3 border-b border-[#E8E4DD]">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-stone-700">tune</span>
            {isOpen && <h2 className="text-[13px] font-semibold text-stone-800">Trợ thính &amp; Trợ giác</h2>}
          </div>
          <button
            onClick={onToggleOpen}
            className="p-1 rounded-md text-stone-500 hover:text-stone-800 hover:bg-stone-200/60 transition-colors"
            title={isOpen ? 'Thu gọn bảng công cụ' : 'Mở rộng bảng công cụ'}
            type="button"
          >
            <span className="material-symbols-outlined text-[18px] block">
              {isOpen ? 'last_page' : 'first_page'}
            </span>
          </button>
        </div>

        {isOpen && (
          <>
            {/* Nhóm 1: TỐC ĐỘ PHÁT ÂM */}
            <div className="space-y-2">
              <span className="text-[11px] uppercase tracking-wider font-semibold text-stone-500 block font-label">
                Tốc độ phát âm
              </span>
              <div className="grid grid-cols-2 gap-2 bg-stone-200/50 p-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => onSpeedChange(0.75)}
                  className={`py-1.5 px-2 rounded-md text-[12px] font-medium text-center transition-all ${
                    playbackSpeed === 0.75
                      ? 'bg-white text-stone-900 shadow-xs font-semibold'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  0.75x (Chậm rõ)
                </button>
                <button
                  type="button"
                  onClick={() => onSpeedChange(1.0)}
                  className={`py-1.5 px-2 rounded-md text-[12px] font-medium text-center transition-all ${
                    playbackSpeed === 1.0
                      ? 'bg-white text-stone-900 shadow-xs font-semibold'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  1.0x (Chuẩn)
                </button>
              </div>
            </div>

            {/* Nhóm 2: ĐỘ TƯƠNG PHẢN & PHÔNG CHỮ */}
            <div className="space-y-2.5">
              <span className="text-[11px] uppercase tracking-wider font-semibold text-stone-500 block font-label">
                Độ tương phản &amp; Phông chữ
              </span>
              <div className="space-y-2 font-body">
                <label className="flex items-center justify-between p-2 rounded-lg bg-white/70 border border-stone-200/60 cursor-pointer hover:bg-white transition-all">
                  <span className="text-[12px] text-stone-700 font-medium">
                    Phông chữ OpenDyslexic
                  </span>
                  <input
                    type="checkbox"
                    checked={openDyslexic}
                    onChange={onToggleOpenDyslexic}
                    className="w-4 h-4 rounded text-primary focus:ring-0 cursor-pointer accent-primary"
                  />
                </label>

                <label className="flex items-center justify-between p-2 rounded-lg bg-white/70 border border-stone-200/60 cursor-pointer hover:bg-white transition-all">
                  <span className="text-[12px] text-stone-700 font-medium">
                    Thước đọc dẫn dòng
                  </span>
                  <input
                    type="checkbox"
                    checked={readingRuler}
                    onChange={onToggleReadingRuler}
                    className="w-4 h-4 rounded text-primary focus:ring-0 cursor-pointer accent-primary"
                  />
                </label>

                <label className="flex items-center justify-between p-2 rounded-lg bg-white/70 border border-stone-200/60 cursor-pointer hover:bg-white transition-all">
                  <span className="text-[12px] text-stone-700 font-medium">
                    Nền ấm dịu thị giác
                  </span>
                  <input
                    type="checkbox"
                    checked={warmBackground}
                    onChange={onToggleWarmBackground}
                    className="w-4 h-4 rounded text-primary focus:ring-0 cursor-pointer accent-primary"
                  />
                </label>
              </div>
            </div>

            {/* Nhóm 3: HỖ TRỢ XÚC GIÁC & ÂM THANH */}
            <div className="space-y-2.5">
              <span className="text-[11px] uppercase tracking-wider font-semibold text-stone-500 block font-label">
                Hỗ trợ xúc giác &amp; Âm thanh
              </span>
              <div className="space-y-2 font-body">
                <label className="flex items-center justify-between p-2 rounded-lg bg-white/70 border border-stone-200/60 cursor-pointer hover:bg-white transition-all">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px] text-stone-600">
                      vibration
                    </span>
                    <span className="text-[12px] text-stone-700 font-medium">
                      Rung haptic feedback
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={hapticFeedback}
                    onChange={onToggleHapticFeedback}
                    className="w-4 h-4 rounded text-primary focus:ring-0 cursor-pointer accent-primary"
                  />
                </label>

                <label className="flex items-center justify-between p-2 rounded-lg bg-white/70 border border-stone-200/60 cursor-pointer hover:bg-white transition-all">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px] text-stone-600">
                      file_map_stack
                    </span>
                    <span className="text-[12px] text-stone-700 font-medium">
                      Nhịp gõ metronome
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={metronome}
                    onChange={onToggleMetronome}
                    className="w-4 h-4 rounded text-primary focus:ring-0 cursor-pointer accent-primary"
                  />
                </label>
              </div>
            </div>

            {/* Nhóm 4: GHI CHÚ HỌC TẬP */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase tracking-wider font-semibold text-stone-500 font-label">
                  Ghi chú học tập
                </span>
                <span className="material-symbols-outlined text-[14px] text-stone-400">
                  lock_outline
                </span>
              </div>
              <div className="relative">
                <textarea
                  value={notes}
                  onChange={(e) => onNotesChange(e.target.value)}
                  className="w-full text-[12px] p-2.5 bg-white/90 rounded-lg border border-[#E8E4DD] focus:outline-none focus:border-primary text-stone-800 placeholder-stone-400 font-body resize-none leading-relaxed shadow-xs"
                  placeholder="Viết mẹo cá nhân để nhớ chữ b và d..."
                  rows={4}
                />
                <span className="absolute bottom-2 right-2 text-[10px] text-stone-400 font-label">
                  Tự lưu
                </span>
              </div>
            </div>

            {/* Phím tắt trợ năng gợi ý nhanh */}
            <div className="p-2.5 rounded-lg bg-stone-200/40 text-[11px] text-stone-600 flex items-center justify-between font-label mt-auto">
              <span>Phím tắt nghe lại</span>
              <kbd className="px-1.5 py-0.5 rounded bg-white border border-stone-300 text-stone-700 font-semibold shadow-xs">
                Space
              </kbd>
            </div>
          </>
        )}
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop Persistent Toolbar */}
      <div className="hidden xl:block h-[calc(100vh-4rem)] sticky top-16 z-20 shrink-0">
        {content}
      </div>

      {/* Mobile / Tablet Drawer Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 xl:hidden flex justify-end">
          <div
            className="fixed inset-0 bg-stone-900/40 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="relative z-50 h-full w-72 max-w-[85vw] shadow-2xl flex flex-col">
            {content}
          </div>
        </div>
      )}
    </>
  );
};
