import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/SiteHeader";
import { Logo } from "@/components/Logo";

const ADDRESS = "Kielnieńska 111, Gdańsk 80-299";
const PHONE = "511 061 221";

export default function PolitykaPrywatnosci() {
  useEffect(() => {
    document.title = "Polityka prywatności — Dr Koło: Serwis Rowerowy Gdańsk";

    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = "https://drkolo.pl/polityka-prywatnosci";

    const desc = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    if (desc) desc.setAttribute("content", "Polityka prywatności serwisu rowerowego Dr Koło w Gdańsku. Informacje o przetwarzaniu danych osobowych zgodnie z RODO.");

    return () => {
      document.title = "Dr Koło — Profesjonalny Serwis Rowerowy | Gdańsk · Kartuzy";
      if (canonical) canonical.href = "https://drkolo.pl/";
      if (desc) desc.setAttribute("content", "Dr Koło — profesjonalny serwis rowerowy w Gdańsku i Kartuzach. Naprawa rowerów MTB, szosowych, gravel, elektrycznych. Serwis amortyzatorów. Tel. 511 061 221.");
    };
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      <main className="pt-16">
        <section className="py-24 md:py-32">
          <div className="container max-w-3xl">
            <div className="mb-10">
              <Button asChild variant="outline" size="sm" className="rounded-full">
                <Link to="/"><ArrowLeft className="h-3.5 w-3.5 mr-1.5" />Wróć</Link>
              </Button>
            </div>

            <h1 className="font-display font-bold text-3xl md:text-5xl mb-12">
              Polityka prywatności
            </h1>

            <div className="prose prose-sm dark:prose-invert max-w-none space-y-8 text-muted-foreground">
              <section>
                <h2 className="text-foreground font-display font-semibold text-xl mb-3">1. Administrator danych</h2>
                <p>
                  Administratorem Twoich danych osobowych jest Dr Koło z siedzibą przy ul. Kielnieńskiej 111, 80-299 Gdańsk
                  (dalej: „Administrator"). Kontakt: tel. <a href="tel:+48511061221" className="text-accent">511 061 221</a>.
                </p>
              </section>

              <section>
                <h2 className="text-foreground font-display font-semibold text-xl mb-3">2. Jakie dane zbieramy</h2>
                <p>W ramach korzystania z naszej strony i usług możemy przetwarzać następujące dane:</p>
                <ul className="list-disc pl-6 space-y-1">
                  <li><strong>Formularz rezerwacji:</strong> imię i nazwisko, numer telefonu, marka i model roweru, opis usterki.</li>
                  <li><strong>Formularz zlecenia:</strong> imię i nazwisko, numer telefonu, dane roweru.</li>
                  <li><strong>Dane analityczne:</strong> adres strony, z której nastąpiło wejście, w celu poprawy działania serwisu (anonimowe).</li>
                </ul>
              </section>

              <section>
                <h2 className="text-foreground font-display font-semibold text-xl mb-3">3. Cel i podstawa przetwarzania</h2>
                <ul className="list-disc pl-6 space-y-1">
                  <li><strong>Realizacja usługi serwisowej</strong> — na podstawie art. 6 ust. 1 lit. b RODO (wykonanie umowy).</li>
                  <li><strong>Kontakt telefoniczny</strong> w celu potwierdzenia rezerwacji — na podstawie art. 6 ust. 1 lit. b RODO.</li>
                  <li><strong>Analityka</strong> — na podstawie art. 6 ust. 1 lit. f RODO (prawnie uzasadniony interes — poprawa jakości usług).</li>
                </ul>
              </section>

              <section>
                <h2 className="text-foreground font-display font-semibold text-xl mb-3">4. Okres przechowywania</h2>
                <p>
                  Dane z rezerwacji i zleceń przechowujemy przez okres niezbędny do realizacji usługi, a następnie przez
                  okres wymagany przepisami prawa podatkowego (5 lat). Dane analityczne przechowujemy przez 12 miesięcy.
                </p>
              </section>

              <section>
                <h2 className="text-foreground font-display font-semibold text-xl mb-3">5. Odbiorcy danych</h2>
                <p>
                  Twoje dane mogą być przekazywane podmiotom przetwarzającym dane na nasze zlecenie:
                  dostawcy usług hostingowych (Supabase Inc., USA — na podstawie standardowych klauzul umownych)
                  oraz dostawcy usług hostingu strony (GitHub Inc., USA).
                </p>
              </section>

              <section>
                <h2 className="text-foreground font-display font-semibold text-xl mb-3">6. Twoje prawa</h2>
                <p>Zgodnie z RODO przysługuje Ci prawo do:</p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>dostępu do swoich danych osobowych,</li>
                  <li>sprostowania danych,</li>
                  <li>usunięcia danych („prawo do bycia zapomnianym"),</li>
                  <li>ograniczenia przetwarzania,</li>
                  <li>przenoszenia danych,</li>
                  <li>wniesienia sprzeciwu wobec przetwarzania,</li>
                  <li>wniesienia skargi do Prezesa Urzędu Ochrony Danych Osobowych (PUODO).</li>
                </ul>
                <p className="mt-2">
                  W celu realizacji powyższych praw skontaktuj się z nami telefonicznie: <a href="tel:+48511061221" className="text-accent">511 061 221</a>.
                </p>
              </section>

              <section>
                <h2 className="text-foreground font-display font-semibold text-xl mb-3">7. Pliki cookies</h2>
                <p>
                  Strona drkolo.pl wykorzystuje localStorage do zapamiętania preferencji motywu (jasny/ciemny).
                  Nie stosujemy plików cookies śledzących ani marketingowych. Nie korzystamy z Google Analytics
                  ani innych zewnętrznych narzędzi śledzących.
                </p>
              </section>

              <section>
                <h2 className="text-foreground font-display font-semibold text-xl mb-3">8. Zmiany w polityce prywatności</h2>
                <p>
                  Administrator zastrzega sobie prawo do wprowadzania zmian w polityce prywatności.
                  Aktualna wersja polityki prywatności jest zawsze dostępna na stronie drkolo.pl/polityka-prywatnosci.
                </p>
                <p className="mt-2">
                  Ostatnia aktualizacja: 27 czerwca 2026 r.
                </p>
              </section>
            </div>
          </div>
        </section>
      </main>

      <footer className="py-10 border-t border-border">
        <div className="container flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <Logo className="h-7" />
          <div>{ADDRESS} · {PHONE}</div>
          <div>© {new Date().getFullYear()} Dr Koło. Wszelkie prawa zastrzeżone.</div>
        </div>
      </footer>
    </div>
  );
}
