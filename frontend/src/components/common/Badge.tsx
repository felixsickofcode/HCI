import React from 'react';

export interface TagMarkerProps {
  label: string;
  dotColorClass?: string;
  className?: string;
}

export const TagMarker: React.FC<TagMarkerProps> = ({
  label,
  dotColorClass = 'bg-tertiary',
  className = '',
}) => {
  return (
    <div
      className={`inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-surface-container-low shadow-sm select-none ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dotColorClass}`} />
      <span className="text-xs font-label uppercase tracking-widest text-on-surface-variant font-medium">
        {label}
      </span>
    </div>
  );
};

export interface CategoryBadgeProps {
  label: string;
  className?: string;
}

export const CategoryBadge: React.FC<CategoryBadgeProps> = ({ label, className = '' }) => {
  return (
    <span
      className={`px-3 py-1 rounded-full text-xs font-label font-medium bg-surface-container-lowest/90 backdrop-blur-md text-on-surface shadow-sm select-none ${className}`}
    >
      {label}
    </span>
  );
};

export interface HighlightMarkProps {
  children: React.ReactNode;
  className?: string;
}

export const HighlightMark: React.FC<HighlightMarkProps> = ({ children, className = '' }) => {
  return (
    <mark
      className={`bg-tertiary-fixed/40 text-on-tertiary-fixed px-1.5 py-0.5 rounded-sm font-normal ${className}`}
    >
      {children}
    </mark>
  );
};
