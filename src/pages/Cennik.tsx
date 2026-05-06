import { useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Bike, Wrench, Cog, ArrowLeft,
  ClipboardList, Settings, CircleDot,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/SiteHeader";

const PHONE = "511 061 221";
const ADDRESS = "Kielnieńska 111, Gdańsk 80-299";

const categories = [
  {
    icon: ClipboardList,
    title: "Przeglądy",
    items: [
      { name: "Przegląd podstawowy", price: "80 zł" },
      { name: "Przegląd rozszerzony", price: "150 zł" },
      { name: "Przegląd kompleksowy", price: "250 zł" },
    ],
  },
  {
    icon: Wrench,
    title: "Naprawy",
    items: [
      { name: "Regulacja przerzutek", price: "50 zł" },
      { name: "Regulacja hamulców", price: "40 zł" },
      { name: "Wymiana linki / pancerza", price: "30 zł" },
      { name: "Naprawa przebicia", price: "25 zł" },
    ],
  },
  {
    icon: Cog,
    title: "Amortyzacja",
    items: [
      { name: "Serwis amortyzatora przedniego", price: "od 120 zł" },
      { name: "Serwis tylnego zawieszenia", price: "od 150 zł" },
      { name: "Wymiana oleju", price: "80 zł" },
    ],
    note: "Cena zależna od modelu amortyzatora.",
  },
  {
    icon: CircleDot,
    title: "Koła",
    items: [
      { name: "Centrowanie koła", price: "60 zł" },
      { name: "Wymiana szprychy", price: "15 zł" },
      { name: "Montaż opony", price: "20 zł" },
      { name: "Wymiana dętki", price: "25 zł" },
    ],
  },
  {
    icon: Settings,
    title: "Napęd",
    items: [
      { name: "Wymiana łańcucha", price: "40 zł" },
      { name: "Wymiana kasety", price: "30 zł" },
      { name: "Wymiana suportu", price: "od 60 zł" },
      { name: "Czyszczenie napędu", price: "50 zł" },
    ],
  },
];

const Cennik = () => {
  useEffect(() => {
    document.title = "Cennik usług — Dr Koło: Serwis Rowerowy Gdańsk";
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) { canonical = document.createElement("link"); canonical.rel = "canonical"; document.head.appendChild(canonical); }
    canonical.href = "https://drkolo.pl/cennik";
    let desc = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    if (desc) desc.setAttribute("content", "Cennik serwisu rowerowego Dr Koło — Gdańsk, Kartuzy. Przeglądy, naprawy, serwis amortyzatorów, koła, napęd. Sprawdź aktualne ceny.");
    return () => {
      if (canonical) canonical.href = "https://drkolo.pl/";
      if (desc) desc.setAttribute("content", "Dr Koło — profesjonalny serwis rowerowy w Gdańsku i Kartuzach. Naprawa rowerów MTB, szosowych, gravel, elektrycznych. Serwis amortyzatorów. Tel. 511 061 221.");
    };
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <SiteHeader activePage="cennik" />

      {/* Content */}
      <main className="pt-16">
        <section className="py-24 md:py-32">
          <div className="container">
            {/* Back button */}
            <div className="mb-10">
              <Button asChild variant="outline" size="sm" className="rounded-full">
                <Link to="/"><ArrowLeft className="h-3.5 w-3.5 mr-1.5" />Wróć</Link>
              </Button>
            </div>

            {/* Heading */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16">
              <div>
                <div className="text-sm font-medium text-accent uppercase tracking-widest mb-3">Cennik</div>
                <h1 className="font-display font-bold text-4xl md:text-6xl max-w-2xl text-balance">
                  Przejrzyste ceny, bez niespodzianek.
                </h1>
              </div>
              <p className="text-muted-foreground max-w-sm">
                Poniższe ceny mają charakter orientacyjny. Ostateczna wycena po oględzinach roweru.
              </p>
            </div>

            {/* Price cards */}
            <div className="grid md:grid-cols-2 gap-6">
              {categories.map((cat, i) => (
                <div
                  key={cat.title}
                  className="group relative p-8 bg-card border border-border rounded-lg hover:border-accent transition-all duration-500 hover:-translate-y-1 hover:shadow-bold"
                >
                  <div className="absolute top-6 right-6 text-xs font-mono text-muted-foreground">
                    0{i + 1}
                  </div>
                  <div className="w-12 h-12 rounded-full bg-accent/10 text-accent flex items-center justify-center mb-6 group-hover:bg-accent group-hover:text-accent-foreground transition-colors">
                    <cat.icon className="h-5 w-5" />
                  </div>
                  <h2 className="font-display font-semibold text-xl mb-4">{cat.title}</h2>
                  <ul>
                    {cat.items.map((item, j) => (
                      <li
                        key={item.name}
                        className={`flex items-center justify-between py-3 ${j < cat.items.length - 1 ? "border-b border-border" : ""}`}
                      >
                        <span className="text-sm text-muted-foreground">{item.name}</span>
                        <span className="font-mono text-sm font-semibold text-accent ml-4 shrink-0">{item.price}</span>
                      </li>
                    ))}
                  </ul>
                  {cat.note && (
                    <p className="mt-4 text-xs text-muted-foreground italic">{cat.note}</p>
                  )}
                </div>
              ))}
            </div>

            {/* Bottom note */}
            <p className="mt-10 text-center text-sm text-muted-foreground">
              Ceny są orientacyjne. Ostateczna wycena po oględzinach roweru.
            </p>
          </div>
        </section>
      </main>

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

export default Cennik;
