import type { VercelRequest, VercelResponse } from '../_lib/vercel';
import { setCors } from '../_lib/store';
import { hashesEqual, issueStaffToken, sha256Hex } from '../_lib/auth';
import { getDoctorByReg } from '../_lib/store';

/** POST /api/doctors/verify { registrationNumber, pin } -> { doctor, token } */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (setCors(req as never, res as never)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { registrationNumber, pin } = req.body ?? {};
  if (!registrationNumber || !pin) {
    return res.status(400).json({ error: 'Registration number and PIN are required' });
  }
  const doctor = await getDoctorByReg(String(registrationNumber).trim());
  if (!doctor) return res.status(404).json({ error: 'Doctor not found. Check the registration number or register as a custom doctor.' });
  if (!hashesEqual(sha256Hex(String(pin)), doctor.pinHash)) {
    return res.status(401).json({ error: 'Incorrect PIN for this registration number.' });
  }
  const { pinHash: _omit, ...publicDoctor } = doctor;
  const token = issueStaffToken(doctor.id, doctor.registrationNumber);
  return res.status(200).json({ doctor: publicDoctor, token });
}
