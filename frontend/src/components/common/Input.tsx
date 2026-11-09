import React, { useEffect, useRef, useState } from 'react';
import { ACCEPT_ATTR } from '../../lib/document';

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
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  onFileSelect?: (file: File) => void;
  onSubmit?: () => void;
  onCancel?: () => void;
  isLoading?: boolean;
  error?: string | null;
  fileName?: string | null;
  submitText?: string;
  uploadText?: string;
  className?: string;
}

export const DropZoneInput: React.FC<DropZoneInputProps> = ({
  value,
  onChange,
  placeholder = 'Dán văn bản vào đây, hoặc kéo thả tệp PDF, ảnh...',
  onFileSelect,
  onSubmit,
  onCancel,
  isLoading = false,
  error = null,
  fileName = null,
  submitText = 'Đọc ngay',
  uploadText = 'Tải file',
  className = '',
}) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const el = textRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [value]);

  const pickFile = (file?: File) => {
    if (file && onFileSelect) onFileSelect(file);
  };

  return (
    <div className={`relative w-full max-w-2xl group ${className}`}>
      {/* Underlaid paper sheet 2 */}
      <div className="absolute inset-x-5 -bottom-3 h-20 bg-surface-container rounded-full opacity-60 transition-transform duration-500 group-hover:translate-y-1 pointer-events-none" />
      {/* Underlaid paper sheet 1 */}
      <div className="absolute inset-x-2 -bottom-1.5 h-20 bg-surface-container-low rounded-full opacity-80 transition-transform duration-300 group-hover:translate-y-0.5 pointer-events-none" />

      {/* Main Input Card */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!isLoading) setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          if (!isLoading) pickFile(e.dataTransfer.files[0]);
        }}
        className={`relative bg-surface-container-lowest rounded-[2rem] p-2.5 sm:p-3 shadow-drop-zone flex flex-col sm:flex-row items-center gap-3 transition-shadow ${
          isDragging ? 'ring-2 ring-primary' : ''
        }`}
      >
        <div className="flex items-start gap-3.5 pl-4 sm:pl-5 flex-1 w-full text-left">
          <span className="material-symbols-outlined text-outline text-[22px] select-none mt-2">
            auto_stories
          </span>
          <textarea
            ref={textRef}
            rows={1}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            disabled={isLoading}
            aria-label="Văn bản cần đọc"
            className="w-full resize-none bg-transparent text-sm sm:text-base text-on-surface placeholder:text-outline/70 focus:outline-none font-body py-2"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end pr-1 pb-1 sm:pb-0">
          {onFileSelect && (
            <>
              <input
                ref={fileRef}
                type="file"
                accept={ACCEPT_ATTR}
                hidden
                aria-label="Chọn tệp PDF hoặc ảnh"
                onChange={(e) => {
                  pickFile(e.target.files?.[0]);
                  e.target.value = '';
                }}
              />
              <button
                type="button"
                disabled={isLoading}
                onClick={() => fileRef.current?.click()}
                className="px-4 py-2.5 text-xs font-label text-on-surface-variant hover:text-on-surface transition-colors flex items-center gap-1.5 rounded-full hover:bg-surface-container-low select-none disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[18px]">upload_file</span>
                <span>{uploadText}</span>
              </button>
            </>
          )}
          <button
            type="button"
            onClick={onSubmit}
            disabled={isLoading}
            className="px-6 py-2.5 bg-gradient-to-r from-primary to-primary-container text-on-primary font-label text-xs sm:text-sm font-medium rounded-full shadow-sm hover:shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2 whitespace-nowrap select-none disabled:opacity-60"
          >
            <span>{submitText}</span>
            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </button>
        </div>
      </div>

      {/* Status line: loading / error / chosen file */}
      <div aria-live="polite" className="relative mt-5 min-h-[1.25rem] text-center text-xs font-label">
        {isLoading ? (
          <span className="inline-flex items-center gap-3 text-on-surface-variant">
            <span>
              Đang xử lý{fileName ? ` “${fileName}”` : ''}... Tệp scan hoặc ảnh có thể mất vài chục giây.
            </span>
            {onCancel && (
              <button type="button" onClick={onCancel} className="underline hover:text-primary">
                Hủy
              </button>
            )}
          </span>
        ) : error ? (
          <span role="alert" className="text-error">
            {error}
          </span>
        ) : null}
      </div>
    </div>
  );
};
