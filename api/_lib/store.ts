import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { GoogleGenAI } from '@google/genai';
import type { PatientRecord } from '../../src/types';

// ---------------------------------------------------------------------------
// Env helpers (works both locally via dotenv and on Vercel serverless)
// ---------------------------------------------------------------------------
export function getEnv(name: string): string {
  return process.env[name] || '';
}

export function isSupabaseConfigured(): boolean {
  return Boolean(getSupabaseUrl() && getSupabaseKey());
}

function getSupabaseUrl(): string {
  return (
    getEnv('SUPABASE_URL') ||
    getEnv('VITE_SUPABASE_URL') ||
    getEnv('NEXT_PUBLIC_SUPABASE_URL')
  );
}

function getSupabaseKey(): string {
  return (
    getEnv('SUPABASE_SERVICE_ROLE_KEY') ||
    getEnv('SUPABASE_ANON_KEY') ||
    getEnv('VITE_SUPABASE_ANON_KEY') ||
    getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY') ||
    getEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY')
  );
}

let supabaseClient: SupabaseClient | null = null;
export function getSupabase(): SupabaseClient | null {
  if (supabaseClient) return supabaseClient;
  const url = getSupabaseUrl();
  // Prefer service-role key server-side (bypasses RLS for kiosk writes),
  // fall back to anon / publishable key.
  const key = getSupabaseKey();
  if (!url || !key) return null;
  try {
    supabaseClient = createClient(url, key);
  } catch {
    supabaseClient = null;
  }
  return supabaseClient;
}

// ---------------------------------------------------------------------------
// Gemini helper
// ---------------------------------------------------------------------------
let geminiClient: GoogleGenAI | null = null;
export function getGemini(): GoogleGenAI | null {
  if (geminiClient) return geminiClient;
  const key = getEnv('GEMINI_API_KEY');
  if (!key) return null;
  try {
    geminiClient = new GoogleGenAI({ apiKey: key });
  } catch {
    geminiClient = null;
  }
  return geminiClient;
}

/** Current Gemini model. Override via GEMINI_MODEL env. */
export function geminiModel(): string {
  return getEnv('GEMINI_MODEL') || 'gemini-2.0-flash';
}

// ---------------------------------------------------------------------------
// Patient store: Supabase-primary, in-memory fallback (serverless-safe)
// ---------------------------------------------------------------------------
// NOTE: On Vercel serverless the in-memory array only lives for the lifetime
// of a warm lambda. Supabase is the source of truth when configured.
let memoryStore: PatientRecord[] = [];

function sortPatients(list: PatientRecord[]): PatientRecord[] {
  return [...list].sort((a, b) => {
    if (a.isRedFlag && !b.isRedFlag) return -1;
    if (!a.isRedFlag && b.isRedFlag) return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

function toRow(p: PatientRecord): Record<string, unknown> {
  return {
    id: p.id,
    token_number: p.tokenNumber,
    demographics: p.demographics,
    conversation_transcript: p.conversationTranscript ?? [],
    documents: p.documents ?? [],
    structured_summary: p.structuredSummary ?? null,
    vitals: p.vitals ?? null,
    primary_body_region: p.primaryBodyRegion ?? null,
    status: p.status,
    priority: p.priority,
    is_red_flag: p.isRedFlag ?? false,
    red_flag_reason: p.redFlagReason ?? null,
    room_number: p.roomNumber ?? null,
    doctor_notes: p.doctorNotes ?? null,
    doctor_prescription: p.doctorPrescription ?? null,
    consultation_started_at: p.consultationStartedAt ?? null,
    consultation_completed_at: p.consultationCompletedAt ?? null,
    created_at: p.createdAt,
  };
}

function fromRow(r: Record<string, unknown>): PatientRecord {
  return {
    id: String(r.id),
    tokenNumber: String(r.token_number ?? ''),
    demographics: (r.demographics as PatientRecord['demographics']) ?? ({} as PatientRecord['demographics']),
    conversationTranscript: (r.conversation_transcript as PatientRecord['conversationTranscript']) ?? [],
    documents: (r.documents as PatientRecord['documents']) ?? [],
    structuredSummary: (r.structured_summary as PatientRecord['structuredSummary']) ?? undefined,
    vitals: (r.vitals as PatientRecord['vitals']) ?? undefined,
    primaryBodyRegion: (r.primary_body_region as PatientRecord['primaryBodyRegion']) ?? undefined,
    status: (r.status as PatientRecord['status']) ?? 'waiting',
    priority: (r.priority as PatientRecord['priority']) ?? 'routine',
    isRedFlag: Boolean(r.is_red_flag),
    redFlagReason: (r.red_flag_reason as string) ?? undefined,
    roomNumber: String(r.room_number ?? 'Room 104'),
    doctorNotes: (r.doctor_notes as string) ?? undefined,
    doctorPrescription: (r.doctor_prescription as string) ?? undefined,
    consultationStartedAt: (r.consultation_started_at as string) ?? undefined,
    consultationCompletedAt: (r.consultation_completed_at as string) ?? undefined,
    createdAt: String(r.created_at ?? new Date().toISOString()),
  };
}

function applyVitalsTriage(p: PatientRecord): void {
  const v = p.vitals;
  if (!v) return;
  const { systolicBp, diastolicBp, pulseRate, spO2, temperature } = v;
  if (
    (systolicBp && systolicBp >= 180) ||
    (diastolicBp && diastolicBp >= 110) ||
    (spO2 && spO2 < 92) ||
    (pulseRate && (pulseRate > 130 || pulseRate < 45)) ||
    (temperature && temperature >= 103)
  ) {
    p.isRedFlag = true;
    p.priority = 'emergency';
    if (!p.redFlagReason) {
      p.redFlagReason = `Critical vitals detected: ${spO2 ? `SpO2: ${spO2}%, ` : ''}${systolicBp ? `BP: ${systolicBp}/${diastolicBp} mmHg` : ''}`;
    }
  }
}

export async function listPatients(): Promise<PatientRecord[]> {
  const sb = getSupabase();
  if (sb) {
    try {
      const { data, error } = await sb.from('patients').select('*');
      if (!error && data) return sortPatients((data as Record<string, unknown>[]).map(fromRow));
      console.error('[store] Supabase list error:', error?.message);
    } catch (e) {
      console.error('[store] Supabase list exception:', e);
    }
  }
  return sortPatients(memoryStore);
}

export async function getPatient(id: string): Promise<PatientRecord | null> {
  const sb = getSupabase();
  if (sb) {
    try {
      const { data, error } = await sb.from('patients').select('*').eq('id', id).single();
      if (!error && data) return fromRow(data as Record<string, unknown>);
      if (error && error.code !== 'PGRST116') console.error('[store] Supabase get error:', error.message);
    } catch (e) {
      console.error('[store] Supabase get exception:', e);
    }
  }
  return memoryStore.find((p) => p.id === id) ?? null;
}

export async function upsertPatient(input: PatientRecord): Promise<PatientRecord> {
  if (!input.id) throw new Error('Invalid patient record: missing id');
  const all = await listPatients();
  const takenTokens = new Set(all.filter((p) => p.id !== input.id).map((p) => p.tokenNumber));
  if (!input.tokenNumber || takenTokens.has(input.tokenNumber)) {
    // Sequential-ish unique token: bump until free (collision-safe vs the
    // client's random OPD-A10..89 default).
    let n = all.length + 1;
    let candidate = `OPD-A${String(n).padStart(2, '0')}`;
    while (takenTokens.has(candidate)) {
      n += 1;
      candidate = `OPD-A${String(n).padStart(2, '0')}`;
    }
    input.tokenNumber = candidate;
  }
  applyVitalsTriage(input);

  const sb = getSupabase();
  if (sb) {
    try {
      const { data, error } = await sb.from('patients').upsert(toRow(input) as never, { onConflict: 'id' }).select().single();
      if (!error && data) return fromRow(data as Record<string, unknown>);
      console.error('[store] Supabase upsert error:', error?.message);
    } catch (e) {
      console.error('[store] Supabase upsert exception:', e);
    }
  }
  // memory fallback
  const idx = memoryStore.findIndex((p) => p.id === input.id);
  if (idx >= 0) memoryStore[idx] = input;
  else memoryStore.unshift(input);
  return input;
}

export async function clearPatients(): Promise<void> {
  memoryStore = [];
  const sb = getSupabase();
  if (sb) {
    try {
      const { error } = await sb.from('patients').delete().neq('id', '__never__');
      if (error) console.error('[store] Supabase clear error:', error.message);
    } catch (e) {
      console.error('[store] Supabase clear exception:', e);
    }
  }
}

export async function patchPatient(id: string, patch: Partial<PatientRecord>): Promise<PatientRecord | null> {
  const current = await getPatient(id);
  if (!current) return null;
  const updated: PatientRecord = { ...current, ...patch };
  const sb = getSupabase();
  if (sb) {
    try {
      const { data, error } = await sb.from('patients').update(toRow(updated) as never).eq('id', id).select().single();
      if (!error && data) return fromRow(data as Record<string, unknown>);
      console.error('[store] Supabase patch error:', error?.message);
    } catch (e) {
      console.error('[store] Supabase patch exception:', e);
    }
  }
  const idx = memoryStore.findIndex((p) => p.id === id);
  if (idx >= 0) memoryStore[idx] = updated;
  else memoryStore.unshift(updated);
  return updated;
}

// ---------------------------------------------------------------------------
// Doctors directory: Supabase `doctors` table, memory fallback with the same
// 4 demo physicians (PIN '1234') for local dev without Supabase.
// ---------------------------------------------------------------------------
export interface DoctorRow {
  id: string;
  name: string;
  title: string;
  department: string;
  roomNumber: string;
  registrationNumber: string;
  pinHash: string;
  active: boolean;
}

const SEED_DOCTORS: DoctorRow[] = [
  { id: 'doc-rajesh', name: 'Dr. Rajesh Kumar', title: 'Senior Consultant Physician, MD (Med)', department: 'Internal Medicine & OPD Clinic', roomNumber: 'Room 104', registrationNumber: 'MCI-DEL-2014-88329', pinHash: '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4', active: true },
  { id: 'doc-ananya', name: 'Dr. Ananya Iyer', title: 'Consultant Cardiologist, DM (Cardio)', department: 'Cardiology & Heart Station', roomNumber: 'Room 202', registrationNumber: 'NMC-2018-45920', pinHash: '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4', active: true },
  { id: 'doc-meenakshi', name: 'Dr. Meenakshi Sundaram', title: 'Head of Emergency & Critical Care, MD', department: 'Emergency & Acute Triage', roomNumber: 'Room 101', registrationNumber: 'TN-MC-2008-31284', pinHash: '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4', active: true },
  { id: 'doc-vikram', name: 'Dr. Vikramaditya Rao', title: 'Consultant Orthopedic Surgeon, MS (Ortho)', department: 'Orthopedics & Joint Clinic', roomNumber: 'Room 108', registrationNumber: 'KA-MC-2016-52190', pinHash: '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4', active: true },
];

let memoryDoctors: DoctorRow[] = [...SEED_DOCTORS];

function doctorFromRow(r: Record<string, unknown>): DoctorRow {
  return {
    id: String(r.id),
    name: String(r.name),
    title: String(r.title ?? ''),
    department: String(r.department ?? ''),
    roomNumber: String(r.room_number ?? ''),
    registrationNumber: String(r.registration_number ?? ''),
    pinHash: String(r.pin_hash ?? ''),
    active: r.active !== false,
  };
}

/** Public directory (no hashes) for the login preset picker. */
export async function listDoctorsPublic(): Promise<Array<Omit<DoctorRow, 'pinHash'>>> {
  const sb = getSupabase();
  if (sb) {
    try {
      const { data, error } = await sb.from('doctors_public').select('*');
      if (!error && data) {
        return (data as Record<string, unknown>[]).map((r) => {
          const d = doctorFromRow(r);
          const { pinHash: _omit, ...pub } = d;
          return pub;
        });
      }
      console.error('[store] doctors_public error:', error?.message);
    } catch (e) {
      console.error('[store] doctors_public exception:', e);
    }
  }
  return memoryDoctors.filter((d) => d.active).map(({ pinHash: _omit, ...pub }) => pub);
}

/** Full row including hash — server-side verification only, never sent to clients. */
export async function getDoctorByReg(registrationNumber: string): Promise<DoctorRow | null> {
  const sb = getSupabase();
  if (sb) {
    try {
      const { data, error } = await sb.from('doctors').select('*').eq('registration_number', registrationNumber).single();
      if (!error && data) return doctorFromRow(data as Record<string, unknown>);
      if (error && error.code !== 'PGRST116') console.error('[store] doctor lookup error:', error.message);
    } catch (e) {
      console.error('[store] doctor lookup exception:', e);
    }
  }
  return memoryDoctors.find((d) => d.registrationNumber === registrationNumber && d.active) ?? null;
}

export async function createDoctor(input: Omit<DoctorRow, 'active'>): Promise<DoctorRow> {
  const row: DoctorRow = { ...input, active: true };
  const sb = getSupabase();
  if (sb) {
    try {
      const { data, error } = await sb.from('doctors').insert({
        id: row.id,
        name: row.name,
        title: row.title,
        department: row.department,
        room_number: row.roomNumber,
        registration_number: row.registrationNumber,
        pin_hash: row.pinHash,
      } as never).select().single();
      if (!error && data) return doctorFromRow(data as Record<string, unknown>);
      console.error('[store] doctor create error (falling back to memory):', error?.message);
    } catch (e) {
      console.error('[store] doctor create exception (falling back to memory):', e);
    }
  }
  if (memoryDoctors.some((d) => d.registrationNumber === row.registrationNumber)) {
    throw new Error('Registration number already exists');
  }
  memoryDoctors.push(row);
  return row;
}

// ---------------------------------------------------------------------------
// Body parser helper for Vercel functions (handles string/parsed bodies)
// ---------------------------------------------------------------------------
export function parseBody<T = Record<string, any>>(body: unknown): T {
  if (typeof body === 'string') {
    try {
      return JSON.parse(body) as T;
    } catch {
      return {} as T;
    }
  }
  return (body as T) || ({} as T);
}

// ---------------------------------------------------------------------------
// CORS / method helpers for Vercel functions
// ---------------------------------------------------------------------------
export function setCors(req: { method?: string; headers: Record<string, string | string[] | undefined> }, res: { setHeader: (k: string, v: string) => void; status: (c: number) => { end: () => void } }): boolean {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return true;
  }
  return false;
}


