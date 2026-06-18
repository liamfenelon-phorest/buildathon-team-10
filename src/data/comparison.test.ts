import { describe, it, expect } from "vitest";
import {
  compareMetrics,
  type MonthlySnapshot,
} from "./comparison";

/**
 * Build `count` consecutive monthly snapshots ending the month BEFORE
 * (endYear, endMonth), counting backwards. Each snapshot carries a single
 * `serviceSales` metric fixed at `baseValue` so tests can dial the current
 * month's value to produce a precise delta.
 */
function buildHistory(
  endYear: number,
  endMonth: number,
  count: number,
  baseValue = 100,
): MonthlySnapshot[] {
  const out: MonthlySnapshot[] = [];
  let year = endYear;
  let month = endMonth;
  for (let i = 0; i < count; i++) {
    // step one month back
    month -= 1;
    if (month === 0) {
      month = 12;
      year -= 1;
    }
    out.push({ year, month, metrics: { serviceSales: baseValue } });
  }
  return out;
}

function current(
  year: number,
  month: number,
  serviceSales: number,
): MonthlySnapshot {
  return { year, month, metrics: { serviceSales } };
}

const pick = (rows: ReturnType<typeof compareMetrics>) =>
  rows.find((r) => r.metric === "serviceSales")!;

describe("compareMetrics — basis selection by history length", () => {
  it("(a) 14 months of history in March → year-over-year", () => {
    // 14 months ending before March 2026 → spans Jan 2025 … Feb 2026,
    // which includes the March 2025 baseline.
    const history = buildHistory(2026, 3, 14, 100);
    const result = compareMetrics(current(2026, 3, 110), history);
    const row = pick(result);

    expect(row.basis).toBe("year-over-year");
    expect(row.basisLabel).toBe("vs. last year");
    expect(row.previous).toBe(100); // March 2025
    expect(row.deltaPct).toBeCloseTo(10);
    expect(row.direction).toBe("up");
    expect(row.label).toBe("Great"); // +10% ≥ +5%
    expect(row.softened).toBe(false);
  });

  it("(b) 6 months of history in March → month-over-month, no softening", () => {
    // 6 months ending before March 2026 → spans Sep 2025 … Feb 2026,
    // so the February 2026 baseline is present.
    const history = buildHistory(2026, 3, 6, 100);
    const result = compareMetrics(current(2026, 3, 110), history);
    const row = pick(result);

    expect(row.basis).toBe("month-over-month");
    expect(row.basisLabel).toBe("vs. last month");
    expect(row.previous).toBe(100); // February 2026
    expect(row.deltaPct).toBeCloseTo(10);
    expect(row.label).toBe("Great");
    expect(row.softened).toBe(false);
  });
});

describe("compareMetrics — slow-month softening (month-over-month)", () => {
  it("(c) 6 months of history in January, 10% decline → softened to On track", () => {
    // 6 months ending before Jan 2026 → spans Jul 2025 … Dec 2025,
    // so the December 2025 baseline is present.
    const history = buildHistory(2026, 1, 6, 100);
    const result = compareMetrics(current(2026, 1, 90), history);
    const row = pick(result);

    expect(row.basis).toBe("month-over-month");
    expect(row.deltaPct).toBeCloseTo(-10);
    expect(row.direction).toBe("down");
    // Without softening a -10% decline would read "Room to grow";
    // January softening lifts it to "On track".
    expect(row.label).toBe("On track");
    expect(row.softened).toBe(true);
  });

  it("(d) 6 months of history in January, 20% decline → Room to grow", () => {
    const history = buildHistory(2026, 1, 6, 100);
    const result = compareMetrics(current(2026, 1, 80), history);
    const row = pick(result);

    expect(row.basis).toBe("month-over-month");
    expect(row.deltaPct).toBeCloseTo(-20);
    // -20% is beyond the -15% slow-month floor, so softening does not save it.
    expect(row.label).toBe("Room to grow");
    expect(row.softened).toBe(false);
  });
});

describe("compareMetrics — softening never applies to year-over-year", () => {
  it("14 months of history in January, 10% decline → Room to grow (not softened)", () => {
    const history = buildHistory(2026, 1, 14, 100); // includes Jan 2025
    const result = compareMetrics(current(2026, 1, 90), history);
    const row = pick(result);

    expect(row.basis).toBe("year-over-year");
    expect(row.deltaPct).toBeCloseTo(-10);
    // YoY baseline is already the same slow month last year — no softening.
    expect(row.label).toBe("Room to grow");
    expect(row.softened).toBe(false);
  });
});
