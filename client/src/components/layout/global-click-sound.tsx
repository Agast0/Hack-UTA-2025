'use client';

import { useEffect, useRef } from 'react';
import { useUiStore } from '@/lib/store';

export function GlobalClickSound() {
  const mlgMode = useUiStore((s) => s.mlgMode);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastPlayRef = useRef<number>(0);
  const lastTimesRef = useRef<number | null>(null);

  useEffect(() => {
    audioRef.current = new Audio('/hitmarker.mp3');
    if (audioRef.current) {
      audioRef.current.volume = 0.35;
      audioRef.current.preload = 'auto';
    }

    const handleClick = () => {
      const now = Date.now();
      // Throttle to avoid overwhelming overlapping plays on rapid clicks
      if (now - lastPlayRef.current < 75) return;
      lastPlayRef.current = now;

      const audio = audioRef.current;
      if (!audio) return;

      // Single play per click only
      try {
        const instance = audio.cloneNode(true) as HTMLAudioElement;
        instance.volume = audio.volume;
        instance.currentTime = 0;
        void instance.play();
      } catch {
        // no-op
      }
    };

    if (!mlgMode) return; // disable when MLG mode is off
    window.addEventListener('click', handleClick, { capture: true });
    return () => {
      window.removeEventListener('click', handleClick, { capture: true } as any);
    };
  }, [mlgMode]);

  return null;
}

 