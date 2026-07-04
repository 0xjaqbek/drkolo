import type { VercelRequest, VercelResponse } from '@vercel/node';
import OpenAI from 'openai';
import { supabase } from '../lib/supabase';
import { SYSTEM_PROMPT } from '../lib/system-prompt';
import { parseReply, type BookingData } from '../lib/parse-reply';
import { setCors, handleOptions } from '../lib/cors';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

function buildSmsBody(booking: BookingData): string {
  return `Nowe zapytanie - Dr Koło\nData: ${booking.date} o ${booking.time}\nImię: ${booking.customer_name}\nTelefon: ${booking.customer_phone}\nRower: ${booking.bike_manufacturer} ${booking.bike_model}\nOpis: ${booking.service_note}`;
}

async function submitBooking(booking: BookingData): Promise<{ id: string; status: string }> {
  const supabaseUrl = process.env.SUPABASE_URL!;
  const anonKey = process.env.SUPABASE_ANON_KEY!;

  const response = await fetch(`${supabaseUrl}/functions/v1/appointments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${anonKey}`,
      'apikey': anonKey,
    },
    body: JSON.stringify({
      date: booking.date,
      time: booking.time,
      customer_name: booking.customer_name,
      customer_phone: booking.customer_phone,
      bike_manufacturer: booking.bike_manufacturer,
      bike_model: booking.bike_model,
      service_note: booking.service_note,
    }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const message = (body as Record<string, unknown>).message ?? 'Booking failed';
    throw new Error(String(message));
  }

  const data = await response.json() as { id: string; status: string };
  return { id: data.id, status: data.status };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;
  setCors(req, res);

  if (req.method !== 'POST') return res.status(405).end();

  const { sessionId, messages } = req.body as {
    sessionId?: string;
    messages?: ChatMessage[];
  };

  if (!sessionId || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'sessionId and messages[] required' });
  }

  // Ensure session row exists
  await supabase
    .from('chat_sessions')
    .upsert({ id: sessionId }, { onConflict: 'id', ignoreDuplicates: true });

  // Call DeepSeek via OpenAI-compatible SDK
  const client = new OpenAI({
    apiKey: process.env.DEEPSEEK_API_KEY!,
    baseURL: 'https://api.deepseek.com',
  });

  const completion = await client.chat.completions.create({
    model: 'deepseek-chat',
    messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
  });

  const rawReply = completion.choices[0].message.content ?? '';
  const parsed = parseReply(rawReply);

  // Persist the latest user message and assistant reply
  const lastUserMessage = messages[messages.length - 1];
  await supabase.from('chat_messages').insert([
    { session_id: sessionId, role: lastUserMessage.role, content: lastUserMessage.content },
    { session_id: sessionId, role: 'assistant', content: parsed.reply },
  ]);

  await supabase
    .from('chat_sessions')
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', sessionId);

  // If booking data was extracted, submit to Supabase
  if (parsed.booking) {
    try {
      const result = await submitBooking(parsed.booking);
      const smsBody = buildSmsBody(parsed.booking);
      return res.status(200).json({
        reply: parsed.reply,
        booking: result,
        smsBody,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Nie udało się zapisać wizyty';
      return res.status(200).json({
        reply: parsed.reply,
        bookingError: message,
        smsBody: buildSmsBody(parsed.booking),
      });
    }
  }

  return res.status(200).json({
    reply: parsed.reply,
    ...(parsed.smsBody ? { smsBody: parsed.smsBody } : {}),
  });
}
