/**
 * Hardcoded "Wrapped" data for a single staff member.
 *
 * Numbers are internally consistent:
 *   (serviceSales + retailSales) / clientVisits ≈ averageBill
 *   (68420 + 9860) / 1247 ≈ €62.77  → averageBill 62
 *
 * Colours reference Phorest's tree-named brand palette
 * (see consultation-webapp/app/assets/colors.css):
 *   oak (brand purple) #643582 · brand-teal #0d615d · brand-green #115e59
 *   birch (blue) · fir (green) · chestnut (orange) · brand-yellow #fbbf24
 */

export interface StaffWrapped {
  staffName: string;
  staffFirstName: string;
  salonName: string;
  role: string;
  period: string; // headline period label
  currency: string; // symbol
  metrics: {
    clientVisits: number;
    serviceSales: number;
    retailSales: number;
    averageBill: number;
    tips: number;
    rebookedRate: number; // 0–100 (%)
    salonRebookAvg: number; // salon average for comparison
    topPercentile: number; // "top X% of stylists"
  };
}

export const wrapped: StaffWrapped = {
  staffName: "Jess Murphy",
  staffFirstName: "Jess",
  salonName: "Bloom Hair & Beauty",
  role: "Senior Stylist",
  period: "2025",
  currency: "€",
  metrics: {
    clientVisits: 1247,
    serviceSales: 68420,
    retailSales: 9860,
    averageBill: 62,
    tips: 4215,
    rebookedRate: 73,
    salonRebookAvg: 51,
    topPercentile: 5,
  },
};
