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

  const { id } = req.query as { id: string };

  if (req.method === 'GET') {
    const { data: session, error: sErr } = await supabase
      .from('chat_sessions')
      .select('*')
      .eq('id', id)
      .single();

    if (sErr) return res.status(404).json({ error: 'Session not found' });

    const { data: messages, error: mErr } = await supabase
      .from('chat_messages')
      .select('id, role, content, created_at')
      .eq('session_id', id)
      .order('created_at', { ascending: true });

    if (mErr) return res.status(500).json({ error: mErr.message });

    return res.status(200).json({ ...session, messages: messages ?? [] });
  }

  if (req.method === 'DELETE') {
    const { error } = await supabase.from('chat_sessions').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(204).end();
  }

  return res.status(405).end();
}
