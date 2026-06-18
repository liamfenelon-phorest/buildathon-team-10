# Phorest Wrapped 🎁

A "Spotify Wrapped"-style, story-based recap of a staff member's year — built
mobile-first, fully animated, and styled with Phorest's brand palette.

![intro](docs/intro.png)

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
```

`npm run dev` automatically loads `.env.local` (gitignored). With a valid token
in there the slides show **live month-to-date data**; without it they fall back
to the hardcoded demo persona.

```bash
npm run build    # type-check + production bundle in dist/
npm run preview  # serve the production build
```

## Live data

The slides are driven by the api-facade `staffPerformance` GraphQL query
(`MONTH_TO_DATE` by default), mapped into the `StaffWrapped` shape in
`src/data/fetchWrapped.ts`.

Configure via `.env.local` (copy `.env.example`):

```bash
VITE_WRAPPED_TOKEN=<bearer token>        # dev tokens last ~30 min
VITE_WRAPPED_BUSINESS_ID=<business_id>   # from the token payload
VITE_WRAPPED_USER_ID=<user_id>           # from the token payload
# VITE_WRAPPED_STAFF_ID=<staff_id>       # optional: a specific stylist
# VITE_WRAPPED_PRESET=MONTH_TO_DATE      # TODAY | WEEK_TO_DATE | MONTH_TO_DATE | YEAR_TO_DATE
```

The browser calls the relative `/api-facade/graphql`, which the Vite dev server
**proxies** to `https://api-gateway-dev.phorest.com` (see `vite.config.ts`) —
so there's no CORS, and the required `Authorization` + `x-memento-security-context`
headers are added in `fetchWrapped.ts`.

**Mapping** (`staffPerformance` → slide):

| Slide | GraphQL field |
| --- | --- |
| Client visits | `clientVisitsStats.totalCount` |
| Service sales | `serviceAndCoursesRevenueStats.total.totalAmount.amount` |
| Retail sales | `retailRevenueStats.total.totalAmount.amount` |
| Average bill | `averageRevenueStats.totalAmount.amount` |
| Tips | `tipAmount.amount` |
| Rebooked | `rebookStats.totalPercentage` |
| Currency | `defaultCurrency` (mapped to a symbol) |
| Period label | derived from `startDate` |

Notes:
- The API returns numbers as **strings**, and `"-"` when there's no data — both
  are parsed to `0`.
- `salonRebookAvg` and `topPercentile` are **not** exposed by `staffPerformance`;
  they stay as configurable demo values (fall back from `wrapped.ts`).
- Staff/salon **names** aren't in this query either — set
  `VITE_WRAPPED_STAFF_NAME` / `VITE_WRAPPED_SALON_NAME`, or leave the demo defaults.
- Dev tokens are short-lived (~30 min). On `401`s, refresh `VITE_WRAPPED_TOKEN`;
  the dev server restarts automatically when `.env.local` changes.

## The experience

Eight full-screen story slides, Instagram/Spotify-style:

1. **Intro** – salon + year build-up
2. **Client visits** – 1,247
3. **Service sales** – €68,420
4. **Retail sales** – €9,860
5. **Average bill** – €62 / visit
6. **Tips** – €4,215
7. **Rebooked** – 73% (animated ring gauge, the hero metric)
8. **Summary** – shareable recap card + confetti

### Controls

| Action | Gesture |
| --- | --- |
| Next / previous | tap right / left (or `→` / `←`) |
| Pause | press & hold (or `space`) |
| Auto-advance | ~6s per slide, segmented progress bars up top |
| Share | Web Share API, falls back to clipboard copy |
| Replay | button on the summary card |

Respects `prefers-reduced-motion` (instant counts, no confetti, static blobs).

### Deep links (handy for demos / QA)

- `?s=N` – start on slide `N` (0–7)
- `?paused=1` – start paused

## Where things live

- `src/data/wrapped.ts` – **all hardcoded data** (staff, salon, metrics).
  Numbers are internally consistent: `(service + retail) / visits ≈ average bill`.
- `src/components/slides/index.tsx` – slide registry + per-slide colour themes.
- `src/components/StoryPlayer.tsx` – navigation, auto-advance, progress, gestures.
- `src/components/AnimatedNumber.tsx` – count-up via a Framer `MotionValue`.
- `src/index.css` – Phorest brand tokens (the tree-named palette: oak, birch,
  fir, chestnut, ash, cherry + brand teal/green/yellow), lifted from
  `consultation-webapp`.

## Tech

Vite · React · TypeScript · Framer Motion · canvas-confetti.

## Notes

- Data is hardcoded for now; swapping in a real per-staff feed is a matter of
  replacing the `wrapped` export (and, later, fetching by staff id).
- The brand colours mirror Phorest's existing design tokens so it sits visually
  alongside the rest of the product.
