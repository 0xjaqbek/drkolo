# AI Agent API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expose 4 Supabase Edge Functions + OpenAPI discoverability so external AI assistants and third-party apps can check availability, browse services, book appointments, and look up appointment status.

**Architecture:** Four Deno Edge Functions (`availability`, `services`, `appointments`) deployed on Supabase. Static files `openapi.json` and `.well-known/ai-plugin.json` served by the Vite app from `public/`. `llms.txt` updated to reference the API.

**Tech Stack:** Deno (Supabase Edge Functions), Supabase PostgREST (via supabase-js), OpenAPI 3.1, Vite static assets.

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `supabase/migrations/008_ai_agent_source.sql` | Create | Add `'ai_agent'` to source check constraint |
| `src/lib/types.ts` | Modify | Add `'ai_agent'` to `AppointmentSource` union |
| `supabase/functions/services/index.ts` | Create | GET /functions/v1/services — static catalog |
| `supabase/functions/availability/index.ts` | Create | GET /functions/v1/availability?date= |
| `supabase/functions/appointments/index.ts` | Create | GET + POST /functions/v1/appointments |
| `public/openapi.json` | Create | OpenAPI 3.1 spec for AI agent discoverability |
| `public/.well-known/ai-plugin.json` | Create | ChatGPT plugin manifest |
| `public/llms.txt` | Modify | Add `## API` section |

---

## Task 1: Database migration + type update

**Files:**
- Create: `supabase/migrations/008_ai_agent_source.sql`
- Modify: `src/lib/types.ts` line 48

- [ ] **Step 1: Create migration file**

```sql
-- supabase/migrations/008_ai_agent_source.sql
alter table service_appointments
  drop constraint service_appointments_source_check;
alter table service_appointments
  add constraint service_appointments_source_check
  check (source in ('online', 'manual', 'ai_agent'));
```

- [ ] **Step 2: Update AppointmentSource type in src/lib/types.ts**

Change line 48 from:
```typescript
export type AppointmentSource = 'online' | 'manual';
```
to:
```typescript
export type AppointmentSource = 'online' | 'manual' | 'ai_agent';
```

- [ ] **Step 3: Run existing tests to confirm no regressions**

```bash
npm test
```
Expected: all tests pass (no test touches AppointmentSource directly).

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/008_ai_agent_source.sql src/lib/types.ts
git commit -m "feat: add ai_agent as valid appointment source"
```

---

## Task 2: Apply migration to Supabase

> **Must be done before Task 5 (appointments function testing)** — the POST endpoint inserts rows with `source: 'ai_agent'` which requires this constraint change to be live.

**Files:** none (DB-only change)

- [ ] **Step 1: Apply migration via Supabase SQL editor**

Go to https://supabase.com/dashboard/project/iftyvvymlsdercmyagpe/sql and run:

```sql
alter table service_appointments
  drop constraint service_appointments_source_check;
alter table service_appointments
  add constraint service_appointments_source_check
  check (source in ('online', 'manual', 'ai_agent'));
```

- [ ] **Step 2: Verify constraint updated**

In the same SQL editor:
```sql
select conname, pg_get_constraintdef(oid)
from pg_constraint
where conrelid = 'service_appointments'::regclass
  and conname = 'service_appointments_source_check';
```
Expected: output includes `'ai_agent'` in the constraint definition.

---

## Task 3: services Edge Function

**Files:**
- Create: `supabase/functions/services/index.ts`

- [ ] **Step 1: Create function file**

```typescript
// supabase/functions/services/index.ts
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SERVICES = {
  categories: [
    {
      name: 'Przeglądy',
      services: [
        { name: 'Przegląd generalny Full Suspension', price_pln: 649 },
        { name: 'Przegląd generalny hardtail', price_pln: 449 },
        { name: 'Przegląd podstawowy', price_pln: 249 },
      ],
    },
    {
      name: 'Zawieszenie',
      services: [
        { name: 'Duży serwis zawieszenia', price_pln: 400 },
        { name: 'Mały serwis zawieszenia', price_pln: 200 },
      ],
    },
    {
      name: 'Napęd',
      services: [
        { name: 'Założenie łańcucha + regulacja przerzutki', price_pln: 80 },
        { name: 'Mycie napędu', price_pln: 80 },
        { name: 'Regulacja przerzutki', price_pln: 50 },
      ],
    },
    {
      name: 'Koła',
      services: [
        { name: 'Montaż systemu tubeless', price_pln: 150 },
        { name: 'Zmiana opony tubeless', price_pln: 50 },
        { name: 'Centrowanie koła', price_pln: 50 },
        { name: 'Dolanie uszczelniacza', price_pln: 40 },
        { name: 'Wymiana dętki', price_pln: 30 },
      ],
    },
    {
      name: 'Hamulce i diagnostyka',
      services: [
        { name: 'Diagnostyka Bosch', price_pln: 200 },
        { name: 'Serwis hamulca', price_pln: 50 },
        { name: 'Prostowanie haka przerzutki', price_pln: 30 },
      ],
    },
  ],
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  return new Response(JSON.stringify(SERVICES), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
```

- [ ] **Step 2: Deploy and smoke-test**

```bash
npx supabase functions deploy services --project-ref iftyvvymlsdercmyagpe
curl https://iftyvvymlsdercmyagpe.supabase.co/functions/v1/services \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlmdHl2dnltbHNkZXJjbXlhZ3BlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyMjE4MDUsImV4cCI6MjA5Mzc5NzgwNX0.TC2OIWB_NQVXEJXdp3XiIYTAJ3zMhfvioD-_9DDjUUY"
```
Expected: JSON with `categories` array, 5 categories, no error.

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/services/index.ts
git commit -m "feat: add services edge function"
```

---

## Task 4: availability Edge Function

**Files:**
- Create: `supabase/functions/availability/index.ts`

- [ ] **Step 1: Create function file**

```typescript
// supabase/functions/availability/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const date = url.searchParams.get('date');

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return jsonError('Missing or invalid date parameter (YYYY-MM-DD)', 'INVALID_DATE', 400);
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
  );

  // day_of_week: 0=Sunday. Use UTC to match DB seed.
  const dayOfWeek = new Date(date + 'T12:00:00Z').getUTCDay();

  const { data: wh } = await supabase
    .from('service_working_hours')
    .select('*')
    .eq('day_of_week', dayOfWeek)
    .single();

  if (!wh || !wh.is_open) {
    return new Response(
      JSON.stringify({ date, open: null, close: null, slots: [] }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  const [{ data: appointments }, { data: blockedTimes }] = await Promise.all([
    supabase
      .from('service_appointments')
      .select('arrival_time')
      .eq('appointment_date', date)
      .neq('status', 'odrzucone'),
    supabase
      .from('service_blocked_times')
      .select('start_time, end_time')
      .eq('block_date', date),
  ]);

  const allSlots = generateSlots(wh.open_time, wh.close_time);
  const bookedSlots = new Set((appointments ?? []).map((a: { arrival_time: string }) => a.arrival_time.slice(0, 5)));

  const available = allSlots.filter((slot) => {
    if (bookedSlots.has(slot)) return false;
    for (const block of (blockedTimes ?? [])) {
      if (slot >= block.start_time.slice(0, 5) && slot < block.end_time.slice(0, 5)) return false;
    }
    return true;
  });

  return new Response(
    JSON.stringify({
      date,
      open: wh.open_time.slice(0, 5),
      close: wh.close_time.slice(0, 5),
      slots: available,
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
});
```

- [ ] **Step 2: Deploy**

```bash
npx supabase functions deploy availability --project-ref iftyvvymlsdercmyagpe
```

- [ ] **Step 3: Test open weekday (Monday)**

Find the next Monday's date (e.g. 2026-05-25) and run:
```bash
curl "https://iftyvvymlsdercmyagpe.supabase.co/functions/v1/availability?date=2026-05-25" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlmdHl2dnltbHNkZXJjbXlhZ3BlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyMjE4MDUsImV4cCI6MjA5Mzc5NzgwNX0.TC2OIWB_NQVXEJXdp3XiIYTAJ3zMhfvioD-_9DDjUUY"
```
Expected: `{"date":"2026-05-25","open":"08:00","close":"17:00","slots":["08:00","08:30",...,"16:30"]}`

- [ ] **Step 4: Test Sunday (closed)**

```bash
curl "https://iftyvvymlsdercmyagpe.supabase.co/functions/v1/availability?date=2026-05-24" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlmdHl2dnltbHNkZXJjbXlhZ3BlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyMjE4MDUsImV4cCI6MjA5Mzc5NzgwNX0.TC2OIWB_NQVXEJXdp3XiIYTAJ3zMhfvioD-_9DDjUUY"
```
Expected: `{"date":"2026-05-24","open":null,"close":null,"slots":[]}`

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/availability/index.ts
git commit -m "feat: add availability edge function"
```

---

## Task 5: appointments Edge Function (GET + POST)

**Files:**
- Create: `supabase/functions/appointments/index.ts`

- [ ] **Step 1: Create function file**

```typescript
// supabase/functions/appointments/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

  // Required fields
  const missing = ['date', 'time', 'customer_name', 'customer_phone', 'bike_manufacturer', 'bike_model', 'service_note']
    .filter((f) => !body[f]);
  if (missing.length > 0) {
    return jsonError(`Missing required fields: ${missing.join(', ')}`, 'MISSING_FIELDS', 400);
  }

  // Date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return jsonError('Invalid date format (YYYY-MM-DD)', 'INVALID_DATE', 400);
  }

  // Date not in past (compare date strings, UTC noon)
  const todayStr = new Date().toISOString().slice(0, 10);
  if (date < todayStr) {
    return jsonError('Date is in the past', 'DATE_PAST', 400);
  }

  // Phone: at least 9 digits
  const digits = customer_phone.replace(/\D/g, '');
  if (digits.length < 9) {
    return jsonError('Invalid phone number (minimum 9 digits)', 'INVALID_PHONE', 400);
  }

  // Time format
  if (!/^\d{2}:\d{2}$/.test(time)) {
    return jsonError('Invalid time format (HH:MM)', 'INVALID_TIME', 400);
  }

  // Check shop is open that day
  const dayOfWeek = new Date(date + 'T12:00:00Z').getUTCDay();
  const { data: wh } = await supabase
    .from('service_working_hours')
    .select('*')
    .eq('day_of_week', dayOfWeek)
    .single();

  if (!wh || !wh.is_open) {
    return jsonError('Shop is closed on this day', 'DAY_CLOSED', 400);
  }

  // Check time is a valid slot
  const allSlots = generateSlots(wh.open_time, wh.close_time);
  if (!allSlots.includes(time)) {
    return jsonError('Time is outside working hours or not a 30-min slot', 'INVALID_SLOT', 400);
  }

  // Check slot not already taken
  const { data: existing } = await supabase
    .from('service_appointments')
    .select('id')
    .eq('appointment_date', date)
    .eq('arrival_time', time + ':00')
    .neq('status', 'odrzucone');

  if (existing && existing.length > 0) {
    return jsonError('Time slot unavailable', 'SLOT_TAKEN', 409);
  }

  // Check slot not in blocked times
  const { data: blockedTimes } = await supabase
    .from('service_blocked_times')
    .select('start_time, end_time')
    .eq('block_date', date);

  for (const block of (blockedTimes ?? [])) {
    if (time >= block.start_time.slice(0, 5) && time < block.end_time.slice(0, 5)) {
      return jsonError('Time slot unavailable', 'SLOT_TAKEN', 409);
    }
  }

  // Create appointment
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
      message: `Appointment inquiry created. The shop will call you at ${customer_phone} to confirm.`,
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
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
  );

  if (req.method === 'GET') return handleGet(req, supabase);
  if (req.method === 'POST') return handlePost(req, supabase);

  return jsonError('Method not allowed', 'METHOD_NOT_ALLOWED', 405);
});
```

- [ ] **Step 2: Deploy**

```bash
npx supabase functions deploy appointments --project-ref iftyvvymlsdercmyagpe
```

- [ ] **Step 3: Test POST — create booking**

```bash
curl -X POST https://iftyvvymlsdercmyagpe.supabase.co/functions/v1/appointments \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlmdHl2dnltbHNkZXJjbXlhZ3BlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyMjE4MDUsImV4cCI6MjA5Mzc5NzgwNX0.TC2OIWB_NQVXEJXdp3XiIYTAJ3zMhfvioD-_9DDjUUY" \
  -H "Content-Type: application/json" \
  -d '{"date":"2026-05-25","time":"10:00","customer_name":"Jan Kowalski","customer_phone":"+48600123456","bike_manufacturer":"Trek","bike_model":"Fuel EX 8","service_note":"Serwis amortyzatora"}'
```
Expected: `{"id":"<uuid>","status":"zapytanie","message":"Appointment inquiry created. The shop will call you at +48600123456 to confirm."}`

- [ ] **Step 4: Test GET — lookup by phone**

```bash
curl "https://iftyvvymlsdercmyagpe.supabase.co/functions/v1/appointments?phone=%2B48600123456" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlmdHl2dnltbHNkZXJjbXlhZ3BlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyMjE4MDUsImV4cCI6MjA5Mzc5NzgwNX0.TC2OIWB_NQVXEJXdp3XiIYTAJ3zMhfvioD-_9DDjUUY"
```
Expected: `{"appointments":[{"id":"...","date":"2026-05-25","time":"10:00","status":"zapytanie",...}]}`

- [ ] **Step 5: Test POST — duplicate slot returns 409**

Run the same POST from Step 3 again.
Expected: `{"error":"Time slot unavailable","code":"SLOT_TAKEN"}` with HTTP 409.

- [ ] **Step 6: Test POST — missing field returns 400**

```bash
curl -X POST https://iftyvvymlsdercmyagpe.supabase.co/functions/v1/appointments \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlmdHl2dnltbHNkZXJjbXlhZ3BlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyMjE4MDUsImV4cCI6MjA5Mzc5NzgwNX0.TC2OIWB_NQVXEJXdp3XiIYTAJ3zMhfvioD-_9DDjUUY" \
  -H "Content-Type: application/json" \
  -d '{"date":"2026-05-25","time":"11:00"}'
```
Expected: `{"error":"Missing required fields: customer_name, customer_phone, bike_manufacturer, bike_model, service_note","code":"MISSING_FIELDS"}` with HTTP 400.

- [ ] **Step 7: Commit**

```bash
git add supabase/functions/appointments/index.ts
git commit -m "feat: add appointments edge function (GET + POST)"
```

---

## Task 6: OpenAPI spec

**Files:**
- Create: `public/openapi.json`

- [ ] **Step 1: Create public/openapi.json**

```json
{
  "openapi": "3.1.0",
  "info": {
    "title": "Dr Koło Bike Service API",
    "description": "API for checking availability, browsing services, booking appointments, and looking up appointment status at Dr Koło bicycle repair shop in Gdańsk, Poland.",
    "version": "1.0.0",
    "contact": {
      "name": "Dr Koło",
      "url": "https://drkolo.pl"
    }
  },
  "servers": [
    {
      "url": "https://iftyvvymlsdercmyagpe.supabase.co/functions/v1",
      "description": "Production"
    }
  ],
  "paths": {
    "/availability": {
      "get": {
        "operationId": "getAvailability",
        "summary": "Get available time slots for a date",
        "description": "Returns all available 30-minute appointment slots for the given date. Returns an empty slots array if the shop is closed that day.",
        "parameters": [
          {
            "name": "date",
            "in": "query",
            "required": true,
            "description": "Date in YYYY-MM-DD format",
            "schema": { "type": "string", "pattern": "^\\d{4}-\\d{2}-\\d{2}$", "example": "2026-05-25" }
          }
        ],
        "responses": {
          "200": {
            "description": "Availability for the requested date",
            "content": {
              "application/json": {
                "schema": { "$ref": "#/components/schemas/AvailabilityResponse" },
                "examples": {
                  "open": {
                    "value": {
                      "date": "2026-05-25",
                      "open": "08:00",
                      "close": "17:00",
                      "slots": ["08:00", "08:30", "09:00"]
                    }
                  },
                  "closed": {
                    "value": { "date": "2026-05-24", "open": null, "close": null, "slots": [] }
                  }
                }
              }
            }
          },
          "400": { "description": "Invalid date parameter", "content": { "application/json": { "schema": { "$ref": "#/components/schemas/Error" } } } }
        },
        "security": [{ "anonKey": [] }]
      }
    },
    "/services": {
      "get": {
        "operationId": "getServices",
        "summary": "Get service catalog and pricing",
        "description": "Returns all available services grouped by category with prices in PLN.",
        "responses": {
          "200": {
            "description": "Service catalog",
            "content": {
              "application/json": {
                "schema": { "$ref": "#/components/schemas/ServicesResponse" }
              }
            }
          }
        },
        "security": [{ "anonKey": [] }]
      }
    },
    "/appointments": {
      "post": {
        "operationId": "createAppointment",
        "summary": "Book a service appointment",
        "description": "Creates an appointment inquiry. The shop will call the customer at the provided phone number to confirm. Status will be 'zapytanie' (inquiry) until confirmed by shop.",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": { "$ref": "#/components/schemas/CreateAppointmentRequest" },
              "example": {
                "date": "2026-05-25",
                "time": "10:00",
                "customer_name": "Jan Kowalski",
                "customer_phone": "+48600123456",
                "bike_manufacturer": "Trek",
                "bike_model": "Fuel EX 8",
                "service_note": "Serwis amortyzatora przedniego"
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "Appointment inquiry created",
            "content": {
              "application/json": {
                "schema": { "$ref": "#/components/schemas/CreateAppointmentResponse" }
              }
            }
          },
          "400": { "description": "Validation error", "content": { "application/json": { "schema": { "$ref": "#/components/schemas/Error" } } } },
          "409": { "description": "Time slot unavailable", "content": { "application/json": { "schema": { "$ref": "#/components/schemas/Error" } } } }
        },
        "security": [{ "anonKey": [] }]
      },
      "get": {
        "operationId": "getAppointments",
        "summary": "Look up appointments by customer phone",
        "description": "Returns all appointments for the given phone number, most recent first. Use this to check the status of a booking.",
        "parameters": [
          {
            "name": "phone",
            "in": "query",
            "required": true,
            "description": "Customer phone number (e.g. +48600123456)",
            "schema": { "type": "string", "example": "+48600123456" }
          }
        ],
        "responses": {
          "200": {
            "description": "Appointments for the phone number",
            "content": {
              "application/json": {
                "schema": { "$ref": "#/components/schemas/AppointmentsResponse" }
              }
            }
          },
          "400": { "description": "Missing phone parameter", "content": { "application/json": { "schema": { "$ref": "#/components/schemas/Error" } } } }
        },
        "security": [{ "anonKey": [] }]
      }
    }
  },
  "components": {
    "schemas": {
      "AvailabilityResponse": {
        "type": "object",
        "properties": {
          "date": { "type": "string" },
          "open": { "type": ["string", "null"], "description": "Shop opening time HH:MM or null if closed" },
          "close": { "type": ["string", "null"] },
          "slots": { "type": "array", "items": { "type": "string" }, "description": "Available 30-minute slots in HH:MM format" }
        }
      },
      "ServicesResponse": {
        "type": "object",
        "properties": {
          "categories": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "name": { "type": "string" },
                "services": {
                  "type": "array",
                  "items": {
                    "type": "object",
                    "properties": {
                      "name": { "type": "string" },
                      "price_pln": { "type": "integer" }
                    }
                  }
                }
              }
            }
          }
        }
      },
      "CreateAppointmentRequest": {
        "type": "object",
        "required": ["date", "time", "customer_name", "customer_phone", "bike_manufacturer", "bike_model", "service_note"],
        "properties": {
          "date": { "type": "string", "description": "Appointment date YYYY-MM-DD" },
          "time": { "type": "string", "description": "Arrival time HH:MM (must be a slot from /availability)" },
          "customer_name": { "type": "string" },
          "customer_phone": { "type": "string", "description": "Customer phone — shop will call to confirm" },
          "bike_manufacturer": { "type": "string", "description": "Bike brand e.g. Trek, Specialized" },
          "bike_model": { "type": "string" },
          "service_note": { "type": "string", "description": "Description of what needs to be done" }
        }
      },
      "CreateAppointmentResponse": {
        "type": "object",
        "properties": {
          "id": { "type": "string" },
          "status": { "type": "string", "enum": ["zapytanie"] },
          "message": { "type": "string" }
        }
      },
      "AppointmentsResponse": {
        "type": "object",
        "properties": {
          "appointments": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "id": { "type": "string" },
                "date": { "type": "string" },
                "time": { "type": "string" },
                "status": {
                  "type": "string",
                  "enum": ["zapytanie", "potwierdzone", "odrzucone", "zakonczone"],
                  "description": "zapytanie=inquiry, potwierdzone=confirmed, odrzucone=rejected, zakonczone=completed"
                },
                "bike_manufacturer": { "type": "string" },
                "bike_model": { "type": "string" },
                "service_note": { "type": ["string", "null"] },
                "created_at": { "type": "string" }
              }
            }
          }
        }
      },
      "Error": {
        "type": "object",
        "properties": {
          "error": { "type": "string" },
          "code": { "type": "string" }
        }
      }
    },
    "securitySchemes": {
      "anonKey": {
        "type": "apiKey",
        "in": "header",
        "name": "Authorization",
        "description": "Supabase anon key as 'Bearer <key>'. Public key — safe to use client-side."
      }
    }
  }
}
```

- [ ] **Step 2: Verify JSON is valid**

```bash
node -e "JSON.parse(require('fs').readFileSync('public/openapi.json','utf8')); console.log('valid')"
```
Expected: `valid`

- [ ] **Step 3: Commit**

```bash
git add public/openapi.json
git commit -m "feat: add OpenAPI 3.1 spec for AI agent discoverability"
```

---

## Task 7: ChatGPT plugin manifest

**Files:**
- Create: `public/.well-known/ai-plugin.json`

- [ ] **Step 1: Create directory and file**

```json
{
  "schema_version": "v1",
  "name_for_human": "Dr Koło Serwis Rowerowy",
  "name_for_model": "drkolo_bike_service",
  "description_for_human": "Book a bicycle service appointment at Dr Koło bike shop in Gdańsk, Poland.",
  "description_for_model": "Use this plugin to interact with Dr Koło bicycle repair shop in Gdańsk, Poland. You can check available appointment slots for a specific date, browse the service catalog with prices in PLN, create a booking inquiry (the shop will call the customer to confirm), and look up existing appointment status by customer phone number.",
  "auth": {
    "type": "none"
  },
  "api": {
    "type": "openapi",
    "url": "https://drkolo.pl/openapi.json"
  },
  "logo_url": "https://drkolo.pl/og-image.png",
  "contact_email": "kontakt@drkolo.pl",
  "legal_info_url": "https://drkolo.pl"
}
```

- [ ] **Step 2: Verify JSON is valid**

```bash
node -e "JSON.parse(require('fs').readFileSync('public/.well-known/ai-plugin.json','utf8')); console.log('valid')"
```
Expected: `valid`

- [ ] **Step 3: Commit**

```bash
git add public/.well-known/ai-plugin.json
git commit -m "feat: add ChatGPT plugin manifest"
```

---

## Task 8: Update llms.txt

**Files:**
- Modify: `public/llms.txt`

- [ ] **Step 1: Append API section to public/llms.txt**

Add the following block at the end of the file (after the last line `Gdańsk, Kartuzy i okolice (Trójmiasto, Pomorze).`):

```
## API

Dr Koło exposes a REST API for AI agents and third-party applications.

Full OpenAPI 3.1 spec: https://drkolo.pl/openapi.json
ChatGPT plugin manifest: https://drkolo.pl/.well-known/ai-plugin.json

All endpoints require the Supabase anon key as `Authorization: Bearer <key>`:
`eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlmdHl2dnltbHNkZXJjbXlhZ3BlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyMjE4MDUsImV4cCI6MjA5Mzc5NzgwNX0.TC2OIWB_NQVXEJXdp3XiIYTAJ3zMhfvioD-_9DDjUUY`

Base URL: https://iftyvvymlsdercmyagpe.supabase.co/functions/v1

### Endpoints

- GET /availability?date=YYYY-MM-DD — available 30-min slots for a date
- GET /services — service catalog with PLN prices
- POST /appointments — create booking inquiry (shop calls customer to confirm)
- GET /appointments?phone=+48... — look up appointment status by phone
```

- [ ] **Step 2: Commit**

```bash
git add public/llms.txt
git commit -m "feat: add API section to llms.txt for AI agent discoverability"
```

---

## Task 9: End-to-end verification

- [ ] **Step 1: Verify all three functions are deployed**

```bash
curl https://iftyvvymlsdercmyagpe.supabase.co/functions/v1/services \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlmdHl2dnltbHNkZXJjbXlhZ3BlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyMjE4MDUsImV4cCI6MjA5Mzc5NzgwNX0.TC2OIWB_NQVXEJXdp3XiIYTAJ3zMhfvioD-_9DDjUUY"
```
Expected: JSON with `categories` array.

- [ ] **Step 2: Confirm ai_agent bookings appear in DB**

In Supabase SQL editor:
```sql
select id, source, status, customer_name, customer_phone, appointment_date
from service_appointments
where source = 'ai_agent'
order by created_at desc
limit 5;
```
Expected: rows created during Task 5 testing appear with `source = 'ai_agent'`.

- [ ] **Step 3: Verify openapi.json is publicly accessible**

After deploying the frontend (or running `npm run dev`):
```
http://localhost:8080/openapi.json
```
Expected: valid JSON with `openapi: "3.1.0"`.

- [ ] **Step 4: Final commit**

```bash
git add .
git commit -m "feat: complete AI agent API — edge functions, OpenAPI spec, discoverability"
```
