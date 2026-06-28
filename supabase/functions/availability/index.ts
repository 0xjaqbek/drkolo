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
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  // Use noon UTC to avoid timezone-edge day_of_week shifts
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
  const bookedSlots = new Set(
    (appointments ?? []).map((a: { arrival_time: string }) => a.arrival_time.slice(0, 5)),
  );

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
