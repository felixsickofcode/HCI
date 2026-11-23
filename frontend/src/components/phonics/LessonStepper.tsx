import React from 'react';

export interface LessonStepperProps {
  currentStep: number;
  totalSteps?: number;
  stepTitles?: string[];
  onStepClick?: (step: number) => void;
  className?: string;
}

const DEFAULT_TITLES = [
  'Học đa giác quan',
  'Xem & nghe ghép',
  'Nghe & tự ghép',
  'Tự đọc',
];

export const LessonStepper: React.FC<LessonStepperProps> = ({
  currentStep,
  totalSteps = 4,
  stepTitles = DEFAULT_TITLES,
  onStepClick,
  className = '',
}) => {
  return (
    <nav
      className={`grid grid-cols-4 gap-2 mb-3 shrink-0 select-none ${className}`}
      aria-label={`Tiến trình 4 bước bài học: Bước ${currentStep} trên ${totalSteps}`}
    >
      {Array.from({ length: totalSteps }).map((_, index) => {
        const stepNumber = index + 1;
        const isCompleted = stepNumber < currentStep;
        const isCurrent = stepNumber === currentStep;
        const title = stepTitles[index] || `Bước ${stepNumber}`;

        return (
          <button
            key={stepNumber}
            type="button"
            disabled={!onStepClick || stepNumber > currentStep}
            onClick={() => onStepClick && stepNumber <= currentStep && onStepClick(stepNumber)}
            title={`Bước ${stepNumber}: ${title}`}
            className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs transition-all ${
              isCurrent
                ? 'bg-primary text-on-primary font-semibold shadow-sm'
                : isCompleted
                ? 'bg-primary/15 text-primary hover:bg-primary/25 font-medium'
                : 'bg-surface-container text-on-surface-variant/70 cursor-default font-normal'
            } ${onStepClick && stepNumber <= currentStep ? 'cursor-pointer' : ''}`}
          >
            <span
              className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                isCurrent
                  ? 'bg-on-primary text-primary'
                  : isCompleted
                  ? 'bg-primary text-white'
                  : 'bg-surface-container-high text-on-surface-variant'
              }`}
            >
              {isCompleted ? (
                <span className="material-symbols-outlined text-[11px] leading-none font-bold">check</span>
              ) : (
                stepNumber
              )}
            </span>
            <span className="truncate">{title}</span>
          </button>
        );
      })}
    </nav>
  );
};
