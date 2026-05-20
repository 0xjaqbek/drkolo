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
