import {
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { slides } from "./slides";
import { ProgressBars } from "./ProgressBars";
import { slideTransition } from "./motion";
import { wrapped } from "../data/wrapped";
import type { StaffWrapped } from "../data/wrapped";
import { hasLiveConfig, loadWrapped } from "../data/api";
import type { SlideDef } from "./types";

/** Memoised so per-frame progress ticks don't re-render the slide subtree. */
const Slide = memo(function Slide({
  def,
  data,
  active,
  reducedMotion,
  onReplay,
}: {
  def: SlideDef;
  data: StaffWrapped;
  active: boolean;
  reducedMotion: boolean;
  onReplay: () => void;
}) {
  const { Component } = def;
  return (
    <Component
      data={data}
      theme={def.theme}
      active={active}
      reducedMotion={reducedMotion}
      onReplay={onReplay}
    />
  );
});

const HOLD_MS = 180;

export function StoryPlayer() {
  const reduced = useReducedMotion() ?? false;

  // Live data from api-facade when configured; demo data is the initial state
  // so the story renders immediately and offline.
  const [data, setData] = useState<StaffWrapped>(wrapped);
  useEffect(() => {
    if (!hasLiveConfig()) return;
    let cancelled = false;
    loadWrapped()
      .then((live) => {
        if (!cancelled) setData(live);
      })
      .catch((err) => {
        console.error("Failed to load live wrapped data:", err);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  // Optional deep-link (?s=N) to start on a given slide — handy for sharing/QA.
  const startIndex = (() => {
    const s = Number(new URLSearchParams(window.location.search).get("s"));
    return Number.isInteger(s) && s >= 0 && s < slides.length ? s : 0;
  })();
  const [index, setIndex] = useState(startIndex);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);

  const isLast = index === slides.length - 1;

  const go = useCallback((next: number) => {
    setIndex((i) => {
      const clamped = Math.max(0, Math.min(slides.length - 1, next));
      return clamped === i ? i : clamped;
    });
    setProgress(0);
  }, []);

  const next = useCallback(() => go(index + 1), [go, index]);
  const prev = useCallback(() => go(index - 1), [go, index]);
  const replay = useCallback(() => go(0), [go]);

  // Keep pause state in a ref so toggling it doesn't restart the slide timer.
  const pausedRef = useRef(paused);
  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  // ── rAF auto-advance + progress (immune to reduced-motion CSS overrides) ──
  useEffect(() => {
    if (isLast) {
      setProgress(1); // fill the final segment
      return;
    }
    let raf = 0;
    let last = performance.now();
    let elapsed = 0;
    const duration = slides[index].duration;

    const tick = (now: number) => {
      const dt = now - last;
      last = now;
      if (!pausedRef.current) {
        elapsed += dt;
        const p = Math.min(elapsed / duration, 1);
        setProgress(p);
        if (p >= 1) {
          next();
          return;
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [index, isLast, next]);

  // ── keyboard ──
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === " ") {
        e.preventDefault();
        setPaused((p) => !p);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev]);

  // ── pointer: tap to navigate, hold to pause ──
  const holdTimer = useRef<number>();
  const didHold = useRef(false);
  const downX = useRef(0);

  const onPointerDown = (e: React.PointerEvent) => {
    downX.current = e.clientX;
    didHold.current = false;
    holdTimer.current = window.setTimeout(() => {
      didHold.current = true;
      setPaused(true);
    }, HOLD_MS);
  };

  const endHold = () => {
    window.clearTimeout(holdTimer.current);
    if (didHold.current) {
      setPaused(false);
      didHold.current = false;
      return true; // consumed by hold
    }
    return false;
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const wasHold = endHold();
    if (wasHold || isLast) return; // don't hijack taps on the final card
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (x < rect.width * 0.3) prev();
    else next();
  };

  const onPointerLeave = () => {
    endHold();
  };

  return (
    <div className="player">
      <div
        className="player__viewport"
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerLeave}
        onPointerCancel={onPointerLeave}
      >
        <ProgressBars
          count={slides.length}
          current={index}
          progress={progress}
        />

        <div className="player__brand">PHOREST WRAPPED</div>

        <AnimatePresence initial={false}>
          <motion.div
            key={slides[index].id}
            className="player__slide"
            initial={slideTransition.initial}
            animate={slideTransition.animate}
            exit={slideTransition.exit}
            transition={slideTransition.transition}
          >
            <Slide
              def={slides[index]}
              data={data}
              active
              reducedMotion={reduced}
              onReplay={replay}
            />
          </motion.div>
        </AnimatePresence>

        {paused && <div className="player__paused">paused</div>}
      </div>
    </div>
  );
}
