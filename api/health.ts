import type { VercelRequest, VercelResponse } from './_lib/vercel';
import { getEnv, setCors } from './_lib/store';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (setCors(req as never, res as never)) return;
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  return res.status(200).json({
    status: 'ok',
    geminiConfigured: Boolean(getEnv('GEMINI_API_KEY')),
    supabaseConfigured: Boolean(getEnv('SUPABASE_URL')),
    timestamp: new Date().toISOString(),
  });
}

