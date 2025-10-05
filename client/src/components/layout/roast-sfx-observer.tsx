'use client';

import { useEffect, useRef } from 'react';

const SFX_PATHS = [
  '/roastsfx/airhorn.mp3',
  '/roastsfx/mlg-headshot_n_music.mp3',
  '/roastsfx/mlg-sad-violin-short.mp3',
  '/roastsfx/REKT.mp3',
  '/roastsfx/wow-mlg-sound-effect.mp3',
  '/roastsfx/NEVER_DONE_THAT.mp3',
  '/roastsfx/SANIC.mp3',
];

export function RoastSfxObserver() {
  const remainingRef = useRef<string[]>([]);
  const initializedRef = useRef(false);
  const triggeredOnceRef = useRef<WeakSet<Element>>(new WeakSet());
  const teamRepeatAllowanceRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!initializedRef.current) {
      // Preload pool
      remainingRef.current = [...SFX_PATHS];
      initializedRef.current = true;
    }

    const pickNextPath = () => {
      if (remainingRef.current.length === 0) {
        // Exhausted: reset only on page reload; do not repopulate
        return null;
      }
      const idx = Math.floor(Math.random() * remainingRef.current.length);
      const [path] = remainingRef.current.splice(idx, 1);
      return path;
    };

    const playPath = (path: string | null) => {
      if (!path) return;
      // Find or create a player for this path
      const player = new Audio(path);
      player.volume = 0.5;
      player.preload = 'auto';
      void player.play();
    };

    const attach = () => {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              // Ensure each roast element only triggers once per page lifecycle
              const el = entry.target as HTMLElement;
              const roastId = el.getAttribute('data-roast-id');

              if (triggeredOnceRef.current.has(el)) {
                // If this element has a stable id and hasn't used its allowance in confirmed bugs, allow once
                if (roastId && !teamRepeatAllowanceRef.current.has(roastId) && el.closest('[data-confirmed-bugs-page]')) {
                  teamRepeatAllowanceRef.current.add(roastId);
                } else {
                  return;
                }
              }

              triggeredOnceRef.current.add(el);
              const path = pickNextPath();
              playPath(path);
            }
          });
        },
        {
          root: null,
          // Trigger when element crosses 15% above the bottom of the viewport
          rootMargin: '0px 0px -15% 0px',
          threshold: 0,
        }
      );

      const elements = Array.from(document.querySelectorAll('.roast-trigger'));
      elements.forEach((el) => observer.observe(el));

      return observer;
    };

    let observer = attach();

    // Observe DOM changes to catch dynamically added roast blocks
    const mo = new MutationObserver(() => {
      if (observer) observer.disconnect();
      observer = attach();
    });
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      if (observer) observer.disconnect();
      mo.disconnect();
    };
  }, []);

  return null;
}


