import { Phone, MapPin, Wrench, Bike, Cog, Clock, ShieldCheck, ChevronDown } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/SiteHeader";
import { Logo } from "@/components/Logo";
import { useInView } from "@/hooks/useInView";
const heroImg = "/hero-bike.jpg";
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

        {/* Social icons — top left */}
        <div className="absolute top-20 left-6 md:left-8 z-20 flex flex-row gap-2.5">
          <a
            href="https://www.facebook.com/profile.php?id=61588984934581"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Dr Koło na Facebooku"
            className="flex items-center justify-center w-9 h-9 border border-white/20 bg-black/20 backdrop-blur-sm text-white/50 hover:text-white hover:border-white/50 hover:bg-black/40 transition-all duration-200"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
          </a>
          <a
            href="https://www.instagram.com/drkolo_serwis/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Dr Koło na Instagramie"
            className="flex items-center justify-center w-9 h-9 border border-white/20 bg-black/20 backdrop-blur-sm text-white/50 hover:text-white hover:border-white/50 hover:bg-black/40 transition-all duration-200"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
            </svg>
          </a>
        </div>

        {/* Vertical watermark — desktop only */}
        <div className="absolute right-8 top-1/2 -translate-y-1/2 hidden md:flex items-center justify-center pointer-events-none select-none">
          <span
            className="font-display font-bold text-accent leading-none tracking-[0.3em]"
            style={{ writingMode: "vertical-rl", fontSize: "5rem", opacity: 0.07 }}
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
              <em className="italic font-normal">serwis rowerowy</em>
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
                <div className="w-10 h-10 border border-border flex items-center justify-center text-accent group-hover:bg-accent group-hover:text-accent-foreground group-hover:border-accent transition-colors">
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
          <div ref={aboutImgRef} className="reveal relative">
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
            <ul className="divide-y divide-border/40">
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
        className="reveal py-24 md:py-36 bg-primary dark:bg-card text-primary-foreground dark:text-card-foreground relative overflow-hidden"
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

          <div className="grid md:grid-cols-3 gap-px bg-white/10">
            {/* Phone card */}
            <a
              href={`tel:${PHONE_TEL}`}
              className="group flex flex-col p-10 md:p-14 bg-accent text-accent-foreground hover:shadow-glow transition-shadow duration-500"
            >
              <Phone className="h-7 w-7 mb-8 opacity-60" />
              <div className="text-xs font-medium opacity-60 uppercase tracking-[0.2em] mb-3">Telefon</div>
              <div
                className="font-display font-bold leading-none tracking-[-0.02em] mb-8"
                style={{ fontSize: "clamp(1.5rem, 4vw, 3rem)" }}
              >
                {PHONE}
              </div>
              <div className="mt-auto text-sm font-medium opacity-70 group-hover:opacity-100 transition-opacity tracking-wide">
                Zadzwoń teraz →
              </div>
            </a>

            {/* Gdańsk address card */}
            <div className="flex flex-col bg-primary dark:bg-background border-t-2 border-accent/40">
              <a
                href="https://www.google.com/maps?cid=10548225081155555452"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex flex-col p-10 md:p-14 pb-6"
              >
                <MapPin className="h-7 w-7 mb-8 text-accent opacity-70" />
                <div className="text-xs font-medium opacity-60 uppercase tracking-[0.2em] mb-3">Gdańsk</div>
                <div
                  className="font-display font-bold leading-none tracking-[-0.02em] mb-2"
                  style={{ fontSize: "clamp(1.25rem, 3vw, 2rem)" }}
                >
                  Kielnieńska 111
                </div>
                <div className="text-base opacity-70 mb-8">Gdańsk 80-299</div>

                <div className="divide-y divide-white/10 mb-4">
                  <div className="flex items-center gap-3 py-3 opacity-80">
                    <Clock className="h-4 w-4 text-accent flex-shrink-0" />
                    <span className="text-sm">Pon – Pt: 10:00 – 19:00</span>
                  </div>
                  <div className="flex items-center gap-3 py-3 opacity-80">
                    <Clock className="h-4 w-4 text-accent flex-shrink-0" />
                    <span className="text-sm">Sobota: 10:00 – 16:00</span>
                  </div>
                </div>

                <div className="text-sm font-medium text-accent opacity-70 group-hover:opacity-100 transition-opacity tracking-wide">
                  Otwórz w mapach →
                </div>
              </a>
              {/* Embedded Google Map */}
              <div className="px-4 pb-4">
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2321.5!2d18.56827!3d54.38975!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x924f3a97b3e7d4ec!2sDr+Ko%C5%82o!5e0!3m2!1spl!2spl!4v1"
                  width="100%"
                  height="180"
                  style={{ border: 0, borderRadius: "0.25rem", opacity: 0.85 }}
                  allowFullScreen={false}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Dr Koło — mapa lokalizacji Gdańsk"
                ></iframe>
              </div>
            </div>

            {/* Kartuzy pickup card */}
            <a
              href={`tel:${PHONE_TEL}`}
              className="group flex flex-col p-10 md:p-14 bg-primary dark:bg-background border-t-2 border-accent/40 hover:border-accent transition-colors duration-300"
            >
              <MapPin className="h-7 w-7 mb-8 text-accent opacity-70" />
              <div className="text-xs font-medium opacity-60 uppercase tracking-[0.2em] mb-3">Kartuzy · Dowóz / odbiór</div>
              <div
                className="font-display font-bold leading-none tracking-[-0.02em] mb-2"
                style={{ fontSize: "clamp(1.25rem, 3vw, 2rem)" }}
              >
                Słowackiego 36
              </div>
              <div className="text-base opacity-70 mb-8">Kartuzy</div>

              <div className="border-t border-white/10 pt-4 mb-8">
                <p className="text-sm opacity-70 leading-relaxed">
                  Wymagany wcześniejszy kontakt telefoniczny przed przywiezieniem roweru.
                </p>
              </div>

              <div className="mt-auto inline-flex items-center gap-2 text-sm font-medium text-accent opacity-70 group-hover:opacity-100 transition-opacity tracking-wide">
                <Phone className="h-3.5 w-3.5" />
                Zadzwoń wcześniej →
              </div>
            </a>
          </div>

          {/* Social strip */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 mt-px px-10 md:px-14 py-8 bg-primary dark:bg-background border-t border-white/10">
            <span className="text-xs font-medium opacity-40 uppercase tracking-[0.2em] shrink-0">Obserwuj nas</span>
            <div className="flex items-center gap-6">
              <a
                href="https://www.facebook.com/profile.php?id=61588984934581"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Dr Koło na Facebooku"
                className="flex items-center gap-2.5 text-sm font-medium opacity-60 hover:opacity-100 hover:text-accent transition-all duration-200"
              >
                <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                Facebook
              </a>
              <a
                href="https://www.instagram.com/drkolo_serwis/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Dr Koło na Instagramie"
                className="flex items-center gap-2.5 text-sm font-medium opacity-60 hover:opacity-100 hover:text-accent transition-all duration-200"
              >
                <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
                Instagram
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ───────────────────────────────────────── */}
      <footer className="py-10 border-t-2 border-accent/30">
        <div className="container flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-muted-foreground tracking-[0.05em] uppercase">
          <div className="flex items-center gap-4">
            <Logo className="h-7" />
            <div className="flex items-center gap-2">
              <a
                href="https://www.facebook.com/profile.php?id=61588984934581"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className="opacity-40 hover:opacity-100 hover:text-accent transition-all duration-200"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </a>
              <a
                href="https://www.instagram.com/drkolo_serwis/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="opacity-40 hover:opacity-100 hover:text-accent transition-all duration-200"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </a>
            </div>
          </div>
          <div>{ADDRESS} · {PHONE}</div>
          <div className="flex items-center gap-3">
            <span>© {new Date().getFullYear()} Dr Koło</span>
            <span className="text-border">·</span>
            <Link to="/polityka-prywatnosci" className="hover:text-accent transition-colors">Polityka prywatności</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
