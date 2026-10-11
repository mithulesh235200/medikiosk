import type { VercelRequest, VercelResponse } from '../_lib/vercel';
import { listPatients, upsertPatient, clearPatients, setCors, parseBody } from '../_lib/store';
import { requireStaff } from '../_lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (setCors(req as never, res as never)) return;

  if (req.method === 'GET') {
    const patients = await listPatients();
    return res.status(200).json(patients);
  }

  if (req.method === 'POST') {
    // Public kiosk intake — open by design (self-service terminal).
    const body = parseBody<any>(req.body);
    if (!body || !body.id) return res.status(400).json({ error: 'Invalid patient record' });
    // Basic server-side validation
    if (!body.demographics || !body.status) {
      return res.status(400).json({ error: 'Missing demographics or status' });
    }
    const saved = await upsertPatient(body);
    console.log(`[MediKiosk] Patient recorded: ${saved.demographics?.name} (${saved.tokenNumber})`);
    return res.status(201).json(saved);
  }

  if (req.method === 'DELETE') {
    // Destructive staff action — requires verified staff session.
    if (!(await requireStaff(req.headers as never))) {
      return res.status(401).json({ error: 'Staff authentication required' });
    }
    await clearPatients();
    return res.status(200).json({ message: 'Patient queue cleared successfully', count: 0 });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
