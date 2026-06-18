import { motion } from "framer-motion";
import { SlideShell } from "../SlideShell";
import { popIn, riseIn } from "../motion";
import type { SlideProps } from "../types";

export function IntroSlide({ data, theme, reducedMotion }: SlideProps) {
  return (
    <SlideShell theme={theme} reducedMotion={reducedMotion}>
      <motion.p className="intro__salon" variants={riseIn}>
        {data.salonName}
      </motion.p>

      <motion.div variants={popIn} className="intro__year">
        {data.period}
      </motion.div>

      <motion.h1 className="intro__wrapped" variants={popIn}>
        WRAPPED
      </motion.h1>

      <motion.p className="intro__hello" variants={riseIn}>
        {data.staffFirstName}, here's your year through the chair.
      </motion.p>

      <motion.div
        className="intro__hint"
        variants={riseIn}
        animate={
          reducedMotion ? undefined : { opacity: [0.5, 1, 0.5] }
        }
        transition={{ duration: 1.8, repeat: Infinity }}
      >
        Tap to begin →
      </motion.div>
    </SlideShell>
  );
}
