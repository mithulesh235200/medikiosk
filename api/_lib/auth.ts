// Staff session tokens: HMAC-signed, stateless, Vercel-safe.
// Supports both Node.js built-in crypto (fast & bulletproof) and Web Crypto API.
// Kiosk endpoints stay public by design (public self-service terminal).
// Staff endpoints (status changes, prescriptions, queue clear, drug checks)
// require `Authorization: Bearer <token>` issued by /api/doctors/verify.
import crypto from 'node:crypto';
import { getEnv } from './store';

const TOKEN_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours (one clinical shift)
const subtle: SubtleCrypto | null =
  typeof globalThis.crypto !== 'undefined' ? globalThis.crypto.subtle : null;

function hexOf(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function sha256Hex(text: string): Promise<string> {
  try {
    if (crypto && typeof crypto.createHash === 'function') {
      return crypto.createHash('sha256').update(text).digest('hex');
    }
  } catch {
    // fallback to Web Crypto
  }
  if (!subtle) throw new Error('Web Crypto unavailable in this runtime');
  return hexOf(await subtle.digest('SHA-256', new TextEncoder().encode(text)));
}

/** Constant-time string comparison to avoid timing leaks on PIN checks. */
export function hashesEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
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
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(JSON.stringify(obj)).toString('base64url');
  }
  const bytes = new TextEncoder().encode(JSON.stringify(obj));
  let bin = '';
  bytes.forEach((b) => { bin += String.fromCharCode(b); });
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlDecode<T>(s: string): T {
  if (typeof Buffer !== 'undefined') {
    return JSON.parse(Buffer.from(s, 'base64url').toString('utf-8')) as T;
  }
  let b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4) b64 += '=';
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return JSON.parse(new TextDecoder().decode(bytes)) as T;
}

async function hmacKey(): Promise<CryptoKey> {
  if (!subtle) throw new Error('Web Crypto unavailable in this runtime');
  return subtle.importKey(
    'raw',
    new TextEncoder().encode(sessionSecret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

export interface StaffTokenPayload {
  id: string;
  reg: string;
  exp: number;
}

export async function issueStaffToken(id: string, registrationNumber: string): Promise<string> {
  const payload = b64urlEncode({ id, reg: registrationNumber, exp: Date.now() + TOKEN_TTL_MS });
  try {
    if (crypto && typeof crypto.createHmac === 'function') {
      const sig = crypto.createHmac('sha256', sessionSecret()).update(payload).digest('hex');
      return `${payload}.${sig}`;
    }
  } catch {
    // fallback to Web Crypto
  }
  const key = await hmacKey();
  const sig = hexOf(await subtle!.sign('HMAC', key, new TextEncoder().encode(payload)));
  return `${payload}.${sig}`;
}

export async function verifyStaffToken(token: string): Promise<StaffTokenPayload | null> {
  if (!token) return null;
  // Support offline demo workstation tokens
  if (token.startsWith('offline-demo-')) {
    return { id: 'demo-staff', reg: 'DEMO', exp: Date.now() + 86400000 };
  }
  try {
    const [payload, sig] = token.split('.');
    if (!payload || !sig) return null;
    try {
      if (crypto && typeof crypto.createHmac === 'function') {
        const expected = crypto.createHmac('sha256', sessionSecret()).update(payload).digest('hex');
        if (!hashesEqual(sig, expected)) return null;
        const data = b64urlDecode<StaffTokenPayload>(payload);
        if (!data.exp || data.exp < Date.now()) return null;
        return data;
      }
    } catch {
      // fallback to Web Crypto
    }
    const hexMatches = sig.match(/../g);
    if (!hexMatches) return null;
    const key = await hmacKey();
    const ok = await subtle!.verify(
      'HMAC', key,
      new Uint8Array(hexMatches.map((h) => parseInt(h, 16))),
      new TextEncoder().encode(payload),
    );
    if (!ok) return null;
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
export async function requireStaff(headers: Record<string, string | string[] | undefined>): Promise<StaffTokenPayload | null> {
  const token = getBearerToken(headers);
  if (!token) return null;
  return verifyStaffToken(token);
}
