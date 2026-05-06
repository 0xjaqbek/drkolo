# SiteHeader with Mobile Hamburger Menu — Design Spec

**Date:** 2026-05-06
**Status:** Approved

## Summary

Replace the duplicate `<header>` blocks in `Index.tsx` and `Cennik.tsx` with a shared `SiteHeader` component. On screens below `md` (768px), replace the standalone ThemeToggle with a hamburger button that opens a slide-down mobile navigation panel containing all nav links and the ThemeToggle.

## Component Structure

**New file:** `src/components/SiteHeader.tsx`

Props:
- `activePage: "home" | "cennik"` — determines which nav item receives active accent styling (non-link span instead of anchor)

Internal state:
- `menuOpen: boolean` — controls visibility of the mobile slide-down panel

Both `Index.tsx` and `Cennik.tsx` remove their inline `<header>` blocks and render `<SiteHeader activePage="home" />` / `<SiteHeader activePage="cennik" />` instead.

## Desktop Behaviour (≥ md / 768px)

Unchanged from current:
- Logo on left
- Nav links in center (`hidden md:flex`): Usługi, O nas, Cennik, Kontakt
- ThemeToggle + Zadzwoń button on right

## Mobile Behaviour (< md / 768px)

**Top bar:**
- Logo on left
- Hamburger button on right (round ghost button with border — same visual style as the current ThemeToggle button)
- ThemeToggle is NOT shown in the top bar on mobile
- Zadzwoń button is NOT shown in the top bar on mobile (moved into the slide-down panel)

**Hamburger button:**
- Icon: `Menu` (three lines) when closed → `X` when open (Lucide icons)
- `aria-label`: "Otwórz menu" / "Zamknij menu"

## Slide-Down Panel

**Trigger:** hamburger button tap
**Animation:** `max-height` CSS transition from `0` to full height, `overflow-hidden`, smooth ease
**Dismissal:** tap a nav link, tap the X button
**Stacking:** `z-40` (header is `z-50` — panel sits below header bar, above page content)
**Styling:** same `backdrop-blur-md bg-background/70` as header, `border-b border-border`

**Panel contents (top to bottom):**

1. Nav links — stacked vertically, full width, `py-3` padding each, `hover:text-accent transition-colors`, separated by `border-b border-border/50` dividers
   - Usługi → `<a href="#uslugi">` (home) / `<Link to="/#uslugi">` (cennik)
   - O nas → `<a href="#o-nas">` (home) / `<Link to="/#o-nas">` (cennik)
   - Cennik → `<Link to="/cennik">` (home) / `<span className="text-accent font-semibold">` (cennik — active, not a link)
   - Kontakt → `<a href="#kontakt">` (home) / `<Link to="/#kontakt">` (cennik)

2. Bottom action row — flex row, `justify-between items-center`, `pt-3 mt-1 border-t border-border`
   - Left: ThemeToggle
   - Right: Zadzwoń button (full accent style, rounded-full, always visible in panel)

## Navigation Link Behaviour

On the home page, clicking a nav link (e.g. Usługi) closes the menu and scrolls to the section — standard anchor behaviour.
On the Cennik page, clicking a nav link navigates to `/#uslugi` etc. via React Router Link — the menu closes on navigation.

Closing the menu on link click: set `menuOpen = false` in an `onClick` handler on each link.

## Files Changed

| File | Change |
|------|--------|
| `src/components/SiteHeader.tsx` | New file — shared header component |
| `src/pages/Index.tsx` | Remove `<header>` block, add `<SiteHeader activePage="home" />` |
| `src/pages/Cennik.tsx` | Remove `<header>` block, add `<SiteHeader activePage="cennik" />` |

## Out of Scope

- No changes to footer
- No changes to page content sections
- No animation beyond the slide-down panel transition
- No persistent menu state across page navigation
