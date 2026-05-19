# SEO Fixes Design — drkolo.pl

**Date:** 2026-05-19
**Status:** Approved
**Scope:** Pragmatic JS-only SEO fixes across config/static files and React pages. No SSG or framework migration.

---

## Context

Full SEO audit of drkolo.pl (React SPA, Vite, Supabase, deployed on GitHub Pages) identified a score of 62/100. This spec covers all fixes agreed for implementation, organized into two deployment groups.

Key constraints:
- Stay in current Vite/React setup (no SSG, no framework migration)
- New business — no review data or certifications yet, skip E-E-A-T copy changes
- Real GBP/Facebook URLs not available yet — use clearly marked placeholders

---

## Group 1 — Config / Static Files

### 1. `public/robots.txt`

Add `Disallow` entries for all internal/admin routes to prevent crawlers from indexing them:

```
User-agent: *
Allow: /
Disallow: /analytics
Disallow: /kalendarz
Disallow: /chat-admin
Disallow: /kwestionariusz
Disallow: /kwestionariusz-odp
Disallow: /zlecenie

Sitemap: https://drkolo.pl/sitemap.xml
```

### 2. `index.html` — JSON-LD Schema

Three targeted changes inside the existing `@graph` array:

**a) `sameAs` on Gdańsk entity** — replace self-referencing array with proper external profiles (placeholders):
```json
"sameAs": [
  "REPLACE_WITH_GOOGLE_BUSINESS_PROFILE_URL",
  "REPLACE_WITH_FACEBOOK_PAGE_URL"
]
```

**b) `AggregateRating`** — add to Gdańsk entity (placeholder values, update when real review data exists):
```json
"aggregateRating": {
  "@type": "AggregateRating",
  "ratingValue": "5.0",
  "reviewCount": "1",
  "bestRating": "5",
  "worstRating": "1"
}
```

**c) Kartuzy branch** — add `postalCode` to its `PostalAddress`:
```json
"postalCode": "83-300"
```

### 3. `public/sitemap.xml`

Add the image sitemap namespace and `<image:image>` entries to the homepage URL for the two key images. Since Vite hashes asset filenames at build time, use descriptive captions rather than exact asset paths:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset
  xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  <url>
    <loc>https://drkolo.pl/</loc>
    <lastmod>2026-05-19</lastmod>
    <changefreq>monthly</changefreq>
    <priority>1.0</priority>
    <image:image>
      <image:loc>https://drkolo.pl/og-image.jpg</image:loc>
      <image:title>Dr Koło — Serwis Rowerowy Gdańsk</image:title>
      <image:caption>Profesjonalny serwis rowerowy Dr Koło w Gdańsku i Kartuzach</image:caption>
    </image:image>
  </url>
  <url>
    <loc>https://drkolo.pl/cennik</loc>
    <lastmod>2026-05-19</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://drkolo.pl/rezerwacja</loc>
    <lastmod>2026-05-19</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
</urlset>
```

Note: `og-image.jpg` is in `/public` so it is served at a stable, unhashed URL — safe to reference in the sitemap.

---

## Group 2 — React Page Changes

### 4. New hook: `src/hooks/useNoIndex.ts`

A minimal shared hook to avoid repeating the same noindex logic in 7 admin pages:

```ts
import { useEffect } from "react";

export function useNoIndex() {
  useEffect(() => {
    const meta = document.querySelector('meta[name="robots"]') as HTMLMetaElement | null;
    const prev = meta?.getAttribute("content") ?? "index, follow";
    meta?.setAttribute("content", "noindex, nofollow");
    return () => {
      meta?.setAttribute("content", prev);
    };
  }, []);
}
```

Applied to 7 pages by adding `useNoIndex()` at the top of each component:
- `Analytics.tsx`
- `KalendarzAdmin.tsx`
- `ChatAdmin.tsx`
- `Kwestionariusz.tsx`
- `KwestionariuszOdp.tsx`
- `ZlecenieView.tsx`
- `CreateZlecenie.tsx`

### 5. `src/pages/Rezerwacja.tsx`

Add a `useEffect` (same pattern as `Cennik.tsx`) that updates meta on mount and restores on unmount:

- **Title:** `"Umów wizytę — Dr Koło: Serwis Rowerowy Gdańsk"`
- **Description:** `"Zarezerwuj termin w serwisie rowerowym Dr Koło w Gdańsku. Wybierz datę, godzinę i opisz usterkę — odpiszemy SMS-em."`
- **Canonical:** `https://drkolo.pl/rezerwacja`

Cleanup restores the homepage title, description, and canonical on unmount.

### 6. `src/pages/Cennik.tsx`

Rewrite the `<h1>` from brand-voice copy to a keyword-aligned heading. The original line becomes a subtitle `<p>`:

```jsx
<h1 className="font-display font-bold text-4xl md:text-6xl max-w-2xl text-balance">
  Cennik serwisu rowerowego
</h1>
<p className="text-muted-foreground mt-2 text-lg">
  Przejrzyste ceny, bez niespodzianek.
</p>
```

The existing `useEffect` title/description/canonical/schema logic in `Cennik.tsx` is already correct — no changes needed there.

---

## What Is Explicitly Out of Scope

- SSG / SSR migration (future consideration)
- E-E-A-T copy changes in the About section (new business, no data yet)
- Blog / content marketing section
- Google Maps embed
- Font self-hosting / performance optimization
- Review schema with real data (revisit once GBP reviews accumulate)

---

## Success Criteria

- `robots.txt` disallows all 6 admin routes
- `/analytics`, `/kalendarz`, `/chat-admin`, `/kwestionariusz`, `/kwestionariusz-odp`, `/zlecenie`, `/zlecenie/:hash` serve `noindex, nofollow` meta
- `/rezerwacja` has correct title, description, and canonical in the DOM after React renders
- `/cennik` H1 is "Cennik serwisu rowerowego"
- `index.html` schema has `sameAs` with 2 placeholder URLs, `aggregateRating` block, and Kartuzy `postalCode`
- `sitemap.xml` includes image namespace and `og-image.jpg` entry
