import React from 'react';
import { TagMarker } from '../../../components/common';

export const EditorialPhilosophySection: React.FC = () => {
  return (
    <section className="max-w-7xl mx-auto px-6 lg:px-12 py-12 w-full">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center bg-surface-container-low rounded-3xl p-8 lg:p-14 relative overflow-hidden">
        {/* Left narrative & metrics */}
        <div className="lg:col-span-6 flex flex-col gap-5 z-10">
          <div>
            <TagMarker label="Tuyên ngôn thiết kế" dotColorClass="bg-tertiary" />
          </div>

          <h2 className="font-headline text-3xl sm:text-4xl text-on-surface font-normal leading-snug">
            Khi con chữ tìm thấy <br />
            <em className="font-serif">nhịp điệu thanh thản</em>
          </h2>

          <p className="text-sm sm:text-base text-on-surface-variant font-body leading-relaxed font-light">
            Người đọc hiện đại bị quá tải bởi ánh sáng xanh gay gắt, mật độ chữ ngột ngạt và bố cục phân mảnh. LexiEase định hình lại trải nghiệm đọc như một nghi thức chậm rãi: mặt phẳng quang học làm dịu đồng tử, nhịp ngắt dòng khoa học và chữ nghĩa thở trong không gian thoáng đạt.
          </p>

          <div className="pt-4 flex items-center gap-8">
            <div>
              <p className="font-headline text-3xl text-on-surface font-semibold">84%</p>
              <p className="text-xs text-on-surface-variant font-label mt-1">
                Giảm căng thẳng quang học
              </p>
            </div>
            <div className="w-px h-8 bg-surface-container-highest" />
            <div>
              <p className="font-headline text-3xl text-on-surface font-semibold">2.4x</p>
              <p className="text-xs text-on-surface-variant font-label mt-1">
                Khả năng neo giữ tiêu điểm
              </p>
            </div>
          </div>
        </div>

        {/* Right paper layout mockup */}
        <div className="lg:col-span-6 relative flex justify-center z-10">
          <div className="relative w-full max-w-md bg-surface-container-lowest rounded-3xl p-7 shadow-editorial">
            {/* Paper layout mockup header */}
            <div className="flex items-center justify-between pb-5 border-b border-surface-container-low select-none">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-tertiary/40" />
                <span className="text-xs font-label text-outline uppercase tracking-wider">
                  Trang 04 / Tiểu luận
                </span>
              </div>
              <span className="text-xs text-outline font-label">Nắng chiều êm</span>
            </div>

            {/* Content with drop cap */}
            <div className="space-y-4 font-headline text-on-surface text-base sm:text-lg leading-relaxed pt-4">
              <p className="first-letter:text-4xl first-letter:font-normal first-letter:text-tertiary first-letter:float-left first-letter:mr-3 first-letter:leading-none">
                Ánh sáng xuyên qua khung cửa sổ gỗ, rọi lên mặt giấy màu ngà mịn màng. Không còn những thông báo quấy rầy, chỉ có sự lắng đọng sâu thẳm giữa tâm trí và trang sách.
              </p>
              <p className="text-on-surface-variant/90 text-sm font-body leading-loose">
                Từng khoảng cách giữa các từ được căn chỉnh vi mô nhằm ngăn hiện tượng nhòe dòng hoặc đảo chữ vô thức. Mắt lướt nhẹ nhàng, tư duy mở rộng.
              </p>
            </div>

            {/* Footer meta */}
            <div className="mt-6 pt-4 flex items-center justify-between text-xs text-outline font-label border-t border-surface-container-low select-none">
              <span className="italic font-serif text-on-surface-variant">
                Thư viện Alexandria Số
              </span>
              <span>4 phút đọc</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
