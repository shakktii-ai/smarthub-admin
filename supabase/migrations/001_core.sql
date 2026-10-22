-- SmartHub Pay: core auth, administrators, audit, organizations, territories.
-- Idempotent: safe to run on an existing project. REVIEW against your current schema before running.
create extension if not exists pgcrypto;

do $$ begin
  create type public.app_role as enum ('super_admin','merchant_admin','collection_admin','upi_admin');
exception when duplicate_object then null; end $$;

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(), name text not null unique, created_at timestamptz not null default now());
create table if not exists public.territories (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null, state text, unique (organization_id, name));

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text, full_name text, role public.app_role not null,
  is_active boolean not null default true, created_at timestamptz not null default now());
alter table public.profiles
  add column if not exists mobile text, add column if not exists department text, add column if not exists region text,
  add column if not exists employee_id text,
  add column if not exists organization_id uuid references public.organizations(id),
  add column if not exists reporting_manager_id uuid references public.profiles(id),
  add column if not exists created_by uuid references public.profiles(id),
  add column if not exists suspension_reason text, add column if not exists suspended_at timestamptz,
  add column if not exists suspended_by uuid references public.profiles(id),
  add column if not exists updated_at timestamptz not null default now();
create unique index if not exists profiles_email_key on public.profiles (lower(email));

create table if not exists public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid, actor_name text, action text not null, entity_type text, entity_id text,
  details jsonb not null default '{}'::jsonb, created_at timestamptz not null default now());
create index if not exists audit_logs_created_idx on public.audit_logs (created_at desc);

-- Helpers used by RLS policies (SECURITY DEFINER so they can read profiles without recursion).
create or replace function public.current_app_role() returns public.app_role
  language sql stable security definer set search_path = public as
  $$ select role from public.profiles where id = auth.uid() and is_active $$;
create or replace function public.current_org_id() returns uuid
  language sql stable security definer set search_path = public as
  $$ select organization_id from public.profiles where id = auth.uid() and is_active $$;
revoke all on function public.current_app_role(), public.current_org_id() from public;
grant execute on function public.current_app_role(), public.current_org_id() to authenticated;

alter table public.profiles enable row level security;
alter table public.audit_logs enable row level security;
alter table public.organizations enable row level security;
alter table public.territories enable row level security;
-- Reads only. There are NO insert/update/delete policies: all writes go through server code with the service-role key.
drop policy if exists "read own profile" on public.profiles;
create policy "read own profile" on public.profiles for select using (id = auth.uid());
drop policy if exists "super admin reads profiles" on public.profiles;
create policy "super admin reads profiles" on public.profiles for select using (public.current_app_role() = 'super_admin');
drop policy if exists "super admin reads audit" on public.audit_logs;
create policy "super admin reads audit" on public.audit_logs for select using (public.current_app_role() = 'super_admin');
drop policy if exists "read own org" on public.organizations;
create policy "read own org" on public.organizations for select using (id = public.current_org_id() or public.current_app_role() = 'super_admin');
drop policy if exists "read own territories" on public.territories;
create policy "read own territories" on public.territories for select using (organization_id = public.current_org_id() or public.current_app_role() = 'super_admin');

-- ===== Sales staff =====
create sequence if not exists public.sales_staff_employee_seq;
create table if not exists public.sales_staff (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  employee_id text not null unique default ('SH-SALES-' || lpad(nextval('public.sales_staff_employee_seq')::text, 4, '0')),
  full_name text not null check (char_length(full_name) between 2 and 100),
  mobile text not null check (mobile ~ '^[6-9][0-9]{9}$'),
  email text not null check (email ~ '^\S+@\S+\.\S+$' and char_length(email) <= 254),
  photo_path text,
  joining_date date not null,
  employment_type text check (employment_type in ('Full-time','Part-time','Contract')),
  reporting_manager_id uuid references public.profiles(id),
  territory_id uuid not null references public.territories(id),
  id_proof_type text not null check (id_proof_type in ('Aadhaar (Masked Copy)','Voter ID','Passport','Driving Licence')),
  id_proof_path text, pan_doc_path text,
  address text check (char_length(address) <= 300),
  bank_account_last4 text check (bank_account_last4 ~ '^[0-9]{4}$'),
  device_id text check (device_id ~ '^[A-Za-z0-9._-]{1,50}$'),
  doc_verification_status text not null default 'pending' check (doc_verification_status in ('pending','verified','rejected')),
  doc_verified_by uuid references public.profiles(id), doc_verified_at timestamptz,
  police_verification_status text not null default 'pending' check (police_verification_status in ('pending','done','not_required')),
  police_verified_by uuid references public.profiles(id), police_verified_at timestamptz,
  declaration_accepted boolean not null check (declaration_accepted),
  declaration_accepted_at timestamptz not null, declaration_accepted_by uuid not null references public.profiles(id),
  declaration_policy_version text,
  status text not null default 'pending' check (status in ('pending','active','inactive','rejected')),
  approved_by uuid references public.profiles(id), approved_at timestamptz,
  rejected_by uuid references public.profiles(id), rejected_at timestamptz, rejection_reason text,
  created_by uuid not null, created_by_name text not null, created_at timestamptz not null default now(),
  updated_by uuid, updated_at timestamptz not null default now(),
  constraint sales_staff_created_by_fkey foreign key (created_by) references public.profiles(id),
  -- Enforced in the database, not just the UI: staff cannot be active until verification is complete.
  constraint sales_staff_active_requires_verification check (
    status <> 'active' or (doc_verification_status = 'verified' and police_verification_status in ('done','not_required'))),
  constraint sales_staff_rejection_needs_reason check (status <> 'rejected' or char_length(coalesce(rejection_reason,'')) >= 5)
);
create unique index if not exists sales_staff_org_mobile_key on public.sales_staff (organization_id, mobile);
create unique index if not exists sales_staff_org_email_key on public.sales_staff (organization_id, lower(email));
create index if not exists sales_staff_org_created_idx on public.sales_staff (organization_id, created_at desc);
create index if not exists sales_staff_org_status_idx on public.sales_staff (organization_id, status);

-- Full PAN and bank account number live here. RLS on, NO policies: only the service role (server code) can read them.
create table if not exists public.sales_staff_sensitive (
  staff_id uuid primary key references public.sales_staff(id) on delete cascade,
  pan_number text, bank_account_number text, ifsc text);
alter table public.sales_staff_sensitive enable row level security;
revoke all on public.sales_staff_sensitive from anon, authenticated;

alter table public.sales_staff enable row level security;
drop policy if exists "org admins read staff" on public.sales_staff;
create policy "org admins read staff" on public.sales_staff for select
  using ((public.current_app_role() = 'merchant_admin' and organization_id = public.current_org_id()) or public.current_app_role() = 'super_admin');
revoke insert, update, delete on public.sales_staff from anon, authenticated;

-- Private bucket for staff photos and documents. No storage policies => only server code (service role) can read/write;
-- the app hands out short-lived signed URLs after checking permissions.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('staff-documents', 'staff-documents', false, 5242880, array['image/jpeg','image/png','application/pdf'])
on conflict (id) do update set public = false, file_size_limit = 5242880, allowed_mime_types = excluded.allowed_mime_types;
