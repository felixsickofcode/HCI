import React from 'react';
import { TagMarker, PillarCard } from '../../../components/common';
import { mockPillars } from '../../../mocks';

export const CorePillarsSection: React.FC = () => {
  return (
    <section className="max-w-7xl mx-auto px-6 lg:px-12 py-20 w-full">
      <div className="text-center max-w-2xl mx-auto mb-16 flex flex-col items-center">
        <TagMarker label="Giá trị cốt lõi" />
        <h2 className="mt-4 font-headline text-3xl sm:text-4xl text-on-surface font-normal">
          Ba trụ cột nuôi dưỡng tâm trí
        </h2>
        <p className="mt-4 text-sm sm:text-base text-on-surface-variant font-body font-light">
          Sự kết hợp hài hòa giữa nhãn khoa nhận thức, nghệ thuật xếp chữ truyền thống và công nghệ hỗ trợ nhân văn.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {mockPillars.map((pillar) => (
          <PillarCard
            key={pillar.id}
            icon={pillar.icon}
            iconColorClass={pillar.iconColorClass}
            title={pillar.title}
            description={pillar.description}
            metricLabel={pillar.metricLabel}
            metricValue={pillar.metricValue}
            progressPercent={pillar.progressPercent}
            progressBarColorClass={pillar.progressBarColorClass}
          />
        ))}
      </div>
    </section>
  );
};
