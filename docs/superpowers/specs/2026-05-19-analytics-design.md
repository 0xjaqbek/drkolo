# Analytics Design — Dr Koło

**Date:** 2026-05-19
**Status:** Approved

## Overview

Add custom-built, privacy-friendly page-view analytics to the Dr Koło website. All data is stored in the existing Supabase instance. No third-party tracking scripts, no cookies, no consent banner required. A new password-protected `/analytics` admin page presents the data to the owner.

---

## 1. Database

### Migration: `supabase/migrations/007_page_views_schema.sql`

New table `page_views`:

| column | type | constraints |
|---|---|---|
| `id` | uuid | PK, default `gen_random_uuid()` |
| `path` | text | not null |
| `referrer` | text | nullable |
| `session_id` | uuid | not null |
| `user_agent` | text | nullable |
| `created_at` | timestamptz | default `now()` |

**RLS policies:**
- `anon` role: INSERT + SELECT (no UPDATE, no DELETE)
- The dashboard uses the anon Supabase client key — password protection is UI-level only, consistent with the existing `/kwestionariusz-odp` and `/kalendarz` admin pages

No PII is stored. `session_id` is a random UUID generated per browser tab — it approximates unique visitors without identifying individuals.

---

## 2. Tracking Hook

### `src/hooks/usePageView.ts`

- Uses `useLocation()` from React Router to detect route changes
- On each navigation event, inserts one row into `page_views` with:
  - `path`: current `location.pathname`
  - `referrer`: `document.referrer` domain (hostname only, or null if empty)
  - `session_id`: UUID from `sessionStorage` (created once per tab session via `crypto.randomUUID()`)
  - `user_agent`: `navigator.userAgent`
- **Bot filter:** skips insert if `navigator.userAgent` matches `/bot|crawler|spider|googlebot|bingbot|slurp|duckduckbot|baidu|yandex/i`
- Called once inside `<BrowserRouter>` in `App.tsx` — no changes needed to individual page components

---

## 3. Dashboard `/analytics`

### `src/pages/Analytics.tsx`

**Access:** Password-protected using `VITE_CREATION_PASSWORD` (same pattern as `/kwestionariusz-odp`).

**Route:** `/analytics` added to `App.tsx`.

**Data hook:** `src/hooks/useAnalytics.ts`
- Accepts a `range` parameter: `7` | `30` | `all`
- Fetches all `page_views` rows within the range from Supabase
- Aggregates client-side:
  - Total views
  - Unique session count
  - Views grouped by `path`
  - Daily view counts (last N days)
  - Views grouped by `referrer` domain (null → "Direct")

**Widgets:**

1. **Summary bar** — three stat cards: total views, unique sessions, most visited page
2. **Views by page** — table sorted by count descending, showing path and view count
3. **Daily views chart** — line chart (last 30 days) using the existing `<ChartContainer>` / recharts components already in the codebase
4. **Top referrers** — table of referrer domains sorted by count; null referrer displayed as "Direct"

**Time filter:** three buttons — `7 days`, `30 days`, `All time` — update the `range` state, which re-fetches and re-aggregates all widgets.

---

## 4. Files Changed / Created

| file | change |
|---|---|
| `supabase/migrations/007_page_views_schema.sql` | new — table + RLS |
| `src/hooks/usePageView.ts` | new — tracking hook |
| `src/hooks/useAnalytics.ts` | new — data fetching + aggregation |
| `src/pages/Analytics.tsx` | new — dashboard page |
| `src/App.tsx` | add `/analytics` route + call `usePageView()` inside router |

---

## 5. Out of Scope

- Device-type breakdown (mobile/desktop) — UA string is stored but not displayed; can be added later
- Geolocation — not tracked
- Heatmaps or scroll depth — not tracked
- Real-time updates — data loads on page open, no live polling
- Rate limiting — not needed for a single low-traffic shop
