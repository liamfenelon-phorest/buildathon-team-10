/**
 * Seasonality-aware metric comparison for the "My Month" reveal.
 *
 * The "Your Numbers" section compares each metric to a baseline and labels it
 * Great / On track / Room to grow. The baseline depends on how much history a
 * staff member has:
 *
 *   • 12+ months of history → year-over-year (same month, prior year).
 *   • fewer than 12 months  → month-over-month (the immediately prior month).
 *
 * In January and February a small month-over-month decline is softened from
 * "Room to grow" to "On track" to account for seasonally slower trading. That
 * softening is deliberately NOT applied to year-over-year comparisons, where
 * the baseline is already the same (slow) month a year earlier.
 *
 * The logic is metric-agnostic: callers pass a record of numeric values, so it
 * works for service sales, retail sales, client visits, rebook rate, tips,
 * average bill, reviews, etc.
 */

export type ComparisonBasis = "year-over-year" | "month-over-month";

export type PerformanceLabel = "Great" | "On track" | "Room to grow";

/** A single month's snapshot of a staff member's numbers. */
export interface MonthlySnapshot {
  year: number;
  /** 1 = January … 12 = December. */
  month: number;
  metrics: Record<string, number>;
}

export interface MetricComparison {
  metric: string;
  current: number;
  /** Baseline value, or null when no comparable baseline exists. */
  previous: number | null;
  /** Relative change vs. baseline as a percentage; null when no baseline. */
  deltaPct: number | null;
  direction: "up" | "down" | "flat";
  /** Assigned label, or null when there is nothing to compare against. */
  label: PerformanceLabel | null;
  basis: ComparisonBasis;
  /** Human-readable basis shown beside the arrow. */
  basisLabel: string;
  /** True only when slow-month softening changed the label. */
  softened: boolean;
}

// --- Tunable thresholds -----------------------------------------------------

/** A metric must improve by at least this % vs. baseline to read "Great". */
export const GREAT_MIN_PCT = 5;
/** Declines shallower than this (i.e. ≥ this) still read "On track". */
export const ON_TRACK_FLOOR_PCT = -5;
/** In a slow month, declines down to this floor are softened to "On track". */
export const SLOW_MONTH_FLOOR_PCT = -15;
/** Months of history required before switching to year-over-year. */
export const MIN_MONTHS_FOR_YOY = 12;
/** Below this absolute % change a metric is treated as flat. */
const FLAT_EPSILON_PCT = 0.0001;

// --- Pure helpers -----------------------------------------------------------

/** Year-over-year when there's a full year+ of history, else month-over-month. */
export function selectBasis(historyMonths: number): ComparisonBasis {
  return historyMonths >= MIN_MONTHS_FOR_YOY
    ? "year-over-year"
    : "month-over-month";
}

export function basisLabel(basis: ComparisonBasis): string {
  return basis === "year-over-year" ? "vs. last year" : "vs. last month";
}

/** January and February are treated as seasonally slow trading periods. */
export function isSlowMonth(month: number): boolean {
  return month === 1 || month === 2;
}

/** The {year, month} of the baseline a comparison should look up. */
function baselineCoords(
  current: Pick<MonthlySnapshot, "year" | "month">,
  basis: ComparisonBasis,
): { year: number; month: number } {
  if (basis === "year-over-year") {
    return { year: current.year - 1, month: current.month };
  }
  // month-over-month — wrap January back to the prior December.
  const month = current.month === 1 ? 12 : current.month - 1;
  const year = current.month === 1 ? current.year - 1 : current.year;
  return { year, month };
}

/** Find the baseline snapshot for `current`, or null if it's not in history. */
export function findBaseline(
  history: MonthlySnapshot[],
  current: Pick<MonthlySnapshot, "year" | "month">,
  basis: ComparisonBasis,
): MonthlySnapshot | null {
  const { year, month } = baselineCoords(current, basis);
  return (
    history.find((s) => s.year === year && s.month === month) ?? null
  );
}

/** Relative % change; null when the baseline is 0 (undefined ratio). */
export function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

/**
 * Map a delta to a label.
 *
 * @param softeningAllowed whether slow-month softening may apply (the caller
 *   only sets this for month-over-month comparisons in January/February).
 */
export function labelForDelta(
  deltaPct: number,
  softeningAllowed: boolean,
): { label: PerformanceLabel; softened: boolean } {
  if (deltaPct >= GREAT_MIN_PCT) return { label: "Great", softened: false };
  if (deltaPct >= ON_TRACK_FLOOR_PCT) {
    return { label: "On track", softened: false };
  }
  // Decline beyond the normal "On track" band.
  if (softeningAllowed && deltaPct >= SLOW_MONTH_FLOOR_PCT) {
    return { label: "On track", softened: true };
  }
  return { label: "Room to grow", softened: false };
}

// --- Public entry point -----------------------------------------------------

/**
 * Compare every metric in `current` against its seasonality-aware baseline.
 *
 * @param current the month being revealed.
 * @param history prior monthly snapshots (order doesn't matter). Its length
 *   decides year-over-year vs. month-over-month.
 */
export function compareMetrics(
  current: MonthlySnapshot,
  history: MonthlySnapshot[],
): MetricComparison[] {
  const basis = selectBasis(history.length);
  const label = basisLabel(basis);
  const baseline = findBaseline(history, current, basis);
  const softeningAllowed =
    basis === "month-over-month" && isSlowMonth(current.month);

  return Object.keys(current.metrics).map((metric) => {
    const cur = current.metrics[metric];
    const prev =
      baseline && metric in baseline.metrics ? baseline.metrics[metric] : null;
    const deltaPct = prev === null ? null : pctChange(cur, prev);

    if (deltaPct === null) {
      return {
        metric,
        current: cur,
        previous: prev,
        deltaPct: null,
        direction: "flat",
        label: null,
        basis,
        basisLabel: label,
        softened: false,
      };
    }

    const direction =
      deltaPct > FLAT_EPSILON_PCT
        ? "up"
        : deltaPct < -FLAT_EPSILON_PCT
          ? "down"
          : "flat";
    const { label: perfLabel, softened } = labelForDelta(
      deltaPct,
      softeningAllowed,
    );

    return {
      metric,
      current: cur,
      previous: prev,
      deltaPct,
      direction,
      label: perfLabel,
      basis,
      basisLabel: label,
      softened,
    };
  });
}
