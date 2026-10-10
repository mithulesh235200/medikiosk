// Staff session tokens: HMAC-signed, stateless, Vercel-safe.
// Kiosk endpoints stay public by design (public self-service terminal).
// Staff endpoints (status changes, prescriptions, queue clear, drug checks)
// require `Authorization: Bearer <token>` issued by /api/doctors/verify.
import { createHash, createHmac, timingSafeEqual } from 'crypto';
import { getEnv } from './store';

const TOKEN_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours (one clinical shift)

export function sha256Hex(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

/** Constant-time hash comparison to avoid timing leaks on PIN checks. */
export function hashesEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

function sessionSecret(): string {
  const s =
    getEnv('STAFF_SESSION_SECRET') ||
    getEnv('SUPABASE_SERVICE_ROLE_KEY') ||
    getEnv('GEMINI_API_KEY');
  if (!s) {
    console.warn('[auth] No STAFF_SESSION_SECRET set — using insecure dev fallback. Set it in production.');
    return 'medikiosk-dev-secret-change-me';
  }
  return s;
}

function b64urlEncode(obj: unknown): string {
  return Buffer.from(JSON.stringify(obj)).toString('base64url');
}

function b64urlDecode<T>(s: string): T {
  return JSON.parse(Buffer.from(s, 'base64url').toString('utf8')) as T;
}

export interface StaffTokenPayload {
  id: string;
  reg: string;
  exp: number;
}

export function issueStaffToken(id: string, registrationNumber: string): string {
  const payload = b64urlEncode({
    id,
    reg: registrationNumber,
    exp: Date.now() + TOKEN_TTL_MS,
  } satisfies StaffTokenPayload);
  const sig = createHmac('sha256', sessionSecret()).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

export function verifyStaffToken(token: string): StaffTokenPayload | null {
  try {
    const [payload, sig] = token.split('.');
    if (!payload || !sig) return null;
    const expected = createHmac('sha256', sessionSecret()).update(payload).digest('base64url');
    if (!hashesEqual(sig, expected)) return null;
    const data = b64urlDecode<StaffTokenPayload>(payload);
    if (!data.exp || data.exp < Date.now()) return null;
    return data;
  } catch {
    return null;
  }
}

export function getBearerToken(headers: Record<string, string | string[] | undefined>): string | null {
  const raw = headers['authorization'] || headers['Authorization'];
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value || typeof value !== 'string') return null;
  const m = value.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : null;
}

/** Returns the verified token payload, or null when missing/invalid/expired. */
export function requireStaff(headers: Record<string, string | string[] | undefined>): StaffTokenPayload | null {
  const token = getBearerToken(headers);
  if (!token) return null;
  return verifyStaffToken(token);
}
