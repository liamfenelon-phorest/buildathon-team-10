import type { StaffWrapped } from "../data/wrapped";

export interface SlideTheme {
  /** Full-bleed background (CSS gradient). */
  background: string;
  /** Primary accent colour used for highlights. */
  accent: string;
  /** Main text colour. */
  text: string;
  /** Muted text colour. */
  muted: string;
  /** Colours for the floating decorative blobs. */
  shapes: [string, string, string];
}

export interface SlideProps {
  data: StaffWrapped;
  active: boolean;
  reducedMotion: boolean;
  theme: SlideTheme;
  /** Restart the story from the first slide (used by the summary). */
  onReplay: () => void;
}

export interface SlideDef {
  id: string;
  /** Auto-advance duration in ms. */
  duration: number;
  theme: SlideTheme;
  Component: (props: SlideProps) => JSX.Element;
}
