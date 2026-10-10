import type { VercelRequest, VercelResponse } from '../_lib/vercel';
import { listDoctorsPublic, setCors } from '../_lib/store';

/** GET /api/doctors — public directory for the login preset picker (no hashes). */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (setCors(req as never, res as never)) return;
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const doctors = await listDoctorsPublic();
  return res.status(200).json(doctors);
}
