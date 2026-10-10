import type { VercelRequest, VercelResponse } from '../_lib/vercel';
import { createDoctor, getDoctorByReg, setCors, getEnv } from '../_lib/store';
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
  const { name, title, department, roomNumber, registrationNumber, pin } = req.body ?? {};
  if (!name || !registrationNumber || !roomNumber || !pin || String(pin).length < 4) {
    return res.status(400).json({ error: 'Name, registration number, room number and a 4+ character PIN are required' });
  }
  const existing = await getDoctorByReg(String(registrationNumber).trim());
  if (existing) return res.status(409).json({ error: 'This registration number already exists — sign in with its PIN.' });
  try {
    const doctor = await createDoctor({
      id: `doc-${Date.now()}`,
      name: String(name).trim().startsWith('Dr.') ? String(name).trim() : `Dr. ${String(name).trim()}`,
      title: String(title || 'Consultant Physician').trim(),
      department: String(department || 'General OPD').trim(),
      roomNumber: String(roomNumber).trim(),
      registrationNumber: String(registrationNumber).trim(),
      pinHash: sha256Hex(String(pin)),
    });
    const { pinHash: _omit, ...publicDoctor } = doctor;
    const token = issueStaffToken(doctor.id, doctor.registrationNumber);
    return res.status(201).json({ doctor: publicDoctor, token });
  } catch (e) {
    return res.status(400).json({ error: e instanceof Error ? e.message : 'Registration failed' });
  }
}
