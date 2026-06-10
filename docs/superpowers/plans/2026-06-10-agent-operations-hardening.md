# Agent Operations Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provide safe, reliable public booking operations for people and AI agents while preserving the existing password-gated calendar workflow behind server-validated admin APIs.

**Architecture:** PostgreSQL owns slot availability and atomic booking through narrowly scoped RPC functions and a partial unique index. Supabase Edge Functions expose separate public and password-protected calendar APIs using server-only database credentials. The React booking page and calendar page stop accessing appointment tables directly and use focused API clients.

**Tech Stack:** PostgreSQL/Supabase migrations, Supabase Edge Functions (Deno/TypeScript), React 18, TanStack Query, Vitest, OpenAPI 3.1.

---

## File Map

### Create

- `supabase/migrations/009_agent_operations_hardening.sql` - token columns, working hours, atomic RPCs, uniqueness, and RLS lockdown.
- `supabase/functions/_shared/http.ts` - JSON/CORS responses and method handling.
- `supabase/functions/_shared/booking.ts` - request validation, phone normalization, date validation, and DB error mapping.
- `supabase/functions/_shared/crypto.ts` - lookup-token generation and SHA-256 hashing.
- `supabase/functions/_shared/admin-auth.ts` - timing-safe admin password validation.
- `supabase/functions/_shared/booking.test.ts` - pure validation tests.
- `supabase/functions/_shared/crypto.test.ts` - token tests.
- `supabase/functions/calendar-admin/index.ts` - protected calendar CRUD API.
- `src/lib/bookingApi.ts` - browser client for public availability and booking.
- `src/lib/calendarAdminApi.ts` - browser client for protected calendar operations.
- `src/test/bookingApi.test.ts` - public API client tests.
- `src/test/calendarAdminApi.test.ts` - protected API client tests.

### Modify

- `supabase/functions/services/index.ts` - strict methods and shared response helpers.
- `supabase/functions/availability/index.ts` - RPC-backed availability with explicit DB failures.
- `supabase/functions/appointments/index.ts` - atomic creation and token-protected lookup.
- `src/hooks/useSession.ts` - server-validated calendar password session.
- `src/hooks/useAppointments.ts` - protected calendar API hooks only.
- `src/pages/KalendarzAdmin.tsx` - async server login and authenticated query gating.
- `src/pages/Rezerwacja.tsx` - public API availability and booking.
- `src/components/TimelinePicker.tsx` - support authoritative available-slot input.
- `src/lib/types.ts` - public API and protected calendar types.
- `src/test/Rezerwacja.test.tsx` - public API behavior.
- `src/test/KalendarzAdmin.test.tsx` - protected login behavior.
- `src/test/TimelinePicker.test.tsx` - authoritative slots.
- `vitest.config.ts` - include pure Edge Function tests.
- `public/openapi.json` - accurate authentication, token lookup, timezone, and errors.
- `public/llms.txt` - safe agent workflow.
- `public/.well-known/ai-plugin.json` - matching authentication description and valid logo.
- `index.html` - keep structured opening hours aligned.
- `.github/workflows/deploy.yml` - run tests and lint before the Pages build.
- `README.md` - deployment and secret checklist.

---

### Task 1: Add Pure Booking Validation

**Files:**
- Create: `supabase/functions/_shared/booking.test.ts`
- Create: `supabase/functions/_shared/booking.ts`
- Modify: `vitest.config.ts`

- [ ] **Step 1: Extend Vitest discovery**

Change `vitest.config.ts` to include shared Edge Function tests:

```ts
include: [
  "src/**/*.{test,spec}.{ts,tsx}",
  "supabase/functions/_shared/**/*.{test,spec}.ts",
],
```

- [ ] **Step 2: Write failing validation tests**

Create tests for:

```ts
describe('normalizePhone', () => {
  it('normalizes Polish display formatting', () => {
    expect(normalizePhone('+48 600-123-456')).toBe('48600123456');
  });
  it('rejects fewer than nine digits', () => {
    expect(() => normalizePhone('123')).toThrowError('INVALID_PHONE');
  });
});

describe('validateCalendarDate', () => {
  it('rejects impossible dates', () => {
    expect(() => validateCalendarDate('2026-02-30')).toThrowError('INVALID_DATE');
  });
});

describe('validateCreateAppointment', () => {
  it('trims accepted fields and returns normalized phone', () => {
    expect(validateCreateAppointment(validBody, '2026-06-10')).toMatchObject({
      customer_name: 'Jan',
      customer_phone_normalized: '48600123456',
    });
  });
  it('rejects unknown non-string field values', () => {
    expect(() => validateCreateAppointment({ ...validBody, bike_model: 12 }, '2026-06-10'))
      .toThrowError('INVALID_FIELDS');
  });
  it('rejects a past Warsaw date', () => {
    expect(() => validateCreateAppointment({ ...validBody, date: '2026-06-09' }, '2026-06-10'))
      .toThrowError('DATE_PAST');
  });
});
```

Use maximum lengths:

```ts
customer_name: 120
customer_phone: 40
bike_manufacturer: 120
bike_model: 120
service_note: 2000
```

- [ ] **Step 3: Run the tests and verify RED**

Run:

```powershell
npm test -- supabase/functions/_shared/booking.test.ts
```

Expected: FAIL because `booking.ts` and its exports do not exist.

- [ ] **Step 4: Implement minimal validation**

Export:

```ts
export class ApiProblem extends Error {
  constructor(
    public code: string,
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export function normalizePhone(value: string): string
export function validateCalendarDate(value: unknown): string
export function validateCreateAppointment(
  value: unknown,
  todayWarsaw: string,
): ValidatedAppointment
export function mapBookingDatabaseError(error: { code?: string; message?: string }): ApiProblem
```

Validate exact `HH:MM` half-hour values, real calendar dates, required strings,
trimmed lengths, and the supplied Warsaw `today` string.

Map PostgreSQL exceptions:

```ts
DRK01 -> DAY_CLOSED / 400
DRK02 -> INVALID_SLOT / 400
DRK03 -> SLOT_TAKEN / 409
23505 -> SLOT_TAKEN / 409
default -> DB_ERROR / 500
```

- [ ] **Step 5: Run tests and verify GREEN**

Run:

```powershell
npm test -- supabase/functions/_shared/booking.test.ts
```

Expected: all booking validation tests pass.

- [ ] **Step 6: Commit**

```powershell
git add vitest.config.ts supabase/functions/_shared/booking.ts supabase/functions/_shared/booking.test.ts
git commit -m "test: define public booking validation contract"
```

---

### Task 2: Add Lookup Token Cryptography

**Files:**
- Create: `supabase/functions/_shared/crypto.test.ts`
- Create: `supabase/functions/_shared/crypto.ts`

- [ ] **Step 1: Write failing token tests**

```ts
it('generates a 32-byte base64url token without padding', () => {
  const token = generateLookupToken();
  expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
});

it('generates distinct tokens', () => {
  expect(generateLookupToken()).not.toBe(generateLookupToken());
});

it('hashes deterministically as lowercase SHA-256 hex', async () => {
  expect(await hashLookupToken('known-token')).toMatch(/^[a-f0-9]{64}$/);
  expect(await hashLookupToken('known-token')).toBe(await hashLookupToken('known-token'));
});
```

- [ ] **Step 2: Verify RED**

Run:

```powershell
npm test -- supabase/functions/_shared/crypto.test.ts
```

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement Web Crypto helpers**

Use `crypto.getRandomValues(new Uint8Array(32))`, base64url encoding without
padding, and `crypto.subtle.digest('SHA-256', ...)`.

- [ ] **Step 4: Verify GREEN**

Run:

```powershell
npm test -- supabase/functions/_shared/crypto.test.ts
```

Expected: 3 passing tests.

- [ ] **Step 5: Commit**

```powershell
git add supabase/functions/_shared/crypto.ts supabase/functions/_shared/crypto.test.ts
git commit -m "feat: add secure appointment lookup tokens"
```

---

### Task 3: Add Database Invariants and Lock Down Anonymous Access

**Files:**
- Create: `supabase/migrations/009_agent_operations_hardening.sql`

- [ ] **Step 1: Write the migration**

The migration must:

```sql
alter table public.service_appointments
  add column if not exists customer_phone_normalized text,
  add column if not exists lookup_token_hash text;

update public.service_appointments
set customer_phone_normalized = regexp_replace(customer_phone, '\D', '', 'g')
where customer_phone_normalized is null;

alter table public.service_appointments
  add constraint service_appointments_lookup_token_hash_format
  check (lookup_token_hash is null or lookup_token_hash ~ '^[a-f0-9]{64}$');

create unique index if not exists service_appointments_active_slot_unique
  on public.service_appointments (appointment_date, arrival_time)
  where status <> 'odrzucone';
```

Update live hours:

```sql
update public.service_working_hours
set open_time = case when day_of_week between 1 and 5 then '10:00'::time
                     when day_of_week = 6 then '10:00'::time end,
    close_time = case when day_of_week between 1 and 5 then '19:00'::time
                      when day_of_week = 6 then '16:00'::time end,
    is_open = day_of_week <> 0;
```

Create:

```sql
public.get_public_availability(p_date date)
public.create_public_appointment(...)
public.get_public_appointment(p_phone_normalized text, p_lookup_token_hash text)
```

`get_public_availability` returns one row with:

```sql
requested_date date,
open_time time,
close_time time,
slots text[]
```

`create_public_appointment` validates the weekday schedule and blocked periods,
inserts `source = 'ai_agent'`, and translates slot conflicts to:

```sql
raise exception using errcode = 'DRK03', message = 'slot taken';
```

Remove all existing anonymous policies on:

```sql
service_appointments
service_working_hours
service_blocked_times
```

Revoke table access:

```sql
revoke all on public.service_appointments from anon, authenticated;
revoke all on public.service_working_hours from anon, authenticated;
revoke all on public.service_blocked_times from anon, authenticated;
```

Grant RPC execution only to `service_role`.

- [ ] **Step 2: Check existing duplicate active slots before applying**

Run against production SQL editor or CLI:

```sql
select appointment_date, arrival_time, count(*)
from public.service_appointments
where status <> 'odrzucone'
group by appointment_date, arrival_time
having count(*) > 1;
```

Expected: zero rows. If rows exist, stop and resolve them with the shop before
creating the unique index.

- [ ] **Step 3: Apply migration to a linked/local database**

Run:

```powershell
npx supabase db push
```

Expected: migration `009_agent_operations_hardening.sql` applies successfully.

- [ ] **Step 4: Verify database behavior**

Run SQL checks:

```sql
select * from public.get_public_availability('2026-06-11');
```

Expected: Thursday returns `10:00`, `19:00`, and half-hour slots.

Attempt two calls to `create_public_appointment` for the same active slot.
Expected: first succeeds; second raises `DRK03`.

Attempt direct appointment select with the anon key.
Expected: permission denied or zero authorized access, never customer rows.

- [ ] **Step 5: Commit**

```powershell
git add supabase/migrations/009_agent_operations_hardening.sql
git commit -m "feat: make public appointment booking atomic and private"
```

---

### Task 4: Standardize Edge Function Responses

**Files:**
- Create: `supabase/functions/_shared/http.ts`
- Modify: `supabase/functions/services/index.ts`

- [ ] **Step 1: Add failing helper tests to `booking.test.ts`**

Test that JSON responses contain:

```ts
Access-Control-Allow-Origin: *
Access-Control-Allow-Headers: authorization, apikey, x-admin-password, content-type
Content-Type: application/json; charset=utf-8
Cache-Control: no-store
```

- [ ] **Step 2: Verify RED**

Run the shared test file and confirm the response helper is missing.

- [ ] **Step 3: Implement response helpers**

Export:

```ts
json(data: unknown, status = 200): Response
jsonError(message: string, code: string, status: number): Response
preflight(): Response
methodNotAllowed(): Response
```

- [ ] **Step 4: Update services handler**

Accept only `GET` and `OPTIONS`. Return `405 METHOD_NOT_ALLOWED` for all other
methods. Preserve the existing catalog response.

- [ ] **Step 5: Verify tests**

Run:

```powershell
npm test -- supabase/functions/_shared/booking.test.ts
```

Expected: all shared tests pass.

- [ ] **Step 6: Commit**

```powershell
git add supabase/functions/_shared/http.ts supabase/functions/_shared/booking.test.ts supabase/functions/services/index.ts
git commit -m "refactor: standardize agent API responses"
```

---

### Task 5: Rebuild Availability on the Database RPC

**Files:**
- Modify: `supabase/functions/availability/index.ts`

- [ ] **Step 1: Add a handler seam**

Refactor the function around:

```ts
export async function handleAvailability(
  req: Request,
  deps: { getAvailability(date: string): Promise<AvailabilityRow> },
): Promise<Response>
```

Keep `Deno.serve` as the production adapter.

- [ ] **Step 2: Write failing contract tests**

Add tests covering:

- impossible date returns `400 INVALID_DATE`;
- POST returns `405`;
- DB failure returns `500 DB_ERROR`;
- a closed day returns `open: null`, `close: null`, `slots: []`;
- an open day includes `timezone: "Europe/Warsaw"`.

- [ ] **Step 3: Verify RED**

Run:

```powershell
npm test -- supabase/functions/_shared/booking.test.ts
```

Expected: new availability contract assertions fail.

- [ ] **Step 4: Implement RPC adapter**

Create the client with:

```ts
createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false } },
)
```

Call `get_public_availability`. Treat every Supabase `error` as `DB_ERROR`;
never convert it to a closed-day response.

- [ ] **Step 5: Verify GREEN**

Run shared tests, then:

```powershell
npx supabase functions serve availability --no-verify-jwt
```

Smoke request a Thursday and a Sunday.

- [ ] **Step 6: Commit**

```powershell
git add supabase/functions/availability/index.ts supabase/functions/_shared/booking.test.ts
git commit -m "feat: serve reliable Warsaw availability"
```

---

### Task 6: Rebuild Appointment Creation and Lookup

**Files:**
- Modify: `supabase/functions/appointments/index.ts`
- Modify: `supabase/functions/_shared/booking.test.ts`

- [ ] **Step 1: Write failing handler tests**

Cover:

- request body over 8 KiB returns `413 PAYLOAD_TOO_LARGE`;
- non-JSON POST returns `415 UNSUPPORTED_MEDIA_TYPE`;
- creation returns `lookup_token` but never `lookup_token_hash`;
- database `DRK03` returns `409 SLOT_TAKEN`;
- GET requires both `phone` and `token`;
- incorrect credentials return generic `404 NOT_FOUND`;
- returned appointment omits phone, customer name, token hash, and technician note.

- [ ] **Step 2: Verify RED**

Run the focused shared test file and confirm the existing handler violates these
assertions.

- [ ] **Step 3: Implement POST**

Use:

```ts
const token = generateLookupToken();
const tokenHash = await hashLookupToken(token);
```

Call `create_public_appointment` with validated values and
`customer_phone_normalized`. Return:

```ts
json({
  id: row.id,
  status: row.status,
  lookup_token: token,
  message: 'Appointment inquiry created. The shop will call to confirm.',
}, 201)
```

- [ ] **Step 4: Implement protected GET**

Require `phone` and `token`, normalize/hash them, and call
`get_public_appointment`. Return generic `404` when no row matches.

- [ ] **Step 5: Verify GREEN**

Run:

```powershell
npm test -- supabase/functions/_shared/booking.test.ts
```

Then serve locally and smoke-test invalid requests. Do not create a production
booking in this task.

- [ ] **Step 6: Commit**

```powershell
git add supabase/functions/appointments/index.ts supabase/functions/_shared/booking.test.ts
git commit -m "feat: protect appointment status with lookup tokens"
```

---

### Task 7: Add Server-Validated Calendar Admin API

**Files:**
- Create: `supabase/functions/_shared/admin-auth.ts`
- Create: `supabase/functions/calendar-admin/index.ts`
- Modify: `supabase/functions/_shared/booking.test.ts`

- [ ] **Step 1: Write failing auth tests**

Test:

```ts
expect(await verifyAdminPassword('correct', 'correct')).toBe(true);
expect(await verifyAdminPassword('wrong', 'correct')).toBe(false);
expect(await verifyAdminPassword('', 'correct')).toBe(false);
```

Add handler tests proving invalid credentials return `401 UNAUTHORIZED` before
any database dependency is called.

- [ ] **Step 2: Verify RED**

Run focused tests and confirm missing modules fail.

- [ ] **Step 3: Implement timing-safe validation**

Hash both supplied and configured passwords with SHA-256, then compare every
byte without early exit. Read the configured value only from:

```ts
Deno.env.get('ADMIN_PASSWORD')
```

- [ ] **Step 4: Implement calendar routes**

Use one function with an `action` query parameter:

```text
GET    ?action=verify
GET    ?action=working-hours
PATCH  ?action=working-hours&id=<uuid>
GET    ?action=appointments&date=YYYY-MM-DD
GET    ?action=pending
POST   ?action=appointments
PATCH  ?action=appointments&id=<uuid>
GET    ?action=blocked-times&date=YYYY-MM-DD
POST   ?action=blocked-times
DELETE ?action=blocked-times&id=<uuid>
```

Every branch uses explicit selected/updated fields and the service-role client.
Manual creation sets `source = 'manual'` and defaults status to `potwierdzone`.
Unknown actions return `404 NOT_FOUND`; wrong methods return `405`.

- [ ] **Step 5: Verify GREEN**

Run shared tests and locally serve the function with an `ADMIN_PASSWORD` value.
Verify correct and incorrect password requests.

- [ ] **Step 6: Commit**

```powershell
git add supabase/functions/_shared/admin-auth.ts supabase/functions/calendar-admin/index.ts supabase/functions/_shared/booking.test.ts
git commit -m "feat: protect calendar operations behind server password"
```

---

### Task 8: Add Browser API Clients

**Files:**
- Create: `src/test/bookingApi.test.ts`
- Create: `src/test/calendarAdminApi.test.ts`
- Create: `src/lib/bookingApi.ts`
- Create: `src/lib/calendarAdminApi.ts`
- Modify: `src/lib/types.ts`

- [ ] **Step 1: Write failing public-client tests**

Mock `fetch` and assert:

- availability encodes the date;
- both `Authorization` and `apikey` headers are sent;
- booking serializes the seven public fields;
- structured API errors become an `ApiClientError` with `code` and `status`.

- [ ] **Step 2: Write failing admin-client tests**

Assert:

- `verifyCalendarPassword` sends `X-Admin-Password`;
- calendar requests never put the password in the URL or request body;
- protected reads and writes use the documented action and HTTP method.

- [ ] **Step 3: Verify RED**

Run:

```powershell
npm test -- src/test/bookingApi.test.ts src/test/calendarAdminApi.test.ts
```

Expected: FAIL because clients do not exist.

- [ ] **Step 4: Implement the clients**

Build the base URL from:

```ts
const functionsBase = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;
```

Use the anon key for gateway headers. Export typed functions for every public
and calendar operation.

- [ ] **Step 5: Verify GREEN**

Run the two test files. Expected: all pass.

- [ ] **Step 6: Commit**

```powershell
git add src/lib/types.ts src/lib/bookingApi.ts src/lib/calendarAdminApi.ts src/test/bookingApi.test.ts src/test/calendarAdminApi.test.ts
git commit -m "feat: add public and calendar API clients"
```

---

### Task 9: Move the Public Booking Page to the Agent API

**Files:**
- Modify: `src/test/Rezerwacja.test.tsx`
- Modify: `src/pages/Rezerwacja.tsx`
- Modify: `src/components/TimelinePicker.tsx`
- Create or Modify: `src/test/TimelinePicker.test.tsx`

- [ ] **Step 1: Write failing page tests**

Test that:

- selecting a date loads `getAvailability`;
- only API-returned slots are enabled;
- submitting calls `createAppointmentInquiry`;
- `SLOT_TAKEN` shows a specific “termin zajęty” message and returns to slot
  selection;
- success copy says the shop will call to confirm;
- no `useCreateAppointment` or direct appointment-table hook is used.

- [ ] **Step 2: Verify RED**

Run:

```powershell
npm test -- src/test/Rezerwacja.test.tsx src/test/TimelinePicker.test.tsx
```

Expected: new assertions fail against direct Supabase behavior.

- [ ] **Step 3: Update TimelinePicker**

Add optional:

```ts
availableSlots?: string[]
```

When supplied, it is authoritative. A generated slot is busy unless included in
`availableSlots`. Preserve the old appointment/block calculation for the admin
calendar.

- [ ] **Step 4: Update Rezerwacja**

Remove public use of:

```ts
useWorkingHours
useAppointmentsByDate
useBlockedTimes
useCreateAppointment
```

Use TanStack Query for `getAvailability(dateStr)` and a mutation for
`createAppointmentInquiry`. Pass mapped opening hours and authoritative slots to
`TimelinePicker`.

Store returned token only in `sessionStorage` under:

```text
drkolo_booking_<appointment-id>
```

Do not display or log it.

- [ ] **Step 5: Verify GREEN**

Run focused tests. Expected: all pass.

- [ ] **Step 6: Commit**

```powershell
git add src/pages/Rezerwacja.tsx src/components/TimelinePicker.tsx src/test/Rezerwacja.test.tsx src/test/TimelinePicker.test.tsx
git commit -m "feat: route customer bookings through public API"
```

---

### Task 10: Move Calendar Hooks Behind the Protected API

**Files:**
- Modify: `src/hooks/useSession.ts`
- Modify: `src/hooks/useAppointments.ts`
- Modify: `src/pages/KalendarzAdmin.tsx`
- Create or Modify: `src/test/KalendarzAdmin.test.tsx`
- Modify tests for `AppointmentCard`, `WorkingHoursEditor`, and `BlockedTimesEditor` if needed.

- [ ] **Step 1: Write failing session tests**

Require:

- login calls `verifyCalendarPassword`;
- wrong password is not stored;
- correct password is stored in `sessionStorage`;
- logout clears it.

- [ ] **Step 2: Write failing calendar tests**

Require:

- data hooks are disabled before authentication;
- correct login reveals the calendar;
- wrong login shows the existing Polish error;
- current appointment, working-hours, and blocked-time operations call the
  protected API client.

- [ ] **Step 3: Verify RED**

Run:

```powershell
npm test -- src/test/KalendarzAdmin.test.tsx
```

Expected: FAIL because login is currently client-side and hooks use Supabase
tables directly.

- [ ] **Step 4: Implement async session login**

Change:

```ts
login(password: string): boolean
```

to:

```ts
login(password: string): Promise<boolean>
```

Validate with `verifyCalendarPassword`, then store the password only after a
successful response.

- [ ] **Step 5: Replace hook implementations**

Keep existing exported hook names to minimize component churn, but implement
them with `calendarAdminApi`. Add:

```ts
enabled: hasCalendarAdminSession()
```

to protected queries.

- [ ] **Step 6: Update KalendarzAdmin**

Await login, show loading state, preserve current UI copy, and ensure logout
clears cached protected queries:

```ts
queryClient.removeQueries({ queryKey: ['appointments'] });
queryClient.removeQueries({ queryKey: ['working_hours'] });
queryClient.removeQueries({ queryKey: ['blocked_times'] });
```

- [ ] **Step 7: Verify GREEN**

Run all calendar/component tests.

- [ ] **Step 8: Confirm no calendar table access remains**

Run:

```powershell
rg -n "from\\('service_(appointments|working_hours|blocked_times)'\\)" src
```

Expected: no matches.

- [ ] **Step 9: Commit**

```powershell
git add src/hooks/useSession.ts src/hooks/useAppointments.ts src/pages/KalendarzAdmin.tsx src/test/KalendarzAdmin.test.tsx src/components/AppointmentCard.tsx src/components/WorkingHoursEditor.tsx src/components/BlockedTimesEditor.tsx
git commit -m "feat: move calendar admin behind protected API"
```

---

### Task 11: Repair Agent Discovery and Public Metadata

**Files:**
- Modify: `public/openapi.json`
- Modify: `public/llms.txt`
- Modify: `public/.well-known/ai-plugin.json`
- Modify: `index.html`
- Create or Modify: `src/test/agentDiscovery.test.ts`

- [ ] **Step 1: Write failing discovery tests**

Load the static JSON/text files and assert:

- OpenAPI parses as 3.1;
- server URL matches the resumed project;
- two gateway security schemes describe `Authorization` and `apikey`;
- appointment GET requires `phone` and `token`;
- creation response includes `lookup_token`;
- availability includes `timezone`;
- plugin logo is `/og-image.jpg`;
- `llms.txt` instructs the agent to ask before booking and retain the token;
- hours are `10:00-19:00`, Saturday `10:00-16:00`.

- [ ] **Step 2: Verify RED**

Run:

```powershell
npm test -- src/test/agentDiscovery.test.ts
```

Expected: failures for auth mismatch, missing token, and invalid logo.

- [ ] **Step 3: Update OpenAPI**

Define:

```json
"security": [
  {
    "bearerAnonKey": [],
    "apiKeyHeader": []
  }
]
```

with:

```json
"bearerAnonKey": {
  "type": "http",
  "scheme": "bearer"
},
"apiKeyHeader": {
  "type": "apiKey",
  "in": "header",
  "name": "apikey"
}
```

Document token lookup, all required properties, Warsaw timezone, `404`, `409`,
`413`, and `500`.

- [ ] **Step 4: Update llms and manifest**

Use the existing anon key only as a public gateway credential. Explain the
booking-consent and token-retention workflow. Set:

```json
"logo_url": "https://drkolo.pl/og-image.jpg"
```

- [ ] **Step 5: Align structured hours**

Verify `index.html` JSON-LD and visible fallback both use the intended hours.

- [ ] **Step 6: Verify GREEN**

Run the discovery test and validate JSON:

```powershell
node -e "JSON.parse(require('fs').readFileSync('public/openapi.json','utf8')); JSON.parse(require('fs').readFileSync('public/.well-known/ai-plugin.json','utf8')); console.log('valid')"
```

- [ ] **Step 7: Commit**

```powershell
git add public/openapi.json public/llms.txt public/.well-known/ai-plugin.json index.html src/test/agentDiscovery.test.ts
git commit -m "docs: publish secure agent booking contract"
```

---

### Task 12: Strengthen CI and Deployment Documentation

**Files:**
- Modify: `.github/workflows/deploy.yml`
- Modify: `README.md`

- [ ] **Step 1: Update CI**

Before `npm run build`, add:

```yaml
- run: npm test
- run: npm run lint
```

- [ ] **Step 2: Document deployment**

Replace the placeholder README with:

- required frontend variables;
- `ADMIN_PASSWORD` Supabase secret;
- migration command;
- function deployment commands;
- Pages deployment behavior;
- smoke-test commands;
- warning never to expose the service-role key or admin password as `VITE_*`.

Document:

```powershell
npx supabase secrets set ADMIN_PASSWORD="<value>" --project-ref iftyvvymlsdercmyagpe
npx supabase functions deploy services --project-ref iftyvvymlsdercmyagpe
npx supabase functions deploy availability --project-ref iftyvvymlsdercmyagpe
npx supabase functions deploy appointments --project-ref iftyvvymlsdercmyagpe
npx supabase functions deploy calendar-admin --project-ref iftyvvymlsdercmyagpe
```

- [ ] **Step 3: Verify workflow syntax and project tests**

Run:

```powershell
npm test
npm run lint
npm run build
```

Expected: all commands exit `0`.

- [ ] **Step 4: Commit**

```powershell
git add .github/workflows/deploy.yml README.md
git commit -m "ci: verify and document hardened booking deployment"
```

---

### Task 13: Deploy and Verify Production End to End

**Files:** no source changes expected.

- [ ] **Step 1: Inspect production before mutation**

Record:

- existing active duplicate slots;
- existing policies;
- current working hours;
- latest migration version.

- [ ] **Step 2: Set secret and deploy backend**

Run the documented `secrets set`, `db push`, and four function deployments.

- [ ] **Step 3: Verify public privacy**

Using the anon key, direct PostgREST reads from `service_appointments` must fail.
The public availability and services functions must return `200`.

- [ ] **Step 4: Verify token flow**

Choose a future available slot explicitly reserved for testing. POST one inquiry
with a clearly synthetic customer:

```json
{
  "customer_name": "TEST AGENT",
  "customer_phone": "+48000000000",
  "bike_manufacturer": "TEST",
  "bike_model": "TEST",
  "service_note": "Automated production verification - remove after test"
}
```

Confirm:

- creation returns `201` and a token;
- correct phone plus token returns the inquiry;
- wrong token returns `404`;
- a duplicate POST returns `409`;
- no response exposes internal fields.

- [ ] **Step 5: Verify protected calendar**

Confirm:

- wrong password returns `401`;
- correct password loads the synthetic inquiry;
- status and note updates work;
- working-hour reads work;
- create/delete a temporary blocked period.

Delete or reject the synthetic inquiry through the protected calendar API so it
does not occupy a real slot.

- [ ] **Step 6: Deploy frontend**

Push the verified commits to `main` or run the repository's approved Pages
deployment workflow.

- [ ] **Step 7: Verify public artifacts**

Check:

```text
https://drkolo.pl/
https://drkolo.pl/rezerwacja
https://drkolo.pl/llms.txt
https://drkolo.pl/openapi.json
https://drkolo.pl/.well-known/ai-plugin.json
https://drkolo.pl/og-image.jpg
```

Expected: all return `200`, correct content types, and current content.

- [ ] **Step 8: Final verification**

Run fresh:

```powershell
npm test
npm run lint
npm run build
git -c safe.directory=D:/drkolo status --short
```

Expected:

- zero failing tests;
- zero lint errors;
- successful production build;
- only known unrelated files such as `supabase/.temp/` remain untracked.

- [ ] **Step 9: Final commit if verification required source corrections**

Commit only files changed to correct verified failures. Do not add
`supabase/.temp/`.
