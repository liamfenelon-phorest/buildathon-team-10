import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { stagger } from "./motion";
import type { SlideTheme } from "./types";

function Blobs({
  colors,
  reduced,
}: {
  colors: SlideTheme["shapes"];
  reduced: boolean;
}) {
  const blobs = [
    { c: colors[0], size: 320, top: "-8%", left: "-18%", dur: 13 },
    { c: colors[1], size: 240, top: "62%", left: "58%", dur: 17 },
    { c: colors[2], size: 180, top: "30%", left: "70%", dur: 11 },
  ];
  return (
    <div className="slide__blobs" aria-hidden>
      {blobs.map((b, i) => (
        <motion.span
          key={i}
          className="slide__blob"
          style={{
            width: b.size,
            height: b.size,
            top: b.top,
            left: b.left,
            background: `radial-gradient(circle at 30% 30%, ${b.c}, transparent 70%)`,
          }}
          animate={
            reduced
              ? undefined
              : {
                  y: [0, -26, 0],
                  x: [0, 18, 0],
                  scale: [1, 1.12, 1],
                }
          }
          transition={{
            duration: b.dur,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

export function SlideShell({
  theme,
  reducedMotion,
  children,
}: {
  theme: SlideTheme;
  reducedMotion: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className="slide"
      style={{ background: theme.background, color: theme.text }}
    >
      <Blobs colors={theme.shapes} reduced={reducedMotion} />
      <div className="slide__grain" aria-hidden />
      <motion.div
        className="slide__content"
        variants={stagger}
        initial="hidden"
        animate="show"
      >
        {children}
      </motion.div>
    </div>
  );
}
