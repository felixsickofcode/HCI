import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppSidebar } from '../../components/layout';
import { FeedbackBanner } from '../../components/common';
import {
  LetterDisplay,
  LessonStepper,
  StrokeGuide,
  Step1SubNav,
  StrokeCustomizerModal,
  ToneCardsDisplay,
  GuidedBlendingGrid,
  ElkoninExercise,
} from '../../components/phonics';
import type { GlyphFontStyle } from '../../data/phonics/glyphData';
import { bai01Lesson } from '../../data/lessons/lessonCatalog';
import { usePhonicsAudio } from '../../hooks/usePhonicsAudio';

const STEP_TITLES = [
  'Học đa giác quan',
  'Xem và nghe cách ghép',
  'Nghe và tự ghép',
  'Tự đọc',
];

export const PhonicsPracticeView: React.FC = () => {
  const navigate = useNavigate();
  const { lessonId } = useParams<{ lessonId?: string }>();
  const lessonAvailable = !lessonId || lessonId === bai01Lesson.id;
  const [currentStep, setCurrentStep] = useState(1);
  const [step1Screen, setStep1Screen] = useState(0);
  const [viewedStep1Tabs, setViewedStep1Tabs] = useState<number[]>([0]);
  const [isCustomizerOpen, setIsCustomizerOpen] = useState(false);
  const [strokeColor, setStrokeColor] = useState('#094cb2');
  const [strokeSpeed, setStrokeSpeed] = useState(1.0);
  const [strokeWidth, setStrokeWidth] = useState(14);
  const [strokeFontStyle, setStrokeFontStyle] = useState<GlyphFontStyle>('sans');
  const [step2Example, setStep2Example] = useState(0);
  const [step2Phase, setStep2Phase] = useState(-1);
  const [step3Exercise, setStep3Exercise] = useState(0);
  const [step3Ready, setStep3Ready] = useState(false);
  const [step3Correct, setStep3Correct] = useState(false);
  const [step3Completed, setStep3Completed] = useState<number[]>([]);
  const step3ExerciseRef = useRef<import('../../components/phonics/ElkoninExercise').ElkoninExerciseHandle>(null);
  const [step4Item, setStep4Item] = useState(0);
  const [step4Choice, setStep4Choice] = useState<string | null>(null);
  const [step4Dimmed, setStep4Dimmed] = useState<string[]>([]);
  const [step4Feedback, setStep4Feedback] = useState<{ message: string; type: 'correct' | 'tryAgain' } | null>(null);
  const [leftSidebarCollapsed, setLeftSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const timeoutRefs = useRef<number[]>([]);

  const { isPlaying, activeUrl, playAudio, stop, lastNotification, clearNotification } = usePhonicsAudio();

  const clearTimeouts = useCallback(() => {
    timeoutRefs.current.forEach((id) => window.clearTimeout(id));
    timeoutRefs.current = [];
  }, []);

  const handleStep3StateChange = useCallback((state: { isReady: boolean; isCorrect: boolean }) => {
    setStep3Ready(state.isReady);
    setStep3Correct(state.isCorrect);
    if (state.isCorrect) {
      setStep3Completed((current) =>
        current.includes(step3Exercise) ? current : [...current, step3Exercise],
      );
    }
  }, [step3Exercise]);

  const play = useCallback((url: string, slow = false, onEnded?: () => void) => {
    clearNotification();
    playAudio(url, { slow, onEnded });
  }, [clearNotification, playAudio]);

  const resetLesson = useCallback(() => {
    clearTimeouts();
    stop();
    setCurrentStep(1);
    setStep1Screen(0);
    setViewedStep1Tabs([0]);
    setIsCustomizerOpen(false);
    setStep2Example(0);
    setStep2Phase(-1);
    setStep3Exercise(0);
    setStep3Ready(false);
    setStep3Correct(false);
    setStep3Completed([]);
    setStep4Item(0);
    setStep4Choice(null);
    setStep4Dimmed([]);
    setStep4Feedback(null);
  }, [clearTimeouts, stop]);

  useEffect(() => () => clearTimeouts(), [clearTimeouts]);

  useEffect(() => {
    if (currentStep !== 4) return;
    const item = bai01Lesson.step4.items[step4Item];
    if (!item) return;
    const id = window.setTimeout(() => play(item.audio), 350);
    return () => window.clearTimeout(id);
  }, [currentStep, step4Item, play]);

  const goBack = () => {
    if (currentStep === 1) {
      if (step1Screen > 0) setStep1Screen((value) => value - 1);
      return;
    }
    stop();
    setCurrentStep((value) => value - 1);
  };

  const goNext = () => {
    if (currentStep === 1) {
      if (step1Screen < 4) {
        stop();
        const nextScreen = step1Screen + 1;
        setStep1Screen(nextScreen);
        setViewedStep1Tabs((prev) => (prev.includes(nextScreen) ? prev : [...prev, nextScreen]));
        return;
      }
      stop();
      setCurrentStep(2);
      return;
    }
    if (currentStep < 4) {
      stop();
      setCurrentStep((value) => value + 1);
    }
  };

  // Shortcut: Enter để qua âm kế tiếp khi ở Bước 1
  useEffect(() => {
    if (currentStep !== 1) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.closest('button')) return;
        goNext();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  const runBlendingExample = (exampleIndex: number) => {
    clearTimeouts();
    setStep2Example(exampleIndex);
    setStep2Phase(-1);
    const example = bai01Lesson.step2.examples[exampleIndex];
    if (!example) return;
    if (example.parts) {
      const first = example.parts[0];
      const second = example.parts[1];
      const firstSound = bai01Lesson.step1.sounds.find((sound) => sound.symbol === first);
      const secondSound = bai01Lesson.step1.sounds.find((sound) => sound.symbol === second);
      setStep2Phase(0);
      play(firstSound?.audio.normal || '');
      timeoutRefs.current.push(window.setTimeout(() => {
        setStep2Phase(1);
        play(secondSound?.audio.normal || '');
      }, 900));
      timeoutRefs.current.push(window.setTimeout(() => {
        setStep2Phase(2);
        play(example.audio);
      }, 1800));
    } else {
      setStep2Phase(1);
      play(bai01Lesson.step1.sounds.find((sound) => sound.symbol === 'a')?.audio.normal || '');
      timeoutRefs.current.push(window.setTimeout(() => {
        setStep2Phase(2);
        play(example.audio);
      }, 900));
    }
  };

  const chooseStep4 = (option: string) => {
    if (step4Choice === bai01Lesson.step4.items[step4Item].answer) return;
    const item = bai01Lesson.step4.items[step4Item];
    if (option === item.answer) {
      setStep4Choice(option);
      setStep4Feedback({ type: 'correct', message: `Đúng rồi!` });
      play(item.audio);
    } else {
      setStep4Choice(null);
      setStep4Dimmed((current) => current.includes(option) ? current : [...current, option]);
      setStep4Feedback({ type: 'tryAgain', message: 'Chưa đúng, mình nghe lại nhé.' });
      play(item.audio);
    }
  };

  useEffect(() => {
    if (currentStep !== 4) return;
    const handleKey = (event: KeyboardEvent) => {
      if (!['1', '2', '3'].includes(event.key)) return;
      if (step4Feedback?.type === 'correct') return;
      const item = bai01Lesson.step4.items[step4Item];
      chooseStep4(item.options[Number(event.key) - 1]);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  });

  if (!lessonAvailable) {
    return (
      <div className="min-h-screen flex bg-[#FAF8F5]">
        <AppSidebar
          currentScreen="multisensory"
          isCollapsed={leftSidebarCollapsed}
          onToggleCollapse={() => setLeftSidebarCollapsed((value) => !value)}
          mobileOpen={mobileSidebarOpen}
          onCloseMobile={() => setMobileSidebarOpen(false)}
          activeLessonId={lessonId}
          onSelectLesson={(id) => {
            resetLesson();
            navigate(`/phonics/${id}`);
          }}
        />
        <main className="flex-1 flex items-center justify-center p-8">
          <div role="status" className="rounded-3xl border border-[#E8E4DD] bg-white px-8 py-6 text-center shadow-card-subtle">
            <p className="text-xl font-semibold">Bài này sắp có</p>
            <button type="button" onClick={() => navigate('/phonics/bai-01')} className="mt-4 min-h-[48px] px-5 rounded-xl bg-primary text-white">
              Mở Bài 01
            </button>
          </div>
        </main>
      </div>
    );
  }

  const stepBackDisabled = currentStep === 1 && step1Screen === 0;

  return (
    <div className="min-h-screen h-screen flex bg-[#FAF8F5] text-stone-900 overflow-hidden">
      <AppSidebar
        currentScreen="multisensory"
        isCollapsed={leftSidebarCollapsed}
        onToggleCollapse={() => setLeftSidebarCollapsed((value) => !value)}
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
        activeLessonId="bai-01"
        onSelectLesson={(id) => {
          resetLesson();
          navigate(`/phonics/${id}`);
        }}
      />

      <main className="flex-1 min-w-0 px-4 sm:px-6 lg:px-8 py-4 flex flex-col h-full overflow-hidden justify-between">
        <div className="w-full max-w-6xl mx-auto shrink-0">
          <header className="flex items-center justify-between pb-2">
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-headline font-bold text-on-surface">Bài 01 – Âm và chữ</h1>
              <span className="px-2 py-0.5 rounded bg-surface-container-high text-on-surface-variant text-[11px] font-label font-medium flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">schedule</span>
                Khoảng 40 phút
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-label text-on-surface-variant font-medium">
                Tiến độ: {currentStep}/4 bước
              </span>
            </div>
          </header>

          <LessonStepper
            currentStep={currentStep}
            totalSteps={4}
            stepTitles={STEP_TITLES}
            onStepClick={(step) => {
              stop();
              setCurrentStep(step);
            }}
          />

          {currentStep === 1 && (
            <Step1SubNav
              sounds={bai01Lesson.step1.sounds}
              activeIndex={step1Screen}
              viewedTabs={viewedStep1Tabs}
              onSelectTab={(idx) => {
                stop();
                setStep1Screen(idx);
                setViewedStep1Tabs((prev) => (prev.includes(idx) ? prev : [...prev, idx]));
              }}
            />
          )}
          {currentStep === 3 && (
            <div className="flex items-center justify-between py-1.5 shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-label font-semibold text-on-surface-variant mr-1">Bài tập thực hành:</span>
                {bai01Lesson.step3.items.map((item, index) => (
                  <button
                    key={item.word}
                    type="button"
                    onClick={() => {
                      setStep3Exercise(index);
                      setStep3Ready(false);
                      setStep3Correct(false);
                      stop();
                    }}
                    aria-label={`Bài tập ${index + 1}${index === step3Exercise ? ', đang chọn' : ''}`}
                    aria-current={index === step3Exercise ? 'step' : undefined}
                    className={`w-9 h-9 rounded-xl font-label text-sm flex items-center justify-center transition-transform ${
                      index === step3Exercise
                        ? 'bg-primary text-on-primary shadow-sm scale-105 font-bold'
                        : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-dim font-semibold'
                    }`}
                  >
                    {step3Completed.includes(index) ? (
                      <span className="material-symbols-outlined text-[18px]" aria-label="Đã đúng">check</span>
                    ) : (
                      index + 1
                    )}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 text-xs font-label text-on-surface-variant">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-tertiary-fixed-dim" />
                <span>Nghe kỹ âm mẫu, kéo hoặc bấm chọn âm tương ứng</span>
              </div>
            </div>
          )}
        </div>

        {(lastNotification || step4Feedback) && (
          <div className="w-full max-w-6xl mx-auto my-1 flex justify-center shrink-0">
            {lastNotification ? (
              <FeedbackBanner type="hint" message={lastNotification} />
            ) : step4Feedback ? (
              <FeedbackBanner type={step4Feedback.type} message={step4Feedback.message} />
            ) : null}
          </div>
        )}

        <section className="w-full max-w-6xl mx-auto flex-1 min-h-0 my-1 overflow-hidden">
          {currentStep === 1 && step1Screen < 4 && (() => {
            const sound = bai01Lesson.step1.sounds[step1Screen];
            return (
              <div className="h-full flex gap-5 items-stretch min-h-0">
                {/* CỘT TRÁI: 2/3 CHIỀU RỘNG (Trực quan hoá âm chữ và nút Phát lại duy nhất) */}
                <div className="w-2/3 h-full">
                  <StrokeGuide
                    symbol={sound.symbol}
                    soundType={sound.type}
                    fontStyle={strokeFontStyle}
                    strokeColor={strokeColor}
                    strokeWidth={strokeWidth}
                    speed={strokeSpeed}
                    onPlaySound={() => play(sound.audio.normal)}
                  />
                </div>

                {/* CỘT PHẢI: 1/3 CHIỀU RỘNG (Khối hướng dẫn & Tuỳ chỉnh nét) */}
                <div className="w-1/3 h-full flex flex-col gap-3 justify-between">
                  {/* Khối hướng dẫn giác quan trên */}
                  <div className="bg-surface-container-lowest p-4 rounded-2xl shadow-xs border border-surface-container/60 shrink-0">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl bg-tertiary-fixed text-on-tertiary-fixed flex items-center justify-center shrink-0 shadow-xs">
                        <span className="material-symbols-outlined text-[20px]">pan_tool_alt</span>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-on-surface leading-snug">
                          Bạn hãy vừa viết theo bằng tay, vừa đọc to âm{' '}
                          <span className="font-headline font-bold text-primary text-base">“{sound.readAs}”</span> nhé.
                        </p>
                        <p className="text-[11px] text-outline font-label leading-relaxed flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[14px] text-tertiary">hearing</span>
                          Ghi nhớ vận động cơ tay kết hợp phản xạ thanh quản
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Khối tuỳ chỉnh nét dưới: khi mở là modal/panel, khi đóng là nút mở */}
                  {isCustomizerOpen ? (
                    <StrokeCustomizerModal
                      isOpen={isCustomizerOpen}
                      onClose={() => setIsCustomizerOpen(false)}
                      strokeColor={strokeColor}
                      onChangeColor={setStrokeColor}
                      speed={strokeSpeed}
                      onChangeSpeed={setStrokeSpeed}
                      strokeWidth={strokeWidth}
                      onChangeStrokeWidth={setStrokeWidth}
                      fontStyle={strokeFontStyle}
                      onChangeFontStyle={setStrokeFontStyle}
                    />
                  ) : (
                    <div className="flex-1 bg-surface-container-lowest p-5 rounded-2xl shadow-xs border border-surface-container/60 flex flex-col justify-between items-center text-center">
                      <div className="w-12 h-12 rounded-2xl bg-primary-fixed/30 flex items-center justify-center text-primary mt-2">
                        <span className="material-symbols-outlined text-[26px]">palette</span>
                      </div>
                      <div>
                        <h3 className="font-headline font-bold text-sm text-on-surface">Tuỳ chỉnh nét</h3>
                        <p className="text-xs text-on-surface-variant mt-1.5 px-3 leading-relaxed">
                          Chọn màu nét (5 sắc xanh), chỉnh tốc độ, độ dày nét và 4 kiểu font hiển thị.
                        </p>
                        <div className="mt-2 text-xs text-stone-500">
                          Phông hiện tại: <span className="font-semibold text-primary">Lexend</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsCustomizerOpen(true)}
                        className="w-full py-2.5 px-4 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-primary font-semibold text-xs transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[16px]">tune</span>
                        <span>Mở bảng tuỳ chỉnh nét</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {currentStep === 1 && step1Screen === 4 && (
            <div className="h-full bg-surface-container-lowest border border-surface-container rounded-2xl shadow-xs overflow-hidden">
              <ToneCardsDisplay
                tones={bai01Lesson.step1.tones}
                onPlayTone={(url) => play(url)}
                isPlaying={isPlaying}
                activeUrl={activeUrl}
              />
            </div>
          )}

          {currentStep === 2 && (() => {
            return (
              <GuidedBlendingGrid
                examples={bai01Lesson.step2.examples}
                activeExample={step2Phase >= 0 ? step2Example : null}
                activePhase={step2Phase}
                activeUrl={activeUrl}
                onPlayExample={runBlendingExample}
              />
            );
          })()}

          {currentStep === 3 && (
            <ElkoninExercise
              key={`step3-${step3Exercise}`}
              ref={step3ExerciseRef}
              item={bai01Lesson.step3.items[step3Exercise]}
              exerciseIndex={step3Exercise}
              onReplay={(audio) => play(audio)}
              onStateChange={handleStep3StateChange}
            />
          )}

          {currentStep === 4 && (() => {
            const item = bai01Lesson.step4.items[step4Item];
            const isCorrect = step4Choice === item.answer;
            return (
              <div className="h-full px-6 py-4 flex flex-col items-center justify-center">
                {step4Item < 4 ? (
                  <>
                    <p className="text-sm font-semibold text-primary">Câu {step4Item + 1} / 4</p>
                    <h2 className="mt-2 text-xl sm:text-2xl font-bold">Đọc tiếng và chọn cách viết đúng</h2>
                    <button type="button" onClick={() => play(item.audio)} className="mt-3 min-h-[48px] px-5 rounded-xl border border-primary/30 text-primary font-semibold">
                      Nghe lại
                    </button>
                    <div className="mt-5 grid grid-cols-3 gap-4 w-full max-w-xl">
                      {item.options.map((option, index) => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => chooseStep4(option)}
                          disabled={isCorrect}
                          aria-label={`Lựa chọn ${index + 1}: ${option}`}
                          className={`relative min-h-[150px] rounded-3xl border-2 bg-white flex flex-col items-center justify-center ${
                            isCorrect && option === item.answer
                              ? 'border-emerald-500 bg-emerald-50'
                              :                               step4Choice === option || step4Dimmed.includes(option)
                              ? 'opacity-50'
                              : 'border-outline-variant/40 hover:border-primary/50'
                          }`}
                        >
                          <span className="absolute top-3 left-3 w-6 h-6 rounded-full bg-stone-100 text-xs flex items-center justify-center">{index + 1}</span>
                          {isCorrect && option === item.answer && <span className="absolute top-3 right-3 material-symbols-outlined text-emerald-600">check_circle</span>}
                          <LetterDisplay letter={option} type={item.answer === option ? (bai01Lesson.step1.sounds.find((sound) => sound.symbol === 'o')?.type || 'vowel') : 'consonant'} size="lg" />
                          <span className="text-sm text-stone-600">{option}</span>
                        </button>
                      ))}
                    </div>
                    {isCorrect && (
                      step4Item < 3 ? (
                        <button type="button" onClick={() => { setStep4Item((value) => value + 1); setStep4Choice(null); setStep4Dimmed([]); setStep4Feedback(null); }} className="mt-4 min-h-[48px] px-6 rounded-xl bg-primary text-white font-semibold">
                          Câu tiếp theo
                        </button>
                      ) : (
                        <button type="button" onClick={() => setStep4Item(4)} className="mt-4 min-h-[48px] px-6 rounded-xl bg-primary text-white font-semibold">
                          Kết thúc bài
                        </button>
                      )
                    )}
                  </>
                ) : (
                  <div className="text-center">
                    <span className="material-symbols-outlined text-[72px] text-emerald-600" aria-hidden="true">celebration</span>
                    <h2 className="mt-2 text-3xl font-bold">Bạn đã hoàn thành bài học!</h2>
                    <p className="mt-3 text-lg text-stone-700">
                      Hôm nay bạn đã học: âm a, c, o, ô; dấu huyền, sắc, hỏi, nặng.
                    </p>
                    <div className="mt-6 flex justify-center gap-3">
                      <button type="button" onClick={resetLesson} className="min-h-[48px] px-6 rounded-xl border-2 border-primary/30 text-primary font-semibold">Học lại</button>
                      <button type="button" onClick={() => navigate('/')} className="min-h-[48px] px-6 rounded-xl bg-primary text-white font-semibold">Về trang chủ</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </section>

        {!(currentStep === 4 && step4Item === 4) && (
          <nav className="w-full max-w-6xl mx-auto pt-3 flex items-center justify-between shrink-0 select-none" aria-label="Điều hướng bài học">
            <button
              type="button"
              aria-label={currentStep === 3 ? 'Bài tập trước' : 'Quay lại'}
              onClick={() => {
                if (currentStep === 3 && step3Exercise > 0) {
                  setStep3Exercise((value) => value - 1);
                  setStep3Ready(false);
                  setStep3Correct(false);
                  stop();
                } else {
                  goBack();
                }
              }}
              disabled={currentStep === 3 ? step3Exercise === 0 : stepBackDisabled}
              className="h-12 px-5 rounded-xl bg-surface-container-high text-on-surface font-label font-semibold text-sm hover:bg-surface-dim active:scale-95 transition-all flex items-center gap-2 disabled:opacity-40"
            >
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
              <span>{currentStep === 3 ? 'Bài tập trước' : 'Quay lại'}</span>
            </button>
            <div className="flex items-center gap-3">
              {currentStep === 1 && (
                <span className="text-xs font-label text-outline hidden sm:inline">
                  Phím tắt: Enter để qua âm kế tiếp
                </span>
              )}
              {currentStep === 3 && (
                <button
                  type="button"
                  aria-label="Kiểm tra"
                  onClick={() => step3ExerciseRef.current?.checkAnswer()}
                  disabled={!step3Ready}
                  className="h-12 px-8 rounded-xl bg-surface-container-highest text-outline font-label font-bold text-sm transition-all flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-60 enabled:bg-primary enabled:text-on-primary"
                >
                  <span className="material-symbols-outlined text-lg">spellcheck</span>
                  Kiểm tra
                </button>
              )}
              <button
                type="button"
                aria-label={currentStep === 3
                  ? (step3Exercise === 3 ? 'Sang bước 4' : 'Bài tập tiếp theo')
                  : 'Tiếp tục'}
                onClick={() => {
                  if (currentStep === 3) {
                    if (!step3Correct) return;
                    if (step3Exercise < 3) {
                      setStep3Exercise((value) => value + 1);
                      setStep3Ready(false);
                      setStep3Correct(false);
                      stop();
                    } else {
                      stop();
                      setCurrentStep(4);
                    }
                  } else {
                    goNext();
                  }
                }}
                disabled={currentStep === 3 && !step3Correct}
                className="h-12 px-5 rounded-xl bg-surface-container-highest text-outline font-label font-semibold text-sm transition-all flex items-center gap-2 disabled:cursor-not-allowed enabled:bg-primary enabled:text-on-primary"
              >
                <span>{currentStep === 3 ? (step3Exercise === 3 ? 'Sang bước 4' : 'Bài tập tiếp theo') : 'Tiếp tục'}</span>
                <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
              </button>
            </div>
          </nav>
        )}
      </main>
      {/* TODO: gửi kết quả lên BE khi có API tiến độ. */}
    </div>
  );
};
