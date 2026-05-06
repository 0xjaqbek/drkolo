# SiteHeader with Mobile Hamburger Menu — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract a shared `SiteHeader` component with a slide-down hamburger menu for mobile (< 768px), replacing the duplicate header blocks in `Index.tsx` and `Cennik.tsx`.

**Architecture:** A new `SiteHeader` component owns all header/nav state. It accepts `activePage` to handle active link styling per page. On mobile it shows a hamburger icon that toggles a slide-down panel containing nav links + ThemeToggle + Zadzwoń button.

**Tech Stack:** React, TypeScript, React Router DOM, Tailwind CSS, Lucide React, shadcn/ui Button, Vitest + React Testing Library

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `src/components/SiteHeader.tsx` | **Create** | Shared header: logo, desktop nav, mobile hamburger + panel |
| `src/test/SiteHeader.test.tsx` | **Create** | Smoke tests for SiteHeader |
| `src/pages/Index.tsx` | **Modify** | Remove `<header>` block, remove ThemeToggle import, add SiteHeader |
| `src/pages/Cennik.tsx` | **Modify** | Remove `<header>` block, remove Phone+ThemeToggle imports, add SiteHeader |

---

## Task 1: Write failing tests for SiteHeader

**Files:**
- Create: `src/test/SiteHeader.test.tsx`

- [ ] **Step 1: Create the test file**

```tsx
// src/test/SiteHeader.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { SiteHeader } from "@/components/SiteHeader";

const renderHeader = (activePage: "home" | "cennik") =>
  render(
    <MemoryRouter>
      <SiteHeader activePage={activePage} />
    </MemoryRouter>
  );

describe("SiteHeader", () => {
  it("renders the logo", () => {
    renderHeader("home");
    expect(screen.getByText("Dr Koło")).toBeInTheDocument();
  });

  it("shows hamburger button with aria-label 'Otwórz menu'", () => {
    renderHeader("home");
    expect(screen.getByRole("button", { name: "Otwórz menu" })).toBeInTheDocument();
  });

  it("toggles aria-label to 'Zamknij menu' when hamburger is clicked", () => {
    renderHeader("home");
    fireEvent.click(screen.getByRole("button", { name: "Otwórz menu" }));
    expect(screen.getByRole("button", { name: "Zamknij menu" })).toBeInTheDocument();
  });

  it("shows all four nav section labels", () => {
    renderHeader("home");
    expect(screen.getAllByText("Usługi").length).toBeGreaterThan(0);
    expect(screen.getAllByText("O nas").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Cennik").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Kontakt").length).toBeGreaterThan(0);
  });

  it("renders Cennik as a non-link span when activePage is cennik", () => {
    renderHeader("cennik");
    const cennikItems = screen.getAllByText("Cennik");
    const spans = cennikItems.filter((el) => el.tagName === "SPAN");
    expect(spans.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run the tests — confirm they fail**

```
npm test -- --run src/test/SiteHeader.test.tsx
```

Expected: All 5 tests FAIL with `Cannot find module '@/components/SiteHeader'`

---

## Task 2: Implement SiteHeader component

**Files:**
- Create: `src/components/SiteHeader.tsx`

- [ ] **Step 1: Create the component**

```tsx
// src/components/SiteHeader.tsx
import { useState } from "react";
import { Link } from "react-router-dom";
import { Phone, Bike, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";

const PHONE = "511 061 221";
const PHONE_TEL = "+48511061221";

interface SiteHeaderProps {
  activePage: "home" | "cennik";
}

export const SiteHeader = ({ activePage }: SiteHeaderProps) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const close = () => setMenuOpen(false);

  const linkClass = "block py-3 text-sm font-medium hover:text-accent transition-colors border-b border-border/50";

  return (
    <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-background/70 border-b border-border">
      {/* Top bar */}
      <div className="container flex items-center justify-between h-16">
        {/* Logo */}
        {activePage === "home" ? (
          <a href="#top" className="flex items-center gap-2 font-display font-bold text-lg">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-accent text-accent-foreground">
              <Bike className="h-4 w-4" />
            </span>
            Dr Koło
          </a>
        ) : (
          <Link to="/" className="flex items-center gap-2 font-display font-bold text-lg">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-accent text-accent-foreground">
              <Bike className="h-4 w-4" />
            </span>
            Dr Koło
          </Link>
        )}

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
          {activePage === "home" ? (
            <>
              <a href="#uslugi" className="hover:text-accent transition-colors">Usługi</a>
              <a href="#o-nas" className="hover:text-accent transition-colors">O nas</a>
              <Link to="/cennik" className="hover:text-accent transition-colors">Cennik</Link>
              <a href="#kontakt" className="hover:text-accent transition-colors">Kontakt</a>
            </>
          ) : (
            <>
              <Link to="/#uslugi" className="hover:text-accent transition-colors">Usługi</Link>
              <Link to="/#o-nas" className="hover:text-accent transition-colors">O nas</Link>
              <span className="text-accent font-semibold">Cennik</span>
              <Link to="/#kontakt" className="hover:text-accent transition-colors">Kontakt</Link>
            </>
          )}
        </nav>

        {/* Right controls */}
        <div className="flex items-center gap-2">
          {/* Desktop: theme toggle */}
          <div className="hidden md:block">
            <ThemeToggle />
          </div>
          {/* Desktop: call button */}
          <Button
            asChild
            size="sm"
            className="hidden md:inline-flex bg-accent text-accent-foreground hover:bg-accent/90 rounded-full"
          >
            <a href={`tel:${PHONE_TEL}`}>
              <Phone className="h-3.5 w-3.5 mr-1.5" />
              Zadzwoń
            </a>
          </Button>
          {/* Mobile: hamburger */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label={menuOpen ? "Zamknij menu" : "Otwórz menu"}
            className="md:hidden rounded-full border border-border hover:bg-accent hover:text-accent-foreground"
          >
            {menuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Mobile slide-down panel */}
      <div
        className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${
          menuOpen ? "max-h-80 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <nav className="container pb-4">
          {activePage === "home" ? (
            <>
              <a href="#uslugi" onClick={close} className={linkClass}>Usługi</a>
              <a href="#o-nas" onClick={close} className={linkClass}>O nas</a>
              <Link to="/cennik" onClick={close} className={linkClass}>Cennik</Link>
              <a href="#kontakt" onClick={close} className={linkClass}>Kontakt</a>
            </>
          ) : (
            <>
              <Link to="/#uslugi" onClick={close} className={linkClass}>Usługi</Link>
              <Link to="/#o-nas" onClick={close} className={linkClass}>O nas</Link>
              <span className="block py-3 text-sm font-semibold text-accent border-b border-border/50">
                Cennik
              </span>
              <Link to="/#kontakt" onClick={close} className={linkClass}>Kontakt</Link>
            </>
          )}
          <div className="flex items-center justify-between pt-3 mt-1 border-t border-border">
            <ThemeToggle />
            <Button
              asChild
              size="sm"
              className="bg-accent text-accent-foreground hover:bg-accent/90 rounded-full"
            >
              <a href={`tel:${PHONE_TEL}`}>
                <Phone className="h-3.5 w-3.5 mr-1.5" />
                Zadzwoń
              </a>
            </Button>
          </div>
        </nav>
      </div>
    </header>
  );
};
```

- [ ] **Step 2: Run the tests — confirm they pass**

```
npm test -- --run src/test/SiteHeader.test.tsx
```

Expected: All 5 tests PASS

- [ ] **Step 3: Commit**

```bash
git add src/components/SiteHeader.tsx src/test/SiteHeader.test.tsx
git commit -m "feat: add SiteHeader component with mobile hamburger menu"
```

---

## Task 3: Update Index.tsx

**Files:**
- Modify: `src/pages/Index.tsx`

- [ ] **Step 1: Replace the import line for ThemeToggle with SiteHeader**

Find:
```tsx
import { ThemeToggle } from "@/components/ThemeToggle";
```

Replace with:
```tsx
import { SiteHeader } from "@/components/SiteHeader";
```

- [ ] **Step 2: Replace the entire `<header>` block with `<SiteHeader activePage="home" />`**

Find (lines ~31–52):
```tsx
      {/* Nav */}
      <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-background/70 border-b border-border">
        <div className="container flex items-center justify-between h-16">
          <a href="#top" className="flex items-center gap-2 font-display font-bold text-lg">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-accent text-accent-foreground">
              <Bike className="h-4 w-4" />
            </span>
            Dr Koło
          </a>
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
            <a href="#uslugi" className="hover:text-accent transition-colors">Usługi</a>
            <a href="#o-nas" className="hover:text-accent transition-colors">O nas</a>
            <Link to="/cennik" className="hover:text-accent transition-colors">Cennik</Link>
            <a href="#kontakt" className="hover:text-accent transition-colors">Kontakt</a>
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button asChild size="sm" className="hidden sm:inline-flex bg-accent text-accent-foreground hover:bg-accent/90 rounded-full">
              <a href={`tel:${PHONE_TEL}`}><Phone className="h-3.5 w-3.5 mr-1.5" />Zadzwoń</a>
            </Button>
          </div>
        </div>
      </header>
```

Replace with:
```tsx
      {/* Nav */}
      <SiteHeader activePage="home" />
```

- [ ] **Step 3: Run all tests — confirm nothing is broken**

```
npm test -- --run
```

Expected: All tests PASS

- [ ] **Step 4: Commit**

```bash
git add src/pages/Index.tsx
git commit -m "refactor: use SiteHeader in Index page"
```

---

## Task 4: Update Cennik.tsx

**Files:**
- Modify: `src/pages/Cennik.tsx`

- [ ] **Step 1: Update imports — remove Phone (icon), ThemeToggle; add SiteHeader**

Find:
```tsx
import {
  Phone, Bike, Wrench, Cog, ArrowLeft,
  ClipboardList, Settings, CircleDot,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
```

Replace with:
```tsx
import {
  Bike, Wrench, Cog, ArrowLeft,
  ClipboardList, Settings, CircleDot,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/SiteHeader";
```

> Note: `Phone` (the Lucide icon) was only used in the header Zadzwoń button, which SiteHeader now owns. The `PHONE` string constant remains — it is used in the footer as plain text. `Bike` is kept because it is used in the footer logo.

- [ ] **Step 2: Replace the entire `<header>` block with `<SiteHeader activePage="cennik" />`**

Find (lines ~82–104):
```tsx
      {/* Nav */}
      <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-background/70 border-b border-border">
        <div className="container flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2 font-display font-bold text-lg">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-accent text-accent-foreground">
              <Bike className="h-4 w-4" />
            </span>
            Dr Koło
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
            <Link to="/#uslugi" className="hover:text-accent transition-colors">Usługi</Link>
            <Link to="/#o-nas" className="hover:text-accent transition-colors">O nas</Link>
            <span className="text-accent font-semibold">Cennik</span>
            <Link to="/#kontakt" className="hover:text-accent transition-colors">Kontakt</Link>
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button asChild size="sm" className="hidden sm:inline-flex bg-accent text-accent-foreground hover:bg-accent/90 rounded-full">
              <a href={`tel:${PHONE_TEL}`}><Phone className="h-3.5 w-3.5 mr-1.5" />Zadzwoń</a>
            </Button>
          </div>
        </div>
      </header>
```

Replace with:
```tsx
      {/* Nav */}
      <SiteHeader activePage="cennik" />
```

- [ ] **Step 3: Run all tests — confirm everything passes**

```
npm test -- --run
```

Expected: All tests PASS (including existing Cennik tests)

- [ ] **Step 4: Commit**

```bash
git add src/pages/Cennik.tsx
git commit -m "refactor: use SiteHeader in Cennik page"
```

---

## Task 5: Final verification

- [ ] **Step 1: Run the full test suite one last time**

```
npm test -- --run
```

Expected output includes:
```
✓ src/test/example.test.ts
✓ src/test/Cennik.test.tsx
✓ src/test/SiteHeader.test.tsx
```

All tests pass with no failures.
