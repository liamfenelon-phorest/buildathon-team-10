import { useCountUp } from "../hooks/useCountUp";

interface Props {
  value: number;
  active: boolean;
  reducedMotion: boolean;
  prefix?: string;
  suffix?: string;
  /** Number of decimals to show. */
  decimals?: number;
  duration?: number;
  delay?: number;
  className?: string;
}

export function AnimatedNumber({
  value,
  active,
  reducedMotion,
  prefix = "",
  suffix = "",
  decimals = 0,
  duration,
  delay,
  className,
}: Props) {
  // Only count once the slide is active; otherwise sit at 0 (or final if reduced).
  const current = useCountUp(active ? value : 0, {
    duration,
    delay,
    instant: reducedMotion,
  });

  const formatted = current.toLocaleString("en-IE", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return (
    <span className={className}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}
