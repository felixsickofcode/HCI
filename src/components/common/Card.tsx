import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  hoverable?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  hoverable = true,
  className = '',
  ...props
}) => {
  return (
    <div
      className={`bg-surface-container-lowest rounded-3xl p-7 sm:p-8 shadow-card-subtle transition-all duration-300 ${
        hoverable ? 'hover:shadow-card-hover' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export interface ReadingCardProps {
  imageSrc: string;
  imageAlt?: string;
  category: string;
  readingTime: string;
  comfortLevel?: string;
  title: string;
  excerpt: string;
  author: string;
  onReadClick?: () => void;
  className?: string;
}

export const ReadingCard: React.FC<ReadingCardProps> = ({
  imageSrc,
  imageAlt = '',
  category,
  readingTime,
  comfortLevel = '100%',
  title,
  excerpt,
  author,
  onReadClick,
  className = '',
}) => {
  return (
    <article
      className={`group bg-surface-container-lowest rounded-3xl overflow-hidden shadow-card-subtle hover:shadow-card-hover transition-all duration-300 flex flex-col ${className}`}
    >
      <div className="relative h-56 overflow-hidden">
        <img
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          src={imageSrc}
          alt={imageAlt}
        />
        <div className="absolute top-4 left-4">
          <span className="px-3 py-1 rounded-full text-xs font-label font-medium bg-surface-container-lowest/90 backdrop-blur-md text-on-surface shadow-sm">
            {category}
          </span>
        </div>
      </div>
      <div className="p-7 flex flex-col flex-1 justify-between">
        <div>
          <div className="flex items-center gap-3 text-xs text-outline font-label mb-2">
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[15px]">schedule</span> {readingTime}
            </span>
            <span className="w-1 h-1 rounded-full bg-surface-container-highest" />
            <span className="text-tertiary font-medium">Mức dịu mắt: {comfortLevel}</span>
          </div>
          <h3 className="font-headline text-xl text-on-surface font-medium leading-snug group-hover:text-primary transition-colors">
            {title}
          </h3>
          <p className="mt-3 text-xs sm:text-sm text-on-surface-variant font-body leading-relaxed font-light line-clamp-3">
            {excerpt}
          </p>
        </div>
        <div className="mt-6 pt-5 flex items-center justify-between border-t border-surface-container-low">
          <span className="text-xs text-on-surface-variant font-label">{author}</span>
          <button
            type="button"
            onClick={onReadClick}
            aria-label="Đọc tiếp tác phẩm"
            className="w-8 h-8 rounded-full bg-surface-container-low flex items-center justify-center text-on-surface group-hover:bg-primary group-hover:text-on-primary transition-colors select-none"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </button>
        </div>
      </div>
    </article>
  );
};

export interface PillarCardProps {
  icon: string;
  iconColorClass?: string;
  title: string;
  description: string;
  metricLabel: string;
  metricValue: string;
  progressPercent: number;
  progressBarColorClass?: string;
  className?: string;
}

export const PillarCard: React.FC<PillarCardProps> = ({
  icon,
  iconColorClass = 'text-primary',
  title,
  description,
  metricLabel,
  metricValue,
  progressPercent,
  progressBarColorClass = 'bg-primary',
  className = '',
}) => {
  return (
    <div
      className={`bg-surface-container-lowest rounded-3xl p-8 sm:p-10 shadow-card-subtle hover:shadow-card-hover transition-all duration-300 flex flex-col justify-between ${className}`}
    >
      <div>
        <div className="w-12 h-12 rounded-full bg-surface-container-low flex items-center justify-center mb-6">
          <span className={`material-symbols-outlined text-[26px] ${iconColorClass}`}>
            {icon}
          </span>
        </div>
        <h3 className="font-headline text-xl text-on-surface font-semibold mb-3">{title}</h3>
        <p className="text-sm text-on-surface-variant font-body leading-relaxed font-light">
          {description}
        </p>
      </div>
      <div className="mt-8 pt-6 bg-surface-container-low/60 rounded-2xl p-4">
        <div className="flex items-center justify-between text-xs font-label text-outline mb-2">
          <span>{metricLabel}</span>
          <span className="text-on-surface font-medium">{metricValue}</span>
        </div>
        <div className="w-full bg-surface-container h-1.5 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${progressBarColorClass}`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>
    </div>
  );
};

export interface ManuscriptCardProps {
  children: React.ReactNode;
  className?: string;
}

export const ManuscriptCard: React.FC<ManuscriptCardProps> = ({ children, className = '' }) => {
  return (
    <article
      className={`w-full max-w-[760px] bg-surface-container-lowest rounded-xl shadow-manuscript transition-all duration-500 ease-out px-7 py-12 sm:px-14 sm:py-16 md:px-20 md:py-20 relative select-text ${className}`}
    >
      {children}
    </article>
  );
};
