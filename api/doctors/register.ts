import type { VercelRequest, VercelResponse } from '../_lib/vercel';
import { createDoctor, getDoctorByReg, setCors, getEnv, parseBody } from '../_lib/store';
import { issueStaffToken, sha256Hex } from '../_lib/auth';

/**
 * POST /api/doctors/register — self-register a custom doctor, then auto-login.
 * Disable open self-registration in production with ALLOW_DOCTOR_SELF_REGISTER=false
 * (pre-provision doctors via supabase/schema.sql instead).
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (setCors(req as never, res as never)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (getEnv('ALLOW_DOCTOR_SELF_REGISTER') === 'false') {
    return res.status(403).json({ error: 'Self-registration is disabled. Ask the administrator to provision your account.' });
  }
  try {
    const { name, title, department, roomNumber, registrationNumber, pin } = parseBody<any>(req.body);
    if (!name || !registrationNumber || !roomNumber || !pin || String(pin).length < 4) {
      return res.status(400).json({ error: 'Name, registration number, room number and a 4+ character PIN are required' });
    }
    const existing = await getDoctorByReg(String(registrationNumber).trim());
    if (existing) return res.status(409).json({ error: 'This registration number already exists — sign in with its PIN.' });
    const doctor = await createDoctor({
      id: `doc-${Date.now()}`,
      name: String(name).trim().startsWith('Dr.') ? String(name).trim() : `Dr. ${String(name).trim()}`,
      title: String(title || 'Consultant Physician').trim(),
      department: String(department || 'General OPD').trim(),
      roomNumber: String(roomNumber).trim(),
      registrationNumber: String(registrationNumber).trim(),
      pinHash: await sha256Hex(String(pin)),
    });
    const { pinHash: _omit, ...publicDoctor } = doctor;
    const token = await issueStaffToken(doctor.id, doctor.registrationNumber);
    return res.status(201).json({ doctor: publicDoctor, token });
  } catch (e) {
    console.error('[register] unhandled:', e);
    // Surface database/permission problems (e.g. missing service_role key
    // for RLS bypass) instead of a blank 500.
    const msg = e instanceof Error ? e.message : 'Registration failed';
    if (/row-level security|permission|policy/i.test(msg)) {
      return res.status(503).json({ error: 'Database is not ready for staff accounts (RLS blocked the write). Add SUPABASE_SERVICE_ROLE_KEY in server env vars.' });
    }
    return res.status(400).json({ error: msg });
  }
}
