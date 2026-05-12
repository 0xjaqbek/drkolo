import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCors, handleOptions } from '../lib/cors';

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;
  setCors(req, res);
  return res.status(200).json({ ok: true });
}
