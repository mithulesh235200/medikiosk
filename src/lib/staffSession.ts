// Staff session token storage + authed fetch helper for the Doctor Portal.
// The token is issued by POST /api/doctors/verify (or /register) and must be
// sent as `Authorization: Bearer <token>` on staff-only endpoints:
// status changes, annotations, queue clear, drug-interaction checks.

const TOKEN_KEY = 'medikiosk_staff_token';

export function getStaffToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStaffToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // ignore storage failures
  }
}

export function clearStaffToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore
  }
}

export function staffHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const token = getStaffToken();
  return token ? { ...extra, Authorization: `Bearer ${token}` } : { ...extra };
}
