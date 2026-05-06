import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Phone, MapPin, Wrench, Bike, Cog, ArrowUpRight, Clock, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import heroImg from "@/assets/hero-bike.jpg";
import mechanicImg from "@/assets/service-mechanic.jpg";

const PHONE = "511 061 221";
const PHONE_TEL = "+48511061221";
const ADDRESS = "Kielnieńska 111, Gdańsk 80-299";

const Index = () => {
  useEffect(() => {
    document.title = "Dr Koło — Profesjonalny Serwis Rowerowy | Gdańsk Kartuzy";
    const desc = "Dr Koło — profesjonalny serwis rowerowy w Gdańsku i Kartuzach. Naprawa rowerów każdego typu oraz amortyzacji. Tel. 511 061 221.";
    let m = document.querySelector('meta[name="description"]');
    if (!m) { m = document.createElement("meta"); m.setAttribute("name", "description"); document.head.appendChild(m); }
    m.setAttribute("content", desc);
  }, []);

  const services = [
    { icon: Bike, title: "Rowery każdego typu", desc: "MTB, szosowe, gravel, miejskie, dziecięce, elektryczne — kompleksowy serwis." },
    { icon: Cog, title: "Amortyzacja", desc: "Serwis i regeneracja amortyzatorów oraz tylnych zawieszeń." },
    { icon: Wrench, title: "Przeglądy i naprawy", desc: "Diagnostyka, regulacja przerzutek, hamulców, centrowanie kół." },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
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

      {/* Hero */}
      <section id="top" className="relative pt-16 min-h-screen flex items-center overflow-hidden">
        <img
          src={heroImg}
          alt="Profesjonalny serwis amortyzatora rowerowego"
          width={1920}
          height={1280}
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-hero" />
        <div className="absolute inset-0 grain opacity-40" />

        <div className="container relative z-10 py-20 md:py-32">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/20 bg-white/5 backdrop-blur text-xs font-medium text-white/90 mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
              Kartuzy · Gdańsk
            </div>
            <h1 className="font-display font-bold text-5xl md:text-7xl lg:text-8xl text-white leading-[0.95] text-balance">
              Profesjonalny <br />
              <span className="text-accent">serwis rowerowy</span>
            </h1>
            <p className="mt-6 text-lg md:text-xl text-white/80 max-w-xl">
              Naprawiamy rowery każdego typu oraz amortyzację. Precyzja, doświadczenie i dbałość o każdy detal.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90 rounded-full text-base px-8 h-14 shadow-glow">
                <a href={`tel:${PHONE_TEL}`}>
                  <Phone className="h-4 w-4 mr-2" />
                  {PHONE}
                </a>
              </Button>
              <Button asChild size="lg" variant="outline" className="rounded-full text-base px-8 h-14 bg-transparent border-white/30 text-white hover:bg-white/10 hover:text-white">
                <a href="#uslugi">
                  Nasze usługi
                  <ArrowUpRight className="h-4 w-4 ml-2" />
                </a>
              </Button>
            </div>

            <div className="mt-16 grid grid-cols-2 md:grid-cols-3 gap-8 max-w-2xl">
              {[
                { k: "15+", v: "lat doświadczenia" },
                { k: "5000+", v: "naprawionych rowerów" },
                { k: "100%", v: "gwarancji jakości" },
              ].map((s) => (
                <div key={s.v}>
                  <div className="font-display text-3xl md:text-4xl font-bold text-accent">{s.k}</div>
                  <div className="text-sm text-white/70 mt-1">{s.v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Services */}
      <section id="uslugi" className="py-24 md:py-32">
        <div className="container">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16">
            <div>
              <div className="text-sm font-medium text-accent uppercase tracking-widest mb-3">Usługi</div>
              <h2 className="font-display font-bold text-4xl md:text-6xl max-w-2xl text-balance">
                Każda naprawa wykonana z pasją.
              </h2>
            </div>
            <p className="text-muted-foreground max-w-sm">
              Od podstawowego przeglądu po kompleksową regenerację zawieszenia — zajmiemy się Twoim rowerem.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {services.map((s, i) => (
              <div
                key={s.title}
                className="group relative p-8 bg-card border border-border rounded-lg hover:border-accent transition-all duration-500 hover:-translate-y-1 hover:shadow-bold"
              >
                <div className="absolute top-6 right-6 text-xs font-mono text-muted-foreground">
                  0{i + 1}
                </div>
                <div className="w-12 h-12 rounded-full bg-accent/10 text-accent flex items-center justify-center mb-6 group-hover:bg-accent group-hover:text-accent-foreground transition-colors">
                  <s.icon className="h-5 w-5" />
                </div>
                <h3 className="font-display font-semibold text-xl mb-3">{s.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About */}
      <section id="o-nas" className="py-24 md:py-32 bg-secondary">
        <div className="container grid md:grid-cols-2 gap-12 lg:gap-20 items-center">
          <div className="relative">
            <img
              src={mechanicImg}
              alt="Mechanik podczas serwisu roweru"
              width={1280}
              height={1280}
              loading="lazy"
              className="w-full h-[500px] object-cover rounded-lg shadow-bold"
            />
            <div className="absolute -bottom-6 -right-6 bg-accent text-accent-foreground p-6 rounded-lg max-w-[200px] hidden md:block">
              <Wrench className="h-6 w-6 mb-2" />
              <div className="font-display font-bold text-lg leading-tight">Doświadczenie i precyzja</div>
            </div>
          </div>
          <div>
            <div className="text-sm font-medium text-accent uppercase tracking-widest mb-3">O nas</div>
            <h2 className="font-display font-bold text-4xl md:text-5xl mb-6 text-balance">
              Doktor od rowerów. Diagnoza, kuracja, gwarancja.
            </h2>
            <p className="text-muted-foreground text-lg mb-8 leading-relaxed">
              Dr Koło to serwis prowadzony przez pasjonatów dwóch kółek. Niezależnie od tego, czy jeździsz po mieście, w góry, czy startujesz w wyścigach — przywrócimy Twój rower do idealnej formy.
            </p>
            <ul className="space-y-4">
              {[
                { icon: ShieldCheck, t: "Gwarancja na wykonane usługi" },
                { icon: Clock, t: "Szybkie terminy realizacji" },
                { icon: Cog, t: "Specjalistyczne narzędzia i części" },
              ].map((f) => (
                <li key={f.t} className="flex items-center gap-3">
                  <span className="w-9 h-9 rounded-full bg-background border border-border flex items-center justify-center text-accent">
                    <f.icon className="h-4 w-4" />
                  </span>
                  <span className="font-medium">{f.t}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section id="kontakt" className="py-24 md:py-32 bg-primary text-primary-foreground relative overflow-hidden">
        <div className="absolute inset-0 grain opacity-20" />
        <div className="container relative">
          <div className="text-sm font-medium text-accent uppercase tracking-widest mb-3">Kontakt</div>
          <h2 className="font-display font-bold text-4xl md:text-6xl mb-12 max-w-3xl text-balance">
            Twój rower w dobrych rękach. Zadzwoń lub wpadnij.
          </h2>

          <div className="grid md:grid-cols-2 gap-6">
            <a
              href={`tel:${PHONE_TEL}`}
              className="group p-8 md:p-10 rounded-lg bg-accent text-accent-foreground hover:scale-[1.02] transition-transform duration-500"
            >
              <Phone className="h-8 w-8 mb-6" />
              <div className="text-sm font-medium opacity-70 uppercase tracking-wider mb-2">Telefon</div>
              <div className="font-display font-bold text-3xl md:text-5xl mb-4">{PHONE}</div>
              <div className="inline-flex items-center text-sm font-medium">
                Zadzwoń teraz <ArrowUpRight className="h-4 w-4 ml-1 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
              </div>
            </a>

            <a
              href="https://maps.google.com/?q=Kielnieńska+111+Gdańsk"
              target="_blank"
              rel="noopener noreferrer"
              className="group p-8 md:p-10 rounded-lg border border-white/15 hover:border-accent transition-colors"
            >
              <MapPin className="h-8 w-8 mb-6 text-accent" />
              <div className="text-sm font-medium opacity-70 uppercase tracking-wider mb-2">Adres</div>
              <div className="font-display font-bold text-2xl md:text-3xl mb-2">Kielnieńska 111</div>
              <div className="text-lg opacity-80 mb-4">Gdańsk 80-299</div>
              <div className="inline-flex items-center text-sm font-medium text-accent">
                Otwórz w mapach <ArrowUpRight className="h-4 w-4 ml-1 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
              </div>
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 border-t border-border">
        <div className="container flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2 font-display font-bold text-foreground">
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-accent text-accent-foreground">
              <Bike className="h-3.5 w-3.5" />
            </span>
            Dr Koło
          </div>
          <div>{ADDRESS} · {PHONE}</div>
          <div>© {new Date().getFullYear()} Dr Koło. Wszelkie prawa zastrzeżone.</div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
