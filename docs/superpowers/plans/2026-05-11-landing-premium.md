# Landing Page Premium Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Elevate the Dr Koło landing page to an editorial/luxury aesthetic by upgrading typography, adding scroll-reveal animations, and refining every visual detail.

**Architecture:** 5 file changes — font swap in `index.html` + `tailwind.config.ts`, CSS additions in `index.css`, a new `useInView` hook, and a full visual rewrite of `Index.tsx`. No new routes, no backend changes.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Vite, Google Fonts (Cormorant Garamond + DM Sans)

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `index.html` | Modify | Swap Google Fonts: add Cormorant Garamond + DM Sans, remove Inter + Space Grotesk |
| `tailwind.config.ts` | Modify | Update `fontFamily.display` → Cormorant Garamond, `fontFamily.sans` → DM Sans |
| `src/index.css` | Modify | Font feature settings, section-label styling, `.reveal` animation class, nav underline, card left-border micro-interaction |
| `src/hooks/useInView.ts` | Create | IntersectionObserver hook that sets `data-visible="true"` when element enters viewport |
| `src/pages/Index.tsx` | Modify | Full visual rewrite: hero, services, about, contact, footer sections |

---

## Task 1: Swap Fonts — index.html + tailwind.config.ts

**Files:**
- Modify: `index.html`
- Modify: `tailwind.config.ts`

- [ ] **Step 1.1: Update Google Fonts import in index.html**

Replace the existing `<link>` tags for Space Grotesk and Inter (there may be `@import` in CSS instead — see Task 2). In `index.html`, add a preconnect + font link in `<head>` before the closing `</head>`. Add after the Twitter meta tags and before `</head>`:

```html
    <!-- Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;0,700;1,300;1,400;1,600;1,700&family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;1,9..40,400&display=swap" rel="stylesheet" />
```

- [ ] **Step 1.2: Update tailwind.config.ts font families**

In `tailwind.config.ts`, inside `theme.extend.fontFamily`, replace the existing values:

```ts
fontFamily: {
  sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
  display: ['"Cormorant Garamond"', 'Georgia', 'serif'],
},
```

- [ ] **Step 1.3: Verify build compiles**

```bash
cd D:/drkolo && npm run build 2>&1 | tail -5
```

Expected: no errors, ends with something like `✓ built in Xs`

- [ ] **Step 1.4: Commit**

```bash
cd D:/drkolo && git add index.html tailwind.config.ts && git commit -m "feat: swap fonts to Cormorant Garamond + DM Sans"
```

---

## Task 2: CSS Foundation — index.css

**Files:**
- Modify: `src/index.css`

- [ ] **Step 2.1: Update the @import and base styles**

Replace the entire contents of `src/index.css` with:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 40 30% 97%;
    --foreground: 20 14% 8%;

    --card: 0 0% 100%;
    --card-foreground: 20 14% 8%;

    --popover: 0 0% 100%;
    --popover-foreground: 20 14% 8%;

    --primary: 20 14% 8%;
    --primary-foreground: 45 100% 60%;

    --secondary: 40 20% 92%;
    --secondary-foreground: 20 14% 8%;

    --muted: 40 15% 90%;
    --muted-foreground: 20 8% 40%;

    --accent: 45 100% 55%;
    --accent-foreground: 20 14% 6%;

    --destructive: 0 84% 50%;
    --destructive-foreground: 0 0% 100%;

    --border: 20 10% 85%;
    --input: 20 10% 85%;
    --ring: 45 100% 55%;

    --radius: 0.25rem;

    --gradient-hero: linear-gradient(135deg, hsl(20 14% 8% / 0.95), hsl(20 14% 8% / 0.7) 60%, hsl(20 14% 8% / 0.3));
    --gradient-accent: linear-gradient(135deg, hsl(45 100% 60%), hsl(35 100% 55%));
    --shadow-bold: 0 20px 60px -20px hsl(20 14% 8% / 0.4);
    --shadow-glow: 0 0 40px hsl(45 100% 55% / 0.4);
    --transition-smooth: cubic-bezier(0.22, 1, 0.36, 1);
  }

  .dark {
    --background: 20 14% 6%;
    --foreground: 40 20% 95%;

    --card: 20 14% 9%;
    --card-foreground: 40 20% 95%;

    --popover: 20 14% 9%;
    --popover-foreground: 40 20% 95%;

    --primary: 45 100% 55%;
    --primary-foreground: 20 14% 6%;

    --secondary: 20 10% 14%;
    --secondary-foreground: 40 20% 95%;

    --muted: 20 10% 12%;
    --muted-foreground: 40 10% 65%;

    --accent: 45 100% 55%;
    --accent-foreground: 20 14% 6%;

    --destructive: 0 70% 45%;
    --destructive-foreground: 0 0% 100%;

    --border: 20 10% 18%;
    --input: 20 10% 18%;
    --ring: 45 100% 55%;

    --gradient-hero: linear-gradient(135deg, hsl(20 14% 4% / 0.95), hsl(20 14% 4% / 0.6) 60%, hsl(20 14% 4% / 0.2));
    --shadow-bold: 0 20px 60px -20px hsl(0 0% 0% / 0.6);
    --shadow-glow: 0 0 60px hsl(45 100% 55% / 0.5);
  }
}

@layer base {
  * { @apply border-border; }
  body {
    @apply bg-background text-foreground font-sans antialiased;
    font-feature-settings: "kern", "liga", "calt";
  }
  h1, h2, h3, h4 {
    @apply font-display tracking-tight;
    font-feature-settings: "kern", "liga", "calt", "onum";
  }
}

@layer utilities {
  .text-balance { text-wrap: balance; }

  /* Grain dot texture */
  .grain {
    background-image: radial-gradient(hsl(var(--foreground) / 0.04) 1px, transparent 1px);
    background-size: 4px 4px;
  }

  /* Section label: small amber line before */
  .section-label {
    display: inline-flex;
    align-items: center;
    gap: 0.75rem;
    font-size: 0.75rem;
    font-weight: 500;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: hsl(var(--accent));
  }
  .section-label::before {
    content: '';
    display: block;
    width: 2rem;
    height: 1px;
    background: hsl(var(--accent));
    flex-shrink: 0;
  }

  /* Scroll reveal */
  .reveal {
    opacity: 0;
    transform: translateY(24px);
    transition: opacity 0.7s var(--transition-smooth), transform 0.7s var(--transition-smooth);
  }
  .reveal[data-visible="true"] {
    opacity: 1;
    transform: translateY(0);
  }

  @media (prefers-reduced-motion: reduce) {
    .reveal {
      opacity: 1;
      transform: none;
      transition: none;
    }
  }

  /* Service card left-border accent slide on hover */
  .service-card {
    position: relative;
    overflow: hidden;
  }
  .service-card::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 2px;
    background: hsl(var(--accent));
    transform: scaleY(0);
    transform-origin: bottom;
    transition: transform 0.4s var(--transition-smooth);
  }
  .service-card:hover::before {
    transform: scaleY(1);
  }

  /* Nav link underline micro-interaction */
  .nav-link {
    position: relative;
  }
  .nav-link::after {
    content: '';
    position: absolute;
    bottom: -2px;
    left: 0;
    right: 0;
    height: 1px;
    background: hsl(var(--accent));
    transform: scaleX(0);
    transform-origin: left;
    transition: transform 0.3s var(--transition-smooth);
  }
  .nav-link:hover::after {
    transform: scaleX(1);
  }

  /* Hero scroll indicator pulse */
  @keyframes scrollPulse {
    0%, 100% { opacity: 0.4; transform: translateY(0); }
    50% { opacity: 1; transform: translateY(6px); }
  }
  .scroll-indicator {
    animation: scrollPulse 2s ease-in-out infinite;
  }
}
```

- [ ] **Step 2.2: Verify build**

```bash
cd D:/drkolo && npm run build 2>&1 | tail -5
```

Expected: no errors.

- [ ] **Step 2.3: Commit**

```bash
cd D:/drkolo && git add src/index.css && git commit -m "feat: add editorial CSS — reveal animations, section labels, micro-interactions"
```

---

## Task 3: useInView Hook

**Files:**
- Create: `src/hooks/useInView.ts`

- [ ] **Step 3.1: Create the hook**

Create `src/hooks/useInView.ts`:

```ts
import { useEffect, useRef, type RefObject } from "react";

/**
 * Generic IntersectionObserver hook.
 * Attaches to the returned ref and sets data-visible="true" when element enters viewport.
 * One-shot: does not reset when element leaves.
 *
 * Usage: const ref = useInView<HTMLDivElement>();
 */
export function useInView<T extends HTMLElement = HTMLElement>(threshold = 0.15): RefObject<T> {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.setAttribute("data-visible", "true");
          observer.disconnect();
        }
      },
      { threshold }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return ref;
}
```

- [ ] **Step 3.2: Verify TypeScript compiles**

```bash
cd D:/drkolo && npm run build 2>&1 | tail -5
```

Expected: no errors.

- [ ] **Step 3.3: Commit**

```bash
cd D:/drkolo && git add src/hooks/useInView.ts && git commit -m "feat: add useInView hook for scroll-reveal"
```

---

## Task 4: Hero Section — Index.tsx

**Files:**
- Modify: `src/pages/Index.tsx`

- [ ] **Step 4.1: Rewrite the hero section**

Replace the entire `Index.tsx` file content with the following. Read carefully — this is the hero only first, we will add more in later tasks. This is the full file with ALL sections unchanged except the hero:

```tsx
import { Phone, MapPin, Wrench, Bike, Cog, Clock, ShieldCheck, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/SiteHeader";
import { Logo } from "@/components/Logo";
import { useInView } from "@/hooks/useInView";
import heroImg from "@/assets/hero-bike.jpg";
import mechanicImg from "@/assets/service-mechanic.jpg";

const PHONE = "511 061 221";
const PHONE_TEL = "+48511061221";
const ADDRESS = "Kielnieńska 111, Gdańsk 80-299";

const Index = () => {
  const servicesRef = useInView<HTMLDivElement>();
  const aboutImgRef = useInView<HTMLDivElement>();
  const aboutTextRef = useInView<HTMLDivElement>(0.1);
  const contactRef = useInView<HTMLElement>(0.1);

  const services = [
    { icon: Bike, title: "Rowery każdego typu", desc: "MTB, szosowe, gravel, miejskie, dziecięce, elektryczne — kompleksowy serwis." },
    { icon: Cog, title: "Amortyzacja", desc: "Serwis i regeneracja amortyzatorów oraz tylnych zawieszeń." },
    { icon: Wrench, title: "Przeglądy i naprawy", desc: "Diagnostyka, regulacja przerzutek, hamulców, centrowanie kół." },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <SiteHeader activePage="home" />

      {/* ─── HERO ─────────────────────────────────────────── */}
      <section id="top" className="relative pt-16 min-h-screen flex items-center overflow-hidden">
        <img
          src={heroImg}
          alt="Profesjonalny serwis amortyzatora rowerowego"
          width={1920}
          height={1280}
          fetchPriority="high"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-hero" />
        <div className="absolute inset-0 grain opacity-40" />

        {/* Vertical watermark — desktop only */}
        <div className="absolute right-8 top-1/2 -translate-y-1/2 hidden md:flex items-center justify-center pointer-events-none select-none">
          <span
            className="font-display font-bold text-[5rem] leading-none tracking-[0.3em] text-accent"
            style={{ writingMode: "vertical-rl", opacity: 0.07 }}
          >
            DR KOŁO
          </span>
        </div>

        <div className="container relative z-10 py-20 md:py-32">
          <div className="max-w-4xl">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 border border-white/15 text-xs font-medium text-white/80 mb-8 tracking-widest uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
              Kartuzy · Gdańsk
            </div>

            {/* Headline */}
            <h1
              className="font-display font-bold text-white leading-[0.92] tracking-[-0.02em] text-balance"
              style={{ fontSize: "clamp(3rem, 10vw, 9rem)" }}
            >
              Profesjonalny
              <br />
              <em className="not-italic italic font-normal">serwis rowerowy</em>
            </h1>

            <p className="mt-8 text-lg md:text-xl text-white/75 max-w-xl font-sans font-light leading-relaxed">
              Naprawiamy rowery każdego typu oraz amortyzację. Precyzja, doświadczenie i dbałość o każdy detal.
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-6">
              <Button
                asChild
                size="lg"
                className="bg-accent text-accent-foreground hover:bg-accent/90 rounded-none text-base px-10 h-14 shadow-glow font-medium tracking-wide"
              >
                <a href={`tel:${PHONE_TEL}`}>
                  <Phone className="h-4 w-4 mr-2" />
                  {PHONE}
                </a>
              </Button>
              <a
                href="#uslugi"
                className="nav-link text-white/80 hover:text-white text-sm font-medium tracking-wide transition-colors pb-0.5"
              >
                Nasze usługi
              </a>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 scroll-indicator">
          <ChevronDown className="h-5 w-5 text-white/40" />
        </div>

        {/* Bottom editorial rule */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-accent/30" />
      </section>

      {/* ─── SERVICES ─────────────────────────────────────── */}
      <section id="uslugi" className="py-24 md:py-36">
        <div className="container">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-20">
            <div>
              <div className="section-label mb-5">Usługi</div>
              <h2
                className="font-display font-bold text-balance leading-[0.95] tracking-[-0.02em]"
                style={{ fontSize: "clamp(2.25rem, 6vw, 5rem)" }}
              >
                Każda naprawa
                <br />
                wykonana <em className="italic font-normal">z pasją.</em>
              </h2>
            </div>
            <p className="text-muted-foreground max-w-xs font-display italic text-lg leading-relaxed">
              Od podstawowego przeglądu po kompleksową regenerację zawieszenia — zajmiemy się Twoim rowerem.
            </p>
          </div>

          <div
            ref={servicesRef}
            className="reveal grid md:grid-cols-3 gap-px bg-border"
          >
            {services.map((s, i) => (
              <div
                key={s.title}
                className="service-card group relative p-10 bg-background hover:bg-card transition-colors duration-300"
                style={{ transitionDelay: `${i * 100}ms` }}
              >
                {/* Giant background numeral */}
                <div
                  className="absolute bottom-4 right-4 font-display font-bold text-foreground pointer-events-none select-none leading-none"
                  style={{ fontSize: "9rem", opacity: 0.05 }}
                  aria-hidden="true"
                >
                  0{i + 1}
                </div>

                {/* Card number */}
                <div className="text-xs font-mono text-accent mb-8 tracking-widest">
                  0{i + 1}
                </div>

                <h3 className="font-display font-semibold text-xl mb-4 leading-tight">{s.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed mb-12">{s.desc}</p>

                {/* Icon bottom-left */}
                <div className="w-10 h-10 rounded-none border border-border flex items-center justify-center text-accent group-hover:bg-accent group-hover:text-accent-foreground group-hover:border-accent transition-colors">
                  <s.icon className="h-4 w-4" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── ABOUT ────────────────────────────────────────── */}
      <section id="o-nas" className="py-24 md:py-36 bg-secondary">
        <div className="container grid md:grid-cols-2 gap-12 lg:gap-20 items-center">
          <div
            ref={aboutImgRef}
            className="reveal relative"
          >
            <img
              src={mechanicImg}
              alt="Mechanik podczas serwisu roweru"
              width={1280}
              height={1280}
              loading="lazy"
              className="w-full h-[580px] object-cover shadow-bold"
            />
            {/* Typographic callout */}
            <div className="absolute -bottom-6 -right-6 hidden md:block max-w-[180px]">
              <div className="border-t-2 border-accent pt-3">
                <p className="font-display italic text-accent text-lg leading-snug">
                  Doświadczenie<br />i precyzja
                </p>
              </div>
            </div>
          </div>

          <div
            ref={aboutTextRef}
            className="reveal"
            style={{ transitionDelay: "150ms" }}
          >
            <div className="section-label mb-5">O nas</div>

            {/* Pull quote */}
            <p className="font-display italic text-accent text-xl mb-6 leading-relaxed">
              „Każdy rower zasługuje na najlepszą opiekę."
            </p>

            <h2
              className="font-display font-bold mb-6 text-balance leading-[0.95] tracking-[-0.02em]"
              style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)" }}
            >
              Doktor <em className="italic font-normal">od rowerów.</em>
              <br />
              Diagnoza, kuracja, gwarancja.
            </h2>
            <p className="text-muted-foreground text-lg mb-8 leading-relaxed font-sans">
              Dr Koło to serwis prowadzony przez pasjonatów dwóch kółek. Niezależnie od tego, czy jeździsz po mieście, w góry, czy startujesz w wyścigach — przywrócimy Twój rower do idealnej formy.
            </p>
            <ul className="space-y-0 divide-y divide-border/40">
              {[
                { icon: ShieldCheck, t: "Gwarancja na wykonane usługi" },
                { icon: Clock, t: "Szybkie terminy realizacji" },
                { icon: Cog, t: "Specjalistyczne narzędzia i części" },
              ].map((f) => (
                <li key={f.t} className="flex items-center gap-4 py-4">
                  <span className="text-accent font-mono text-lg leading-none">—</span>
                  <span className="font-medium text-sm tracking-wide">{f.t}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ─── CONTACT ──────────────────────────────────────── */}
      <section
        id="kontakt"
        ref={contactRef}
        className="reveal py-24 md:py-36 bg-primary text-primary-foreground relative overflow-hidden"
      >
        <div className="absolute inset-0 grain opacity-20" />
        <div className="container relative">
          <div className="section-label mb-5" style={{ color: "hsl(var(--accent))" }}>Kontakt</div>
          <h2
            className="font-display font-bold mb-16 max-w-3xl text-balance leading-[0.95] tracking-[-0.02em]"
            style={{ fontSize: "clamp(2.25rem, 6vw, 5rem)" }}
          >
            Twój rower w dobrych rękach.
            <br />
            <em className="italic font-normal">Zadzwoń lub wpadnij.</em>
          </h2>

          <div className="grid md:grid-cols-2 gap-px bg-white/10">
            {/* Phone card */}
            <a
              href={`tel:${PHONE_TEL}`}
              className="group flex flex-col p-10 md:p-14 bg-accent text-accent-foreground hover:shadow-glow transition-shadow duration-500"
            >
              <Phone className="h-7 w-7 mb-8 opacity-60" />
              <div className="text-xs font-medium opacity-60 uppercase tracking-[0.2em] mb-3">Telefon</div>
              <div
                className="font-display font-bold leading-none tracking-[-0.02em] mb-8"
                style={{ fontSize: "clamp(2rem, 6vw, 4rem)" }}
              >
                {PHONE}
              </div>
              <div className="mt-auto text-sm font-medium opacity-70 group-hover:opacity-100 transition-opacity tracking-wide">
                Zadzwoń teraz →
              </div>
            </a>

            {/* Address card */}
            <a
              href="https://maps.google.com/?q=Kielnieńska+111+Gdańsk"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col p-10 md:p-14 bg-primary border-t-2 border-accent/40 hover:border-accent transition-colors duration-300"
            >
              <MapPin className="h-7 w-7 mb-8 text-accent opacity-70" />
              <div className="text-xs font-medium opacity-60 uppercase tracking-[0.2em] mb-3">Adres</div>
              <div
                className="font-display font-bold leading-none tracking-[-0.02em] mb-2"
                style={{ fontSize: "clamp(1.5rem, 4vw, 2.5rem)" }}
              >
                Kielnieńska 111
              </div>
              <div className="text-lg opacity-70 mb-8">Gdańsk 80-299</div>

              <div className="space-y-0 divide-y divide-white/10 mb-8">
                <div className="flex items-center gap-3 py-3 opacity-80">
                  <Clock className="h-4 w-4 text-accent flex-shrink-0" />
                  <span className="text-sm">Pon – Pt: 10:00 – 19:00</span>
                </div>
                <div className="flex items-center gap-3 py-3 opacity-80">
                  <Clock className="h-4 w-4 text-accent flex-shrink-0" />
                  <span className="text-sm">Sobota: 10:00 – 16:00</span>
                </div>
              </div>

              <div className="mt-auto text-sm font-medium text-accent opacity-70 group-hover:opacity-100 transition-opacity tracking-wide">
                Otwórz w mapach →
              </div>
            </a>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ───────────────────────────────────────── */}
      <footer className="py-10 border-t-2 border-accent/30">
        <div
          className="container flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-muted-foreground tracking-[0.05em] uppercase"
        >
          <Logo className="h-7" />
          <div>{ADDRESS} · {PHONE}</div>
          <div>© {new Date().getFullYear()} Dr Koło. Wszelkie prawa zastrzeżone.</div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
```

- [ ] **Step 4.2: Verify TypeScript compiles with no errors**

```bash
cd D:/drkolo && npm run build 2>&1 | tail -20
```

Expected: no TypeScript errors, successful build.

If you see a TypeScript error about `ref` prop type on `<div>`, cast it: `ref={servicesRef as React.RefObject<HTMLDivElement>}` — this is already in the code above.

- [ ] **Step 4.3: Start dev server and visually verify**

```bash
cd D:/drkolo && npm run dev
```

Open `http://localhost:5173` and check:
- Cormorant Garamond loads for headings (large serif font)
- DM Sans for body text
- Hero headline is oversized (~3rem+ on mobile, much larger on desktop)
- "serwis rowerowy" is in italic
- Vertical "DR KOŁO" watermark visible on desktop
- Animated scroll chevron at bottom of hero
- Amber rule at very bottom of hero
- Badge has no blur fill, clean border
- "Nasze usługi" is a plain text link, not an outline button
- Service cards: giant faint numerals in background, icon at bottom, amber left-border slides in on hover
- About section: no amber box overlay, instead thin amber overline with italic text
- Pull quote in amber italic above the about headline
- Contact: phone number in large Cormorant serif, sharp corners (no rounded), top amber accent border on address card
- Footer: amber top border, uppercase small tracking text

- [ ] **Step 4.4: Commit**

```bash
cd D:/drkolo && git add src/pages/Index.tsx && git commit -m "feat: premium editorial redesign — Cormorant serif, scroll reveals, refined micro-interactions"
```

---

## Task 5: Verify Mobile Responsiveness

**Files:** No code changes — visual verification only.

- [ ] **Step 5.1: Check mobile in browser DevTools**

With dev server running (`npm run dev`):
1. Open DevTools → Toggle device toolbar (Ctrl+Shift+M)
2. Set to iPhone 12 Pro (390px width)

Check:
- Hero H1 at ~3rem — readable, not wrapping awkwardly
- "DR KOŁO" vertical watermark is NOT visible (hidden on mobile)
- Service cards stack to 1 column
- Giant background numerals still visible but proportional
- About section: stacks to single column, pull quote readable
- Contact cards: stack vertically, phone number scales down

- [ ] **Step 5.2: Check tablet (768px)**

Set to iPad Mini (768px). All sections should switch to 2-column layouts at this breakpoint. Verify nothing overlaps or breaks.

- [ ] **Step 5.3: Final production build check**

```bash
cd D:/drkolo && npm run build 2>&1 | tail -10
```

Expected: successful build, no warnings about large bundle sizes that weren't already there.

- [ ] **Step 5.4: Commit if any fixes were needed**

If you made any responsive fixes during steps 5.1–5.2:
```bash
cd D:/drkolo && git add src/pages/Index.tsx && git commit -m "fix: mobile responsive adjustments for premium redesign"
```

If no fixes needed, skip this step.

---

## Notes for the Implementer

1. **Font loading:** The Google Fonts URL in Task 1 loads Cormorant Garamond in weights 300/400/600/700 + italics, and DM Sans in regular/medium + italic. The `display=swap` prevents invisible text during load.

2. **`useInView` ref typing:** The hook returns `useRef<HTMLElement | null>` which is the base type. When attaching to a `<div>` or `<section>`, cast it: `ref={myRef as React.RefObject<HTMLDivElement>}`. This is intentional — the hook works on any HTML element.

3. **Services grid gap:** The `gap-px bg-border` technique on the grid creates a 1px border between cards using the background color showing through. This is more editorial than individual card borders.

4. **`section-label` in dark contact section:** The section-label `::before` line uses `hsl(var(--accent))` which is amber — it works on both light and dark backgrounds. The label text is already amber via the `.section-label` class. In the contact section, apply it with `style={{ color: "hsl(var(--accent))" }}` since the section has `text-primary-foreground` which would otherwise override the color.

5. **`em` italic in JSX:** Using `<em className="italic font-normal">` keeps the semantic meaning (emphasis) while controlling the visual style. `not-italic italic` on the parent resets Tailwind's default italic removal and then re-applies it — or just use `italic` on the `<em>` directly.
