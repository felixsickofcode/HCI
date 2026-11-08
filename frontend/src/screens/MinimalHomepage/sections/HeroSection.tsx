import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TagMarker, DropZoneInput } from '../../../components/common';
import { useDocument } from '../../../context';

export const HeroSection: React.FC = () => {
  const navigate = useNavigate();
  const { submitPastedText, submitFile } = useDocument();
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const handleStartReading = () => {
    try {
      submitPastedText(inputValue);
      navigate('/reading');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Đã xảy ra lỗi. Vui lòng thử lại.');
    }
  };

  const handleFileSelect = async (file: File) => {
    const controller = new AbortController();
    abortRef.current = controller;
    setError(null);
    setFileName(file.name);
    setIsLoading(true);
    try {
      await submitFile(file, controller.signal);
      navigate('/reading');
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setError(err instanceof Error ? err.message : 'Đã xảy ra lỗi. Vui lòng thử lại.');
    } finally {
      abortRef.current = null;
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    abortRef.current?.abort();
  };

  return (
    <section className="relative w-full overflow-hidden px-6 lg:px-12 py-16 lg:py-24">
      {/* Ambient backdrops inside section */}
      <div className="absolute top-12 left-1/2 -translate-x-1/2 w-[700px] h-[340px] bg-tertiary-fixed/20 rounded-full blur-[110px] pointer-events-none -z-10" />
      <div className="absolute top-44 right-10 w-[380px] h-[280px] bg-primary-fixed/25 rounded-full blur-[90px] pointer-events-none -z-10" />

      <div className="max-w-5xl mx-auto flex flex-col items-center text-center">
        {/* Minimal tag marker */}
        <TagMarker label="Ấn bản kỹ thuật số thuần khiết" />

        {/* Main Headline with scholarly serif */}
        <h1 className="mt-8 font-headline text-4xl sm:text-5xl lg:text-6xl text-on-surface tracking-tight leading-[1.18] font-normal max-w-3xl">
          Trải nghiệm đọc êm dịu, <br className="hidden sm:inline" />
          <span className="italic font-normal text-primary">không rào cản</span>
        </h1>

        <p className="mt-6 text-base sm:text-lg text-on-surface-variant font-body max-w-2xl font-light leading-relaxed">
          Không gian văn bản giải phóng áp lực thị giác. Tự động hóa sự thấu hiểu cho mọi nhịp độ tiếp nhận thông tin, mang trả lại niềm hân hoan thuần tuý khi lật từng trang chữ.
        </p>

        {/* Soft Paper Drop Zone (Layered Sheet Effect) */}
        <div className="mt-12 w-full flex justify-center">
          <DropZoneInput
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              setError(null);
            }}
            onSubmit={handleStartReading}
            onFileSelect={handleFileSelect}
            onCancel={handleCancel}
            isLoading={isLoading}
            error={error}
            fileName={fileName}
          />
        </div>

        {/* Supported formats & Security indicator */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs text-outline font-label select-none">
          <span className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[15px] text-tertiary">
              verified_user
            </span>{' '}
            Định dạng hỗ trợ: PDF, PNG, JPEG, WebP hoặc văn bản dán
          </span>
          <span className="hidden sm:inline-block w-1 h-1 rounded-full bg-surface-container-highest" />
          <span>Tệp chỉ dùng để trích xuất chữ, không được lưu lại</span>
        </div>
      </div>
    </section>
  );
};