-- MediKiosk Supabase schema — run in Supabase Dashboard > SQL Editor
-- Creates the `patients` table used by /api/* serverless functions.

create table if not exists public.patients (
  id text primary key,
  token_number text not null,
  demographics jsonb not null default '{}'::jsonb,
  conversation_transcript jsonb not null default '[]'::jsonb,
  documents jsonb not null default '[]'::jsonb,
  structured_summary jsonb,
  vitals jsonb,
  primary_body_region text,
  status text not null default 'waiting' check (status in ('waiting','in_consultation','seen','referred')),
  priority text not null default 'routine' check (priority in ('routine','urgent','emergency')),
  is_red_flag boolean not null default false,
  red_flag_reason text,
  room_number text default 'Room 104',
  doctor_notes text,
  doctor_prescription text,
  consultation_started_at timestamptz,
  consultation_completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists patients_status_idx on public.patients (status);
create index if not exists patients_redflag_idx on public.patients (is_red_flag);
create index if not exists patients_created_idx on public.patients (created_at desc);

-- Enable Row Level Security with open kiosk policy.
-- For production, tighten these (e.g. require service-role key server-side).
alter table public.patients enable row level security;

drop policy if exists "kiosk open access" on public.patients;
create policy "kiosk open access" on public.patients
  for all using (true) with check (true);

-- Optional: storage bucket for document scans (avoids huge base64 rows).
insert into storage.buckets (id, name, public)
values ('medical-documents', 'medical-documents', true)
on conflict (id) do nothing;

drop policy if exists "public read docs" on storage.objects;
create policy "public read docs" on storage.objects
  for select using (bucket_id = 'medical-documents');

drop policy if exists "kiosk upload docs" on storage.objects;
create policy "kiosk upload docs" on storage.objects
  for insert with check (bucket_id = 'medical-documents');

-- ---------------------------------------------------------------------------
-- Staff doctors table: server-side PIN verification for the Doctor Portal.
-- PINs are stored as SHA-256 hashes; the anon key must NEVER read this table
-- (no public policies). /api uses the service_role key and only returns
-- doctor profiles WITHOUT the hash, plus a signed session token.
-- ---------------------------------------------------------------------------
create table if not exists public.doctors (
  id text primary key,
  name text not null,
  title text not null default 'Consultant Physician',
  department text not null default 'General OPD',
  room_number text not null default 'Room 104',
  registration_number text not null unique,
  pin_hash text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.doctors enable row level security;

-- No public policies on doctors: only service_role (server) can read it.
-- Preset picker uses this hash-free view instead:
create or replace view public.doctors_public as
  select id, name, title, department, room_number, registration_number
  from public.doctors where active = true;

-- Seed the 4 demo physicians (default PIN '1234', SHA-256 hash).
-- Change these PINs after first login in production.
insert into public.doctors (id, name, title, department, room_number, registration_number, pin_hash)
values
  ('doc-rajesh', 'Dr. Rajesh Kumar', 'Senior Consultant Physician, MD (Med)', 'Internal Medicine & OPD Clinic', 'Room 104', 'MCI-DEL-2014-88329', '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4'),
  ('doc-ananya', 'Dr. Ananya Iyer', 'Consultant Cardiologist, DM (Cardio)', 'Cardiology & Heart Station', 'Room 202', 'NMC-2018-45920', '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4'),
  ('doc-meenakshi', 'Dr. Meenakshi Sundaram', 'Head of Emergency & Critical Care, MD', 'Emergency & Acute Triage', 'Room 101', 'TN-MC-2008-31284', '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4'),
  ('doc-vikram', 'Dr. Vikramaditya Rao', 'Consultant Orthopedic Surgeon, MS (Ortho)', 'Orthopedics & Joint Clinic', 'Room 108', 'KA-MC-2016-52190', '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4')
on conflict (id) do nothing;
