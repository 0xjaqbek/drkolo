# API Security & Abuse Protection Fixes

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 4 issues preventing the AI booking API from working safely: auth config for ChatGPT, RLS lockdown, abuse protection with rate limiting, and correct working hours seed.

**Architecture:** Edge Functions switch from anon key to service_role key so RLS can be locked down for direct REST API access. A new `booking_rate_limits` table tracks per-phone and per-IP attempts. The appointments Edge Function enforces rate limits, booking caps, and advance window checks before inserting. Agent-facing docs (llms.txt, llms-full.txt, openapi.json) are updated with rate limit info.

**Tech Stack:** Supabase Edge Functions (Deno/TypeScript), PostgreSQL (migrations), JSON config files

---

## File Map

| Action | File | Responsibility |
|--------|------|---------------|
| Modify | `public/.well-known/ai-plugin.json` | Fix auth type for ChatGPT |
| Create | `supabase/migrations/009_rls_lockdown.sql` | Replace open RLS policies with restrictive ones |
| Create | `supabase/migrations/010_rate_limits.sql` | Rate limit tracking table + cleanup function |
| Create | `supabase/migrations/011_fix_working_hours.sql` | Correct seed hours to match real schedule |
| Modify | `supabase/functions/availability/index.ts` | Switch to service_role key |
| Modify | `supabase/functions/appointments/index.ts` | Switch to service_role key + add abuse protection |
| Modify | `supabase/functions/services/index.ts` | No DB access, no change needed |
| Modify | `public/openapi.json` | Document rate limits and error codes |
| Modify | `public/llms.txt` | Update API section with rate limit info |
| Modify | `public/llms-full.txt` | Update API section with rate limit info |

---

### Task 1: Fix ai-plugin.json auth configuration

**Files:**
- Modify: `public/.well-known/ai-plugin.json`

- [ ] **Step 1: Update auth type to service_http**

Replace the entire file content with:

```json
{
  "schema_version": "v1",
  "name_for_human": "Dr Koło Serwis Rowerowy",
  "name_for_model": "drkolo_bike_service",
  "description_for_human": "Book a bicycle service appointment at Dr Koło bike shop in Gdańsk, Poland.",
  "description_for_model": "Use this plugin to interact with Dr Koło bicycle repair shop in Gdańsk, Poland. You can check available appointment slots for a specific date, browse the service catalog with prices in PLN, create a booking inquiry (the shop will call the customer to confirm), and look up existing appointment status by customer phone number.",
  "auth": {
    "type": "service_http",
    "authorization_type": "bearer",
    "verification_tokens": {
      "supabase": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlmdHl2dnltbHNkZXJjbXlhZ3BlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyMjE4MDUsImV4cCI6MjA5Mzc5NzgwNX0.TC2OIWB_NQVXEJXdp3XiIYTAJ3zMhfvioD-_9DDjUUY"
    }
  },
  "api": {
    "type": "openapi",
    "url": "https://drkolo.pl/openapi.json"
  },
  "logo_url": "https://drkolo.pl/og-image.png",
  "contact_email": "kontakt@drkolo.pl",
  "legal_info_url": "https://drkolo.pl/polityka-prywatnosci"
}
```

Key changes:
- `auth.type` → `"service_http"` (ChatGPT will send the Bearer token)
- `auth.authorization_type` → `"bearer"`
- `auth.verification_tokens.supabase` → the anon key
- `legal_info_url` → points to privacy policy page

- [ ] **Step 2: Commit**

```bash
git add public/.well-known/ai-plugin.json
git commit -m "fix: ai-plugin.json auth type for ChatGPT compatibility"
```

---

### Task 2: RLS lockdown migration

**Files:**
- Create: `supabase/migrations/009_rls_lockdown.sql`

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/009_rls_lockdown.sql`:

```sql
-- 009: Lock down RLS policies
-- Edge Functions now use service_role (bypasses RLS).
-- These policies only affect direct REST API access with the anon key.

-- ============================================================
-- service_working_hours: anon can only SELECT (read schedule)
-- ============================================================
drop policy if exists "anon_select_working_hours" on service_working_hours;
drop policy if exists "anon_update_working_hours" on service_working_hours;

create policy "anon_read_working_hours"
  on service_working_hours for select
  using (true);

-- No INSERT / UPDATE / DELETE for anon on working_hours.

-- ============================================================
-- service_appointments: anon can only INSERT (create booking)
-- No SELECT (protects customer PII), no UPDATE, no DELETE.
-- ============================================================
drop policy if exists "anon_select_appointments" on service_appointments;
drop policy if exists "anon_insert_appointments" on service_appointments;
drop policy if exists "anon_update_appointments" on service_appointments;

create policy "anon_insert_appointments"
  on service_appointments for insert
  with check (
    status = 'zapytanie'
    and source in ('online', 'ai_agent')
  );

-- No SELECT / UPDATE / DELETE for anon on appointments.

-- ============================================================
-- service_blocked_times: anon can only SELECT
-- ============================================================
drop policy if exists "anon_select_blocked_times" on service_blocked_times;
drop policy if exists "anon_insert_blocked_times" on service_blocked_times;
drop policy if exists "anon_update_blocked_times" on service_blocked_times;
drop policy if exists "anon_delete_blocked_times" on service_blocked_times;

create policy "anon_read_blocked_times"
  on service_blocked_times for select
  using (true);

-- No INSERT / UPDATE / DELETE for anon on blocked_times.
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/009_rls_lockdown.sql
git commit -m "security: lock down RLS — anon can only read hours and insert bookings"
```

---

### Task 3: Switch Edge Functions to service_role key

**Files:**
- Modify: `supabase/functions/availability/index.ts`
- Modify: `supabase/functions/appointments/index.ts`

- [ ] **Step 1: Update availability/index.ts**

Change the Supabase client initialization (line 41-44) from:

```typescript
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_ANON_KEY') ?? '',
);
```

to:

```typescript
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);
```

- [ ] **Step 2: Update appointments/index.ts**

Change the Supabase client initialization (line 174-177) from:

```typescript
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_ANON_KEY') ?? '',
);
```

to:

```typescript
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);
```

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/availability/index.ts supabase/functions/appointments/index.ts
git commit -m "security: Edge Functions use service_role key to bypass locked-down RLS"
```

---

### Task 4: Rate limit table migration

**Files:**
- Create: `supabase/migrations/010_rate_limits.sql`

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/010_rate_limits.sql`:

```sql
-- 010: Rate limiting for booking API
-- Tracks booking attempts per phone and per IP for abuse prevention.

create table if not exists booking_rate_limits (
  id uuid primary key default gen_random_uuid(),
  phone text not null,
  ip_address text,
  created_at timestamptz not null default now()
);

-- Index for fast lookups
create index idx_rate_limits_phone_created on booking_rate_limits (phone, created_at desc);
create index idx_rate_limits_ip_created on booking_rate_limits (ip_address, created_at desc);

-- Auto-cleanup: delete entries older than 24 hours
-- Run via Supabase pg_cron or manual call
create or replace function cleanup_old_rate_limits()
returns void as $$
  delete from booking_rate_limits where created_at < now() - interval '24 hours';
$$ language sql;

-- Schedule cleanup every hour (requires pg_cron extension)
-- Supabase projects have pg_cron enabled by default.
select cron.schedule(
  'cleanup-rate-limits',
  '0 * * * *',
  $$ select cleanup_old_rate_limits() $$
);

-- RLS: no direct access for anon
alter table booking_rate_limits enable row level security;
-- No policies = no anon access. Only service_role (Edge Functions) can read/write.
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/010_rate_limits.sql
git commit -m "feat: add booking_rate_limits table with hourly pg_cron cleanup"
```

---

### Task 5: Add abuse protection to appointments Edge Function

**Files:**
- Modify: `supabase/functions/appointments/index.ts`

- [ ] **Step 1: Rewrite the full appointments/index.ts**

Replace the entire file with the version below. Changes from original:
- Uses `SUPABASE_SERVICE_ROLE_KEY` (from Task 3)
- Extracts client IP from headers
- Adds `checkRateLimits()` — enforces per-phone, per-IP, and global daily limits
- Adds `checkBookingConstraints()` — max 3 active per phone, no same-phone+date duplicate, 14-day advance window
- Records every booking attempt in `booking_rate_limits`
- Removes duplicate `generateSlots()` — inlined from shared logic

```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// --- Rate limit configuration ---
const MAX_BOOKINGS_PER_PHONE_PER_DAY = 3;
const MAX_BOOKINGS_PER_IP_PER_HOUR = 5;
const MAX_AI_BOOKINGS_PER_DAY = 50;
const MAX_ACTIVE_PER_PHONE = 3;
const MAX_ADVANCE_DAYS = 14;

function jsonError(message: string, code: string, status: number): Response {
  return new Response(JSON.stringify({ error: message, code }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function generateSlots(openTime: string, closeTime: string): string[] {
  const slots: string[] = [];
  const [openH, openM] = openTime.split(':').map(Number);
  const [closeH, closeM] = closeTime.split(':').map(Number);
  let h = openH;
  let m = openM;
  while (h * 60 + m < closeH * 60 + closeM) {
    slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    m += 30;
    if (m >= 60) { h++; m -= 60; }
  }
  return slots;
}

function getClientIp(req: Request): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  );
}

async function checkRateLimits(
  supabase: ReturnType<typeof createClient>,
  phone: string,
  ip: string,
): Promise<Response | null> {
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();

  // Check per-phone daily limit
  const { count: phoneCount } = await supabase
    .from('booking_rate_limits')
    .select('*', { count: 'exact', head: true })
    .eq('phone', phone)
    .gte('created_at', oneDayAgo);

  if ((phoneCount ?? 0) >= MAX_BOOKINGS_PER_PHONE_PER_DAY) {
    return jsonError(
      `Maximum ${MAX_BOOKINGS_PER_PHONE_PER_DAY} booking attempts per phone per day. Try again tomorrow.`,
      'RATE_LIMIT_PHONE', 429,
    );
  }

  // Check per-IP hourly limit
  if (ip !== 'unknown') {
    const { count: ipCount } = await supabase
      .from('booking_rate_limits')
      .select('*', { count: 'exact', head: true })
      .eq('ip_address', ip)
      .gte('created_at', oneHourAgo);

    if ((ipCount ?? 0) >= MAX_BOOKINGS_PER_IP_PER_HOUR) {
      return jsonError(
        `Too many requests from this IP. Try again later.`,
        'RATE_LIMIT_IP', 429,
      );
    }
  }

  // Check global AI agent daily limit
  const { count: globalCount } = await supabase
    .from('booking_rate_limits')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', oneDayAgo);

  if ((globalCount ?? 0) >= MAX_AI_BOOKINGS_PER_DAY) {
    return jsonError(
      'Daily booking limit reached. Please call 511 061 221 to book.',
      'RATE_LIMIT_GLOBAL', 429,
    );
  }

  return null;
}

async function checkBookingConstraints(
  supabase: ReturnType<typeof createClient>,
  phone: string,
  date: string,
): Promise<Response | null> {
  // Max active bookings per phone
  const { count: activeCount } = await supabase
    .from('service_appointments')
    .select('*', { count: 'exact', head: true })
    .eq('customer_phone', phone)
    .in('status', ['zapytanie', 'potwierdzone']);

  if ((activeCount ?? 0) >= MAX_ACTIVE_PER_PHONE) {
    return jsonError(
      `Maximum ${MAX_ACTIVE_PER_PHONE} active bookings per phone number. Cancel or complete existing bookings first.`,
      'MAX_ACTIVE_REACHED', 400,
    );
  }

  // No duplicate: same phone + same date
  const { count: dupCount } = await supabase
    .from('service_appointments')
    .select('*', { count: 'exact', head: true })
    .eq('customer_phone', phone)
    .eq('appointment_date', date)
    .in('status', ['zapytanie', 'potwierdzone']);

  if ((dupCount ?? 0) > 0) {
    return jsonError(
      'You already have a booking for this date. Choose a different date or call 511 061 221.',
      'DUPLICATE_DATE', 409,
    );
  }

  // Max 14 days in advance
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const bookingDate = new Date(date + 'T00:00:00');
  const diffDays = Math.floor((bookingDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays > MAX_ADVANCE_DAYS) {
    return jsonError(
      `Bookings can be made up to ${MAX_ADVANCE_DAYS} days in advance. Call 511 061 221 for later dates.`,
      'TOO_FAR_AHEAD', 400,
    );
  }

  return null;
}

async function handleGet(req: Request, supabase: ReturnType<typeof createClient>): Promise<Response> {
  const url = new URL(req.url);
  const phone = url.searchParams.get('phone');

  if (!phone) {
    return jsonError('Missing phone parameter', 'MISSING_PHONE', 400);
  }

  const { data, error } = await supabase
    .from('service_appointments')
    .select('id, appointment_date, arrival_time, status, bike_manufacturer, bike_model, service_note, created_at')
    .eq('customer_phone', phone)
    .order('appointment_date', { ascending: false })
    .order('arrival_time', { ascending: false });

  if (error) {
    return jsonError('Failed to fetch appointments', 'DB_ERROR', 500);
  }

  return new Response(
    JSON.stringify({
      appointments: (data ?? []).map((a) => ({
        id: a.id,
        date: a.appointment_date,
        time: a.arrival_time.slice(0, 5),
        status: a.status,
        bike_manufacturer: a.bike_manufacturer,
        bike_model: a.bike_model,
        service_note: a.service_note,
        created_at: a.created_at,
      })),
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
}

async function handlePost(req: Request, supabase: ReturnType<typeof createClient>): Promise<Response> {
  let body: Record<string, string>;
  try {
    body = await req.json();
  } catch {
    return jsonError('Invalid JSON body', 'INVALID_JSON', 400);
  }

  const { date, time, customer_name, customer_phone, bike_manufacturer, bike_model, service_note } = body;

  const missing = ['date', 'time', 'customer_name', 'customer_phone', 'bike_manufacturer', 'bike_model', 'service_note']
    .filter((f) => !body[f]);
  if (missing.length > 0) {
    return jsonError(`Missing required fields: ${missing.join(', ')}`, 'MISSING_FIELDS', 400);
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return jsonError('Invalid date format (YYYY-MM-DD)', 'INVALID_DATE', 400);
  }

  const todayStr = new Date().toISOString().slice(0, 10);
  if (date < todayStr) {
    return jsonError('Date is in the past', 'DATE_PAST', 400);
  }

  const digits = customer_phone.replace(/\D/g, '');
  if (digits.length < 9) {
    return jsonError('Invalid phone number (minimum 9 digits)', 'INVALID_PHONE', 400);
  }

  if (!/^\d{2}:\d{2}$/.test(time)) {
    return jsonError('Invalid time format (HH:MM)', 'INVALID_TIME', 400);
  }

  // --- Rate limiting ---
  const clientIp = getClientIp(req);
  const rateLimitError = await checkRateLimits(supabase, customer_phone, clientIp);
  if (rateLimitError) return rateLimitError;

  // --- Booking constraints ---
  const constraintError = await checkBookingConstraints(supabase, customer_phone, date);
  if (constraintError) return constraintError;

  // --- Slot validation ---
  const dayOfWeek = new Date(date + 'T12:00:00Z').getUTCDay();
  const { data: wh } = await supabase
    .from('service_working_hours')
    .select('*')
    .eq('day_of_week', dayOfWeek)
    .single();

  if (!wh || !wh.is_open) {
    return jsonError('Shop is closed on this day', 'DAY_CLOSED', 400);
  }

  const allSlots = generateSlots(wh.open_time, wh.close_time);
  if (!allSlots.includes(time)) {
    return jsonError('Time is outside working hours or not a 30-min slot', 'INVALID_SLOT', 400);
  }

  const { data: existing } = await supabase
    .from('service_appointments')
    .select('id')
    .eq('appointment_date', date)
    .eq('arrival_time', time + ':00')
    .neq('status', 'odrzucone');

  if (existing && existing.length > 0) {
    return jsonError('Time slot unavailable', 'SLOT_TAKEN', 409);
  }

  const { data: blockedTimes } = await supabase
    .from('service_blocked_times')
    .select('start_time, end_time')
    .eq('block_date', date);

  for (const block of (blockedTimes ?? [])) {
    if (time >= block.start_time.slice(0, 5) && time < block.end_time.slice(0, 5)) {
      return jsonError('Time slot unavailable', 'SLOT_TAKEN', 409);
    }
  }

  // --- Record rate limit attempt ---
  await supabase.from('booking_rate_limits').insert({
    phone: customer_phone,
    ip_address: clientIp,
  });

  // --- Create appointment ---
  const { data: created, error } = await supabase
    .from('service_appointments')
    .insert({
      appointment_date: date,
      arrival_time: time + ':00',
      customer_name,
      customer_phone,
      bike_manufacturer,
      bike_model,
      service_note,
      status: 'zapytanie',
      source: 'ai_agent',
      estimated_duration_minutes: null,
      technician_note: null,
    })
    .select('id, status')
    .single();

  if (error || !created) {
    return jsonError('Failed to create appointment', 'DB_ERROR', 500);
  }

  return new Response(
    JSON.stringify({
      id: created.id,
      status: created.status,
      message: `Rezerwacja utworzona. Serwis oddzwoni pod numer ${customer_phone} w celu potwierdzenia.`,
    }),
    { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  if (req.method === 'GET') return handleGet(req, supabase);
  if (req.method === 'POST') return handlePost(req, supabase);

  return jsonError('Method not allowed', 'METHOD_NOT_ALLOWED', 405);
});
```

- [ ] **Step 2: Commit**

```bash
git add supabase/functions/appointments/index.ts
git commit -m "feat: add rate limiting, booking constraints, and IP tracking to appointments API"
```

---

### Task 6: Fix working hours seed migration

**Files:**
- Create: `supabase/migrations/011_fix_working_hours.sql`

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/011_fix_working_hours.sql`:

```sql
-- 011: Correct working hours to match actual shop schedule
-- Website and llms.txt advertise: Mon-Fri 10:00-19:00, Sat 10:00-16:00

update service_working_hours set open_time = '10:00', close_time = '19:00' where day_of_week = 1; -- Monday
update service_working_hours set open_time = '10:00', close_time = '19:00' where day_of_week = 2; -- Tuesday
update service_working_hours set open_time = '10:00', close_time = '19:00' where day_of_week = 3; -- Wednesday
update service_working_hours set open_time = '10:00', close_time = '19:00' where day_of_week = 4; -- Thursday
update service_working_hours set open_time = '10:00', close_time = '19:00' where day_of_week = 5; -- Friday
update service_working_hours set open_time = '10:00', close_time = '16:00' where day_of_week = 6; -- Saturday
-- Sunday (day_of_week=0) already has is_open=false, no change needed.
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/011_fix_working_hours.sql
git commit -m "fix: correct working hours seed to match real schedule (10-19 Mon-Fri, 10-16 Sat)"
```

---

### Task 7: Update OpenAPI spec with rate limit documentation

**Files:**
- Modify: `public/openapi.json`

- [ ] **Step 1: Add rate limit error responses to POST /appointments**

Add these response codes to the `POST /appointments` responses object:

```json
"429": {
  "description": "Rate limit exceeded (per-phone, per-IP, or global daily limit)",
  "content": { "application/json": { "schema": { "$ref": "#/components/schemas/Error" } } }
}
```

Update the `POST /appointments` description to:

```
"description": "Creates an appointment inquiry. The shop will call the customer to confirm. Rate limits: max 3 attempts per phone per day, max 5 per IP per hour, max 50 AI bookings per day globally. Constraints: max 3 active bookings per phone, no duplicate same-phone+date, max 14 days in advance."
```

- [ ] **Step 2: Commit**

```bash
git add public/openapi.json
git commit -m "docs: add rate limit info and 429 response to OpenAPI spec"
```

---

### Task 8: Update agent-facing documentation (llms.txt, llms-full.txt)

**Files:**
- Modify: `public/llms.txt`
- Modify: `public/llms-full.txt`

- [ ] **Step 1: Update llms.txt API section**

Replace the `## API` section (from `## API` to end of file) with:

```markdown
## API

Dr Koło udostępnia REST API dla agentów AI i aplikacji zewnętrznych.

Specyfikacja OpenAPI 3.1: https://drkolo.pl/openapi.json
Manifest ChatGPT: https://drkolo.pl/.well-known/ai-plugin.json

Uwierzytelnianie: Bearer token (klucz anon) — patrz securitySchemes w /openapi.json.
Base URL: https://iftyvvymlsdercmyagpe.supabase.co/functions/v1

### Endpoints

- GET /availability?date=YYYY-MM-DD — available 30-min slots for a date
- GET /services — service catalog with PLN prices
- POST /appointments — create booking inquiry (shop calls customer to confirm)
- GET /appointments?phone=+48... — look up appointment status by phone

### Limity i ograniczenia

- Maks. 3 próby rezerwacji na numer telefonu dziennie
- Maks. 5 żądań na adres IP na godzinę
- Maks. 50 rezerwacji AI dziennie (globalnie)
- Maks. 3 aktywne rezerwacje na numer telefonu
- Nie można zarezerwować dwóch wizyt na ten sam numer telefonu w tym samym dniu
- Rezerwacja możliwa maks. 14 dni do przodu
- Przy przekroczeniu limitu odpowiedź 429 z kodem błędu
```

- [ ] **Step 2: Update llms-full.txt API section**

Replace the `## API` section (from `## API` to end of file) with the same content as above.

- [ ] **Step 3: Commit**

```bash
git add public/llms.txt public/llms-full.txt
git commit -m "docs: update llms.txt with rate limits and booking constraints for AI agents"
```

---

### Task 9: Deploy migrations and Edge Functions

- [ ] **Step 1: Push migrations to Supabase**

```bash
npx supabase db push --linked
```

Expected: 3 migrations applied (009, 010, 011).

- [ ] **Step 2: Deploy Edge Functions**

```bash
npx supabase functions deploy availability --linked
npx supabase functions deploy appointments --linked
```

Expected: Both functions deployed successfully.

- [ ] **Step 3: Verify endpoints still work**

Test GET /services:
```bash
curl -s --ssl-no-revoke "https://iftyvvymlsdercmyagpe.supabase.co/functions/v1/services" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlmdHl2dnltbHNkZXJjbXlhZ3BlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyMjE4MDUsImV4cCI6MjA5Mzc5NzgwNX0.TC2OIWB_NQVXEJXdp3XiIYTAJ3zMhfvioD-_9DDjUUY"
```
Expected: 200 with service catalog JSON.

Test GET /availability:
```bash
curl -s --ssl-no-revoke "https://iftyvvymlsdercmyagpe.supabase.co/functions/v1/availability?date=2026-06-30" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlmdHl2dnltbHNkZXJjbXlhZ3BlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyMjE4MDUsImV4cCI6MjA5Mzc5NzgwNX0.TC2OIWB_NQVXEJXdp3XiIYTAJ3zMhfvioD-_9DDjUUY"
```
Expected: 200 with slots for Monday.

- [ ] **Step 4: Verify RLS blocks direct REST API access to appointments**

```bash
curl -s --ssl-no-revoke "https://iftyvvymlsdercmyagpe.supabase.co/rest/v1/service_appointments?select=*" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlmdHl2dnltbHNkZXJjbXlhZ3BlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyMjE4MDUsImV4cCI6MjA5Mzc5NzgwNX0.TC2OIWB_NQVXEJXdp3XiIYTAJ3zMhfvioD-_9DDjUUY" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlmdHl2dnltbHNkZXJjbXlhZ3BlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyMjE4MDUsImV4cCI6MjA5Mzc5NzgwNX0.TC2OIWB_NQVXEJXdp3XiIYTAJ3zMhfvioD-_9DDjUUY"
```
Expected: empty array `[]` (anon cannot SELECT appointments).

- [ ] **Step 5: Final commit with all changes**

```bash
git add -A
git commit -m "deploy: API security fixes — auth, RLS, rate limiting, working hours"
```
