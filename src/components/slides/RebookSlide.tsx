import { motion } from "framer-motion";
import { SlideShell } from "../SlideShell";
import { AnimatedNumber } from "../AnimatedNumber";
import { popIn, riseIn } from "../motion";
import type { SlideProps } from "../types";

const R = 120;
const CIRC = 2 * Math.PI * R;

export function RebookSlide({ data, theme, active, reducedMotion }: SlideProps) {
  const { rebookedRate, salonRebookAvg } = data.metrics;
  const target = CIRC * (1 - rebookedRate / 100);
  const diff = rebookedRate - salonRebookAvg;

  const headline =
    diff > 0
      ? `${diff} points above your salon average`
      : "Every rebook keeps your column full";
  const caption =
    diff > 0
      ? `Salon average is ${salonRebookAvg}%. That loyalty? That's all you. 💜`
      : "Every client you bring back builds your future. 💜";

  return (
    <SlideShell theme={theme} reducedMotion={reducedMotion}>
      <motion.p className="stat__kicker" variants={riseIn}>
        Your clients keep coming back
      </motion.p>

      <motion.div className="rebook__ring" variants={popIn}>
        <svg viewBox="0 0 280 280" width="260" height="260">
          <circle
            cx="140"
            cy="140"
            r={R}
            fill="none"
            stroke="rgba(255,255,255,0.16)"
            strokeWidth="20"
          />
          <motion.circle
            cx="140"
            cy="140"
            r={R}
            fill="none"
            stroke={theme.accent}
            strokeWidth="20"
            strokeLinecap="round"
            strokeDasharray={CIRC}
            initial={{ strokeDashoffset: CIRC }}
            animate={{ strokeDashoffset: active ? target : CIRC }}
            transition={{
              duration: reducedMotion ? 0 : 1.8,
              ease: [0.22, 1, 0.36, 1],
              delay: 0.3,
            }}
            transform="rotate(-90 140 140)"
          />
        </svg>
        <div className="rebook__center">
          <AnimatedNumber
            className="rebook__pct"
            value={rebookedRate}
            active={active}
            reducedMotion={reducedMotion}
            suffix="%"
            delay={300}
            duration={1800}
          />
          <span className="rebook__label">rebooked</span>
        </div>
      </motion.div>

      <motion.h2 className="stat__headline" variants={riseIn}>
        {headline}
      </motion.h2>

      <motion.p
        className="stat__caption"
        variants={riseIn}
        style={{ color: theme.muted }}
      >
        {caption}
      </motion.p>
    </SlideShell>
  );
}
