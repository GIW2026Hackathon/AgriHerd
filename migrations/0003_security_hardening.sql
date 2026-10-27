-- Harden authorization roles, provider verification, and claim state changes.

create or replace function public.current_role()
returns public.user_role
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select p.role from public.profiles p where p.id = (select auth.uid())),
    'farmer'::public.user_role)
$$;

create or replace function public.guard_profile_role_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.role is distinct from old.role
    and coalesce(auth.role(), '') <> 'service_role'
    and public.current_role() <> 'admin'::public.user_role then
    raise exception 'Only an administrator may change profile roles';
  end if;
  return new;
end
$$;

drop trigger if exists guard_profile_role_change on public.profiles;
create trigger guard_profile_role_change
  before update on public.profiles
  for each row execute function public.guard_profile_role_change();

drop policy if exists profiles_self_update on public.profiles;
create policy profiles_self_update on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists provider_self_manage on public.veterinary_profiles;
drop policy if exists provider_self_read on public.veterinary_profiles;
drop policy if exists provider_staff_read on public.veterinary_profiles;
drop policy if exists provider_self_insert on public.veterinary_profiles;
drop policy if exists provider_self_update on public.veterinary_profiles;
drop policy if exists provider_staff_verify on public.veterinary_profiles;
create policy provider_self_read on public.veterinary_profiles for select using (user_id = auth.uid());
create policy provider_staff_read on public.veterinary_profiles for select
  using (public.current_role() in ('county','admin'));
create policy provider_self_insert on public.veterinary_profiles for insert with check (
  user_id = auth.uid() and verification_status = 'pending' and verified_at is null and verified_by is null);
create policy provider_self_update on public.veterinary_profiles for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and verification_status = 'pending' and verified_at is null and verified_by is null);
create policy provider_staff_verify on public.veterinary_profiles for update
  using (public.current_role() in ('county','admin'))
  with check (public.current_role() in ('county','admin'));

drop policy if exists provider_credentials_self on public.provider_credentials;
drop policy if exists provider_credentials_self_read on public.provider_credentials;
drop policy if exists provider_credentials_self_insert on public.provider_credentials;
drop policy if exists provider_credentials_self_delete on public.provider_credentials;
drop policy if exists provider_credentials_staff_update on public.provider_credentials;
create policy provider_credentials_self_read on public.provider_credentials for select
  using (provider_id = auth.uid());
create policy provider_credentials_self_insert on public.provider_credentials for insert
  with check (provider_id = auth.uid() and status = 'pending');
create policy provider_credentials_self_delete on public.provider_credentials for delete
  using (provider_id = auth.uid() and status = 'pending');
create policy provider_credentials_staff_update on public.provider_credentials for update
  using (public.current_role() in ('county','admin'))
  with check (public.current_role() in ('county','admin'));

drop policy if exists claims_farmer on public.claims;
drop policy if exists claims_farmer_read on public.claims;
drop policy if exists claims_farmer_insert on public.claims;
drop policy if exists claims_farmer_submit on public.claims;
drop policy if exists claims_vet_recommend on public.claims;
drop policy if exists claims_sponsor on public.claims;
drop policy if exists claims_sponsor_read on public.claims;
drop policy if exists claims_sponsor_review on public.claims;
drop policy if exists claims_admin_all on public.claims;
create policy claims_farmer_read on public.claims for select
  using (requested_by = auth.uid());
create policy claims_farmer_insert on public.claims for insert
  with check (
    requested_by = auth.uid()
    and status = 'draft'
    and case_id in (
      select c.id from public.disease_cases c
      join public.farms f on f.id = c.farm_id
      where f.owner_id = auth.uid() and f.id = claims.farm_id)
    and (sponsor_id is null or sponsor_id = (
      select f.sponsor_id from public.farms f where f.id = claims.farm_id))
    and (pool_id is null or pool_id in (
      select p.id from public.funding_pools p
      where p.sponsor_id = claims.sponsor_id and p.active)));
create policy claims_farmer_submit on public.claims for update
  using (requested_by = auth.uid() and status = 'draft')
  with check (requested_by = auth.uid() and status = 'submitted');
create policy claims_vet_recommend on public.claims for update
  using (
    case_id in (select id from public.disease_cases where assigned_vet_id = auth.uid())
    and status in ('submitted','under_review'))
  with check (
    case_id in (select id from public.disease_cases where assigned_vet_id = auth.uid())
    and status = 'under_review');
create policy claims_sponsor_read on public.claims for select
  using (sponsor_id in (select id from public.sponsors where profile_id = auth.uid()));
create policy claims_sponsor_review on public.claims for update
  using (
    sponsor_id in (select id from public.sponsors where profile_id = auth.uid())
    and status in ('submitted','under_review'))
  with check (
    sponsor_id in (select id from public.sponsors where profile_id = auth.uid())
    and status in ('under_review','approved','rejected'));
create policy claims_admin_all on public.claims for all
  using (public.current_role() = 'admin')
  with check (public.current_role() = 'admin');

create or replace function public.guard_claim_update()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  actor_role public.user_role := public.current_role();
begin
  if tg_op = 'INSERT' then
    if coalesce(auth.role(), '') <> 'service_role'
      and (new.disbursement_ref is not null
        or new.disbursed_at is not null
        or new.status in ('disbursed'::public.claim_status, 'reconciled'::public.claim_status)) then
      raise exception 'Disbursement state can only be created by a trusted service';
    end if;
    return new;
  end if;

  if coalesce(auth.role(), '') <> 'service_role'
    and (new.disbursement_ref is distinct from old.disbursement_ref
      or new.disbursed_at is distinct from old.disbursed_at
      or (new.status in ('disbursed'::public.claim_status, 'reconciled'::public.claim_status)
        and new.status is distinct from old.status)) then
    raise exception 'Disbursement state can only be changed by a trusted service';
  end if;

  if coalesce(auth.role(), '') = 'service_role' then
    return new;
  end if;

  if new.id is distinct from old.id
    or new.claim_number is distinct from old.claim_number
    or new.case_id is distinct from old.case_id
    or new.farm_id is distinct from old.farm_id
    or new.requested_by is distinct from old.requested_by
    or new.sponsor_id is distinct from old.sponsor_id
    or new.pool_id is distinct from old.pool_id
    or new.amount_kes is distinct from old.amount_kes
    or new.disbursement_ref is distinct from old.disbursement_ref
    or new.disbursed_at is distinct from old.disbursed_at
    or new.created_at is distinct from old.created_at then
    raise exception 'Claim identity, amount, and disbursement fields cannot be changed directly';
  end if;

  if actor_role = 'admin'::public.user_role then
    return new;
  end if;

  if actor_role = 'farmer'::public.user_role then
    if old.requested_by <> (select auth.uid())
      or old.status <> 'draft'::public.claim_status
      or new.status <> 'submitted'::public.claim_status
      or new.submitted_at is null
      or new.vet_recommendation is distinct from old.vet_recommendation
      or new.reviewer_id is distinct from old.reviewer_id
      or new.review_note is distinct from old.review_note
      or new.reviewed_at is distinct from old.reviewed_at
      or new.submitted_at is not distinct from old.submitted_at then
      raise exception 'Farmers may only submit their own draft claims';
    end if;
    return new;
  end if;

  if actor_role = 'vet'::public.user_role then
    if old.case_id not in (
      select c.id from public.disease_cases c where c.assigned_vet_id = (select auth.uid()))
      or old.status not in ('submitted'::public.claim_status, 'under_review'::public.claim_status)
      or new.status <> 'under_review'::public.claim_status
      or new.vet_recommendation is null
      or new.reviewer_id is distinct from (select auth.uid())
      or new.reviewed_at is null
      or new.review_note is distinct from old.review_note
      or new.submitted_at is distinct from old.submitted_at then
      raise exception 'Veterinarians may only add recommendations to assigned claims';
    end if;
    return new;
  end if;

  if actor_role = 'sponsor'::public.user_role then
    if old.sponsor_id not in (
      select s.id from public.sponsors s where s.profile_id = (select auth.uid()))
      or old.status not in ('submitted'::public.claim_status, 'under_review'::public.claim_status)
      or new.status not in ('under_review'::public.claim_status, 'approved'::public.claim_status, 'rejected'::public.claim_status)
      or (new.status in ('approved'::public.claim_status, 'rejected'::public.claim_status)
        and old.status <> 'under_review'::public.claim_status)
      or new.vet_recommendation is distinct from old.vet_recommendation
      or new.submitted_at is distinct from old.submitted_at
      or new.reviewer_id is distinct from (select auth.uid())
      or new.reviewed_at is null then
      raise exception 'Sponsors may only review linked claims; disbursement requires a trusted workflow';
    end if;
    return new;
  end if;

  raise exception 'This role cannot update claims';
end
$$;

drop trigger if exists guard_claim_update on public.claims;
create trigger guard_claim_update
  before insert or update on public.claims
  for each row execute function public.guard_claim_update();

drop policy if exists claim_items_inherit on public.claim_line_items;
drop policy if exists claim_items_visible on public.claim_line_items;
drop policy if exists claim_items_farmer_draft on public.claim_line_items;
create policy claim_items_visible on public.claim_line_items for select
  using (claim_id in (select id from public.claims));
create policy claim_items_farmer_draft on public.claim_line_items for all
  using (claim_id in (
    select id from public.claims
    where requested_by = auth.uid() and status = 'draft'))
  with check (claim_id in (
    select id from public.claims
    where requested_by = auth.uid() and status = 'draft'));
