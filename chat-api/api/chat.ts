import type { VercelRequest, VercelResponse } from '@vercel/node';
import OpenAI from 'openai';
import { supabase } from '../lib/supabase';
import { SYSTEM_PROMPT } from '../lib/system-prompt';
import { parseReply } from '../lib/parse-reply';
import { setCors, handleOptions } from '../lib/cors';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
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
  const { reply, smsBody } = parseReply(rawReply);

  // Persist the latest user message and assistant reply
  const lastUserMessage = messages[messages.length - 1];
  await supabase.from('chat_messages').insert([
    { session_id: sessionId, role: lastUserMessage.role, content: lastUserMessage.content },
    { session_id: sessionId, role: 'assistant', content: reply },
  ]);

  await supabase
    .from('chat_sessions')
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', sessionId);

  return res.status(200).json({ reply, ...(smsBody ? { smsBody } : {}) });
}
