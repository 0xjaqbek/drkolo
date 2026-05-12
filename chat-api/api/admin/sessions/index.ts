import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../../../lib/supabase';
import { setCors, handleOptions } from '../../../lib/cors';

function checkAuth(req: VercelRequest, res: VercelResponse): boolean {
  if (req.headers.authorization !== `Bearer ${process.env.ADMIN_PASSWORD}`) {
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }
  return true;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;
  setCors(req, res);
  if (!checkAuth(req, res)) return;
  if (req.method !== 'GET') return res.status(405).end();

  const { data: sessions, error: sessionsError } = await supabase
    .from('chat_sessions')
    .select('id, created_at, last_message_at')
    .order('last_message_at', { ascending: false, nullsFirst: false });

  if (sessionsError) return res.status(500).json({ error: sessionsError.message });
  if (!sessions || sessions.length === 0) return res.status(200).json([]);

  const sessionIds = sessions.map((s) => s.id);

  const { data: allMessages, error: msgError } = await supabase
    .from('chat_messages')
    .select('session_id, content, created_at')
    .in('session_id', sessionIds)
    .order('created_at', { ascending: false });

  if (msgError) return res.status(500).json({ error: msgError.message });

  // Group by session to compute count and last preview
  const statsBySession = new Map<string, { count: number; lastPreview: string }>();
  for (const msg of allMessages ?? []) {
    if (!statsBySession.has(msg.session_id)) {
      statsBySession.set(msg.session_id, { count: 0, lastPreview: msg.content.slice(0, 80) });
    }
    statsBySession.get(msg.session_id)!.count++;
  }

  const result = sessions.map((s) => ({
    ...s,
    message_count: statsBySession.get(s.id)?.count ?? 0,
    last_preview: statsBySession.get(s.id)?.lastPreview ?? '',
  }));

  return res.status(200).json(result);
}
