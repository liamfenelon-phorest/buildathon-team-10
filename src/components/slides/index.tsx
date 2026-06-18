import type { SlideDef, SlideTheme } from "../types";
import { IntroSlide } from "./IntroSlide";
import { StatSlide } from "./StatSlide";
import { RebookSlide } from "./RebookSlide";
import { SummarySlide } from "./SummarySlide";

const light = "rgba(255,255,255,0.78)";

const themes: Record<string, SlideTheme> = {
  intro: {
    background: "linear-gradient(160deg, #7a45a0 0%, #643582 45%, #3d1f52 100%)",
    accent: "#fbbf24",
    text: "#ffffff",
    muted: light,
    shapes: ["#fbbf24", "#b98fd6", "#0d615d"],
  },
  visits: {
    background: "linear-gradient(160deg, #0a8fc0 0%, #00739e 45%, #0c4a6e 100%)",
    accent: "#7fcde9",
    text: "#ffffff",
    muted: light,
    shapes: ["#7fcde9", "#fbbf24", "#ffffff"],
  },
  service: {
    background: "linear-gradient(160deg, #149a73 0%, #115e59 50%, #065f46 100%)",
    accent: "#7fe9c4",
    text: "#ffffff",
    muted: light,
    shapes: ["#2ecc71", "#fbbf24", "#7fcde9"],
  },
  retail: {
    background: "linear-gradient(160deg, #ffae5e 0%, #fb7c00 45%, #92400e 100%)",
    accent: "#fff1dc",
    text: "#2a1300",
    muted: "rgba(42,19,0,0.7)",
    shapes: ["#ffd5ac", "#ffffff", "#fbbf24"],
  },
  bill: {
    background: "linear-gradient(160deg, #3a4658 0%, #282f3c 55%, #11151c 100%)",
    accent: "#7fcde9",
    text: "#ffffff",
    muted: light,
    shapes: ["#7484a0", "#7fcde9", "#fbbf24"],
  },
  tips: {
    background: "linear-gradient(160deg, #ffe27a 0%, #fbbf24 45%, #d97706 100%)",
    accent: "#7c3a00",
    text: "#3a2300",
    muted: "rgba(58,35,0,0.72)",
    shapes: ["#ffffff", "#ffd5ac", "#fb7c00"],
  },
  rebook: {
    background: "linear-gradient(160deg, #8a52b3 0%, #643582 45%, #2f1640 100%)",
    accent: "#fbbf24",
    text: "#ffffff",
    muted: light,
    shapes: ["#fbbf24", "#b98fd6", "#7fcde9"],
  },
  summary: {
    background: "linear-gradient(165deg, #2a1640 0%, #160b22 55%, #0a0610 100%)",
    accent: "#fbbf24",
    text: "#ffffff",
    muted: light,
    shapes: ["#643582", "#0d615d", "#fb7c00"],
  },
};

export const slides: SlideDef[] = [
  {
    id: "intro",
    duration: 4500,
    theme: themes.intro,
    Component: IntroSlide,
  },
  {
    id: "visits",
    duration: 6000,
    theme: themes.visits,
    Component: (p) => (
      <StatSlide
        {...p}
        kicker="You welcomed"
        value={p.data.metrics.clientVisits}
        suffix=""
        headline="clients through your chair"
        caption="That's about 24 happy faces every single week. 🌿"
        glyph="👀"
      />
    ),
  },
  {
    id: "service",
    duration: 6000,
    theme: themes.service,
    Component: (p) => (
      <StatSlide
        {...p}
        kicker="Your services brought in"
        value={p.data.metrics.serviceSales}
        prefix={p.data.currency}
        headline="in service sales"
        caption="Cuts, colours, blow-dries — your craft, paying off. ✂️"
        glyph="✂️"
      />
    ),
  },
  {
    id: "retail",
    duration: 6000,
    theme: themes.retail,
    Component: (p) => (
      <StatSlide
        {...p}
        kicker="And you sold"
        value={p.data.metrics.retailSales}
        prefix={p.data.currency}
        headline="in retail products"
        caption="Every recommendation your clients trusted you on. 🛍️"
        glyph="🛍️"
      />
    ),
  },
  {
    id: "bill",
    duration: 6000,
    theme: themes.bill,
    Component: (p) => (
      <StatSlide
        {...p}
        kicker="Your average bill was"
        value={p.data.metrics.averageBill}
        prefix={p.data.currency}
        headline="per visit"
        caption="Premium service, premium value — every appointment. 🧾"
        glyph="🧾"
      />
    ),
  },
  {
    id: "tips",
    duration: 6000,
    theme: themes.tips,
    Component: (p) => (
      <StatSlide
        {...p}
        kicker="Clients tipped you"
        value={p.data.metrics.tips}
        prefix={p.data.currency}
        headline="in tips this year"
        caption="A little thank-you, over a thousand times over. 💛"
        glyph="💛"
      />
    ),
  },
  {
    id: "rebook",
    duration: 7000,
    theme: themes.rebook,
    Component: RebookSlide,
  },
  {
    id: "summary",
    duration: 99000, // effectively no auto-advance on the final card
    theme: themes.summary,
    Component: SummarySlide,
  },
];
