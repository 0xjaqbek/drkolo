# AI Agent API — Design Spec
**Date:** 2026-05-20
**Status:** Approved

## Goal

Make drkolo.pl bookable and queryable by external AI assistants (ChatGPT, Claude, Perplexity) and third-party apps/aggregators via a standard REST API with OpenAPI discoverability.

## Architecture

```
supabase/functions/
  availability/index.ts   GET  – free 30-min slots for a date
  services/index.ts       GET  – service catalog + prices
  appointments/index.ts   POST – create booking inquiry
                          GET  – lookup appointments by customer phone

public/
  openapi.json            OpenAPI 3.1 spec (ChatGPT Actions, custom agents)
  .well-known/
    ai-plugin.json        ChatGPT plugin manifest
  llms.txt                (updated: add ## API section)

supabase/migrations/
  008_ai_agent_source.sql Add 'ai_agent' to source constraint
```

All endpoints are unauthenticated (Supabase anon key). All responses are JSON with CORS headers (`Access-Control-Allow-Origin: *`).

## Endpoints

### GET /functions/v1/availability

**Query params:** `date=YYYY-MM-DD` (required)

Computes available 30-minute slots for the given day by:
1. Fetching working hours for that weekday from `service_working_hours`
2. Fetching existing appointments from `service_appointments` (excluding `odrzucone`)
3. Fetching blocked times from `service_blocked_times`
4. Returning all 30-min slots in the open window that are not occupied

**Success response:**
```json
{
  "date": "2026-05-22",
  "open": "08:00",
  "close": "17:00",
  "slots": ["08:00", "08:30", "09:00", "09:30"]
}
```

**Closed day response:**
```json
{ "date": "2026-05-24", "open": null, "close": null, "slots": [] }
```

---

### GET /functions/v1/services

Static response. Returns the service catalog with Polish names and PLN prices, grouped by category.

**Response:**
```json
{
  "categories": [
    {
      "name": "Przeglądy",
      "services": [
        { "name": "Przegląd generalny Full Suspension", "price_pln": 649 },
        { "name": "Przegląd generalny hardtail", "price_pln": 449 },
        { "name": "Przegląd podstawowy", "price_pln": 249 }
      ]
    },
    {
      "name": "Zawieszenie",
      "services": [
        { "name": "Duży serwis zawieszenia", "price_pln": 400 },
        { "name": "Mały serwis zawieszenia", "price_pln": 200 }
      ]
    },
    {
      "name": "Napęd",
      "services": [
        { "name": "Założenie łańcucha + regulacja przerzutki", "price_pln": 80 },
        { "name": "Mycie napędu", "price_pln": 80 },
        { "name": "Regulacja przerzutki", "price_pln": 50 }
      ]
    },
    {
      "name": "Koła",
      "services": [
        { "name": "Montaż systemu tubeless", "price_pln": 150 },
        { "name": "Zmiana opony tubeless", "price_pln": 50 },
        { "name": "Centrowanie koła", "price_pln": 50 },
        { "name": "Dolanie uszczelniacza", "price_pln": 40 },
        { "name": "Wymiana dętki", "price_pln": 30 }
      ]
    },
    {
      "name": "Hamulce i diagnostyka",
      "services": [
        { "name": "Diagnostyka Bosch", "price_pln": 200 },
        { "name": "Serwis hamulca", "price_pln": 50 },
        { "name": "Prostowanie haka przerzutki", "price_pln": 30 }
      ]
    }
  ]
}
```

---

### POST /functions/v1/appointments

Creates a booking inquiry with `status: "zapytanie"` and `source: "ai_agent"`. The shop receives the inquiry and calls the customer at the provided phone number to confirm.

**Request body:**
```json
{
  "date": "2026-05-22",
  "time": "10:00",
  "customer_name": "Jan Kowalski",
  "customer_phone": "+48600123456",
  "bike_manufacturer": "Trek",
  "bike_model": "Fuel EX 8",
  "service_note": "Serwis amortyzatora przedniego"
}
```

**Validation:**
- All 7 fields required → `400` with field-level error
- `date` not in the past → `400 { "error": "Date is in the past", "code": "DATE_PAST" }`
- `date` must be an open working day → `400 { "error": "Shop is closed on this day", "code": "DAY_CLOSED" }`
- `time` must match an available slot → `409 { "error": "Time slot unavailable", "code": "SLOT_TAKEN" }`
- `customer_phone` minimum 9 digits → `400 { "error": "Invalid phone number", "code": "INVALID_PHONE" }`

**Success response `201`:**
```json
{
  "id": "uuid",
  "status": "zapytanie",
  "message": "Appointment inquiry created. The shop will call you at +48600123456 to confirm."
}
```

---

### GET /functions/v1/appointments?phone=+48xxxxxxxxx

Returns all appointments for the given phone number, most recent first. Exposes only customer-facing fields — no technician notes or internal data.

**Response:**
```json
{
  "appointments": [
    {
      "id": "uuid",
      "date": "2026-05-22",
      "time": "10:00",
      "status": "zapytanie",
      "bike_manufacturer": "Trek",
      "bike_model": "Fuel EX 8",
      "service_note": "Serwis amortyzatora przedniego",
      "created_at": "2026-05-20T14:32:00Z"
    }
  ]
}
```

Status values: `zapytanie` (inquiry), `potwierdzone` (confirmed), `odrzucone` (rejected), `zakonczone` (completed).

---

## Discoverability

### /openapi.json
OpenAPI 3.1 spec describing all 4 endpoints with full schemas, parameter descriptions in English, and example responses. Served as a static file from the Vite public directory. Used by ChatGPT Actions, custom agent frameworks, and API consumers.

Base server URL points to the Supabase functions subdomain (e.g., `https://<project>.supabase.co/functions/v1`).

### /.well-known/ai-plugin.json
ChatGPT plugin manifest. References `/openapi.json` and provides a one-sentence description of the shop for the plugin registry.

### /llms.txt
Add a new `## API` section:
```
## API

Dr Koło exposes a REST API for AI agents. OpenAPI spec: https://drkolo.pl/openapi.json

Agents can:
- Check availability: GET /functions/v1/availability?date=YYYY-MM-DD
- List services and prices: GET /functions/v1/services
- Book a service inquiry: POST /functions/v1/appointments
- Look up appointment status by phone: GET /functions/v1/appointments?phone=+48...
```

---

## Database Migration

**`008_ai_agent_source.sql`** — Extends the `source` check constraint on `service_appointments` to accept `'ai_agent'` in addition to `'online'` and `'manual'`.

```sql
alter table service_appointments
  drop constraint service_appointments_source_check;
alter table service_appointments
  add constraint service_appointments_source_check
  check (source in ('online', 'manual', 'ai_agent'));
```

---

## Error Format

All errors follow a consistent shape:
```json
{ "error": "Human-readable message", "code": "MACHINE_CODE" }
```

HTTP status codes: `400` for bad input, `409` for conflicts (slot taken), `500` for unexpected errors.

---

## What Is Not In Scope

- Authentication / API keys (same anon access as the web UI)
- Rate limiting (can be added later at Supabase or Cloudflare level)
- Webhook notifications to the shop (they see new `ai_agent` inquiries in the existing admin calendar)
- MCP server (can be added later as a thin wrapper on these functions)
