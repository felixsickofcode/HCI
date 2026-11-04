import React from 'react';
import { Link } from 'react-router-dom';
import { mockFooterNavLinks } from '../../mocks';

export interface FooterProps {
  className?: string;
}

export const Footer: React.FC<FooterProps> = ({ className = '' }) => {
  return (
    <footer
      className={`w-full bg-[#FAF7F2]/90 backdrop-blur-md mt-24 py-16 shadow-ambient-footer ${className}`}
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-12 flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="flex flex-col items-center md:items-start gap-2">
          <div className="flex items-center gap-2">
            <span className="font-headline text-lg font-semibold text-on-surface">
              LexiEase
            </span>
            <span className="text-xs font-label text-tertiary uppercase tracking-wider px-2 py-0.5 rounded-lg bg-tertiary-fixed/30 font-medium">
              Accessible Reading
            </span>
          </div>
          <p className="text-xs text-on-surface-variant text-center md:text-left font-body max-w-sm leading-relaxed">
            Không gian đọc dịu mắt, hỗ trợ toàn diện tư duy và sự tập trung với ngôn ngữ hình thức ấm áp.
          </p>
        </div>

        <nav className="flex items-center gap-6 text-xs text-on-surface-variant font-label select-none">
          {mockFooterNavLinks.map((link) => (
            <Link
              key={link.label}
              to={link.path}
              className="hover:text-on-surface transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="text-xs text-on-surface-variant/70 font-label tracking-wide select-none">
          © 2025 LexiEase. Nuôi dưỡng từng con chữ.
        </div>
      </div>
    </footer>
  );
};
