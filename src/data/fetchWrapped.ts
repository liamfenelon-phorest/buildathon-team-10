/**
 * Live data loader for Phorest Wrapped.
 *
 * Pulls a staff member's month-to-date performance from the api-facade
 * `staffPerformance` GraphQL query and maps it into the `StaffWrapped` shape
 * the slides already consume. If the app isn't configured (no token), or the
 * request fails, callers fall back to the hardcoded demo persona.
 *
 * Query lives in api-facade: src/staff-performance/* → proxies to
 * account-reports-service /business/{businessId}/user/{userId}/report.
 */
import { wrapped as fallback, type StaffWrapped } from "./wrapped";

const QUERY = /* GraphQL */ `
  query Wrapped($options: StaffPerformanceOptions!, $tz: String!, $staffId: ID) {
    staffPerformance(options: $options, timeZone: $tz, staffId: $staffId) {
      startDate
      endDate
      defaultCurrency
      tipAmount {
        amount
      }
      clientVisitsStats {
        totalCount
      }
      rebookStats {
        totalCount
        totalPercentage
      }
      averageRevenueStats {
        totalAmount {
          amount
        }
      }
      retailRevenueStats {
        total {
          totalAmount {
            amount
          }
        }
      }
      serviceAndCoursesRevenueStats {
        total {
          totalAmount {
            amount
          }
        }
      }
    }
  }
`;

const CURRENCY_SYMBOLS: Record<string, string> = {
  EUR: "€",
  GBP: "£",
  USD: "$",
  AUD: "$",
  CAD: "$",
  NZD: "$",
  ZAR: "R",
  CHF: "CHF ",
};

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function currencySymbol(code?: string): string {
  if (!code) return fallback.currency;
  return CURRENCY_SYMBOLS[code] ?? `${code} `;
}

/** Parse an API string number. The API uses "-" for "no data" → treat as 0. */
function num(value?: string | null): number {
  if (value == null) return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function periodLabel(preset: Preset, iso?: string): string {
  if (!iso) return fallback.period;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return fallback.period;
  switch (preset) {
    case "YEAR_TO_DATE":
      return `${d.getFullYear()}`;
    case "WEEK_TO_DATE":
      return "This Week";
    case "TODAY":
      return "Today";
    case "MONTH_TO_DATE":
    default:
      return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  }
}

type Preset =
  | "TODAY"
  | "WEEK_TO_DATE"
  | "MONTH_TO_DATE"
  | "YEAR_TO_DATE";

export interface WrappedConfig {
  apiUrl: string;
  token: string;
  businessId: string;
  userId: string;
  staffId?: string;
  timeZone: string;
  preset: Preset;
  staffName?: string;
  salonName?: string;
}

/** Read config from Vite env. Returns null if the essentials are missing. */
export function readConfig(): WrappedConfig | null {
  const env = import.meta.env;
  const token = env.VITE_WRAPPED_TOKEN as string | undefined;
  const businessId = env.VITE_WRAPPED_BUSINESS_ID as string | undefined;
  const userId = env.VITE_WRAPPED_USER_ID as string | undefined;

  if (!token || !businessId || !userId) return null;

  return {
    // Default to a relative path served through the Vite dev proxy (no CORS).
    apiUrl: (env.VITE_WRAPPED_API_URL as string) || "/api-facade/graphql",
    token: token.replace(/^Bearer\s+/i, ""),
    businessId,
    userId,
    staffId: (env.VITE_WRAPPED_STAFF_ID as string) || undefined,
    timeZone: (env.VITE_WRAPPED_TIMEZONE as string) || "Europe/Dublin",
    preset: ((env.VITE_WRAPPED_PRESET as string) || "MONTH_TO_DATE") as Preset,
    staffName: (env.VITE_WRAPPED_STAFF_NAME as string) || undefined,
    salonName: (env.VITE_WRAPPED_SALON_NAME as string) || undefined,
  };
}

export interface WrappedResult {
  data: StaffWrapped;
  live: boolean;
}

/**
 * Fetch month-to-date staff performance and map it to `StaffWrapped`.
 * Resolves to the hardcoded fallback (live: false) when unconfigured;
 * throws on transport/GraphQL errors so the caller can fall back too.
 */
export async function fetchWrapped(): Promise<WrappedResult> {
  const cfg = readConfig();
  if (!cfg) return { data: fallback, live: false };

  const res = await fetch(cfg.apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${cfg.token}`,
      "x-memento-security-context": `${cfg.businessId}||${cfg.userId}`,
    },
    body: JSON.stringify({
      query: QUERY,
      variables: {
        tz: cfg.timeZone,
        staffId: cfg.staffId ?? null,
        options: { preset: cfg.preset },
      },
    }),
  });

  if (!res.ok) throw new Error(`Wrapped API responded ${res.status}`);

  const json = await res.json();
  if (json.errors?.length) {
    throw new Error(json.errors[0]?.message ?? "GraphQL error");
  }

  const sp = json.data?.staffPerformance;
  if (!sp) throw new Error("No staffPerformance in response");

  const staffName = cfg.staffName ?? fallback.staffName;

  const data: StaffWrapped = {
    staffName,
    staffFirstName: staffName.split(" ")[0],
    salonName: cfg.salonName ?? fallback.salonName,
    role: fallback.role,
    period: periodLabel(cfg.preset, sp.startDate),
    currency: currencySymbol(sp.defaultCurrency),
    metrics: {
      clientVisits: num(sp.clientVisitsStats?.totalCount),
      serviceSales: num(sp.serviceAndCoursesRevenueStats?.total?.totalAmount?.amount),
      retailSales: num(sp.retailRevenueStats?.total?.totalAmount?.amount),
      averageBill: num(sp.averageRevenueStats?.totalAmount?.amount),
      tips: num(sp.tipAmount?.amount),
      rebookedRate: Math.round(num(sp.rebookStats?.totalPercentage)),
      // Not exposed by staffPerformance — kept as configurable demo values.
      salonRebookAvg: fallback.metrics.salonRebookAvg,
      topPercentile: fallback.metrics.topPercentile,
    },
  };

  return { data, live: true };
}
