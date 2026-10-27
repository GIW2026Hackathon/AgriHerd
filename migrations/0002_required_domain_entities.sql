-- Required domain entities not present in the initial schema.
-- Apply after schema.sql. This migration intentionally contains no seed data.

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  organization_type text not null check (organization_type in ('cooperative','buyer','processor','agency','clinic','other')),
  county text,
  created_at timestamptz not null default now()
);

create table public.organization_memberships (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null,
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create table public.farm_memberships (
  farm_id uuid not null references public.farms(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('owner','member','observer')),
  created_at timestamptz not null default now(),
  primary key (farm_id, user_id)
);

create table public.user_consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  consent_type text not null,
  version text not null,
  granted_at timestamptz not null default now(),
  withdrawn_at timestamptz
);
create index user_consents_user_idx on public.user_consents(user_id, consent_type);

create table public.veterinary_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  practice_name text,
  verification_status text not null default 'pending'
    check (verification_status in ('pending','verified','rejected','suspended','expired')),
  verified_at timestamptz,
  verified_by uuid references public.profiles(id),
  bio text
);

create table public.provider_credentials (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.veterinary_profiles(user_id) on delete cascade,
  credential_type text not null,
  credential_number text not null,
  expires_on date,
  status text not null default 'pending'
    check (status in ('pending','verified','rejected','expired')),
  storage_path text,
  unique (provider_id, credential_type, credential_number)
);

create table public.provider_services (
  provider_id uuid not null references public.veterinary_profiles(user_id) on delete cascade,
  service text not null,
  primary key (provider_id, service)
);

create table public.provider_service_areas (
  provider_id uuid not null references public.veterinary_profiles(user_id) on delete cascade,
  county text not null,
  ward text,
  primary key (provider_id, county, ward)
);

create table public.provider_availability (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.veterinary_profiles(user_id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  check (ends_at > starts_at)
);

create table public.breeding_records (
  id uuid primary key default gen_random_uuid(),
  animal_id uuid not null references public.animals(id) on delete cascade,
  recorded_by uuid not null references public.profiles(id),
  event_date date not null,
  event_type text not null,
  sire_tag text,
  notes text
);

create table public.vaccination_records (
  id uuid primary key default gen_random_uuid(),
  animal_id uuid not null references public.animals(id) on delete cascade,
  administered_by uuid not null references public.profiles(id),
  vaccine text not null,
  administered_on date not null,
  next_due_on date,
  notes text
);

create table public.preventive_care_records (
  id uuid primary key default gen_random_uuid(),
  animal_id uuid not null references public.animals(id) on delete cascade,
  recorded_by uuid not null references public.profiles(id),
  care_type text not null,
  performed_on date not null,
  next_due_on date,
  notes text
);

create table public.follow_up_records (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.disease_cases(id) on delete cascade,
  recorded_by uuid not null references public.profiles(id),
  due_on date not null,
  completed_at timestamptz,
  outcome text,
  notes text
);

create table public.tick_treatment_records (
  id uuid primary key default gen_random_uuid(),
  animal_id uuid not null references public.animals(id) on delete cascade,
  recorded_by uuid not null references public.profiles(id),
  product text not null,
  treated_on date not null,
  next_due_on date,
  notes text
);

create table public.attachments (
  id uuid primary key default gen_random_uuid(),
  uploaded_by uuid not null references public.profiles(id),
  storage_path text not null unique,
  file_name text not null,
  content_type text not null,
  size_bytes bigint not null check (size_bytes > 0),
  case_id uuid references public.disease_cases(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.organizations enable row level security;
alter table public.organization_memberships enable row level security;
alter table public.farm_memberships enable row level security;
alter table public.user_consents enable row level security;
alter table public.veterinary_profiles enable row level security;
alter table public.provider_credentials enable row level security;
alter table public.provider_services enable row level security;
alter table public.provider_service_areas enable row level security;
alter table public.provider_availability enable row level security;
alter table public.breeding_records enable row level security;
alter table public.vaccination_records enable row level security;
alter table public.preventive_care_records enable row level security;
alter table public.follow_up_records enable row level security;
alter table public.tick_treatment_records enable row level security;
alter table public.attachments enable row level security;

create policy org_members_read on public.organization_memberships for select using (user_id = auth.uid() or public.current_role() in ('county','admin'));
create policy org_admin_write on public.organization_memberships for all using (public.current_role() = 'admin') with check (public.current_role() = 'admin');
create policy farm_members_read on public.farm_memberships for select using (
  user_id = auth.uid() or farm_id in (select id from public.farms where owner_id = auth.uid()) or public.current_role() in ('county','admin'));
create policy consent_owner on public.user_consents for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy provider_public_verified on public.veterinary_profiles for select using (verification_status = 'verified');
create policy provider_self_read on public.veterinary_profiles for select using (user_id = auth.uid());
create policy provider_staff_read on public.veterinary_profiles for select using (public.current_role() in ('county','admin'));
create policy provider_self_insert on public.veterinary_profiles for insert with check (
  user_id = auth.uid() and verification_status = 'pending' and verified_at is null and verified_by is null);
create policy provider_self_update on public.veterinary_profiles for update using (
  user_id = auth.uid())
  with check (user_id = auth.uid() and verification_status = 'pending' and verified_at is null and verified_by is null);
create policy provider_staff_verify on public.veterinary_profiles for update using (
  public.current_role() in ('county','admin'))
  with check (public.current_role() in ('county','admin'));
create policy provider_credentials_self_read on public.provider_credentials for select using (provider_id = auth.uid());
create policy provider_credentials_self_insert on public.provider_credentials for insert with check (
  provider_id = auth.uid() and status = 'pending');
create policy provider_credentials_self_delete on public.provider_credentials for delete using (
  provider_id = auth.uid() and status = 'pending');
create policy provider_credentials_staff on public.provider_credentials for select using (public.current_role() in ('county','admin'));
create policy provider_credentials_staff_update on public.provider_credentials for update using (
  public.current_role() in ('county','admin'))
  with check (public.current_role() in ('county','admin'));
create policy provider_services_verified on public.provider_services for select using (
  provider_id in (select user_id from public.veterinary_profiles where verification_status = 'verified'));
create policy provider_areas_verified on public.provider_service_areas for select using (
  provider_id in (select user_id from public.veterinary_profiles where verification_status = 'verified'));
create policy provider_availability_verified on public.provider_availability for select using (
  provider_id in (select user_id from public.veterinary_profiles where verification_status = 'verified'));

create policy breeding_farm_access on public.breeding_records for all using (
  animal_id in (select a.id from public.animals a join public.farms f on f.id = a.farm_id where f.owner_id = auth.uid())
  or public.current_role() in ('county','admin'))
  with check (recorded_by = auth.uid());
create policy vaccination_farm_access on public.vaccination_records for all using (
  animal_id in (select a.id from public.animals a join public.farms f on f.id = a.farm_id where f.owner_id = auth.uid())
  or public.current_role() in ('county','admin'))
  with check (administered_by = auth.uid());
create policy preventive_farm_access on public.preventive_care_records for all using (
  animal_id in (select a.id from public.animals a join public.farms f on f.id = a.farm_id where f.owner_id = auth.uid())
  or public.current_role() in ('county','admin'))
  with check (recorded_by = auth.uid());
create policy tick_farm_access on public.tick_treatment_records for all using (
  animal_id in (select a.id from public.animals a join public.farms f on f.id = a.farm_id where f.owner_id = auth.uid())
  or public.current_role() in ('county','admin'))
  with check (recorded_by = auth.uid());
create policy follow_up_case_access on public.follow_up_records for all using (
  case_id in (select id from public.disease_cases where reported_by = auth.uid() or assigned_vet_id = auth.uid())
  or public.current_role() in ('county','admin'))
  with check (recorded_by = auth.uid());
create policy attachment_owner on public.attachments for all using (
  uploaded_by = auth.uid()
  or case_id in (select id from public.disease_cases where reported_by = auth.uid() or assigned_vet_id = auth.uid())
  or public.current_role() in ('county','admin'))
  with check (uploaded_by = auth.uid());
