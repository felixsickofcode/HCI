import { useCallback, useEffect, useRef, useState } from 'react';

let globalAudio: HTMLAudioElement | null = null;

export const stopAllPhonicsAudio = () => {
  if (globalAudio) {
    globalAudio.pause();
    globalAudio.currentTime = 0;
  }
};

export interface PlayAudioOptions {
  slow?: boolean;
  onEnded?: () => void;
}

export const usePhonicsAudio = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeUrl, setActiveUrl] = useState<string | null>(null);
  const [lastNotification, setLastNotification] = useState<string | null>(null);
  const currentCallbackRef = useRef<(() => void) | undefined>(undefined);

  const clearNotification = useCallback(() => {
    setLastNotification(null);
  }, []);

  const playAudio = useCallback(
    (url: string, options: PlayAudioOptions = {}) => {
      const { slow = false, onEnded } = options;

      stopAllPhonicsAudio();

      if (!url) {
        onEnded?.();
        return;
      }

      setActiveUrl(url);
      setIsPlaying(true);
      currentCallbackRef.current = onEnded;

      if (!globalAudio) {
        globalAudio = new Audio();
      }

      globalAudio.src = url;
      globalAudio.playbackRate = slow ? 0.75 : 1;

      const handleEnded = () => {
        setIsPlaying(false);
        setActiveUrl(null);
        currentCallbackRef.current?.();
        currentCallbackRef.current = undefined;
      };

      const handleError = () => {
        console.warn(`[Phonics Audio] Chưa có file âm thanh tại '${url}'.`);
        if (!url.endsWith('/assets/audio/silence.wav')) {
          setLastNotification('Chưa có file âm thanh mẫu');
        }
        setIsPlaying(false);
        setActiveUrl(null);
        currentCallbackRef.current?.();
        currentCallbackRef.current = undefined;
      };

      globalAudio.onended = handleEnded;
      globalAudio.onerror = handleError;

      const playPromise = globalAudio.play();
      if (playPromise !== undefined) {
        playPromise.catch(handleError);
      }
    },
    []
  );

  const stop = useCallback(() => {
    stopAllPhonicsAudio();
    setIsPlaying(false);
    setActiveUrl(null);
  }, []);

  useEffect(() => {
    return () => {
      currentCallbackRef.current = undefined;
    };
  }, []);

  return {
    isPlaying,
    activeUrl,
    lastNotification,
    playAudio,
    stop,
    clearNotification,
  };
};
