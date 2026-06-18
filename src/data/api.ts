/**
 * Live data layer: pulls a staff member's purchases from api-facade and maps
 * them into the {@link StaffWrapped} shape the story slides consume.
 *
 * api-facade is a GraphQL server (https://github.com/phorest/api-facade).
 * The query we use is `purchases` — internally the resolver is named
 * `getPurchases` (src/purchases/purchases.queries.ts). It takes a top-level
 * `branchId` and a `filterBy.staffMemberId` (the "staffId").
 *
 * Auth is "direct fetch + pasted token": supply a bearer token and business
 * scope via Vite env vars (.env.local). When they're absent we fall back to
 * the hardcoded demo data in ./wrapped, so the app still runs offline.
 *
 *   VITE_API_FACADE_URL     e.g. https://api-gateway-dev.phorest.com/api-facade/graphql
 *   VITE_API_TOKEN          access token from auth-service (no "Bearer " prefix)
 *   VITE_BUSINESS_ID        business id (decoded from the token)
 *   VITE_BRANCH_ID          the branch to scope to
 *   VITE_STAFF_ID           the staff member whose numbers we want
 *   VITE_USER_ID            (optional) user id for the business scope header
 *   VITE_STAFF_NAME         (optional) display name override
 *   VITE_SALON_NAME         (optional) salon name override
 *   VITE_PERIOD             (optional) headline period label, e.g. "2025"
 *   VITE_CURRENCY           (optional) currency symbol, defaults to "€"
 */

import { wrapped as demoWrapped, type StaffWrapped } from "./wrapped";

interface ApiConfig {
  url: string;
  token: string;
  businessId: string;
  branchId: string;
  staffId: string;
  userId: string;
  staffName?: string;
  salonName?: string;
  period?: string;
  currency?: string;
  /** Inclusive date range (YYYY-MM-DD) to filter purchases by, client-side. */
  startDate?: string;
  endDate?: string;
}

function readConfig(): ApiConfig | null {
  const env = import.meta.env;
  const url = env.VITE_API_FACADE_URL;
  const token = env.VITE_API_TOKEN;
  const businessId = env.VITE_BUSINESS_ID;
  const branchId = env.VITE_BRANCH_ID;
  const staffId = env.VITE_STAFF_ID;

  if (!url || !token || !businessId || !branchId || !staffId) return null;

  const period = env.VITE_PERIOD;
  // Explicit range wins; otherwise, if the period is a plain year (e.g. "2025"),
  // default to that whole calendar year.
  const yearMatch = period?.trim().match(/^(\d{4})$/);
  const startDate =
    env.VITE_START_DATE ?? (yearMatch ? `${yearMatch[1]}-01-01` : undefined);
  const endDate =
    env.VITE_END_DATE ?? (yearMatch ? `${yearMatch[1]}-12-31` : undefined);

  return {
    url,
    token,
    businessId,
    branchId,
    staffId,
    userId: env.VITE_USER_ID ?? "",
    staffName: env.VITE_STAFF_NAME,
    salonName: env.VITE_SALON_NAME,
    period,
    currency: env.VITE_CURRENCY,
    startDate,
    endDate,
  };
}

/**
 * Keeps only purchases whose date falls within the configured range. The
 * scalar is a local date-time (e.g. "2025-03-14T10:30:00"); comparing the
 * leading YYYY-MM-DD lexicographically is correct and timezone-agnostic.
 */
function withinRange(node: PurchaseNode, cfg: ApiConfig): boolean {
  if (!cfg.startDate && !cfg.endDate) return true;
  const day = (node.purchasedAtDateTime ?? "").slice(0, 10);
  if (!day) return false;
  if (cfg.startDate && day < cfg.startDate) return false;
  if (cfg.endDate && day > cfg.endDate) return false;
  return true;
}

/** Whether the app has enough config to attempt a live fetch. */
export const hasLiveConfig = (): boolean => readConfig() !== null;

// ── GraphQL ────────────────────────────────────────────────────────────────

/** POST a GraphQL operation, throwing on HTTP or GraphQL errors. */
async function postGraphQL<T>(
  cfg: ApiConfig,
  query: string,
  variables: Record<string, unknown>,
): Promise<T> {
  const res = await fetch(cfg.url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${cfg.token}`,
      // Business scope: "businessId|branchId|userId" (split on "|" in
      // api-facade's context.ts). api-facade reads either
      // x-memento-security-context or x-security-business-scope.
      "x-memento-security-context": `${cfg.businessId}|${cfg.branchId}|${cfg.userId}`,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) {
    throw new Error(`api-facade responded ${res.status} ${res.statusText}`);
  }

  const json = await res.json();
  if (json.errors?.length) {
    throw new Error(
      `GraphQL error: ${json.errors.map((e: any) => e.message).join("; ")}`,
    );
  }
  return json.data as T;
}

// We query `items` rather than `receiptItems`: receiptItems triggers a
// server-side resolver error on some data, and items carries the same
// per-line staffName/type/amount we need for per-staff attribution.
const PURCHASES_QUERY = /* GraphQL */ `
  query StaffPurchases(
    $branchId: ID!
    $staffMemberId: ID!
    $first: Int!
    $after: String
  ) {
    purchases(
      branchId: $branchId
      first: $first
      after: $after
      filterBy: { staffMemberId: $staffMemberId }
    ) {
      totalCount
      pageInfo {
        endCursor
        hasNextPage
      }
      edges {
        node {
          id
          purchasedAtDateTime
          clientId
          tips {
            staffMemberId
            tipAmount
          }
          items {
            purchaseItemType
            staffName
            totalAmount {
              amount
              currency
            }
          }
        }
      }
    }
  }
`;

const STAFF_QUERY = /* GraphQL */ `
  query StaffName($id: ID!) {
    staff(id: $id) {
      firstName
      lastName
      branch {
        name
      }
    }
  }
`;

interface PurchaseNode {
  id: string;
  purchasedAtDateTime: string;
  clientId?: string;
  tips: { staffMemberId: string; tipAmount: string }[];
  items: {
    purchaseItemType: string;
    staffName?: string;
    totalAmount: { amount: string; currency?: string };
  }[];
}

interface StaffInfo {
  firstName: string;
  lastName: string;
  fullName: string;
  branchName?: string;
}

// The core REST layer caps page size (first: 100 is rejected as "Invalid
// number of results requested"); 50 is the largest value that works.
const PAGE_SIZE = 50;

/** Resolve the staff member's display name (items only carry staffName). */
async function fetchStaffInfo(cfg: ApiConfig): Promise<StaffInfo | null> {
  const data = await postGraphQL<{
    staff: { firstName: string; lastName: string; branch?: { name?: string } };
  }>(cfg, STAFF_QUERY, { id: cfg.staffId });
  if (!data?.staff) return null;
  const { firstName, lastName, branch } = data.staff;
  return {
    firstName,
    lastName,
    fullName: `${firstName} ${lastName}`.trim(),
    branchName: branch?.name,
  };
}

async function fetchAllPurchases(cfg: ApiConfig): Promise<PurchaseNode[]> {
  const nodes: PurchaseNode[] = [];
  let after: string | undefined;

  // api-facade has no date-range filter (only an exact-day `date`), so to get a
  // full period we page through every purchase for the staff member.
  for (let guard = 0; guard < 1000; guard++) {
    const data = await postGraphQL<{
      purchases?: {
        edges?: { node: PurchaseNode }[];
        pageInfo?: { endCursor?: string; hasNextPage?: boolean };
      };
    }>(cfg, PURCHASES_QUERY, {
      branchId: cfg.branchId,
      staffMemberId: cfg.staffId,
      first: PAGE_SIZE,
      after,
    });

    const conn = data?.purchases;
    if (!conn) break;

    for (const edge of conn.edges ?? []) nodes.push(edge.node);

    if (!conn.pageInfo?.hasNextPage) break;
    after = conn.pageInfo.endCursor;
  }

  return nodes;
}

// ── Mapping ──────────────────────────────────────────────────────────────--

const num = (s: string | undefined): number => {
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
};

/**
 * Item-type classification for the two sales buckets, based on the item types
 * seen in live data:
 *
 *  - Retail: physical products (incl. reward products).
 *  - Non-sale (excluded): deposits and balance payments are prepayments that
 *    also show up as their own SERVICE line when delivered — counting them
 *    would double-count. Vouchers (gift cards) and membership sales aren't a
 *    stylist's service/retail revenue.
 *  - Service: everything else (SERVICE, PACKAGE_ITEM, COURSE, COURSE_SESSION,
 *    EXTRA_APPOINTMENT_COST, SPECIAL_OFFER_ITEM, OPEN_SALE, rewards, …).
 *    Defaulting unknown types to service is deliberate — services dominate and
 *    it's robust to item types we haven't seen. Adjust the sets if needed.
 */
const RETAIL_TYPES = new Set(["PRODUCT", "PRODUCT_REWARD"]);
const NON_SALE_TYPES = new Set([
  "APPOINTMENT_DEPOSIT",
  "OUTSTANDING_BALANCE_PMT",
  "VOUCHER",
  "MEMBERSHIP",
]);

function classifyItem(type: string): "service" | "retail" | "other" {
  if (RETAIL_TYPES.has(type)) return "retail";
  if (NON_SALE_TYPES.has(type)) return "other";
  return "service";
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  EUR: "€",
  GBP: "£",
  USD: "$",
};

function mapToWrapped(
  nodes: PurchaseNode[],
  cfg: ApiConfig,
  staff: StaffInfo | null,
): StaffWrapped {
  // Items carry only a staffName, so attribute sales by matching the resolved
  // name. A basket can span multiple staff (e.g. a colour by one stylist plus
  // a blow-dry by another), and we only want this staff member's lines.
  const staffName = cfg.staffName ?? staff?.fullName;

  let serviceSales = 0;
  let retailSales = 0;
  let tips = 0;
  let currency: string | undefined;
  const clientIds = new Set<string>();

  for (const node of nodes) {
    let staffHasItemHere = false;

    for (const item of node.items ?? []) {
      // If we couldn't resolve a name, fall back to counting all items.
      if (staffName && item.staffName !== staffName) continue;
      staffHasItemHere = true;

      currency ??= item.totalAmount?.currency;
      const amount = num(item.totalAmount?.amount);
      const kind = classifyItem(item.purchaseItemType);
      if (kind === "service") serviceSales += amount;
      else if (kind === "retail") retailSales += amount;
    }

    // Count a client visit only when this staff member actually had a line.
    if (staffHasItemHere && node.clientId) clientIds.add(node.clientId);

    for (const tip of node.tips ?? []) {
      if (tip.staffMemberId === cfg.staffId) tips += num(tip.tipAmount);
    }
  }

  const clientVisits = clientIds.size;
  const totalSales = serviceSales + retailSales;
  const averageBill = clientVisits > 0 ? totalSales / clientVisits : 0;

  const currencySymbol =
    cfg.currency ??
    (currency ? CURRENCY_SYMBOLS[currency] ?? currency : undefined) ??
    demoWrapped.currency;

  return {
    staffName: staffName ?? demoWrapped.staffName,
    staffFirstName: staff?.firstName ?? demoWrapped.staffFirstName,
    salonName: cfg.salonName ?? staff?.branchName ?? demoWrapped.salonName,
    role: demoWrapped.role,
    period: cfg.period ?? demoWrapped.period,
    currency: currencySymbol,
    metrics: {
      clientVisits,
      serviceSales: Math.round(serviceSales),
      retailSales: Math.round(retailSales),
      averageBill: Math.round(averageBill),
      tips: Math.round(tips),
      // Not derivable from purchases — these need appointment/rebooking data
      // from a different api-facade module. Kept as demo placeholders for now.
      rebookedRate: demoWrapped.metrics.rebookedRate,
      salonRebookAvg: demoWrapped.metrics.salonRebookAvg,
      topPercentile: demoWrapped.metrics.topPercentile,
    },
  };
}

/**
 * Loads the wrapped data. Fetches live from api-facade when configured,
 * otherwise returns the hardcoded demo data.
 */
export async function loadWrapped(): Promise<StaffWrapped> {
  const cfg = readConfig();
  if (!cfg) return demoWrapped;

  const [staff, nodes] = await Promise.all([
    fetchStaffInfo(cfg),
    fetchAllPurchases(cfg),
  ]);
  const inRange = nodes.filter((node) => withinRange(node, cfg));
  return mapToWrapped(inRange, cfg, staff);
}
