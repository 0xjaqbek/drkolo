# Zlecenie — Service Order System Design

**Date:** 2026-05-07
**Status:** Approved

---

## Overview

A service order ("zlecenie") system for Dr Koło bike service. When a customer arrives, the service man opens `/zlecenie` on his phone, fills in the bike model and customer's phone number, builds a checklist of work to be done, and submits. A unique hash is generated for the order. The service man then sends an SMS (via the phone's native SMS app) with a link to the order. The customer can follow progress at `drkolo.pl/zlecenie/<hash>`. The service man documents work in progress — checkmarks, photos, notes — all visible to the customer in real time.

---

## Architecture

**Option chosen:** React + Supabase direct (no server-side functions)

- Frontend: existing React SPA on GitHub Pages (unchanged deployment)
- Backend: Supabase (PostgreSQL database + file storage)
- SMS: native `sms:` URI — opens phone's SMS app with pre-filled number and message
- Password: single shared password stored as `VITE_CREATION_PASSWORD` env var, checked client-side, stored in `sessionStorage` for the duration of the session
- No Supabase Auth — the hash alone grants customer read access via RLS; the session password gates edit access

---

## Data Model

### `zlecenia`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | auto-generated |
| hash | text UNIQUE | 8-char random alphanumeric, used in URL |
| bike_model | text | e.g. "Trek Fuel EX 9.8" |
| customer_phone | text | e.g. "+48 600 123 456" |
| status | text | `oczekuje` / `w_trakcie` / `gotowe` |
| created_at | timestamptz | auto |

### `zlecenie_items`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| zlecenie_id | uuid FK | references zlecenia |
| label | text | e.g. "Regulacja przerzutek" |
| is_done | boolean | default false |
| done_at | timestamptz | null until checked |
| sort_order | int | display order |

### `zlecenie_updates`
Notes and photos added during work. Can be attached to a specific item or to the order as a whole.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| zlecenie_id | uuid FK | references zlecenia |
| item_id | uuid FK nullable | null = order-level note |
| note | text nullable | optional text |
| created_at | timestamptz | auto |

### `update_photos`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| update_id | uuid FK | references zlecenie_updates |
| storage_path | text | Supabase Storage path |
| created_at | timestamptz | auto |

### `service_catalog`
Pre-configured service items. Package items have `is_package = true` and reference child items.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| category | text | e.g. "Zawieszenie" |
| label | text | display name |
| is_package | boolean | if true, selecting this adds its children |
| parent_id | uuid FK nullable | null for top-level; set for package children |
| sort_order | int | |

---

## Service Catalog (seed data)

### Zawieszenie
- Serwis amortyzatora przedniego (podstawowy)
- Serwis amortyzatora przedniego (pełny)
- Serwis amortyzatora tylnego (podstawowy)
- Serwis amortyzatora tylnego (pełny)
- Regulacja geometrii zawieszenia

### Opony / Tubeless
- Wymiana dętki — przód
- Wymiana dętki — tył
- Montaż systemu tubeless — przód
- Montaż systemu tubeless — tył
- Wymiana uszczelniacza (sealant) — przód
- Wymiana uszczelniacza (sealant) — tył
- Wymiana opony — przód
- Wymiana opony — tył

### Hamulce
- Regulacja hamulców mechanicznych
- Odpowietrzenie hamulców hydraulicznych
- Wymiana klocków hamulcowych — przód
- Wymiana klocków hamulcowych — tył
- Wymiana okładzin tarczowych — przód
- Wymiana okładzin tarczowych — tył

### Napęd
- Czyszczenie i smarowanie łańcucha
- Wymiana łańcucha
- Wymiana kasety
- Wymiana suportu
- Wymiana przerzutki przedniej
- Wymiana przerzutki tylnej
- Regulacja przerzutek

### Koła
- Centrowanie koła — przód
- Centrowanie koła — tył
- Wymiana szprychy — przód
- Wymiana szprychy — tył
- Wymiana piasty — przód
- Wymiana piasty — tył

### Ogólne
- Mycie roweru
- Wymiana linki i pancerza
- Montaż / demontaż akcesoriów

### Pakiety (rozwijają się w osobne punkty)

**Przegląd podstawowy** (pakiet → 6 punktów)
1. Regulacja przerzutek
2. Regulacja hamulców (odpowietrzanie, regulacja zacisków)
3. Mycie i smarowanie łańcucha
4. Kasacja luzów (stery, piasty, ramiona korb, pedały)
5. Pompowanie kół (sprawdzenie czy jest mleko)
6. Sprawdzenie śrub mostka

**Przegląd gwarancyjny** (pakiet → 7 punktów)
1. Regulacja przerzutek
2. Regulacja hamulców (odpowietrzanie, regulacja zacisków)
3. Mycie i smarowanie łańcucha
4. Kasacja luzów (stery, piasty, ramiona korb, pedały)
5. Pompowanie kół (sprawdzenie czy jest mleko)
6. Sprawdzenie śrub mostka
7. Centrowanie kół (dociągnięcie szprych)

**Przegląd generalny full suspension** (pakiet → 12 punktów)
1. Regulacja przerzutek
2. Regulacja hamulców (odpowietrzanie, regulacja zacisków, mycie zacisków, sprawdzenie stanu klocków, mycie klocków)
3. Mycie napędu i smarowanie łańcucha
4. Kasacja luzów (stery, piasty, ramiona korb, pedały)
5. Sprawdzenie łożysk w piastach kół
6. Pompowanie kół (sprawdzenie czy jest mleko)
7. Czyszczenie sterów
8. Przegląd suportu
9. Przegląd pancerzy i linek hamulcowych oraz przerzutkowych
10. Sprawdzenie śrub mostka
11. Przegląd i czyszczenie ISOSPEED
12. Przegląd i czyszczenie łożysk wahaczy i dampera

---

## Routes

| Path | Component | Who sees what |
|------|-----------|---------------|
| `/zlecenie` | `CreateZlecenie` | Password-gated creation form |
| `/zlecenie/:hash` | `ZlecenieView` | Edit mode if password in sessionStorage; read-only otherwise |

No separate customer URL — the same hash URL serves both. Edit controls render only when `sessionStorage` contains the correct password.

---

## Page: `/zlecenie` — Create Order

1. **Password prompt** — shown if no valid password in sessionStorage. Single text input + confirm. Wrong password → error message. Correct → stored in sessionStorage.
2. **Form**
   - Bike model (text input, required)
   - Customer phone (tel input, required)
3. **Catalog picker** — grouped accordion by category. Tap an item to add it to the checklist. Packages show "(pakiet → X pkt)" — tapping them adds all child items as individual checklist entries.
4. **Custom item** — text input + "+" button to add items not in the catalog.
5. **Selected items preview** — list of added items with remove (×) buttons.
6. **Submit** — creates zlecenie + items in Supabase, generates hash. On success:
   - Shows confirmation screen with the link `drkolo.pl/zlecenie/<hash>`
   - **"Wyślij SMS"** button opens: `sms:<customer_phone>?body=Twój rower jest w serwisie Dr Koło. Śledź postęp: https://drkolo.pl/zlecenie/<hash>`
   - **"Otwórz zlecenie"** button navigates to `/zlecenie/<hash>`

---

## Page: `/zlecenie/:hash` — Manage / View Order

### Edit mode (password in sessionStorage)

- **Status control** — top of page, tap to cycle: Oczekuje (gray) → W trakcie (orange) → Gotowe (green). Updates `zlecenia.status` in Supabase.
- **Checklist** — each item shows label + checkbox. Tapping checkbox sets `is_done = true` and records `done_at`. Tapping again unchecks.
- **Per-item updates** — each item has an expand toggle showing its updates (photos + notes). "Dodaj aktualizację" button opens a bottom sheet:
  - Camera / file picker (multiple photos allowed)
  - Optional note textarea
  - Save → uploads photos to Supabase Storage, inserts `zlecenie_updates` + `update_photos` rows
- **Order-level notes** — section at bottom of page. "Dodaj notatkę ogólną" button opens same bottom sheet but with `item_id = null`.

### Read-only mode (no password in session)

- Status badge (no tap interaction)
- Checklist with checkmarks (no checkbox interaction)
- Updates/photos visible per item (expand toggle works)
- Completed items show green checkmark + completion timestamp
- Auto-refresh every 30 seconds via polling (re-fetch zlecenie + items + updates)
- If status is `gotowe` → green banner: "Twój rower jest gotowy do odbioru!"

---

## Security Model

- **Supabase RLS** — all operations use the anon key only (never the service role key). RLS policies:
  - `zlecenia`: anon SELECT by hash, anon INSERT, anon UPDATE (status only). No DELETE.
  - `zlecenie_items`: anon SELECT by zlecenie_id, anon INSERT, anon UPDATE (is_done/done_at). No DELETE.
  - `zlecenie_updates`: anon SELECT by zlecenie_id, anon INSERT. No DELETE.
  - `update_photos`: anon SELECT, anon INSERT. No DELETE.
- **Supabase Storage**: photos readable by anyone with the storage path (paths include the hash, not guessable). Uploads via anon key with storage policy allowing INSERT.
- **Password**: `VITE_CREATION_PASSWORD` env var. Compared client-side. Gating accidental creation — not protecting sensitive data. Anyone with direct Supabase API access could bypass, but this is acceptable for a single-operator internal tool.
- **Hash generation**: `crypto.randomUUID()` sliced to 8 chars from `[A-Z0-9]`, ~2.8 trillion combinations. Sufficient for privacy.

---

## Components

| Component | Purpose |
|-----------|---------|
| `CreateZlecenie` | Full creation page with password gate, form, catalog picker |
| `CatalogPicker` | Grouped accordion, handles package expansion |
| `ZlecenieView` | Main order view — switches between edit and read-only mode |
| `StatusBadge` | Colored status display; interactive in edit mode |
| `ChecklistItem` | Single item row with checkbox, expand toggle, updates |
| `UpdateSheet` | Bottom sheet for adding photo + note updates |
| `PhotoGallery` | Displays photos in an update |
| `useZlecenie` | TanStack Query hook — fetches order, items, updates; handles polling |
| `useZlecenieActions` | Mutation hooks — create order, toggle item, add update |
| `useSession` | sessionStorage password management |

---

## Environment Variables

```
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key>
VITE_CREATION_PASSWORD=<shared password>
```

---

## Out of Scope

- Customer interaction (comments, confirmations) — read-only only
- Multiple service man accounts / roles
- Order history / search / dashboard
- Price calculations or invoicing
- Push notifications (auto-refresh polling is sufficient)
- Editing or deleting submitted zlecenie items
