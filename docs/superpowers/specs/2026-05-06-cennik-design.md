# Cennik Page — Design Spec

**Date:** 2026-05-06
**Project:** Dr Koło: Bike Service

---

## Overview

A separate `/cennik` route displaying a grouped price list for all bike service offerings. Follows the existing design system exactly — same header, footer, typography, and card patterns as `Index.tsx`.

---

## Routing

- New route: `<Route path="/cennik" element={<Cennik />} />` added in `App.tsx`
- `Index.tsx` nav gets a "Cennik" link pointing to `/cennik` (next to Usługi, O nas, Kontakt)

---

## Page Structure

### Header
- Identical fixed header from `Index.tsx` (logo, nav, ThemeToggle, Zadzwoń button)
- "Cennik" nav link is visually active/highlighted when on the page

### Back Button
- Positioned below the header, top of content area
- Uses `Button variant="outline"` with `← Wróć` label
- `useNavigate(-1)` or `<Link to="/">` — navigate back to homepage

### Hero / Intro Section
- Accent label: `"Cennik"` (uppercase tracking-widest, text-accent)
- `font-display` h1: `"Przejrzyste ceny, bez niespodzianek."`
- Short subtitle in `text-muted-foreground`

### Price Cards Grid
- `grid md:grid-cols-2 gap-6` layout
- 5 category cards matching `bg-card border border-border rounded-lg` style from Usługi section
- Each card has:
  - Top-right mono index number (01–05)
  - Category icon (Lucide) + category name in `font-display font-semibold`
  - Rows of `service name · price` separated by `border-b border-border`
  - Price in `font-mono text-accent font-semibold`
  - Note at bottom if needed (e.g. "Cena zależna od modelu")

### Placeholder Categories & Data

| # | Category | Icon | Services (placeholder) |
|---|----------|------|------------------------|
| 01 | Przeglądy | `ClipboardList` | Przegląd podstawowy 80 zł · Przegląd rozszerzony 150 zł · Przegląd kompleksowy 250 zł |
| 02 | Naprawy | `Wrench` | Regulacja przerzutek 50 zł · Regulacja hamulców 40 zł · Wymiana linki/pancerza 30 zł · Naprawa przebicia 25 zł |
| 03 | Amortyzacja | `Cog` | Serwis amortyzatora przedniego od 120 zł · Serwis tylnego zawieszenia od 150 zł · Wymiana oleju 80 zł |
| 04 | Koła | `Bike` | Centrowanie koła 60 zł · Wymiana szprychy 15 zł · Montaż opony 20 zł · Wymiana dętki 25 zł |
| 05 | Napęd | `Settings` | Wymiana łańcucha 40 zł · Wymiana kasety 30 zł · Wymiana suportu od 60 zł · Czyszczenie napędu 50 zł |

### Footer Note
- Small `text-muted-foreground text-sm` note: `"Ceny są orientacyjne. Ostateczna wycena po oględzinach roweru."`

### Footer
- Identical footer from `Index.tsx`

---

## Implementation Notes

- New file: `src/pages/Cennik.tsx`
- No new dependencies needed
- All icons already available from `lucide-react`
- Reuse same `PHONE`, `PHONE_TEL`, `ADDRESS` constants (extract to shared file or duplicate for now)
