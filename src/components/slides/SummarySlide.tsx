import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";
import { SlideShell } from "../SlideShell";
import { popIn, riseIn, stagger } from "../motion";
import type { SlideProps } from "../types";

const PHOREST_COLORS = ["#643582", "#0d615d", "#fbbf24", "#00739e", "#fb7c00"];

export function SummarySlide({
  data,
  theme,
  active,
  reducedMotion,
  onReplay,
}: SlideProps) {
  const { currency, metrics } = data;
  const fired = useRef(false);
  const [toast, setToast] = useState<string | null>(null);

  const money = (n: number) =>
    `${currency}${n.toLocaleString("en-IE")}`;

  const rows: { icon: string; label: string; value: string }[] = [
    { icon: "👀", label: "Client visits", value: metrics.clientVisits.toLocaleString("en-IE") },
    { icon: "✂️", label: "Service sales", value: money(metrics.serviceSales) },
    { icon: "🛍️", label: "Retail sales", value: money(metrics.retailSales) },
    { icon: "🧾", label: "Average bill", value: money(metrics.averageBill) },
    { icon: "💛", label: "Tips earned", value: money(metrics.tips) },
    { icon: "🔁", label: "Rebooked", value: `${metrics.rebookedRate}%` },
  ];

  useEffect(() => {
    if (!active || fired.current || reducedMotion) return;
    fired.current = true;
    const burst = (x: number) =>
      confetti({
        particleCount: 70,
        spread: 70,
        origin: { x, y: 0.35 },
        colors: PHOREST_COLORS,
        scalar: 0.9,
        disableForReducedMotion: true,
      });
    burst(0.3);
    const t = window.setTimeout(() => burst(0.7), 300);
    return () => window.clearTimeout(t);
  }, [active, reducedMotion]);

  const shareText =
    `${data.staffFirstName}'s ${data.period} Wrapped at ${data.salonName} ✨\n` +
    rows.map((r) => `${r.icon} ${r.label}: ${r.value}`).join("\n") +
    `\n🏆 Top ${metrics.topPercentile}% of stylists! #PhorestWrapped`;

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: "My Phorest Wrapped", text: shareText });
        return;
      }
      await navigator.clipboard.writeText(shareText);
      setToast("Copied to clipboard ✓");
    } catch {
      setToast("Couldn't share — try a screenshot 📸");
    }
    window.setTimeout(() => setToast(null), 2400);
  };

  return (
    <SlideShell theme={theme} reducedMotion={reducedMotion}>
      <motion.p className="summary__title" variants={popIn}>
        {data.staffFirstName}'s {data.period}, Wrapped
      </motion.p>

      <motion.div className="summary__badge" variants={popIn}>
        🏆 Top {metrics.topPercentile}% of stylists
      </motion.div>

      <motion.ul
        className="summary__list"
        variants={stagger}
        initial="hidden"
        animate="show"
      >
        {rows.map((r) => (
          <motion.li key={r.label} className="summary__row" variants={riseIn}>
            <span className="summary__icon" aria-hidden>
              {r.icon}
            </span>
            <span className="summary__label">{r.label}</span>
            <span className="summary__rowvalue">{r.value}</span>
          </motion.li>
        ))}
      </motion.ul>

      <motion.div className="summary__actions" variants={riseIn}>
        <button className="btn btn--solid" onClick={handleShare}>
          Share
        </button>
        <button className="btn btn--ghost" onClick={onReplay}>
          Replay
        </button>
      </motion.div>

      <motion.p className="summary__foot" variants={riseIn}>
        Powered by Phorest
      </motion.p>

      {toast && <div className="summary__toast">{toast}</div>}
    </SlideShell>
  );
}
