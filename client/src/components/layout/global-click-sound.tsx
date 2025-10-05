'use client';

import { useEffect, useRef } from 'react';

export function GlobalClickSound() {
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

      // Decide random count 2-4 times and start each with a 0.3s overlap
      // Avoid repeating the same count as the previous click (immediate back-to-back)
      let nextTimes = Math.floor(Math.random() * 3) + 2; // 2..4
      if (lastTimesRef.current !== null && nextTimes === lastTimesRef.current) {
        // Nudge to a different value in [2,4]
        const alternatives = [2, 3, 4].filter((n) => n !== lastTimesRef.current);
        nextTimes = alternatives[Math.floor(Math.random() * alternatives.length)];
      }
      lastTimesRef.current = nextTimes;
      const overlapMs = 300; // 0.3s between starts

      for (let i = 0; i < nextTimes; i += 1) {
        setTimeout(() => {
          try {
            const instance = audio.cloneNode(true) as HTMLAudioElement;
            instance.volume = audio.volume;
            instance.currentTime = 0;
            void instance.play();
          } catch {
            // no-op
          }
        }, i * overlapMs);
      }
    };

    window.addEventListener('click', handleClick, { capture: true });
    return () => {
      window.removeEventListener('click', handleClick, { capture: true } as any);
    };
  }, []);

  return null;
}

 