import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../../components/common';
import { useAuth } from '../../../context';

export const CallToActionSection: React.FC = () => {
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();

  return (
    <section className="max-w-5xl mx-auto px-6 lg:px-12 py-16 w-full text-center">
      <div className="bg-surface-container rounded-3xl p-10 sm:p-14 relative overflow-hidden shadow-sm">
        <div className="absolute -top-20 -right-16 h-56 w-56 rounded-full bg-tertiary-fixed/30 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-16 h-56 w-56 rounded-full bg-primary-fixed/30 blur-3xl pointer-events-none" />

        <div className="max-w-xl mx-auto relative z-10 flex flex-col items-center">
          <span className="material-symbols-outlined text-tertiary text-3xl mb-4 select-none">
            spa
          </span>
          <h3 className="font-headline text-2xl sm:text-3xl text-on-surface font-normal">
            Hãy để đôi mắt được nghỉ ngơi chiều nay
          </h3>
          <p className="mt-3 text-sm text-on-surface-variant font-body font-light leading-relaxed">
            {user
              ? 'Không cần cài đặt phức tạp. Chỉ cần mở một văn bản bạn yêu thích và bắt đầu bước vào không gian tĩnh tại được thiết kế riêng cho bạn.'
              : 'Tạo tài khoản miễn phí để lưu giữ tủ sách, đồng bộ tiến độ đọc và nhận trải nghiệm được cá nhân hóa cho riêng bạn.'}
          </p>

          {!isLoading && !user ? (
            <>
              <div className="mt-8 flex flex-col sm:flex-row items-center gap-4">
                <Button
                  variant="primary"
                  size="lg"
                  icon="person_add"
                  iconPosition="left"
                  onClick={() => navigate('/register')}
                >
                  Tạo tài khoản miễn phí
                </Button>
                <Button
                  variant="secondary"
                  size="lg"
                  className="bg-surface-container-lowest text-on-surface hover:bg-surface-bright"
                  onClick={() => navigate('/login')}
                >
                  Đăng nhập
                </Button>
              </div>
              <button
                type="button"
                onClick={() => navigate('/reading')}
                className="mt-5 inline-flex items-center gap-1.5 text-xs font-label text-on-surface-variant transition-colors hover:text-primary"
              >
                hoặc trải nghiệm đọc thử ngay
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </button>
              <p className="mt-4 text-[11px] font-label text-outline">
                Miễn phí · Không cần thẻ tín dụng · Bảo mật tài khoản
              </p>
            </>
          ) : (
            <div className="mt-8 flex flex-col sm:flex-row items-center gap-4">
              <Button
                variant="primary-solid"
                size="lg"
                onClick={() => navigate('/reading')}
              >
                Bắt đầu đọc thử
              </Button>
              <Button
                variant="secondary"
                size="lg"
                className="bg-surface-container-lowest text-on-surface hover:bg-surface-bright"
                onClick={() => navigate('/reading')}
              >
                Khám phá phương pháp
              </Button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
