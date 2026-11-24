import React, { useContext, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { mockSidebarReadings } from '../../mocks';
import { phonicsCurriculum } from '../../data/lessons/phonicsCurriculum';
import { AuthContext } from '../../context/auth-context';

export interface AppSidebarProps {
  currentScreen?: 'multisensory' | 'reading' | 'library';
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
  className?: string;
  activeLessonId?: string;
  onSelectLesson?: (id: string) => void;
}

export const AppSidebar: React.FC<AppSidebarProps> = ({
  currentScreen = 'multisensory',
  isCollapsed = false,
  onToggleCollapse,
  mobileOpen = false,
  onCloseMobile,
  className = '',
  activeLessonId,
  onSelectLesson,
}) => {
  const isMultisensory = currentScreen === 'multisensory';
  const navigate = useNavigate();
  const auth = useContext(AuthContext);
  const [openChapters, setOpenChapters] = useState<string[]>(['chapter-1']);
  const [searchQuery, setSearchQuery] = useState('');

  const normalizedSearch = searchQuery.trim().toLocaleLowerCase('vi');
  const filteredCurriculum = useMemo(() => {
    if (!normalizedSearch) return phonicsCurriculum;
    return phonicsCurriculum
      .map((chapter) => ({
        ...chapter,
        lessons: chapter.lessons.filter((lesson) =>
          `${lesson.title} ${lesson.sounds}`.toLocaleLowerCase('vi').includes(normalizedSearch),
        ),
      }))
      .filter((chapter) => chapter.lessons.length > 0);
  }, [normalizedSearch]);

  const toggleChapter = (chapterId: string) => {
    setOpenChapters((current) =>
      current.includes(chapterId)
        ? current.filter((id) => id !== chapterId)
        : [...current, chapterId],
    );
  };

  const handleLogout = () => {
    auth?.logout();
    navigate('/');
  };

  const initials = auth?.user?.fullName
    ? auth.user.fullName
        .trim()
        .split(/\s+/)
        .slice(-2)
        .map((part) => part[0])
        .join('')
        .toUpperCase()
    : 'K';

  const sidebarContent = (
    <aside
      className={`shrink-0 bg-surface-container-low border-r border-surface-container-high flex flex-col h-full transition-all duration-300 ${
        isCollapsed ? 'w-16 overflow-hidden' : 'w-72'
      } ${className}`}
    >
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center justify-between min-h-10">
          {!isCollapsed && (
            <Link
              to="/"
              aria-label="Trang chủ"
              className="flex items-center gap-2 min-w-0 text-on-surface hover:text-primary transition-colors"
            >
              <span className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-on-primary shrink-0">
                <span className="material-symbols-outlined text-[20px]">auto_stories</span>
              </span>
              <span className="min-w-0">
                <span className="font-headline font-bold text-lg tracking-tight block leading-tight">LexiEase</span>
                <span className="font-label text-[9px] tracking-wider uppercase text-tertiary font-semibold block">Hỗ trợ đa giác quan</span>
              </span>
            </Link>
          )}
          {isCollapsed && (
            <Link to="/" aria-label="Trang chủ" className="mx-auto w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-on-primary">
              <span className="material-symbols-outlined text-[20px]">auto_stories</span>
            </Link>
          )}
        </div>

        {!isCollapsed && (
          <div className="mt-3 flex items-center justify-between gap-2">
            <Link
              to="/reading"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-surface-container-high hover:bg-secondary-container text-on-surface text-xs font-medium transition-colors"
            >
              <span className="material-symbols-outlined text-[15px] text-primary">hearing</span>
              <span>Hỗ trợ đọc</span>
            </Link>
            <button
              type="button"
              onClick={onToggleCollapse}
              className="w-8 h-8 inline-flex items-center justify-center rounded-xl text-outline hover:bg-surface-container-high hover:text-on-surface transition-colors"
              aria-label="Thu gọn thanh bên"
              title="Thu gọn thanh bên"
            >
              <span className="material-symbols-outlined text-[18px]">keyboard_double_arrow_left</span>
            </button>
          </div>
        )}

        {isCollapsed && (
          <button
            type="button"
            onClick={onToggleCollapse}
            className="mt-3 mx-auto w-8 h-8 flex items-center justify-center rounded-xl text-outline hover:bg-surface-container-high hover:text-on-surface"
            aria-label="Mở rộng thanh bên"
            title="Mở rộng thanh bên"
          >
            <span className="material-symbols-outlined text-[18px]">keyboard_double_arrow_right</span>
          </button>
        )}
      </div>

      {!isCollapsed && isMultisensory && (
        <>
          <div className="px-5 py-2">
            <label className="relative flex items-center">
              <span className="material-symbols-outlined absolute left-3 text-[18px] text-outline">search</span>
              <span className="sr-only">Tìm kiếm bài học</span>
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                aria-label="Tìm kiếm bài học"
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-surface-container-lowest text-on-surface placeholder-outline focus:outline-none focus:ring-1 focus:ring-primary shadow-sm"
                placeholder="Tìm bài học..."
                type="search"
              />
            </label>
          </div>

          <div className="px-5 py-2.5">
            <div className="p-3 rounded-xl bg-surface-container-lowest shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-label text-[10px] font-bold tracking-wider uppercase text-tertiary">Bài tiếp theo</span>
                <span className="w-2 h-2 rounded-full bg-tertiary-container" />
              </div>
              <p className="text-xs font-semibold text-on-surface mb-2 truncate">Bài 2: ơ, d, đ, e, ê, l</p>
              <button
                type="button"
                onClick={() => onSelectLesson?.('bai-02')}
                className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary-container transition-colors"
              >
                <span>Học ngay</span>
                <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
              </button>
            </div>
          </div>

          <nav aria-label="Giáo trình" className="flex-1 overflow-y-auto px-4 py-2 space-y-1 min-h-0">
            {filteredCurriculum.map((chapter) => {
              const isOpen = normalizedSearch ? true : openChapters.includes(chapter.id);
              return (
                <div key={chapter.id} className="space-y-1">
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => toggleChapter(chapter.id)}
                    className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-on-surface rounded-xl hover:bg-surface-container-high transition-colors"
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      {chapter.id === 'chapter-1' && (
                        <span className="material-symbols-outlined text-[18px] text-primary">menu_book</span>
                      )}
                      <span className="truncate text-left">{isOpen ? chapter.title : `${chapter.shortTitle} (${chapter.lessons.length} bài)`}</span>
                    </span>
                    <span className="material-symbols-outlined text-[18px] text-outline shrink-0">
                      {isOpen ? 'expand_more' : 'chevron_right'}
                    </span>
                  </button>

                  {isOpen && (
                    <div className="pl-4 space-y-1">
                      {chapter.lessons.map((lesson) => {
                        const isActive = (activeLessonId ?? 'bai-01') === lesson.id;
                        return (
                          <button
                            key={lesson.id}
                            type="button"
                            aria-current={isActive ? 'page' : undefined}
                            onClick={() => onSelectLesson?.(lesson.id)}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all ${
                              isActive
                                ? 'text-on-primary font-semibold bg-primary shadow-sm'
                                : 'text-on-surface-variant font-medium hover:bg-surface-container-high hover:text-on-surface'
                            }`}
                          >
                            <span className="truncate text-left">{lesson.title}</span>
                            {lesson.id === 'bai-01' && (
                              <span className="material-symbols-outlined text-[16px] shrink-0" aria-hidden="true">check_circle</span>
                            )}
                            {lesson.id === 'bai-02' && !isActive && (
                              <span className="material-symbols-outlined text-[16px] text-primary shrink-0" aria-hidden="true">play_circle</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </>
      )}

      {!isCollapsed && !isMultisensory && (
        <nav aria-label="Điều hướng" className="flex-1 overflow-y-auto px-4 py-3 space-y-1">
          {mockSidebarReadings.map((reading) => (
            <button
              key={reading.id}
              type="button"
              className={`w-full text-left px-3 py-2 text-[13px] rounded-lg transition-colors ${
                reading.isActive ? 'font-semibold text-primary bg-primary-fixed/40' : 'text-stone-600 hover:bg-stone-200/40'
              }`}
            >
              {reading.title}
            </button>
          ))}
        </nav>
      )}

      {!isCollapsed && (
        <div className="p-4 bg-surface-container-lowest mt-auto border-t border-surface-container-high flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center font-bold text-xs text-on-primary shrink-0">
              {initials}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-semibold text-on-surface truncate">
                {auth?.user?.fullName ?? 'Khách'}
              </p>
              <p className="text-[11px] text-on-surface-variant truncate font-label">
                {auth?.user ? 'Học viên' : 'Chưa đăng nhập'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="w-8 h-8 flex items-center justify-center rounded-xl text-outline hover:bg-surface-container-high hover:text-error transition-colors"
            title="Đăng xuất"
            aria-label="Đăng xuất"
          >
            <span className="material-symbols-outlined text-[18px]">logout</span>
          </button>
        </div>
      )}
    </aside>
  );

  return (
    <>
      <div className="hidden lg:block h-screen sticky top-0 z-20 shrink-0">{sidebarContent}</div>
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <button
            type="button"
            className="fixed inset-0 bg-stone-900/40 backdrop-blur-xs"
            onClick={onCloseMobile}
            aria-label="Đóng thanh bên"
          />
          <div className="relative z-50 h-full w-72 max-w-[85vw] shadow-2xl flex flex-col">{sidebarContent}</div>
        </div>
      )}
    </>
  );
};
