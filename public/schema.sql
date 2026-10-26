-- ============================================================================
-- Gusii Livestock Health & Value Chain Intelligence System — schema.sql
-- Target: PostgreSQL 15 on Supabase · RLS deny-by-default · audit triggers
-- Synthetic data only; no real PII is stored in this repository snapshot.
-- ============================================================================

create extension if not exists "pgcrypto";
create extension if not exists "postgis";        -- geo for vet finder (optional)

-- --------------------------------------------------------------- enums
create type user_role        as enum ('farmer','vet','sponsor','authority','admin');
create type animal_species   as enum ('dairy_cattle','beef_cattle');
create type animal_sex       as enum ('female','male');
create type animal_status    as enum ('active','sold','deceased','quarantine');
create type case_priority    as enum ('routine','urgent','emergency');
create type case_status      as enum ('pending_vet','vet_assigned','in_treatment',
                                      'resolved','escalated','cancelled',
                                      'claim_submitted','claim_under_review',
                                      'claim_approved','claim_paid','claim_rejected');
create type claim_status     as enum ('submitted','under_review','approved','rejected','paid');
create type vet_verification as enum ('pending','verified','suspended');
create type sponsor_status   as enum ('pending','active','suspended');
create type alert_severity   as enum ('info','warning','critical');

-- --------------------------------------------------------------- profiles
create table public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  role          user_role not null,
  full_name     text not null,
  phone         text unique,
  email         text,
  ward          text not null,                -- Gusii wards (Kitutu, Mugirango …)
  lat           double precision,
  lng           double precision,
  active        boolean not null default true,
  created_at    timestamptz not null default now()
);

create table public.farmer_profiles (
  profile_id      uuid primary key references public.profiles(id) on delete cascade,
  national_id     text,
  household_size  smallint,
  cooperative     text,
  member_since    date
);

create table public.vet_profiles (
  profile_id      uuid primary key references public.profiles(id) on delete cascade,
  license_number  text unique not null,          -- e.g. KVB-2021-0341
  specialty       text not null,                  -- 'Dairy & Population Medicine', 'Surgery'…
  years_experience smallint not null default 0,
  verification    vet_verification not null default 'pending',
  rating          numeric(2,1) default 4.5 check (rating between 0 and 5),
  cases_completed integer not null default 0,
  service_radius_km numeric(5,1) not null default 15.0,
  available       boolean not null default true,
  verified_by     uuid references public.profiles(id),
  verified_at     timestamptz
);

create table public.sponsorship_agreements (
  id                uuid primary key default gen_random_uuid(),
  sponsor_profile_id uuid not null references public.profiles(id),
  sponsor_name      text not null,                -- 'Kisii Cream Dairy Co-op'
  tier              text not null check (tier in ('Bronze','Silver','Gold')),
  max_claim_kes     integer not null,             -- per case
  annual_cap_kes    integer not null,
  covered_diagnoses text[] not null default '{}',
  enrollment_code   text not null unique,         -- farmers redeem this
  status            sponsor_status not null default 'pending',
  starts_on         date not null default current_date,
  ends_on           date not null default current_date + 365,
  created_at        timestamptz not null default now()
);

create table public.sponsor_enrollments (
  id             uuid primary key default gen_random_uuid(),
  agreement_id   uuid not null references public.sponsorship_agreements(id) on delete cascade,
  farmer_profile_id uuid not null references public.profiles(id) on delete cascade,
  used_to_date_kes integer not null default 0,
  enrolled_at    timestamptz not null default now(),
  unique (agreement_id, farmer_profile_id)
);

-- --------------------------------------------------------------- registry
create table public.farms (
  id          uuid primary key default gen_random_uuid(),
  farmer_id   uuid not null references public.profiles(id) on delete cascade,
  name        text not null,
  ward        text not null,
  hectares    numeric(6,2),
  lat         double precision not null,
  lng         double precision not null,
  created_at  timestamptz not null default now()
);

create table public.animals (
  id           uuid primary key default gen_random_uuid(),
  farm_id      uuid not null references public.farms(id) on delete cascade,
  tag_number   text not null,
  name         text,
  species      animal_species not null,
  breed        text not null,
  sex          animal_sex not null,
  dob          date,
  weight_kg    numeric(6,1),
  status       animal_status not null default 'active',
  unique (farm_id, tag_number)
);

-- --------------------------------------------------------------- cases
create table public.cases (
  id             uuid primary key default gen_random_uuid(),
  case_number    text not null unique,            -- GLH-2026-000123
  farm_id        uuid not null references public.farms(id),
  animal_id      uuid not null references public.animals(id),
  farmer_id      uuid not null references public.profiles(id),
  vet_id         uuid references public.profiles(id),
  sponsor_id     uuid references public.profiles(id),
  symptoms       text[] not null,
  triage_urgency smallint not null default 50 check (triage_urgency between 0 and 100),
  triage_summary text,
  suspected_dx   text,
  priority       case_priority not null default 'routine',
  status         case_status not null default 'pending_vet',
  reported_at    timestamptz not null default now(),
  assigned_at    timestamptz,
  resolved_at    timestamptz
);

create table public.case_events (
  id          uuid primary key default gen_random_uuid(),
  case_id     uuid not null references public.cases(id) on delete cascade,
  actor_id    uuid references public.profiles(id),
  event       text not null,                      -- 'status:vet_assigned', 'note:…'
  detail      text,
  created_at  timestamptz not null default now()
);

create table public.clinical_records (
  id             uuid primary key default gen_random_uuid(),
  case_id        uuid not null references public.cases(id) on delete cascade,
  vet_id         uuid not null references public.profiles(id),
  examination    text not null,
  diagnosis      text not null,
  temperature_c  numeric(4,1),
  heart_rate     smallint,
  created_at     timestamptz not null default now()
);

create table public.treatments (
  id             uuid primary key default gen_random_uuid(),
  case_id        uuid not null references public.cases(id) on delete cascade,
  drug           text not null,
  dose           text not null,
  route          text not null default 'IM',
  duration_days  smallint not null default 1,
  cost_kes       integer not null default 0,
  administered_at timestamptz not null default now()
);

create table public.claims (
  id             uuid primary key default gen_random_uuid(),
  claim_number   text not null unique,            -- CLM-2026-0042
  case_id        uuid not null references public.cases(id),
  vet_id         uuid not null references public.profiles(id),
  sponsor_id     uuid not null references public.profiles(id),
  amount_kes     integer not null check (amount_kes > 0),
  services       text not null,
  status         claim_status not null default 'submitted',
  submitted_at   timestamptz not null default now(),
  decided_at     timestamptz,
  decided_by     uuid references public.profiles(id),
  decision_reason text
);

-- --------------------------------------------------------------- surveillance & prevention
create table public.alerts (
  id           uuid primary key default gen_random_uuid(),
  disease      text not null,
  zone         text not null,
  severity     alert_severity not null,
  message      text not null,
  case_count   integer not null default 0,
  active       boolean not null default true,
  created_at   timestamptz not null default now()
);

create table public.tick_control_plans (
  id            uuid primary key default gen_random_uuid(),
  farm_id       uuid not null references public.farms(id) on delete cascade,
  dipping_day   text not null,                    -- 'Tuesday'
  acaricide     text not null,
  next_due      date not null,
  compliance_pct smallint check (compliance_pct between 0 and 100),
  created_at    timestamptz not null default now()
);

create table public.vaccinations (
  id           uuid primary key default gen_random_uuid(),
  animal_id    uuid not null references public.animals(id) on delete cascade,
  vaccine      text not null,                     -- 'FMD', 'LSD', 'Anthrax'…
  due_date     date not null,
  administered_date date,
  status       text generated always as (
                 case when administered_date is not null then 'complete'
                      when due_date < current_date then 'overdue'
                      else 'scheduled' end) stored
);

-- --------------------------------------------------------------- cross-cutting
create table public.audit_logs (
  id          bigint generated always as identity primary key,
  actor_id    uuid references public.profiles(id),
  actor_role  user_role,
  action      text not null,
  entity      text not null,
  entity_id   text,
  diff        jsonb,
  created_at  timestamptz not null default now()
);

create table public.notifications (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references public.profiles(id) on delete cascade,
  kind        text not null,
  title       text not null,
  body        text,
  read        boolean not null default false,
  created_at  timestamptz not null default now()
);

-- --------------------------------------------------------------- RLS helpers
create or replace function public.auth_role() returns user_role
language sql stable security definer set search_path = public as
$$ select role from public.profiles where id = auth.uid() $$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as
$$ select coalesce((select role = 'admin' from public.profiles where id = auth.uid()), false) $$;

create or replace function public.is_sponsor_member(p_sponsor uuid) returns boolean
language sql stable security definer set search_path = public as
$$ select exists (select 1 from public.profiles where id = auth.uid() and role = 'sponsor' and id = p_sponsor) $$;

-- --------------------------------------------------------------- RLS policies (representative)
alter table public.profiles enable row level security;
create policy profiles_self_read  on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy profiles_self_write on public.profiles for update using (id = auth.uid());
create policy profiles_admin_all  on public.profiles for all    using (public.is_admin());
create policy vet_directory_read  on public.profiles for select using (role = 'vet');   -- marketplace directory

alter table public.farms enable row level security;
create policy farms_owner   on public.farms for all using (farmer_id = auth.uid() or public.is_admin());
create policy farms_vet_read on public.farms for select using (
  exists (select 1 from public.cases c where c.farm_id = farms.id and c.vet_id = auth.uid()));

alter table public.animals enable row level security;
create policy animals_owner on public.animals for all using (
  exists (select 1 from public.farms f where f.id = animals.farm_id and f.farmer_id = auth.uid()) or public.is_admin());

alter table public.cases enable row level security;
create policy cases_farmer   on public.cases for all using (farmer_id = auth.uid() or public.is_admin());
create policy cases_vet      on public.cases for all using (vet_id = auth.uid());
create policy cases_sponsor  on public.cases for select using (sponsor_id = auth.uid());
create policy cases_authority on public.cases for select using (public.auth_role() = 'authority'); -- aggregate use enforced in views

alter table public.claims enable row level security;
create policy claims_vet     on public.claims for all using (vet_id = auth.uid());
create policy claims_sponsor on public.claims for all using (public.is_sponsor_member(sponsor_id) or public.is_admin());
create policy claims_farmer_read on public.claims for select using (
  exists (select 1 from public.cases c where c.id = claims.case_id and c.farmer_id = auth.uid()));

alter table public.audit_logs enable row level security;
create policy audit_admin_only on public.audit_logs for select using (public.is_admin());
-- inserts happen exclusively through the SECURITY DEFINER trigger below

alter table public.notifications enable row level security;
create policy notif_own on public.notifications for all using (profile_id = auth.uid());

-- Surveillance: anonymised aggregate view — no farmer/vet PII columns
create or replace view public.v_surveillance_zone_stats as
select c.status, c.suspected_dx, f.ward as zone,
       date_trunc('week', c.reported_at)::date as week,
       count(*) as cases
from public.cases c join public.farms f on f.id = c.farm_id
group by 1,2,3,4;

create or replace view public.v_disease_weekly as
select suspected_dx as disease, date_trunc('week', reported_at)::date as week, count(*) as cases
from public.cases group by 1,2;

-- --------------------------------------------------------------- audit trigger
create or replace function public.audit_mutation() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_actor uuid := auth.uid(); v_role user_role;
begin
  select role into v_role from public.profiles where id = v_actor;
  insert into public.audit_logs(actor_id, actor_role, action, entity, entity_id, diff)
  values (v_actor, v_role, tg_op, tg_table_name,
          coalesce(new.id::text, old.id::text),
          jsonb_build_object('new', to_jsonb(new), 'old', to_jsonb(old)));
  return coalesce(new, old);
end $$;

create trigger audit_cases  after insert or update or delete on public.cases  for each row execute function public.audit_mutation();
create trigger audit_claims after insert or update or delete on public.claims for each row execute function public.audit_mutation();
create trigger audit_vprof  after update                     on public.vet_profiles for each row execute function public.audit_mutation();

-- --------------------------------------------------------------- indexes
create index idx_cases_farmer   on public.cases(farmer_id);
create index idx_cases_vet      on public.cases(vet_id);
create index idx_cases_status   on public.cases(status);
create index idx_cases_reported on public.cases(reported_at desc);
create index idx_animals_farm   on public.animals(farm_id);
create index idx_claims_sponsor on public.claims(sponsor_id, status);
create index idx_audit_created  on public.audit_logs(created_at desc);
create index idx_farms_geo      on public.farms using gist (point(lng, lat));
