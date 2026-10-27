-- ============================================================================
-- Gusii Livestock Health & Value Chain Intelligence System (GLHVIS)
-- Supabase / PostgreSQL schema  ·  v1.0  ·  2026-10-26
-- Apply with:  psql $DATABASE_URL -f schema.sql   (or Supabase SQL editor)
-- All tables carry Row Level Security; audit_logs is append-only.
-- ============================================================================

create extension if not exists "pgcrypto";
create extension if not exists "postgis";        -- farm/vet geospatial ranking
create extension if not exists "pg_trgm";        -- fuzzy search on tags/owners

-- ---------------------------------------------------------------------------
-- 1. Enums
-- ---------------------------------------------------------------------------
create type user_role        as enum ('farmer','vet','sponsor','county','admin');
create type animal_species   as enum ('cattle','goat','sheep','pig','chicken','camel');
create type animal_sex       as enum ('female','male');
create type animal_status    as enum ('healthy','under_treatment','quarantine','recovered','deceased','sold');
create type lifecycle_stage  as enum ('calf','heifer','lactating','dry','bull','bullock');
create type case_status      as enum ('submitted','triaged','assigned','in_treatment','monitoring','recovered','referred','deceased','closed');
create type case_priority    as enum ('routine','priority','emergency');
create type claim_status     as enum ('draft','submitted','under_review','approved','rejected','disbursed','reconciled');
create type urgency_tier     as enum ('routine','priority','emergency');
create type alert_severity   as enum ('info','watch','alert','critical');
create type alert_status     as enum ('active','acknowledged','contained','resolved');

-- ---------------------------------------------------------------------------
-- 2. Profiles (1:1 with auth.users)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  full_name     text not null,
  role          user_role not null default 'farmer',
  phone         text,
  national_id   text,
  county        text not null default 'Kisii',
  ward          text,
  organization  text,                       -- co-op / buyer / vet practice for non-farmers
  avatar_url    text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index profiles_role_idx on public.profiles(role);
create index profiles_ward_idx on public.profiles(county, ward);

-- ---------------------------------------------------------------------------
-- 3. Farms
-- ---------------------------------------------------------------------------
create table public.farms (
  id            uuid primary key default gen_random_uuid(),
  farm_code     text not null unique,        -- e.g. KIS-2026-0147
  name          text not null,
  owner_id      uuid not null references public.profiles(id) on delete restrict,
  county        text not null,
  sub_county    text,
  ward          text not null,
  location      geography(Point, 4326),      -- PostGIS point (farm centroid)
  lat           double precision not null,
  lng           double precision not null,
  herd_size     int not null default 1 check (herd_size >= 0),
  primary_breed text,
  sponsor_id    uuid,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index farms_owner_idx    on public.farms(owner_id);
create index farms_ward_idx     on public.farms(county, ward);
create index farms_location_gix on public.farms using gist(location);
create index farms_sponsor_idx  on public.farms(sponsor_id);

-- ---------------------------------------------------------------------------
-- 4. Animals
-- ---------------------------------------------------------------------------
create table public.animals (
  id            uuid primary key default gen_random_uuid(),
  tag_number    text not null,
  farm_id       uuid not null references public.farms(id) on delete cascade,
  species       animal_species not null default 'cattle',
  breed         text not null,
  sex           animal_sex not null,
  dob           date,
  stage         lifecycle_stage not null default 'lactating',
  parity        smallint default 0,
  status        animal_status not null default 'healthy',
  dam_tag       text,
  last_milk_yield_kg numeric(5,2),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (farm_id, tag_number)
);
create index animals_farm_idx    on public.animals(farm_id);
create index animals_status_idx  on public.animals(status);
create index animals_tag_trgm    on public.animals using gin(tag_number gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- 5. Disease cases
-- ---------------------------------------------------------------------------
create table public.disease_cases (
  id              uuid primary key default gen_random_uuid(),
  case_number     text not null unique,      -- e.g. FS-2041
  animal_id       uuid not null references public.animals(id) on delete restrict,
  farm_id         uuid not null references public.farms(id) on delete restrict,
  reported_by     uuid not null references public.profiles(id),
  assigned_vet_id uuid references public.profiles(id) on delete set null,
  chief_complaint text not null,
  symptoms        text[] not null default '{}',
  ai_confidence   numeric(4,3),
  ai_differential jsonb,                     -- ranked differentials from screening
  priority        case_priority not null default 'routine',
  status          case_status not null default 'submitted',
  diagnosis       text,
  outcome         text,
  ward            text not null,
  county          text not null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  closed_at       timestamptz
);
create index cases_farm_idx     on public.disease_cases(farm_id);
create index cases_vet_idx      on public.disease_cases(assigned_vet_id);
create index cases_status_idx   on public.disease_cases(status);
create index cases_ward_idx     on public.disease_cases(county, ward, created_at desc);
create index cases_priority_idx on public.disease_cases(priority) where priority <> 'routine';

-- ---------------------------------------------------------------------------
-- 6. Case events (immutable clinical & workflow timeline)
-- ---------------------------------------------------------------------------
create table public.case_events (
  id          uuid primary key default gen_random_uuid(),
  case_id     uuid not null references public.disease_cases(id) on delete cascade,
  actor_id    uuid not null references public.profiles(id),
  actor_role  user_role not null,
  event_type  text not null check (event_type in
              ('created','triaged','assigned','visit','note','lab','treatment',
               'status_change','claim_linked','escalated','recovered','deceased','closed')),
  body        text,
  meta        jsonb,
  created_at  timestamptz not null default now()
);
create index case_events_case_idx on public.case_events(case_id, created_at);

-- ---------------------------------------------------------------------------
-- 7. Treatments (drug/protocol administration log)
-- ---------------------------------------------------------------------------
create table public.treatments (
  id            uuid primary key default gen_random_uuid(),
  case_id       uuid not null references public.disease_cases(id) on delete cascade,
  administered_by uuid not null references public.profiles(id),
  drug_name     text not null,
  dosage        text not null,
  route         text not null default 'IM',   -- IM, IV, SC, oral, topical, pour-on
  withdrawal_days smallint default 0,
  cost_kes      numeric(10,2) not null default 0,
  administered_at timestamptz not null default now(),
  notes         text
);
create index treatments_case_idx on public.treatments(case_id);

-- ---------------------------------------------------------------------------
-- 8. Sponsors, linkage & funding pools
-- ---------------------------------------------------------------------------
create table public.sponsors (
  id           uuid primary key default gen_random_uuid(),
  profile_id   uuid not null unique references public.profiles(id) on delete cascade,
  company_name text not null,
  co_op_reg_no text,
  contact_email text
);

create table public.sponsor_members (               -- sponsor ↔ farmer link
  sponsor_id uuid not null references public.sponsors(id) on delete cascade,
  farmer_id  uuid not null references public.profiles(id) on delete cascade,
  joined_at  timestamptz not null default now(),
  coverage_tier text not null default 'standard' check (coverage_tier in ('basic','standard','premium')),
  primary key (sponsor_id, farmer_id)
);

alter table public.farms
  add constraint farms_sponsor_fk
  foreign key (sponsor_id) references public.sponsors(id) on delete set null;

create table public.funding_pools (
  id          uuid primary key default gen_random_uuid(),
  sponsor_id  uuid not null references public.sponsors(id) on delete cascade,
  name        text not null,
  total_kes   numeric(12,2) not null,
  committed_kes numeric(12,2) not null default 0,
  disbursed_kes numeric(12,2) not null default 0,
  period      daterange not null,
  active      boolean not null default true
);
create index pools_sponsor_idx on public.funding_pools(sponsor_id) where active;

-- ---------------------------------------------------------------------------
-- 9. Claims & line items
-- ---------------------------------------------------------------------------
create table public.claims (
  id              uuid primary key default gen_random_uuid(),
  claim_number    text not null unique,      -- e.g. CLM-0092
  case_id         uuid not null references public.disease_cases(id) on delete restrict,
  farm_id         uuid not null references public.farms(id) on delete restrict,
  requested_by    uuid not null references public.profiles(id),
  sponsor_id      uuid references public.sponsors(id),
  pool_id         uuid references public.funding_pools(id),
  amount_kes      numeric(12,2) not null check (amount_kes >= 0),
  status          claim_status not null default 'draft',
  vet_recommendation text,
  reviewer_id     uuid references public.profiles(id),
  review_note     text,
  disbursement_ref text,                     -- MOCK-MPESA-… until real rail is wired
  submitted_at    timestamptz,
  reviewed_at     timestamptz,
  disbursed_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index claims_status_idx  on public.claims(status);
create index claims_sponsor_idx on public.claims(sponsor_id);
create index claims_case_idx    on public.claims(case_id);

create table public.claim_line_items (
  id          uuid primary key default gen_random_uuid(),
  claim_id    uuid not null references public.claims(id) on delete cascade,
  description text not null,
  category    text not null check (category in ('vet_fee','drug','lab','transport','procedure','feed_supplement','other')),
  qty         numeric(8,2) not null default 1,
  unit_kes    numeric(10,2) not null,
  total_kes   numeric(12,2) generated always as (qty * unit_kes) stored
);
create index claim_items_claim_idx on public.claim_line_items(claim_id);

-- ---------------------------------------------------------------------------
-- 10. Tick control & herd health plans
-- ---------------------------------------------------------------------------
create table public.tick_control_plans (
  id           uuid primary key default gen_random_uuid(),
  farm_id      uuid not null references public.farms(id) on delete cascade,
  created_by   uuid not null references public.profiles(id),
  product      text not null,                -- e.g. Amitraz 12.5% EC
  interval_days smallint not null default 14,
  last_dip_date date,
  next_dip_date date,
  deworm_next  date,
  vaccine_next date,
  acaricide_note text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index tick_farm_idx on public.tick_control_plans(farm_id);

-- ---------------------------------------------------------------------------
-- 11. AI screenings
-- ---------------------------------------------------------------------------
create table public.ai_screenings (
  id            uuid primary key default gen_random_uuid(),
  farm_id       uuid not null references public.farms(id) on delete cascade,
  animal_id     uuid references public.animals(id) on delete set null,
  performed_by  uuid not null references public.profiles(id),
  symptoms      text[] not null,
  engine        text not null check (engine in ('deterministic_rules','vercel_ai_sdk','hybrid')),
  differential  jsonb not null,              -- [{disease, confidence, urgency, advice}]
  urgency       urgency_tier not null,
  case_id       uuid references public.disease_cases(id) on delete set null,
  created_at    timestamptz not null default now()
);
create index screenings_farm_idx on public.ai_screenings(farm_id, created_at desc);
create index screenings_urgency_idx on public.ai_screenings(urgency) where urgency <> 'routine';

-- ---------------------------------------------------------------------------
-- 12. Disease surveillance alerts (ward-level early warning)
-- ---------------------------------------------------------------------------
create table public.disease_alerts (
  id           uuid primary key default gen_random_uuid(),
  county       text not null,
  ward         text not null,
  disease      text not null,
  severity     alert_severity not null,
  status       alert_status not null default 'active',
  case_count   int not null default 1,
  threshold    int not null default 3,       -- cases / 14 days triggering alert
  summary      text not null,
  acknowledged_by uuid references public.profiles(id),
  acknowledged_at timestamptz,
  window_start date not null default (now() - interval '14 days')::date,
  created_at   timestamptz not null default now()
);
create index alerts_active_idx on public.disease_alerts(status, severity);
create index alerts_ward_idx   on public.disease_alerts(county, ward, disease);

-- Ward-level 14-day outbreak view (refreshable / materializable)
create or replace view public.ward_outbreak_counts as
select county, ward, diagnosis as disease,
       count(*) as cases,
       max(created_at) as latest_case_at
from public.disease_cases
where diagnosis is not null
  and created_at >= now() - interval '14 days'
group by county, ward, diagnosis
having count(*) >= 1;

-- ---------------------------------------------------------------------------
-- 13. Notifications
-- ---------------------------------------------------------------------------
create table public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  title       text not null,
  body        text not null,
  kind        text not null default 'info' check (kind in ('info','case','claim','alert','system')),
  read        boolean not null default false,
  sms_sent    boolean not null default false,   -- mocked SMS gateway in this build
  created_at  timestamptz not null default now()
);
create index notifications_user_idx on public.notifications(user_id, read, created_at desc);

-- ---------------------------------------------------------------------------
-- 14. Audit logs — append-only
-- ---------------------------------------------------------------------------
create table public.audit_logs (
  id           bigint generated always as identity primary key,
  ts           timestamptz not null default now(),
  actor_id     uuid references public.profiles(id),
  actor_role   user_role,
  action       text not null,               -- e.g. claim.approved, case.status_changed
  entity_table text not null,
  entity_id    text not null,
  before       jsonb,
  after        jsonb,
  ip           inet
);
create index audit_entity_idx on public.audit_logs(entity_table, entity_id);
create index audit_actor_idx  on public.audit_logs(actor_id, ts desc);
create index audit_action_idx on public.audit_logs(action, ts desc);

revoke update, delete on public.audit_logs from authenticated, anon, public;

create or replace function public.audit_block_mutation() returns trigger language plpgsql as $$
begin
  raise exception 'audit_logs is append-only: % rejected', tg_op;
end $$;
create trigger audit_logs_append_only
  before update or delete on public.audit_logs
  for each row execute function public.audit_block_mutation();

-- Generic updated_at trigger
create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create trigger touch_profiles  before update on public.profiles  for each row execute function public.touch_updated_at();
create trigger touch_farms     before update on public.farms     for each row execute function public.touch_updated_at();
create trigger touch_animals   before update on public.animals   for each row execute function public.touch_updated_at();
create trigger touch_cases     before update on public.disease_cases for each row execute function public.touch_updated_at();
create trigger touch_claims    before update on public.claims    for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- 15. Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles           enable row level security;
alter table public.farms             enable row level security;
alter table public.animals           enable row level security;
alter table public.disease_cases     enable row level security;
alter table public.case_events       enable row level security;
alter table public.treatments        enable row level security;
alter table public.sponsors          enable row level security;
alter table public.sponsor_members   enable row level security;
alter table public.funding_pools     enable row level security;
alter table public.claims            enable row level security;
alter table public.claim_line_items  enable row level security;
alter table public.tick_control_plans enable row level security;
alter table public.ai_screenings     enable row level security;
alter table public.disease_alerts    enable row level security;
alter table public.notifications     enable row level security;
alter table public.audit_logs        enable row level security;

-- Helper: current user's role from JWT app_metadata / user_metadata
create or replace function public.current_role() returns user_role language sql stable as $$
  select coalesce(
    nullif(auth.jwt() -> 'user_metadata' ->> 'role','')::user_role,
    'farmer'::user_role)
$$;

-- profiles
create policy profiles_self_read   on public.profiles for select using (id = auth.uid() or public.current_role() in ('county','admin'));
create policy profiles_self_update on public.profiles for update using (id = auth.uid());
create policy profiles_admin_all   on public.profiles for all    using (public.current_role() = 'admin');

-- farms: farmer owns; vet/sponsor read linked; county/admin read all
create policy farms_farmer_rw on public.farms for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy farms_linked_read on public.farms for select using (
  public.current_role() in ('county','admin') or
  sponsor_id = (select id from public.sponsors where profile_id = auth.uid()) or
  exists (select 1 from public.sponsor_members sm
          join public.sponsors s on s.id = sm.sponsor_id
          where s.profile_id = auth.uid() and sm.farmer_id = public.farms.owner_id));

-- animals
create policy animals_farm_owner on public.animals for all using (
  exists (select 1 from public.farms f where f.id = animals.farm_id and f.owner_id = auth.uid()));
create policy animals_staff_read on public.animals for select using (public.current_role() in ('county','admin'));
create policy animals_vet_read on public.animals for select using (
  exists (
    select 1
    from public.disease_cases c
    where c.animal_id = animals.id
      and c.assigned_vet_id = auth.uid()));
create policy animals_sponsor_read on public.animals for select using (
  exists (
    select 1
    from public.farms f
    join public.sponsors s on s.id = f.sponsor_id
    where f.id = animals.farm_id
      and s.profile_id = auth.uid()));

-- disease_cases
create policy cases_farmer on public.disease_cases for all
  using (farm_id in (select id from public.farms where owner_id = auth.uid()))
  with check (farm_id in (select id from public.farms where owner_id = auth.uid()));
create policy cases_vet on public.disease_cases for update using (assigned_vet_id = auth.uid());
create policy cases_vet_read on public.disease_cases for select using (assigned_vet_id = auth.uid());
create policy cases_sponsor_read on public.disease_cases for select using (
  exists (
    select 1
    from public.farms f
    where f.id = disease_cases.farm_id
      and (
        f.sponsor_id = (select id from public.sponsors where profile_id = auth.uid())
        or exists (
          select 1
          from public.sponsor_members sm
          join public.sponsors s on s.id = sm.sponsor_id
          where s.profile_id = auth.uid()
            and sm.farmer_id = f.owner_id)));
create policy cases_staff_read on public.disease_cases for select using (public.current_role() in ('county','admin'));
create policy cases_admin on public.disease_cases for all using (public.current_role() = 'admin');

-- case_events
create policy events_case_access on public.case_events for select using (
  case_id in (select id from public.disease_cases));
create policy events_insert on public.case_events for insert with check (actor_id = auth.uid());

-- treatments
create policy treatments_vet on public.treatments for all using (
  exists (select 1 from public.disease_cases c where c.id = treatments.case_id and c.assigned_vet_id = auth.uid()));
create policy treatments_farmer_read on public.treatments for select using (
  exists (
    select 1
    from public.disease_cases c
    join public.farms f on f.id = c.farm_id
    where c.id = treatments.case_id
      and f.owner_id = auth.uid()));
create policy treatments_sponsor_read on public.treatments for select using (
  exists (
    select 1
    from public.disease_cases c
    join public.farms f on f.id = c.farm_id
    where c.id = treatments.case_id
      and (
        f.sponsor_id = (select id from public.sponsors where profile_id = auth.uid())
        or exists (
          select 1
          from public.sponsor_members sm
          join public.sponsors s on s.id = sm.sponsor_id
          where s.profile_id = auth.uid()
            and sm.farmer_id = f.owner_id)));
create policy treatments_staff_read on public.treatments for select using (public.current_role() in ('county','admin'));

-- sponsors & pools: sponsor sees own org; county/admin read
create policy sponsors_read on public.sponsors for select using (profile_id = auth.uid() or public.current_role() in ('county','admin'));
create policy pools_sponsor on public.funding_pools for all
  using (sponsor_id in (select id from public.sponsors where profile_id = auth.uid()))
  with check (sponsor_id in (select id from public.sponsors where profile_id = auth.uid()));
create policy pools_read on public.funding_pools for select using (public.current_role() in ('county','admin'));

-- claims: farmer creates/reads own; vet reads assigned & writes recommendation;
-- sponsor reviews/approves linked farmers' claims; county read; admin all
create policy claims_farmer on public.claims for all
  using (requested_by = auth.uid())
  with check (requested_by = auth.uid() and status = 'draft');
create policy claims_vet_read on public.claims for select using (
  case_id in (select id from public.disease_cases where assigned_vet_id = auth.uid()));
create policy claims_vet_recommend on public.claims for update using (
  case_id in (select id from public.disease_cases where assigned_vet_id = auth.uid())
  and status in ('submitted','under_review')) ;
create policy claims_sponsor on public.claims for all using (
  sponsor_id in (select id from public.sponsors where profile_id = auth.uid()));
create policy claims_county_read on public.claims for select using (public.current_role() in ('county','admin'));

-- claim line items follow parent claim visibility
create policy claim_items_inherit on public.claim_line_items for all using (
  claim_id in (select id from public.claims));

-- tick plans: farmer own; vet linked read/write; admin all
create policy tick_farmer on public.tick_control_plans for all
  using (farm_id in (select id from public.farms where owner_id = auth.uid()))
  with check (farm_id in (select id from public.farms where owner_id = auth.uid()));
create policy tick_vet on public.tick_control_plans for update using (public.current_role() = 'vet');
create policy tick_read on public.tick_control_plans for select using (public.current_role() in ('county','admin','sponsor'));

-- screenings: uploader own; county/admin read (surveillance signal)
create policy screenings_owner on public.ai_screenings for all using (performed_by = auth.uid()) with check (performed_by = auth.uid());
create policy screenings_surveillance_read on public.ai_screenings for select using (public.current_role() in ('county','admin'));

-- alerts: county create/ack; everyone in-scope can read
create policy alerts_county on public.disease_alerts for all using (public.current_role() in ('county','admin'));
create policy alerts_read on public.disease_alerts for select using (true);

-- notifications: strictly per-user
create policy notifications_owner on public.notifications for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- audit: county reads county-scoped rows; admin reads all; no one writes directly
create policy audit_county_read on public.audit_logs for select using (public.current_role() = 'county');
create policy audit_admin_read  on public.audit_logs for select using (public.current_role() = 'admin');
-- (no INSERT policy: writes happen via security-definer trigger/function only)

-- ---------------------------------------------------------------------------
-- 16. Example security-definer audit writer (used by app server actions)
-- ---------------------------------------------------------------------------
create or replace function public.write_audit_log(
  p_action text, p_entity_table text, p_entity_id text,
  p_before jsonb default null, p_after jsonb default null
) returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.audit_logs (actor_id, actor_role, action, entity_table, entity_id, before, after)
  values (auth.uid(), public.current_role(), p_action, p_entity_table, p_entity_id, p_before, p_after);
end $$;

-- ============================================================================
-- End of schema. Seed data is applied by the application seed (src/lib/seed.ts)
-- ============================================================================
