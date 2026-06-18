import { describe, it, expect } from "vitest";
import {
  selectCta,
  initialCtaState,
  type CtaState,
  type CtaInput,
} from "./ctaRotation";

/** Run a sequence of months, threading state through. Returns the CTA list. */
function run(start: CtaState, months: CtaInput[]): {
  ctas: (string | null)[];
  state: CtaState;
} {
  let state = start;
  const ctas: (string | null)[] = [];
  for (const input of months) {
    const decision = selectCta(state, input);
    ctas.push(decision.cta);
    state = decision.state;
  }
  return { ctas, state };
}

const bothApply = (month: string): CtaInput => ({
  month,
  tippingEnabled: false,
  goalsSet: false,
});

// Only Tipping applies: salon hasn't enabled tipping, staff HAS set goals.
const onlyTipping = (month: string): CtaInput => ({
  month,
  tippingEnabled: false,
  goalsSet: true,
});

describe("CTA rotation — alternation when both apply", () => {
  it("(a) both apply, first month → Tipping", () => {
    const { cta } = selectCta(initialCtaState(), bothApply("2026-01"));
    expect(cta).toBe("tipping");
  });

  it("(b) both apply, second month → Goals", () => {
    const { ctas } = run(initialCtaState(), [
      bothApply("2026-01"),
      bothApply("2026-02"),
    ]);
    expect(ctas).toEqual(["tipping", "goals"]);
  });

  it("keeps alternating across several months", () => {
    const { ctas } = run(initialCtaState(), [
      bothApply("2026-01"),
      bothApply("2026-02"),
      bothApply("2026-03"),
      bothApply("2026-04"),
    ]);
    expect(ctas).toEqual(["tipping", "goals", "tipping", "goals"]);
  });
});

describe("CTA rotation — tipping suppression", () => {
  it("(c) tipping shown 3 consecutive months, no action → 4th month shows Goals", () => {
    const { ctas } = run(initialCtaState(), [
      onlyTipping("2026-01"), // tipping (count 1)
      onlyTipping("2026-02"), // tipping (count 2)
      onlyTipping("2026-03"), // tipping (count 3 → suppress Apr–May)
      bothApply("2026-04"), // tipping suppressed → Goals
    ]);
    expect(ctas).toEqual(["tipping", "tipping", "tipping", "goals"]);
  });

  it("(d) tipping shown 3 months, suppressed 2 months, then resumes", () => {
    const { ctas, state } = run(initialCtaState(), [
      onlyTipping("2026-01"), // tipping
      onlyTipping("2026-02"), // tipping
      onlyTipping("2026-03"), // tipping → suppress
      onlyTipping("2026-04"), // suppressed, nothing else applies → null
      onlyTipping("2026-05"), // still suppressed → null
      onlyTipping("2026-06"), // suppression lifted → tipping resumes
    ]);
    expect(ctas).toEqual([
      "tipping",
      "tipping",
      "tipping",
      null,
      null,
      "tipping",
    ]);
    // Suppression window was cleared once we resumed.
    expect(state.tipping_suppressed_until).toBeNull();
    expect(state.tipping_consecutive_count).toBe(1);
  });
});

describe("CTA rotation — permanent retirement", () => {
  it("(e) tipping enabled mid-stream → Goals shown from next month onward", () => {
    const { ctas, state } = run(initialCtaState(), [
      bothApply("2026-01"), // tipping
      // Salon enables tipping before month 2's reveal:
      { month: "2026-02", tippingEnabled: true, goalsSet: false }, // goals
      bothApply("2026-03"), // tipping no longer possible → goals
      bothApply("2026-04"), // → goals
    ]);
    expect(ctas).toEqual(["tipping", "goals", "goals", "goals"]);
    expect(state.tipping_permanently_retired).toBe(true);
  });
});
