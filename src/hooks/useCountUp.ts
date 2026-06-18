import { useEffect, useRef, useState } from "react";

interface Options {
  /** Milliseconds the count should take. */
  duration?: number;
  /** Delay before counting starts. */
  delay?: number;
  /** Skip the animation entirely (reduced motion). */
  instant?: boolean;
}

/** easeOutExpo — fast start, gentle settle, very "Wrapped". */
const ease = (t: number) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));

/**
 * Counts from 0 up to `target`, returning the current value each frame.
 * Re-runs whenever `target` changes (so it restarts per slide).
 */
export function useCountUp(
  target: number,
  { duration = 1600, delay = 250, instant = false }: Options = {}
): number {
  const [value, setValue] = useState(instant ? target : 0);
  const frame = useRef<number>();
  const startTime = useRef<number>();

  useEffect(() => {
    if (instant) {
      setValue(target);
      return;
    }

    setValue(0);
    startTime.current = undefined;

    const timeout = window.setTimeout(() => {
      const tick = (now: number) => {
        if (startTime.current === undefined) startTime.current = now;
        const elapsed = now - startTime.current;
        const progress = Math.min(elapsed / duration, 1);
        setValue(target * ease(progress));
        if (progress < 1) {
          frame.current = requestAnimationFrame(tick);
        } else {
          setValue(target);
        }
      };
      frame.current = requestAnimationFrame(tick);
    }, delay);

    return () => {
      window.clearTimeout(timeout);
      if (frame.current) cancelAnimationFrame(frame.current);
    };
  }, [target, duration, delay, instant]);

  return value;
}
