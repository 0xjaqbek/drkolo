# Kwestionariusz wiedzy o serwisie Dr Koło

**Data:** 2026-05-12
**Status:** Zatwierdzony

## Cel

Zebranie szczegółowej, osobistej wiedzy od właściciela i 2 serwisantów Dr Koło w celu wzbogacenia bazy wiedzy chatbota. Admin ręcznie przeglądnie odpowiedzi i zaktualizuje `chat-api/lib/system-prompt.ts`.

## Wymagania

- Formularz dostępny pod `/kwestionariusz` wewnątrz aplikacji
- Panel admina z odpowiedziami pod `/kwestionariusz-odp`
- Chronione tym samym hasłem co reszta aplikacji (`VITE_ADMIN_PASSWORD`)
- 3 role: `wlasciciel`, `serwisant_1`, `serwisant_2`
- Każda rola wybiera się na starcie — nie widzi odpowiedzi innych ról
- Każda rola może wypełnić formularz tylko raz (blokada po submicie)
- Odpowiedzi przechowywane w Supabase

## Architektura

### Nowe pliki

| Plik | Opis |
|------|------|
| `src/pages/Kwestionariusz.tsx` | Wizard formularz |
| `src/pages/KwestionariuszOdp.tsx` | Panel admina z odpowiedziami |
| `src/hooks/useSurvey.ts` | Supabase queries (check roli, submit, fetch) |
| `supabase/migrations/006_survey_schema.sql` | Tabela survey_responses |

### Zmiany w istniejących plikach

| Plik | Zmiana |
|------|--------|
| `src/App.tsx` | Dwa nowe Route: `/kwestionariusz` i `/kwestionariusz-odp` |

### Baza danych

```sql
create table survey_responses (
  id uuid primary key default gen_random_uuid(),
  role text not null check (role in ('wlasciciel', 'serwisant_1', 'serwisant_2')),
  answers jsonb not null,
  submitted_at timestamptz not null default now()
);
-- unique constraint: jedna odpowiedź per rola
create unique index survey_responses_role_idx on survey_responses(role);
-- RLS: anon może wstawiać i czytać (bez filtrowania — blokada logiczna w kodzie)
alter table survey_responses enable row level security;
create policy "anon_insert_survey" on survey_responses for insert with check (true);
create policy "anon_select_survey" on survey_responses for select using (true);
```

### Hasło

Walidacja client-side przez porównanie z `import.meta.env.VITE_ADMIN_PASSWORD`. Ten sam wzorzec co istniejące strony admin. Dla `/kwestionariusz` (formularz) — hasło otwiera dostęp do wyboru roli. Dla `/kwestionariusz-odp` (odpowiedzi) — hasło otwiera widok wszystkich odpowiedzi.

## Wizard — przepływ

```
Hasło → Wybór roli → Krok 1 → ... → Krok 8 → Podziękowanie
```

- Jeśli rola już ma wpis w `survey_responses`: zamiast formularza → komunikat "Już wypełniono. Dziękujemy!"
- Pasek postępu u góry: `Krok X z 8`
- Przyciski: Wstecz / Dalej, na ostatnim kroku: Wyślij
- Przed submitem: wszystkie kroki zapisane lokalnie w stanie React, jeden INSERT na końcu
- Pytania otwarte: `<textarea>`, pytania wyboru: `<radio>` lub `<select>`

## Sekcje i pytania

### Krok 1 — Profil
- Imię lub pseudonim (opcjonalne)
- Ile lat pracujesz w branży rowerowej?
- Co sprawiło, że zacząłeś/aś pracować z rowerami?

### Krok 2 — Historia z Dr Koło
- Kiedy i jak trafiłeś/aś do serwisu Dr Koło?
- Co cię zaskoczyło na początku pracy tutaj?
- Jakie zlecenie najbardziej zapamiętałeś/aś i dlaczego?
- Co się zmieniło w serwisie od kiedy tu pracujesz?

### Krok 3 — Warsztat — przestrzeń i klimat
- Jak opisałbyś/aś warsztat Dr Koło komuś kto nigdy tu nie był?
- Z czego jesteś najbardziej dumny/a jeśli chodzi o wyposażenie lub organizację warsztatu?
- Co byś dodał/a lub zmienił/a gdybyś mógł/mogła?
- Jak wygląda twój typowy dzień pracy?

### Krok 4 — Narzędzia i sprzęt
- Jakie jest twoje ulubione narzędzie i dlaczego?
- Którego narzędzia lub urządzenia nie oddałbyś/abyś za nic?
- Co uważasz za absolutny niezbędnik każdego serwisanta?
- Których marek narzędzi używasz najchętniej?

### Krok 5 — Naprawy i specjalizacja
- Co naprawiasz najchętniej i w czym czujesz się najlepiej?
- Z czego jesteś znany/a wśród współpracowników?
- Jakie usterki klienci przynoszą najczęściej?
- Jaką naprawę zrobiłeś/aś ostatnio po raz pierwszy?

### Krok 6 — Twój rower
- Co jeździsz prywatnie? (marka, model, rok)
- Co jako pierwsze zmieniłeś/aś lub ulepszyłeś/aś w swoim rowerze?
- Jak skonfigurowałeś/aś swój rower (geometria, osprzęt)?
- Jaki jest twój rower marzeń?

### Krok 7 — Styl jazdy i trasy
- Jaki typ jazdy preferujesz? (MTB / szosa / gravel / trekking / inne)
- Jak często jeździsz prywatnie?
- Jaka jest twoja ulubiona trasa w okolicach Gdańska lub Kartuz?
- Z kim najchętniej jeździsz?

### Krok 8 — Wiedza i filozofia
- Jakie marki rowerów polecasz klientom i dlaczego?
- Jakie komponenty lub akcesoria polecasz najczęściej?
- Co uważasz za najważniejszą rzecz w serwisowaniu roweru?
- Jedno zdanie które chciałbyś/abyś powiedzieć każdemu nowemu klientowi Dr Koło.

## Panel admina `/kwestionariusz-odp`

- Hasło gate (ten sam co formularz)
- 3 zakładki: Właściciel / Serwisant 1 / Serwisant 2
- Zakładka roli bez odpowiedzi: szara, napis "Nie wypełniono jeszcze"
- Zakładka z odpowiedziami: odpowiedzi pogrupowane sekcjami, pytanie + odpowiedź
- Brak akcji edycji/usuwania — widok read-only

## Czego NIE robimy

- Brak automatycznego generowania system prompt
- Brak powiadomień email po wypełnieniu
- Brak edycji odpowiedzi po submicie
- Brak walidacji długości odpowiedzi (pola opcjonalne)
