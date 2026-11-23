import React from 'react';
import { Link } from 'react-router-dom';

export interface StudioHeaderProps {
  onToggleFocusMode?: () => void;
  isFocusMode?: boolean;
  onToggleWarmFilter?: () => void;
  isWarmFilter?: boolean;
  onToggleTTS?: () => void;
  isTTSActive?: boolean;
  onOpenMobileSidebar?: () => void;
  onOpenMobileToolbar?: () => void;
}

export const StudioHeader: React.FC<StudioHeaderProps> = ({
  onToggleFocusMode,
  isFocusMode = false,
  onToggleWarmFilter,
  isWarmFilter = false,
  onToggleTTS,
  isTTSActive = false,
  onOpenMobileSidebar,
  onOpenMobileToolbar,
}) => {
  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-surface-container-lowest/80 backdrop-blur-xl border-b border-[#E8E4DD] shadow-[0_1px_8px_rgba(0,0,0,0.02)] transition-colors duration-200">
      <div className="h-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 flex items-center justify-between gap-4">
        {/* Left: Mobile Drawer Trigger + Brand Logo & Navigation */}
        <div className="flex items-center gap-3 sm:gap-6">
          {/* Mobile Left Sidebar Toggle */}
          <button
            type="button"
            onClick={onOpenMobileSidebar}
            className="lg:hidden p-1.5 rounded-lg text-stone-600 hover:text-stone-900 hover:bg-stone-200/50 transition-colors"
            title="Mở bảng giáo trình"
            aria-label="Mở bảng giáo trình"
          >
            <span className="material-symbols-outlined text-[22px] block">menu</span>
          </button>

          <Link to="/" className="flex items-baseline gap-2 group select-none">
            <span className="font-headline text-2xl font-bold tracking-tight text-primary transition-colors group-hover:text-primary-container">
              LexiEase
            </span>
            <span className="hidden sm:inline-block font-label text-[10px] tracking-widest uppercase font-semibold px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-fixed-variant">
              Studio
            </span>
          </Link>


        </div>

        {/* Right: Quick Accessibility Tools + User Avatar + Mobile Toolbar Trigger */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Quick Accessibility Capsule */}
          <div className="flex items-center bg-surface-container-low rounded-xl p-1 gap-1 border border-outline-variant/20">
            <button
              type="button"
              onClick={onToggleFocusMode}
              className={`p-1.5 rounded-lg transition-all ${
                isFocusMode
                  ? 'bg-primary text-white shadow-xs'
                  : 'text-on-surface-variant hover:text-primary hover:bg-surface-container-lowest'
              }`}
              title="Focus Isolation Mode (Chế độ tập trung cao)"
              aria-label="Focus Isolation Mode"
            >
              <span className="material-symbols-outlined text-[19px] block">
                center_focus_strong
              </span>
            </button>

            <button
              type="button"
              onClick={onToggleWarmFilter}
              className={`p-1.5 rounded-lg transition-all ${
                isWarmFilter
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-on-surface-variant hover:text-tertiary hover:bg-surface-container-lowest'
              }`}
              title="Warm Tone Calibration (Lọc ánh sáng vàng dịu mắt)"
              aria-label="Warm Tone Calibration"
            >
              <span className="material-symbols-outlined text-[19px] block">light_mode</span>
            </button>

            <button
              type="button"
              onClick={onToggleTTS}
              className={`p-1.5 rounded-lg transition-all ${
                isTTSActive
                  ? 'bg-primary text-white shadow-xs'
                  : 'text-on-surface-variant hover:text-primary hover:bg-surface-container-lowest'
              }`}
              title="Text-to-Speech Engine (Đọc mẫu thính giác)"
              aria-label="Text-to-Speech Engine"
            >
              <span className="material-symbols-outlined text-[19px] block">volume_up</span>
            </button>
          </div>

          {/* Mobile Right Toolbar Trigger */}
          <button
            type="button"
            onClick={onOpenMobileToolbar}
            className="xl:hidden p-1.5 rounded-lg text-stone-600 hover:text-stone-900 hover:bg-stone-200/50 transition-colors"
            title="Mở thanh công cụ trợ thính & trợ giác"
            aria-label="Mở thanh công cụ trợ thính & trợ giác"
          >
            <span className="material-symbols-outlined text-[20px] block">tune</span>
          </button>

          <div className="h-4 w-px bg-outline-variant/40 hidden sm:block" />

          {/* User Profile Avatar */}
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-on-primary select-none shadow-xs">
            <span className="material-symbols-outlined text-[18px]">person</span>
          </div>
        </div>
      </div>
    </header>
  );
};
