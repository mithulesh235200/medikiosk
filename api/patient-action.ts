import type { VercelRequest, VercelResponse } from './_lib/vercel';
import { getPatient, patchPatient, setCors } from './_lib/store';
import { requireStaff } from './_lib/auth';

/**
 * PATCH /api/patients/:id/status and /api/patients/:id/annotate
 * (mapped via vercel.json rewrites to /api/patient-action?id=:id&action=...).
 * Single flat function avoids file/directory dynamic-route conflicts.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (setCors(req as never, res as never)) return;
  if (req.method !== 'PATCH') return res.status(405).json({ error: 'Method not allowed' });
  if (!requireStaff(req.headers as never)) {
    return res.status(401).json({ error: 'Staff authentication required' });
  }
  const id = String(req.query.id || '');
  const action = String(req.query.action || '');
  if (!id) return res.status(400).json({ error: 'Missing patient id' });

  const current = await getPatient(id);
  if (!current) return res.status(404).json({ error: 'Patient not found' });

  if (action === 'status') {
    const { status } = req.body ?? {};
    if (!['waiting', 'in_consultation', 'seen', 'referred'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    const patch: Record<string, unknown> = { status };
    if (status === 'in_consultation' && !current.consultationStartedAt) {
      patch.consultationStartedAt = new Date().toISOString();
    }
    if (status === 'seen') patch.consultationCompletedAt = new Date().toISOString();
    const updated = await patchPatient(id, patch as never);
    return res.status(200).json(updated);
  }

  if (action === 'annotate') {
    const { doctorNotes, doctorPrescription } = req.body ?? {};
    const patch: Record<string, unknown> = {};
    if (doctorNotes !== undefined) patch.doctorNotes = String(doctorNotes).slice(0, 10000);
    if (doctorPrescription !== undefined) patch.doctorPrescription = String(doctorPrescription).slice(0, 10000);
    const updated = await patchPatient(id, patch as never);
    return res.status(200).json(updated);
  }

  return res.status(400).json({ error: 'Invalid action' });
}
