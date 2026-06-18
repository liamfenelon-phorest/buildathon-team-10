import { useEffect } from "react";
import { animate, motion, useMotionValue, useTransform } from "framer-motion";

interface Props {
  value: number;
  active: boolean;
  reducedMotion: boolean;
  prefix?: string;
  suffix?: string;
  /** Number of decimals to show. */
  decimals?: number;
  /** Count duration in ms. */
  duration?: number;
  /** Delay before counting starts, in ms. */
  delay?: number;
  className?: string;
}

/**
 * Counts from 0 up to `value` once the slide is active.
 *
 * A MotionValue is rendered straight into the span's text via `useTransform`,
 * so the value commits through Framer Motion's DOM loop (the same path that
 * drives every other animation here) instead of per-frame React state — which
 * keeps it smooth and makes it render reliably, including in headless capture.
 */
export function AnimatedNumber({
  value,
  active,
  reducedMotion,
  prefix = "",
  suffix = "",
  decimals = 0,
  duration = 1600,
  delay = 250,
  className,
}: Props) {
  const count = useMotionValue(0);
  const text = useTransform(count, (v) => {
    const n = v.toLocaleString("en-IE", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
    return `${prefix}${n}${suffix}`;
  });

  useEffect(() => {
    if (!active) {
      count.set(0);
      return;
    }
    if (reducedMotion) {
      count.set(value);
      return;
    }
    count.set(0);
    const controls = animate(count, value, {
      duration: duration / 1000,
      delay: delay / 1000,
      ease: [0.16, 1, 0.3, 1], // easeOutExpo-ish — fast start, gentle settle
    });
    return () => controls.stop();
  }, [active, value, reducedMotion, duration, delay, count]);

  return <motion.span className={className}>{text}</motion.span>;
}
