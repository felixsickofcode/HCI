import React from 'react';
import { Button } from '../common';

export interface AudioButtonProps {
  label: string;
  isPlaying?: boolean;
  onClick: () => void;
  icon?: string;
  variant?: 'primary' | 'secondary' | 'subtle';
  size?: 'md' | 'lg';
  className?: string;
  disabled?: boolean;
}

export const AudioButton: React.FC<AudioButtonProps> = ({
  label,
  isPlaying = false,
  onClick,
  icon = 'volume_up',
  variant = 'primary',
  size = 'lg',
  className = '',
  disabled = false,
}) => {
  const sizeStyles = {
    md: 'min-h-[44px] px-5 py-2.5 text-sm gap-2',
    lg: 'min-h-[48px] px-7 py-3 text-base font-semibold gap-2.5',
  };

  const variantStyles = {
    primary: isPlaying
      ? 'bg-primary text-on-primary ring-4 ring-primary/20 shadow-md animate-pulse'
      : 'bg-primary text-on-primary hover:bg-primary-container shadow-sm hover:shadow-md active:scale-95',
    secondary: isPlaying
      ? 'bg-primary-fixed text-primary ring-4 ring-primary/25 shadow-sm'
      : 'bg-surface-container-high text-on-surface hover:bg-surface-container-highest active:scale-95',
    subtle: isPlaying
      ? 'bg-surface-container-highest text-primary ring-2 ring-primary/30'
      : 'bg-surface-container-lowest/90 border border-outline-variant/40 text-on-surface hover:bg-surface-container-low active:scale-95',
  };

  return (
    <Button
      onClick={onClick}
      disabled={disabled}
      aria-pressed={isPlaying}
      aria-label={`${isPlaying ? 'Đang phát: ' : ''}${label}`}
      variant={variant === 'primary' ? 'primary-solid' : variant === 'secondary' ? 'secondary' : 'ghost'}
      className={`inline-flex items-center justify-center rounded-2xl font-label transition-all select-none disabled:opacity-50 disabled:pointer-events-none ${
        sizeStyles[size]
      } ${variantStyles[variant]} ${className}`}
    >
      <span
        className={`material-symbols-outlined text-[22px] transition-transform ${
          isPlaying ? 'scale-110 text-tertiary-fixed' : ''
        }`}
        style={isPlaying ? { fontVariationSettings: "'FILL' 1" } : undefined}
      >
        {isPlaying ? 'graphic_eq' : icon}
      </span>
      <span>{isPlaying ? 'Đang phát...' : label}</span>
    </Button>
  );
};
