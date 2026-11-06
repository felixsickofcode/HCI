import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: string;
  containerClassName?: string;
}

export const Input: React.FC<InputProps> = ({
  icon,
  className = '',
  containerClassName = '',
  ...props
}) => {
  return (
    <div
      className={`flex items-center gap-3 px-4 py-2.5 rounded-full bg-surface-container-lowest border border-outline-variant/50 focus-within:border-primary transition-colors ${containerClassName}`}
    >
      {icon && (
        <span className="material-symbols-outlined text-outline text-[20px] select-none">
          {icon}
        </span>
      )}
      <input
        className={`w-full bg-transparent text-sm text-on-surface placeholder:text-outline/70 focus:outline-none font-body ${className}`}
        {...props}
      />
    </div>
  );
};

export interface DropZoneInputProps {
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  onUploadClick?: () => void;
  onSubmit?: () => void;
  submitText?: string;
  uploadText?: string;
  className?: string;
}

export const DropZoneInput: React.FC<DropZoneInputProps> = ({
  value,
  onChange,
  placeholder = 'Dán liên kết bài viết, văn bản hoặc kéo thả tập tin...',
  onUploadClick,
  onSubmit,
  submitText = 'Đọc ngay',
  uploadText = 'Tải file',
  className = '',
}) => {
  return (
    <div className={`relative w-full max-w-2xl group ${className}`}>
      {/* Underlaid paper sheet 2 */}
      <div className="absolute inset-x-5 -bottom-3 h-20 bg-surface-container rounded-full opacity-60 transition-transform duration-500 group-hover:translate-y-1 pointer-events-none" />
      {/* Underlaid paper sheet 1 */}
      <div className="absolute inset-x-2 -bottom-1.5 h-20 bg-surface-container-low rounded-full opacity-80 transition-transform duration-300 group-hover:translate-y-0.5 pointer-events-none" />

      {/* Main Input Card */}
      <div className="relative bg-surface-container-lowest rounded-full p-2.5 sm:p-3 shadow-drop-zone flex flex-col sm:flex-row items-center gap-3">
        <div className="flex items-center gap-3.5 pl-4 sm:pl-5 flex-1 w-full text-left">
          <span className="material-symbols-outlined text-outline text-[22px] select-none">
            auto_stories
          </span>
          <input
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            className="w-full bg-transparent text-sm sm:text-base text-on-surface placeholder:text-outline/70 focus:outline-none font-body"
            type="text"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end pr-1 pb-1 sm:pb-0">
          {onUploadClick && (
            <button
              type="button"
              onClick={onUploadClick}
              className="px-4 py-2.5 text-xs font-label text-on-surface-variant hover:text-on-surface transition-colors flex items-center gap-1.5 rounded-full hover:bg-surface-container-low select-none"
            >
              <span className="material-symbols-outlined text-[18px]">upload_file</span>
              <span>{uploadText}</span>
            </button>
          )}
          <button
            type="button"
            onClick={onSubmit}
            className="px-6 py-2.5 bg-gradient-to-r from-primary to-primary-container text-on-primary font-label text-xs sm:text-sm font-medium rounded-full shadow-sm hover:shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2 whitespace-nowrap select-none"
          >
            <span>{submitText}</span>
            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </button>
        </div>
      </div>
    </div>
  );
};
