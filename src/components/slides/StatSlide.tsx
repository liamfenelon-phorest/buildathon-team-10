import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { SlideShell } from "../SlideShell";
import { AnimatedNumber } from "../AnimatedNumber";
import { popIn, riseIn } from "../motion";
import type { SlideTheme } from "../types";

export interface StatSlideConfig {
  kicker: string;
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  headline: ReactNode;
  caption: ReactNode;
  /** Large faint glyph behind the content. */
  glyph: string;
}

interface Props extends StatSlideConfig {
  active: boolean;
  reducedMotion: boolean;
  theme: SlideTheme;
}

export function StatSlide({
  active,
  reducedMotion,
  theme,
  kicker,
  value,
  prefix,
  suffix,
  decimals,
  headline,
  caption,
  glyph,
}: Props) {
  return (
    <SlideShell theme={theme} reducedMotion={reducedMotion}>
      <span className="stat__glyph" aria-hidden style={{ color: theme.accent }}>
        {glyph}
      </span>

      <motion.p className="stat__kicker" variants={riseIn}>
        {kicker}
      </motion.p>

      <motion.div variants={popIn} className="stat__value">
        <AnimatedNumber
          value={value}
          active={active}
          reducedMotion={reducedMotion}
          prefix={prefix}
          suffix={suffix}
          decimals={decimals}
        />
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
