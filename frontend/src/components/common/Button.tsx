import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'primary-solid' | 'secondary' | 'ghost' | 'icon';
  size?: 'sm' | 'md' | 'lg';
  icon?: string;
  iconPosition?: 'left' | 'right';
  children?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'right',
  children,
  className = '',
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center font-label transition-all select-none disabled:opacity-50 disabled:pointer-events-none';

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-xs gap-1.5',
    md: 'px-5 py-2.5 text-xs sm:text-sm font-medium gap-2',
    lg: 'px-8 py-3 text-sm font-medium gap-2.5',
  };

  const variantStyles = {
    primary:
      'bg-gradient-to-r from-primary to-primary-container text-on-primary rounded-full shadow-sm hover:shadow-md active:scale-[0.98]',
    'primary-solid':
      'bg-primary text-on-primary rounded-full shadow-sm hover:bg-primary-container active:scale-[0.98]',
    secondary:
      'bg-surface-container-low text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded-full',
    ghost:
      'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low rounded-full',
    icon:
      'w-8 h-8 rounded-full bg-surface-container-low text-on-surface hover:bg-primary hover:text-on-primary p-0',
  };

  const currentSize = variant === 'icon' ? '' : sizeStyles[size];

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${currentSize} ${className}`}
      {...props}
    >
      {icon && iconPosition === 'left' && (
        <span className="material-symbols-outlined text-[18px]">{icon}</span>
      )}
      {children}
      {icon && iconPosition === 'right' && (
        <span className="material-symbols-outlined text-[18px]">{icon}</span>
      )}
    </button>
  );
};
