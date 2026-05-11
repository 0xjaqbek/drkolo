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

              <div className="divide-y divide-white/10 mb-8">
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

          {/* Kartuzy pickup strip */}
          <div className="mt-px border-t border-white/10 flex flex-col sm:flex-row sm:items-center gap-4 px-10 py-6 bg-primary/80">
            <div className="flex items-center gap-3 flex-1">
              <MapPin className="h-4 w-4 text-accent flex-shrink-0 opacity-70" />
              <div className="text-sm leading-relaxed">
                <span className="font-medium text-primary-foreground/90 tracking-wide">Dowóz / odbiór · Kartuzy, ul. Słowackiego 36</span>
                <span className="block text-primary-foreground/55 text-xs mt-0.5 tracking-wide">
                  Wymagany wcześniejszy kontakt telefoniczny
                </span>
              </div>
            </div>
            <a
              href={`tel:${PHONE_TEL}`}
              className="inline-flex items-center gap-2 text-sm text-accent font-medium tracking-wide hover:opacity-80 transition-opacity whitespace-nowrap"
            >
              <Phone className="h-3.5 w-3.5" />
              Zadzwoń wcześniej
            </a>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ───────────────────────────────────────── */}
      <footer className="py-10 border-t-2 border-accent/30">
        <div className="container flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-muted-foreground tracking-[0.05em] uppercase">
          <Logo className="h-7" />
          <div>{ADDRESS} · {PHONE}</div>
          <div>© {new Date().getFullYear()} Dr Koło. Wszelkie prawa zastrzeżone.</div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
