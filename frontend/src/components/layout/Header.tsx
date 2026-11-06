import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { mockHeaderNavLinks } from '../../mocks';

export interface HeaderProps {
  className?: string;
}

export const Header: React.FC<HeaderProps> = ({ className = '' }) => {
  const location = useLocation();

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

        {/* Right actions */}
        <div className="flex items-center gap-4">
          <Link
            to="/reading"
            className="hidden sm:inline-flex items-center justify-center px-4 py-2 text-sm font-label font-medium rounded-xl text-primary hover:bg-primary/5 transition-all select-none"
          >
            Đọc tiếp
          </Link>
          <button
            type="button"
            aria-label="Hồ sơ cá nhân"
            className="block transition-transform hover:scale-105 select-none"
          >
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-on-primary">
              <span className="material-symbols-outlined text-[18px]">person</span>
            </div>
          </button>
        </div>
      </div>
    </header>
  );
};
