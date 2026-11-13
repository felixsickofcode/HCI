import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { mockHeaderNavLinks } from '../../mocks';
import { useAuth } from '../../context';

export interface HeaderProps {
  className?: string;
}

const getInitials = (fullName: string, email: string) => {
  const initials = fullName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return initials || email.charAt(0).toUpperCase() || 'U';
};

export const Header: React.FC<HeaderProps> = ({ className = '' }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isLoading, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [menuOpen]);

  const handleLogout = () => {
    logout();
    setMenuOpen(false);
    navigate('/');
  };

  return (
    <header
      className={`fixed top-0 w-full z-50 bg-[#FAF7F2]/85 backdrop-blur-xl shadow-ambient-header transition-all duration-300 ${className}`}
    >
      <div className="h-20 max-w-7xl mx-auto px-6 lg:px-12 flex items-center justify-between">
        <div className="flex items-center gap-12">
          {/* Logo */}
          <Link to="/" className="group flex items-center gap-2 select-none">
            <span className="font-headline text-2xl tracking-normal text-on-surface font-semibold group-hover:text-primary transition-colors">
              LexiEase
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-tertiary" />
          </Link>

          {/* Nav links */}
          <nav className="hidden md:flex items-center gap-1 select-none">
            {mockHeaderNavLinks.map((link) => {
              const isCurrent =
                link.path === '/'
                  ? location.pathname === '/'
                  : location.pathname.startsWith(link.path);

              return (
                <Link
                  key={link.label}
                  to={link.path}
                  className={`px-4 py-2 transition-all rounded-xl text-sm ${
                    isCurrent
                      ? 'text-on-surface font-semibold bg-surface-container/60'
                      : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container/40'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Mobile entry: the desktop navigation is hidden below md. */}
        <Link to="/vocabulary" aria-label="Từ khó của tôi" className="md:hidden rounded-full p-2 text-primary">
          <span className="material-symbols-outlined" aria-hidden>bookmarks</span>
        </Link>
        {/* Right actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            to="/reading"
            className="hidden sm:inline-flex items-center justify-center px-4 py-2 text-sm font-label font-medium rounded-xl text-primary hover:bg-primary/5 transition-all select-none"
          >
            Đọc tiếp
          </Link>

          {isLoading ? (
            <div className="h-9 w-9 animate-pulse rounded-full bg-surface-container" />
          ) : user ? (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((current) => !current)}
                aria-label="Mở thực đơn tài khoản"
                aria-expanded={menuOpen}
                className="flex items-center gap-2 rounded-full p-1 pr-1.5 transition-colors hover:bg-surface-container/70 sm:pr-2"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-container text-xs font-label font-semibold text-on-primary shadow-sm">
                  {getInitials(user.fullName, user.email)}
                </span>
                <span className="hidden max-w-[130px] truncate text-sm font-medium text-on-surface sm:block">
                  {user.fullName}
                </span>
                <span className="material-symbols-outlined hidden text-[18px] text-outline sm:block">
                  expand_more
                </span>
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-2 w-64 overflow-hidden rounded-2xl border border-surface-container bg-surface-container-lowest p-2 shadow-card-hover">
                  <div className="px-3 py-2">
                    <p className="truncate text-sm font-semibold text-on-surface">{user.fullName}</p>
                    <p className="truncate text-xs text-on-surface-variant">{user.email}</p>
                  </div>
                  <div className="my-1 h-px bg-surface-container" />
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-error transition-colors hover:bg-error-container/40"
                  >
                    <span className="material-symbols-outlined text-[18px]">logout</span>
                    Đăng xuất
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link
                to="/login"
                state={{ from: location.pathname }}
                className="hidden sm:inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-label font-medium text-on-surface-variant transition-colors hover:bg-surface-container/60 hover:text-on-surface"
              >
                Đăng nhập
              </Link>
              <Link
                to="/login"
                state={{ from: location.pathname }}
                aria-label="Đăng nhập"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container/60 hover:text-on-surface sm:hidden"
              >
                <span className="material-symbols-outlined text-[20px]">person</span>
              </Link>
              <Link
                to="/register"
                state={{ from: location.pathname }}
                className="inline-flex items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-primary to-primary-container px-4 py-2 text-xs font-label font-medium text-on-primary shadow-sm transition-all hover:shadow-md active:scale-[0.98] sm:px-5 sm:text-sm"
              >
                <span className="material-symbols-outlined text-[17px] sm:hidden">person_add</span>
                <span>Đăng ký</span>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
