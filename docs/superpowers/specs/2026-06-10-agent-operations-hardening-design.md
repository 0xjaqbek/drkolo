# Agent Operations Hardening Design

**Date:** 2026-06-10
**Status:** Approved

## Goal

Make Dr Kolo's public booking operations reliable and safe for both AI agents and
people. Agents must be able to list services, check availability, create a
booking inquiry, and retrieve that inquiry without exposing customer records or
allowing concurrent requests to reserve the same slot.

## Scope

This phase covers:

- the public services, availability, booking, and booking-status API;
- the `/rezerwacja` customer booking flow;
- database constraints and row-level security needed by those public flows;
- OpenAPI and agent discovery documents;
- deployment and end-to-end verification.

The calendar admin flow is included because removing anonymous appointment
access would otherwise break the shop's operational tooling. Its existing
password screen remains, but password verification and calendar data access
move to protected Edge Functions.

Shared distributed rate limiting is also deferred. Input validation, bounded
payload sizes, and strict database permissions are required now. A durable rate
limiter should be added before promoting the API beyond modest public traffic.

## Architecture

Supabase remains the system of record and API runtime:

- PostgreSQL stores working hours, blocked periods, and appointment inquiries.
- Supabase Edge Functions expose the public JSON API.
- Public callers authenticate functions with the project's publishable anon
  credential, as required by the Supabase gateway.
- Edge Functions use a server-only Supabase credential for database operations.
- The browser booking page calls the same Edge Functions as AI agents.
- Calendar admin requests send the entered admin password to dedicated Edge
  Functions, which compare it with a server-only secret before accessing data.

This creates one public booking contract instead of maintaining separate browser
and agent implementations.

## Public Operations

### List services

`GET /functions/v1/services`

Returns the service catalog and PLN prices. The function accepts only `GET` and
`OPTIONS`; other methods return a JSON `405` response.

### Check availability

`GET /functions/v1/availability?date=YYYY-MM-DD`

The function validates that the supplied value is a real calendar date. It calls
a database function that returns working hours and unoccupied 30-minute slots.
Database failures return `500`; they must not be represented as a closed day.

Times are interpreted in `Europe/Warsaw`. The response documents that timezone:

```json
{
  "date": "2026-06-11",
  "timezone": "Europe/Warsaw",
  "open": "10:00",
  "close": "19:00",
  "slots": ["10:00", "10:30"]
}
```

### Create booking inquiry

`POST /functions/v1/appointments`

The request retains the existing seven fields:

```json
{
  "date": "2026-06-11",
  "time": "10:00",
  "customer_name": "Jan Kowalski",
  "customer_phone": "+48600123456",
  "bike_manufacturer": "Trek",
  "bike_model": "Fuel EX 8",
  "service_note": "Front suspension service"
}
```

The Edge Function:

1. Rejects invalid JSON and unknown content types.
2. Validates field types, formats, trimmed lengths, and a bounded body size.
3. Normalizes the phone number to a canonical digits-only lookup value.
4. Generates a cryptographically random 32-byte lookup token.
5. Hashes the token with SHA-256.
6. Calls one PostgreSQL booking function with the validated fields and hash.
7. Returns the raw token once, along with the inquiry identifier and status.

Success response:

```json
{
  "id": "uuid",
  "status": "zapytanie",
  "lookup_token": "base64url-token",
  "message": "Appointment inquiry created. The shop will call to confirm."
}
```

The raw token is never stored. Logs and error messages must never contain the
token or the customer's full request body.

### Retrieve booking status

`GET /functions/v1/appointments?phone=...&token=...`

Both values are required. The function normalizes the phone and hashes the
provided token, then queries only rows matching both values. Invalid or
non-matching credentials return:

```json
{ "error": "Appointment not found", "code": "NOT_FOUND" }
```

with status `404`. The response does not reveal whether the phone number or
token was wrong.

The endpoint returns customer-facing fields only. It never returns customer
name, phone, technician notes, token hashes, or internal source metadata.

## Atomic Booking

Appointment creation must be a single PostgreSQL operation. A
`create_public_appointment` database function:

1. Validates that the requested day is open.
2. Validates that the requested time is on the 30-minute schedule.
3. Checks blocked periods.
4. Attempts the insert.
5. Returns the new appointment identifier and status.

A partial unique index on `(appointment_date, arrival_time)` applies to every
appointment whose status is not `odrzucone`. This is the final concurrency
guard. If two callers request the same slot, exactly one insert succeeds and the
other receives `409 SLOT_TAKEN`.

The availability query and customer web page treat all non-rejected
appointments as occupied.

## Lookup Tokens

Each public appointment has:

- `customer_phone_normalized`, used only for exact matching;
- `lookup_token_hash`, a SHA-256 digest stored as lowercase hexadecimal.

The raw token is at least 256 bits of entropy and is encoded as base64url without
padding. It is returned only in the creation response.

Existing appointments have no lookup token and cannot be retrieved through the
new public status endpoint. The shop can continue to access them through its
internal workflow. Token recovery and token rotation are out of scope; a
customer who loses the token contacts the shop.

## Admin Calendar API

The existing calendar password screen and session behavior remain familiar.
Unlike the current implementation, the compiled frontend does not contain the
calendar password.

After login, calendar hooks call protected endpoints with:

```http
Authorization: Bearer <supabase-anon-key>
apikey: <supabase-anon-key>
X-Admin-Password: <entered-password>
```

The functions compare `X-Admin-Password` with an `ADMIN_PASSWORD` Supabase
secret using a timing-safe comparison. Invalid credentials return a generic
`401 UNAUTHORIZED` response.

Protected admin operations cover the current calendar features:

- list appointments by date;
- list pending appointments;
- create a confirmed manual appointment;
- update appointment status, duration, and technician note;
- read and update working hours;
- list, create, and delete blocked periods.

The browser keeps the password in `sessionStorage` for the current tab, matching
the existing interaction style. It is never persisted to `localStorage`, placed
in a URL, logged, or returned by the server. Calendar logout clears it.

Other existing password-gated tools are not migrated unless they access the
appointment, working-hours, or blocked-time tables.

## Database Permissions

Public clients must not directly read or update `service_appointments`.

The migration:

- removes anonymous `SELECT` and `UPDATE` policies from appointments;
- removes anonymous write policies from working hours and blocked times;
- moves public customer and calendar-admin reads and writes behind Edge
  Functions;
- grants execution of narrowly scoped public database functions only to the
  server role used by Edge Functions;
- ensures customer-facing functions select explicit columns.

No policy may permit anonymous appointment, working-hour, or blocked-time
writes after this phase. Anonymous appointment reads are also removed.

## Customer Booking Page

`/rezerwacja` stops inserting appointments directly through Supabase.

The page uses a focused API client for:

- availability requests;
- appointment creation.

After creation, the confirmation screen tells the customer that the request is
pending telephone confirmation. The lookup token may be stored in the current
browser for a future status UI, but it is not displayed unless a status feature
is added. The existing SMS composition behavior can remain after the API
confirms creation.

Working-hour and blocked-time editing remain admin concerns and are not routed
through the public API in this phase.

## Error Contract

All errors use:

```json
{
  "error": "Human-readable message",
  "code": "MACHINE_CODE"
}
```

Required codes include:

- `INVALID_JSON`
- `INVALID_DATE`
- `DATE_PAST`
- `INVALID_TIME`
- `INVALID_PHONE`
- `MISSING_FIELDS`
- `PAYLOAD_TOO_LARGE`
- `DAY_CLOSED`
- `SLOT_TAKEN`
- `NOT_FOUND`
- `METHOD_NOT_ALLOWED`
- `DB_ERROR`

Every response, including errors and preflight responses, includes consistent
CORS and JSON content headers where applicable.

## Discovery Contract

`public/openapi.json` remains the canonical machine-readable API definition.
It must:

- describe the Supabase gateway authentication accurately;
- include both `Authorization: Bearer <anon-key>` and `apikey: <anon-key>` if
  both are required by the deployed gateway;
- require the lookup token for status retrieval;
- document `Europe/Warsaw`;
- mark required schema properties;
- use current future-date examples;
- describe `404`, `409`, `413`, and `500` responses.

`public/llms.txt` gives agents concise workflow instructions:

1. list services if needed;
2. check availability;
3. ask the user before creating a booking;
4. preserve the returned lookup token;
5. use phone plus token for status retrieval.

The plugin manifest and OpenAPI authentication must agree. The manifest logo
points to the existing `/og-image.jpg`. Discovery files must not claim that a
booking is confirmed; all creations are inquiries pending a shop callback.

## Data Consistency

The public page, database working hours, availability API, structured metadata,
and `llms.txt` must agree. The intended Gdansk hours are:

- Monday-Friday: `10:00-19:00`
- Saturday: `10:00-16:00`
- Sunday: closed

The database migration updates current working-hour rows, not only seed values.

The service catalog should have one canonical source where feasible. At minimum,
automated contract tests must detect differences between the API catalog,
OpenAPI examples, and customer-facing prices.

## Testing

Testing is divided into four layers:

1. **Pure unit tests:** date validation, phone normalization, token hashing,
   request validation, error mapping, and slot generation.
2. **Function contract tests:** supported methods, response shapes, lookup-token
   requirements, privacy-safe errors, and database failure handling.
3. **Database tests:** uniqueness under concurrent inserts, rejected-slot reuse,
   blocked periods, closed days, and RLS denial for anonymous appointment reads.
4. **Frontend tests:** `/rezerwacja` calls the public API, handles conflicts and
   server errors, and does not insert directly into the appointment table.
5. **Admin tests:** calendar login is validated by the server, protected hooks
   send the session password, invalid passwords expose no data, and all current
   calendar operations remain available.

All new behavior follows red-green-refactor. Production verification runs the
full test suite, lint, build, migration checks, deployment smoke tests, and a
non-destructive end-to-end flow. Any test appointment created during smoke
testing is identified clearly and removed through an authorized admin path.

## Deployment

Deployment order:

1. Back up the relevant tables and inspect current policies and constraints.
2. Deploy database migration and database functions.
3. Verify public appointment reads are denied.
4. Set the `ADMIN_PASSWORD` secret and deploy updated public and admin Edge
   Functions.
5. Smoke-test services and availability.
6. Create one controlled future booking, retrieve it using its token, and verify
   a wrong token returns `404`.
7. Verify calendar login, appointment reads, manual creation, appointment
   updates, working-hour editing, and blocked-time editing.
8. Deploy the frontend and discovery files.
9. Verify `drkolo.pl`, `llms.txt`, OpenAPI, manifest, and the customer booking
   flow.

Rollback retains the new columns and index but restores the previous function
versions only if necessary. Anonymous appointment read policies must not be
restored as part of rollback.

## Out Of Scope

- role-based or multi-user admin accounts;
- customer token recovery or rotation;
- cancellation or rescheduling by agents;
- payments;
- MCP server;
- distributed rate limiting;
- automated outbound confirmation messages.
