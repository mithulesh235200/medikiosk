import type { VercelRequest, VercelResponse } from '../_lib/vercel';
import { getPatient, setCors } from '../_lib/store';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (setCors(req as never, res as never)) return;
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const { id } = req.query;
  const patient = await getPatient(String(id));
  if (!patient) return res.status(404).json({ error: 'Patient not found' });
  return res.status(200).json(patient);
}
