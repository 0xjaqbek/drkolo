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

  const linkClass =
    "block py-3 text-sm font-medium hover:text-accent transition-colors border-b border-border/50";

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
