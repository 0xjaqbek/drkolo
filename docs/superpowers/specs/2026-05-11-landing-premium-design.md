# Landing Page Premium Redesign — Design Spec
**Date:** 2026-05-11
**Status:** Approved

## Overview

Elevate the Dr Koło landing page (`src/pages/Index.tsx`) from a functional but generic design to a high-end editorial aesthetic. Keep the existing warm dark palette and amber accent. Replace Space Grotesk with Cormorant Garamond for display and DM Sans for body. Add scroll-reveal animations, editorial typographic details, and refined micro-interactions throughout.

No new routes, no backend changes, no new components beyond a small `useInView` hook. Changes are confined to `src/index.css`, `src/pages/Index.tsx`, and the font import in `index.html`.

---

## 1. Typography & Visual Identity

### Font pairing
- **Display:** Cormorant Garamond — weights 300, 400, 600, 700 + italic variants. Used for all H1–H3 and pull quotes. Loaded via Google Fonts.
- **Body/UI:** DM Sans — weights 400, 500. Replaces Inter everywhere for body text, labels, buttons.
- **Monospaced accents:** Keep existing `font-mono` (already in Tailwind stack) for card numbers and section labels.

### Heading scale
- H1 (hero): `clamp(3rem, 10vw, 9rem)` — Cormorant 700
- H2 (section): `clamp(2.5rem, 6vw, 5rem)` — Cormorant 600
- H3 (card): `1.25rem` — Cormorant 600
- Pull quotes: Cormorant 400 italic, ~1.25rem

### Typographic details
- `font-feature-settings: "kern", "liga", "calt", "onum"` — proper serif rendering + oldstyle numerals
- Hero H1: mixed weight — "Profesjonalny" in regular weight, "*serwis rowerowy*" in italic
- Section headings: key phrase in italic for editorial emphasis
- `letter-spacing: -0.02em` on large display headings
- Section labels: uppercase, `letter-spacing: 0.2em`, small amber decorative line before them (`::before` with 2rem amber line)

---

## 2. Hero Section

### Changes
- H1 typography as above — "Profesjonalny" on line 1 (regular), "*serwis rowerowy*" on line 2 (italic). Same copy, transformed character.
- Badge refinement: remove backdrop blur fill → clean thin white/15 border only, dot separator already present stays
- Secondary CTA: change from outline Button to a text link with animated underline (`scaleX` 0→1 on hover)
- Vertical watermark: faint "DR KOŁO" text rotated 90°, right edge, 8% opacity amber, hidden on mobile (`hidden md:flex`)
- Scroll indicator: thin animated line pulse at bottom-center of hero
- Horizontal editorial rule: full-width 1px amber line at the very bottom of the hero section (before services)

### Mobile
- H1 scales via `clamp()` to ~3rem — Cormorant reads well at this size
- Watermark hidden on mobile
- Both CTAs stack vertically on small screens

---

## 3. Services Section

### Changes
- Giant background numeral per card: "01", "02", "03" in Cormorant 700 at `8rem`, `opacity-[0.06]`, positioned bottom-right of each card. Decorative only.
- Section heading: "Każda naprawa wykonana" in regular, "*z pasją.*" in italic
- Right-side intro paragraph: Cormorant italic, slightly larger (~1.1rem), pull-quote styling
- Card icon: move from top-left to bottom-left corner, give it more air
- Card hover: replace border-color transition with a thin amber `::before` pseudo-element left-border that scales from `scaleY(0)` to `scaleY(1)` on hover. The existing border stays neutral.
- Card number (top-right): increase size slightly, keep mono, color amber

### Mobile
- Grid collapses to 1 column (already handled by `md:grid-cols-3`)
- Giant background numeral stays — scales proportionally

---

## 4. About Section

### Changes
- Image: increase height to `h-[580px]`, tighter portrait-style crop
- Floating callout: replace current "Doświadczenie i precyzja" amber card (bottom-right overlap) with a typographic callout — Cormorant italic in large text, amber color, thin amber overline (`border-t`), no background fill
- Pull quote added above paragraph: `"Każdy rower zasługuje na najlepszą opiekę."` in Cormorant italic ~1.25rem, amber color
- Headline: "Doktor od rowerów." → "Doktor" regular, "*od rowerów.*" italic
- Feature list: replace spacing between items with thin `border-b border-border/30` separators. Icon circles replaced by a simple amber dash `—` or thin amber square marker.

### Mobile
- Stacks to single column (already handled)
- Pull quote stays, scales to smaller size

---

## 5. Contact Section

### Changes
- Phone card: phone number renders in Cormorant serif at large size (~4rem on desktop), not the current font-display. The size makes it impossible to miss.
- Card corners: remove `rounded-lg` → sharp corners (`rounded-none`). Sharp edges read more premium.
- Phone card hover: amber glow intensifies via `--shadow-glow` variable, no scale transform
- Address card: hours displayed with thin `border-b border-white/10` separator between Mon–Fri and Saturday rows
- Both cards: generous padding increase, top amber accent border instead of full border

### Mobile
- Cards stack vertically (already handled)
- Phone number size scales down via clamp

---

## 6. Footer

- Replace `border-t border-border` with a thin 2px amber top accent line
- Add `letter-spacing: 0.05em` to footer text for refined look

---

## 7. Scroll-Reveal Animations

### Implementation
A small `useInView` hook in `src/hooks/useInView.ts` using `IntersectionObserver`:
```ts
// Returns a ref and a boolean `inView`
// Adds `data-visible="true"` when element enters viewport (threshold: 0.15)
// One-shot: does not reset when element leaves
```

### CSS animation classes
```css
.reveal {
  opacity: 0;
  transform: translateY(24px);
  transition: opacity 0.6s var(--transition-smooth), transform 0.6s var(--transition-smooth);
}
.reveal[data-visible="true"] {
  opacity: 1;
  transform: translateY(0);
}
```

### Stagger
Service cards: `transition-delay: 0ms`, `150ms`, `300ms` via inline style.
About section: image reveals first (0ms), text block 150ms later.

### Reduced motion
```css
@media (prefers-reduced-motion: reduce) {
  .reveal { opacity: 1; transform: none; transition: none; }
}
```

---

## 8. Nav Micro-interaction

- Desktop nav links: add animated underline via `::after` pseudo-element, `scaleX` 0→1 from left on hover. Amber color. Replaces the simple `hover:text-accent` color change.

---

## Files Changed

| File | Change |
|------|--------|
| `index.html` | Update Google Fonts import: add Cormorant Garamond weights, replace Inter with DM Sans |
| `src/index.css` | Update font variables, reveal animation classes, section label `::before` line, nav underline micro-interaction |
| `src/pages/Index.tsx` | All visual changes to hero, services, about, contact, footer sections |
| `src/hooks/useInView.ts` | New file — IntersectionObserver hook for scroll reveal |

No other files need changes. `SiteHeader.tsx`, `Cennik.tsx`, and all other pages are out of scope.

---

## Out of Scope

- Cennik page, ZlecenieView, any admin pages
- SiteHeader internal styling (nav underline added via CSS only)
- Any content/copy changes beyond italic emphasis styling
- New sections or page structure changes
- Backend, database, chatbot feature
