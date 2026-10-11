import type { VercelRequest, VercelResponse } from './_lib/vercel';
import { getPatient, patchPatient, setCors, parseBody } from './_lib/store';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (setCors(req as never, res as never)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { patientId, reason } = parseBody<any>(req.body);
  if (!patientId) return res.status(400).json({ error: 'patientId required' });
  const patient = await getPatient(String(patientId));
  if (!patient) return res.status(404).json({ error: 'Patient not found' });
  const updated = await patchPatient(String(patientId), {
    isRedFlag: true,
    priority: 'emergency',
    redFlagReason: reason || 'Patient triggered acute red-flag symptoms at kiosk',
  } as never);
  console.warn(`[MediKiosk RED-FLAG] ${patient.demographics?.name} flagged for triage`);
  return res.status(200).json({ success: true, patient: updated });
}
