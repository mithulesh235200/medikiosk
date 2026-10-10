import type { VercelRequest, VercelResponse } from '../../_lib/vercel';
import { getPatient, patchPatient, setCors } from '../../_lib/store';
import { requireStaff } from '../../_lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (setCors(req as never, res as never)) return;
  if (req.method !== 'PATCH') return res.status(405).json({ error: 'Method not allowed' });
  if (!requireStaff(req.headers as never)) {
    return res.status(401).json({ error: 'Staff authentication required' });
  }
  const { id } = req.query;
  const { doctorNotes, doctorPrescription } = req.body ?? {};
  const current = await getPatient(String(id));
  if (!current) return res.status(404).json({ error: 'Patient not found' });
  const patch: Record<string, unknown> = {};
  if (doctorNotes !== undefined) patch.doctorNotes = String(doctorNotes).slice(0, 10000);
  if (doctorPrescription !== undefined) patch.doctorPrescription = String(doctorPrescription).slice(0, 10000);
  const updated = await patchPatient(String(id), patch as never);
  return res.status(200).json(updated);
}
