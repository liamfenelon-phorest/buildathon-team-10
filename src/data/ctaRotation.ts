/**
 * Feature CTA rotation for the "My Month" reveal.
 *
 * At the end of the reveal we show at most ONE feature CTA:
 *   • Tipping — when the salon hasn't enabled tipping.
 *   • Goals   — when the staff member hasn't set goals.
 *
 * When both apply we alternate month to month so neither nags. Tipping also
 * gets suppressed if ignored for too long, and is retired permanently once the
 * salon actually enables tipping.
 *
 * This module is pure: `selectCta` takes the persisted per-staff state plus
 * this month's inputs and returns the chosen CTA together with the next state
 * to persist. A server endpoint (or DB row) just wraps this — see the schema
 * in the task: last_cta_shown / tipping_consecutive_count /
 * tipping_suppressed_until / tipping_permanently_retired.
 *
 * Months are passed as "YYYY-MM" strings.
 */

export type CtaType = "tipping" | "goals";

/** Persisted per-staff state. Mirrors the server-side schema. */
export interface CtaState {
  last_cta_shown: CtaType | null;
  tipping_consecutive_count: number;
  /** First month tipping is allowed again ("YYYY-MM"), or null. */
  tipping_suppressed_until: string | null;
  tipping_permanently_retired: boolean;
}

export interface CtaInput {
  /** The month being revealed, "YYYY-MM". */
  month: string;
  /** True once the salon has enabled tipping (triggers permanent retirement). */
  tippingEnabled: boolean;
  /** True once the staff member has set goals (Goals CTA stops applying). */
  goalsSet: boolean;
}

export interface CtaDecision {
  cta: CtaType | null;
  state: CtaState;
}

/** Consecutive Tipping months that trip the suppression. */
export const TIPPING_CONSECUTIVE_LIMIT = 3;
/** Months Tipping stays suppressed once tripped. */
export const TIPPING_SUPPRESSION_MONTHS = 2;

export function initialCtaState(): CtaState {
  return {
    last_cta_shown: null,
    tipping_consecutive_count: 0,
    tipping_suppressed_until: null,
    tipping_permanently_retired: false,
  };
}

// --- Month helpers ("YYYY-MM" ⇄ absolute month index) -----------------------

function monthIndex(month: string): number {
  const [y, m] = month.split("-").map(Number);
  return y * 12 + (m - 1);
}

function formatMonth(index: number): string {
  const year = Math.floor(index / 12);
  const month = (index % 12) + 1;
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function addMonths(month: string, n: number): string {
  return formatMonth(monthIndex(month) + n);
}

function isBefore(a: string, b: string): boolean {
  return monthIndex(a) < monthIndex(b);
}

// --- Core selection ---------------------------------------------------------

/**
 * Choose this month's CTA and compute the next persisted state.
 *
 * Precedence: permanent retirement → suppression window → applicability →
 * alternation. Exactly one CTA (or none) is returned, never both.
 */
export function selectCta(state: CtaState, input: CtaInput): CtaDecision {
  const next: CtaState = { ...state };

  // 1. Permanent retirement — once the salon enables tipping, it's gone for good.
  if (input.tippingEnabled) {
    next.tipping_permanently_retired = true;
  }

  const goalsApplies = !input.goalsSet;
  const tippingPossible = !next.tipping_permanently_retired;

  // 2. Suppression window. Clear it once the resume month arrives.
  let suppressed = false;
  if (next.tipping_suppressed_until) {
    if (isBefore(input.month, next.tipping_suppressed_until)) {
      suppressed = true;
    } else {
      next.tipping_suppressed_until = null;
    }
  }

  const tippingAvailable = tippingPossible && !suppressed;

  // 3. Select a single CTA.
  let cta: CtaType | null;
  if (tippingAvailable && goalsApplies) {
    // Both apply → alternate. First time (null) starts with Tipping.
    cta = next.last_cta_shown === "tipping" ? "goals" : "tipping";
  } else if (tippingAvailable) {
    cta = "tipping";
  } else if (goalsApplies) {
    cta = "goals";
  } else {
    cta = null;
  }

  // 4. Update counters.
  if (cta === "tipping") {
    next.tipping_consecutive_count += 1;
    if (next.tipping_consecutive_count >= TIPPING_CONSECUTIVE_LIMIT) {
      // Suppress the next TIPPING_SUPPRESSION_MONTHS months, then resume.
      next.tipping_suppressed_until = addMonths(
        input.month,
        TIPPING_SUPPRESSION_MONTHS + 1,
      );
      next.tipping_consecutive_count = 0;
    }
  } else {
    // Any non-Tipping month breaks the consecutive streak.
    next.tipping_consecutive_count = 0;
  }

  // `last_cta_shown` records the last CTA actually shown, so it survives
  // months where nothing was shown (keeps alternation honest across gaps).
  if (cta !== null) {
    next.last_cta_shown = cta;
  }

  return { cta, state: next };
}
