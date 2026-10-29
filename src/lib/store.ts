/**
 * DataClient — Supabase-compatible repository for GLHVIS.
 *
 * Mirrors the Postgres RLS policies in schema.sql §15. Every read method
 * applies the same predicates as the CREATE POLICY statements, so the rules
 * below and the database enforce identical authorization.
 *
 * To cut over to real Supabase:
 *   1. Apply schema.sql to the project.
 *   2. npm i @supabase/supabase-js
 *   3. Implement the same method signatures with .from(...) queries — the
 *      RLS layer will enforce the policies server-side.
 *
 * Persistence: localStorage (namespace glhvis.db.v1). A "Reset demo data"
 * action rebuilds the seed.
 */
import type {
  DB, Profile, Farm, Animal, DiseaseCase, CaseEvent, Treatment, Sponsor,
  FundingPool, Claim, ClaimLineItem, TickControlPlan, AIScreening,
  DiseaseAlert, AppNotification, AuditLog, Role, CaseStatus, ClaimStatus,
} from './types';
import { buildSeed } from './seed';
import { uuid, daysFromNow } from './utils';

const STORAGE_KEY = 'glhvis.db.v1';

function loadDB(): DB {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as DB;
  } catch { /* corrupted — reseed */ }
  return buildSeed();
}
function persist(db: DB) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(db)); } catch { /* quota — ignore */ }
}
export function resetDemoData() {
  localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new Event('glhvis:db-reset'));
}

// ---------------------------------------------------------------------------
// RLS-equivalent predicate helpers (mirror schema.sql policies)
// ---------------------------------------------------------------------------
const isStaff = (role: Role) => role === 'county' || role === 'admin';

function visibleFarms(db: DB, u: Profile): Farm[] {
  if (isStaff(u.role)) return db.farms;
  if (u.role === 'farmer') return db.farms.filter((f) => f.owner_id === u.id);
  const sponsorRows = u.role === 'sponsor' ? db.sponsors.filter((s) => s.profile_id === u.id) : [];
  if (u.role === 'sponsor') {
    const spIds = new Set(sponsorRows.map((s) => s.id));
    const linkedFarmerIds = new Set(
      db.sponsorMembers.filter((m) => spIds.has(m.sponsor_id)).map((m) => m.farmer_id)
    );
    return db.farms.filter(
      (f) => (f.sponsor_id && spIds.has(f.sponsor_id)) || linkedFarmerIds.has(f.owner_id)
    );
  }
  // vet: farms with cases assigned to vet, plus farms of those cases
  const myCaseFarms = new Set(
    db.cases.filter((c) => c.assigned_vet_id === u.id).map((c) => c.farm_id)
  );
  return db.farms.filter((f) => myCaseFarms.has(f.id));
}

function visibleCases(db: DB, u: Profile): DiseaseCase[] {
  if (isStaff(u.role)) return db.cases;
  if (u.role === 'farmer') {
    const myFarmIds = new Set(db.farms.filter((f) => f.owner_id === u.id).map((f) => f.id));
    return db.cases.filter((c) => myFarmIds.has(c.farm_id));
  }
  if (u.role === 'vet') return db.cases.filter((c) => c.assigned_vet_id === u.id || c.status === 'submitted' || c.status === 'triaged');
  // sponsor: cases of linked farms
  const farmIds = new Set(visibleFarms(db, u).map((f) => f.id));
  return db.cases.filter((c) => farmIds.has(c.farm_id));
}

function visibleClaims(db: DB, u: Profile): Claim[] {
  if (u.role === 'admin' || u.role === 'county') return db.claims;
  if (u.role === 'farmer') return db.claims.filter((c) => c.requested_by === u.id);
  if (u.role === 'vet') {
    const myCaseIds = new Set(db.cases.filter((c) => c.assigned_vet_id === u.id).map((c) => c.id));
    return db.claims.filter((c) => myCaseIds.has(c.case_id));
  }
  // sponsor
  const sp = db.sponsors.find((s) => s.profile_id === u.id);
  return sp ? db.claims.filter((c) => c.sponsor_id === sp.id) : [];
}

// ===========================================================================
// DataClient
// ===========================================================================
export class DataClient {
  private db: DB;
  constructor() { this.db = loadDB(); }

  snapshot(): DB { return this.db; }
  private save() { persist(this.db); }

  // ---------- lookups ----------
  profileById(id: string) { return this.db.profiles.find((p) => p.id === id); }
  farmById(id: string) { return this.db.farms.find((f) => f.id === id); }
  animalById(id: string) { return this.db.animals.find((a) => a.id === id); }
  caseById(id: string) { return this.db.cases.find((c) => c.id === id); }
  caseByNumber(n: string) { return this.db.cases.find((c) => c.case_number === n); }
  claimById(id: string) { return this.db.claims.find((c) => c.id === id); }
  sponsorById(id: string) { return this.db.sponsors.find((s) => s.id === id); }
  sponsorForProfile(profileId: string) { return this.db.sponsors.find((s) => s.profile_id === profileId); }
  poolById(id: string) { return this.db.pools.find((p) => p.id === id); }
  vetProfiles() { return this.db.profiles.filter((p) => p.role === 'vet'); }
  auditFor(entityTable: string, entityId: string) {
    return this.db.audit.filter((a) => a.entity_table === entityTable && a.entity_id === entityId);
  }
  eventsFor(caseId: string) {
    return this.db.events.filter((e) => e.case_id === caseId).sort((a, b) => a.created_at.localeCompare(b.created_at));
  }
  treatmentsFor(caseId: string) {
    return this.db.treatments.filter((t) => t.case_id === caseId).sort((a, b) => b.administered_at.localeCompare(a.administered_at));
  }
  claimItems(claimId: string) {
    return this.db.claimItems.filter((i) => i.claim_id === claimId);
  }
  animalsForFarm(farmId: string) { return this.db.animals.filter((a) => a.farm_id === farmId); }
  casesForFarm(farmId: string) { return this.db.cases.filter((c) => c.farm_id === farmId); }
  notificationsFor(userId: string) {
    return this.db.notifications.filter((n) => n.user_id === userId).sort((a, b) => b.created_at.localeCompare(a.created_at));
  }
  farmsForUser(u: Profile) { return visibleFarms(this.db, u); }
  casesForUser(u: Profile) { return visibleCases(this.db, u); }
  claimsForUser(u: Profile) { return visibleClaims(this.db, u); }
  animalsForUser(u: Profile) {
    const farmIds = new Set(visibleFarms(this.db, u).map((f) => f.id));
    return isStaff(u.role) ? this.db.animals : this.db.animals.filter((a) => farmIds.has(a.farm_id));
  }
  membersForSponsor(sponsorProfileId: string) {
    const sp = this.db.sponsors.find((s) => s.profile_id === sponsorProfileId);
    if (!sp) return [];
    return this.db.sponsorMembers.filter((m) => m.sponsor_id === sp.id);
  }

  // ---------- audit ----------
  private auditWrite(u: Profile, action: string, table: string, entityId: string, before: unknown, after: unknown) {
    const entry: AuditLog = {
      id: uuid(), ts: new Date().toISOString(), actor_id: u.id, actor_role: u.role,
      action, entity_table: table, entity_id: entityId,
      before: (before ?? null) as AuditLog['before'],
      after: (after ?? null) as AuditLog['after'],
      ip: '127.0.0.1',
    };
    this.db.audit = [entry, ...this.db.audit];
    return entry;
  }

  private notify(userId: string, title: string, body: string, kind: AppNotification['kind']) {
    this.db.notifications = [
      { id: uuid(), user_id: userId, title, body, kind, read: false, sms_sent: true, created_at: new Date().toISOString() },
      ...this.db.notifications,
    ];
  }

  private caseEvent(u: Profile, caseId: string, event_type: CaseEvent['event_type'], body: string, meta: Record<string, unknown> | null = null) {
    this.db.events = [...this.db.events, {
      id: uuid(), case_id: caseId, actor_id: u.id, actor_role: u.role,
      event_type, body, meta, created_at: new Date().toISOString(),
    }];
  }

  // ---------- mutations ----------
  createDemoAccount(input: { full_name: string; phone: string; email?: string; role: 'farmer' | 'vet' }) {
    const profile: Profile = {
      id: uuid(),
      full_name: input.full_name.trim(),
      role: input.role,
      phone: input.phone.trim(),
      email: input.email?.trim().toLowerCase() || undefined,
      national_id: `DEMO-${uuid().slice(0, 8).toUpperCase()}`,
      county: 'Kisii',
      ward: '',
      organization: null,
      ...(input.role === 'vet' ? { specialty: 'Demo profile', available: false } : {}),
    };
    this.db.profiles = [profile, ...this.db.profiles];
    this.auditWrite(profile, 'account.demo_created', 'profiles', profile.id, null, {
      role: profile.role,
      email: profile.email ?? null,
    });
    this.save();
    return profile;
  }

  updateOwnDemoProfile(actor: Profile, updates: Pick<Profile, 'full_name' | 'phone' | 'email'>) {
    const before = this.profileById(actor.id);
    if (!before) return false;
    const updated: Profile = {
      ...before,
      full_name: updates.full_name.trim(),
      phone: updates.phone.trim(),
      email: updates.email?.trim().toLowerCase() || undefined,
    };
    this.db.profiles = this.db.profiles.map((profile) => profile.id === actor.id ? updated : profile);
    this.auditWrite(updated, 'account.demo_profile_updated', 'profiles', updated.id,
      { full_name: before.full_name, phone: before.phone, email: before.email ?? null },
      { full_name: updated.full_name, phone: updated.phone, email: updated.email ?? null });
    this.save();
    return true;
  }

  createFarm(actor: Profile, data: Omit<Farm, 'id' | 'created_at' | 'farm_code'> & { farm_code?: string }) {
    const seq = 100 + Math.floor(Math.random() * 900);
    const prefix = data.county === 'Nyamira' ? 'NYM' : 'KIS';
    const year = new Date().getFullYear();
    const farm: Farm = { ...data, id: uuid(), farm_code: data.farm_code ?? `${prefix}-${year}-${String(seq).padStart(4, '0')}`, created_at: new Date().toISOString() };
    this.db.farms = [farm, ...this.db.farms];
    this.auditWrite(actor, 'farm.created', 'farms', farm.id, null, { farm_code: farm.farm_code, name: farm.name, ward: farm.ward });
    this.save();
    return farm;
  }

  createAnimal(actor: Profile, data: Omit<Animal, 'id' | 'created_at'>) {
    const animal: Animal = { ...data, id: uuid(), created_at: new Date().toISOString() };
    this.db.animals = [animal, ...this.db.animals];
    const farm = this.farmById(animal.farm_id);
    if (farm) {
      this.db.farms = this.db.farms.map((f) => f.id === farm.id ? { ...f, herd_size: f.herd_size + 1 } : f);
    }
    this.auditWrite(actor, 'animal.created', 'animals', animal.id, null, { tag_number: animal.tag_number, breed: animal.breed, farm_id: animal.farm_id });
    this.save();
    return animal;
  }

  createCaseFromScreening(actor: Profile, input: {
    animal_id: string | null; farm_id: string; chief_complaint: string; symptoms: string[];
    ai_confidence: number | null; ai_differential: DiseaseCase['ai_differential'];
    priority: DiseaseCase['priority']; assigned_vet_id: string | null;
  }) {
    const farm = this.farmById(input.farm_id);
    const n = 2042 + this.db.cases.length;
    const now = new Date().toISOString();
    const c: DiseaseCase = {
      id: uuid(), case_number: `FS-${n}`,
      animal_id: input.animal_id ?? '', farm_id: input.farm_id,
      reported_by: actor.id, assigned_vet_id: input.assigned_vet_id,
      chief_complaint: input.chief_complaint, symptoms: input.symptoms,
      ai_confidence: input.ai_confidence, ai_differential: input.ai_differential,
      priority: input.priority,
      status: input.assigned_vet_id ? 'assigned' : 'submitted',
      diagnosis: null, outcome: null,
      ward: farm?.ward ?? '', county: farm?.county ?? 'Kisii',
      created_at: now, updated_at: now, closed_at: null,
    };
    this.db.cases = [c, ...this.db.cases];
    if (c.animal_id) this.db.animals = this.db.animals.map((a) => a.id === c.animal_id ? { ...a, status: 'under_treatment' } : a);
    this.caseEvent(actor, c.id, 'created', `Case logged via AI triage — ${input.chief_complaint}`, { priority: input.priority });
    if (input.assigned_vet_id) {
      const vet = this.profileById(input.assigned_vet_id);
      this.caseEvent(actor, c.id, 'assigned', `Assigned to ${vet?.full_name ?? 'on-duty vet'} (auto-matched on availability & proximity).`, { vet_id: input.assigned_vet_id });
      this.notify(input.assigned_vet_id, `New assignment: ${c.case_number}`, `${farm?.name ?? 'Farm'} — ${input.chief_complaint.slice(0, 110)}`, 'case');
    }
    this.notify(actor.id, `${c.case_number} logged`, 'Your case has been registered. A vet will review shortly.', 'case');
    // Also record the screening itself
    if (input.ai_differential) {
      const screening: AIScreening = {
        id: uuid(), farm_id: input.farm_id, animal_id: input.animal_id, performed_by: actor.id,
        symptoms: input.symptoms, engine: 'deterministic_rules', urgency: input.priority,
        differential: input.ai_differential, case_id: c.id, created_at: now,
      };
      this.db.screenings = [screening, ...this.db.screenings];
    }
    this.auditWrite(actor, 'case.created', 'disease_cases', c.id, null, { case_number: c.case_number, priority: c.priority, status: c.status });
    this.save();
    return c;
  }

  assignVet(actor: Profile, caseId: string, vetId: string) {
    const before = this.caseById(caseId);
    if (!before) return;
    const vet = this.profileById(vetId);
    this.db.cases = this.db.cases.map((c) => c.id === caseId ? { ...c, assigned_vet_id: vetId, status: c.status === 'submitted' || c.status === 'triaged' ? 'assigned' : c.status, updated_at: new Date().toISOString() } : c);
    this.caseEvent(actor, caseId, 'assigned', `Assigned to ${vet?.full_name ?? vetId} by ${actor.full_name}.`, { vet_id: vetId });
    this.notify(vetId, `New assignment: ${before.case_number}`, `${before.chief_complaint.slice(0, 110)}`, 'case');
    this.auditWrite(actor, 'case.assigned', 'disease_cases', caseId, { assigned_vet_id: before.assigned_vet_id, status: before.status }, { assigned_vet_id: vetId, status: 'assigned' });
    this.save();
  }

  setCaseStatus(actor: Profile, caseId: string, status: CaseStatus, note?: string) {
    const before = this.caseById(caseId);
    if (!before) return;
    const closed_at = (status === 'recovered' || status === 'deceased' || status === 'closed') ? new Date().toISOString() : before.closed_at;
    this.db.cases = this.db.cases.map((c) => c.id === caseId ? { ...c, status, closed_at, updated_at: new Date().toISOString() } : c);
    this.caseEvent(actor, caseId, status === 'recovered' ? 'recovered' : status === 'deceased' ? 'deceased' : 'status_change', note ?? `Status changed ${before.status} → ${status}`, { from: before.status, to: status });
    const farmerId = this.farmById(before.farm_id)?.owner_id;
    if (farmerId && farmerId !== actor.id) this.notify(farmerId, `${before.case_number} updated`, `Status is now “${status.replace(/_/g, ' ')}”.${note ? ` ${note}` : ''}`, 'case');
    this.auditWrite(actor, 'case.status_changed', 'disease_cases', caseId, { status: before.status }, { status, closed_at });
    this.save();
  }

  addCaseNote(actor: Profile, caseId: string, note: string) {
    this.caseEvent(actor, caseId, 'note', note);
    this.auditWrite(actor, 'case.note_added', 'case_events', caseId, null, { note: note.slice(0, 120) });
    this.save();
  }

  addTreatment(actor: Profile, caseId: string, t: Omit<Treatment, 'id' | 'case_id' | 'administered_by' | 'administered_at'>) {
    const treatment: Treatment = { ...t, id: uuid(), case_id: caseId, administered_by: actor.id, administered_at: new Date().toISOString() };
    this.db.treatments = [treatment, ...this.db.treatments];
    const kase = this.caseById(caseId);
    if (kase && (kase.status === 'assigned' || kase.status === 'triaged')) {
      this.db.cases = this.db.cases.map((c) => c.id === caseId ? { ...c, status: 'in_treatment', updated_at: new Date().toISOString() } : c);
      this.caseEvent(actor, caseId, 'status_change', 'Case moved to in-treatment after first administration.', { from: kase.status, to: 'in_treatment' });
    }
    this.caseEvent(actor, caseId, 'treatment', `${t.drug_name} — ${t.dosage} (${t.route}). ${t.notes ?? ''}`.trim(), { cost_kes: t.cost_kes });
    this.auditWrite(actor, 'treatment.logged', 'treatments', treatment.id, null, { case_id: caseId, drug: t.drug_name, cost_kes: t.cost_kes });
    const farmerId = kase ? this.farmById(kase.farm_id)?.owner_id : null;
    if (farmerId && farmerId !== actor.id) this.notify(farmerId, `Treatment logged — ${kase?.case_number}`, `${t.drug_name} administered. Withdrawal period: ${t.withdrawal_days} day(s).`, 'case');
    this.save();
    return treatment;
  }

  setClaimStatus(actor: Profile, claimId: string, status: ClaimStatus, extra?: { review_note?: string; vet_recommendation?: string }) {
    const before = this.claimById(claimId);
    if (!before) return;
    const now = new Date().toISOString();
    const patch: Partial<Claim> = { status, updated_at: now };
    if (status === 'submitted') patch.submitted_at = now;
    if (status === 'under_review' || status === 'approved' || status === 'rejected') { patch.reviewer_id = actor.id; patch.reviewed_at = now; }
    if (status === 'disbursed') {
      patch.disbursed_at = now;
      patch.disbursement_ref = `MOCK-MPESA-${Math.random().toString(36).slice(2, 10).toUpperCase()}${Date.now().toString(36).toUpperCase().slice(-4)}`;
    }
    if (extra?.review_note !== undefined) patch.review_note = extra.review_note;
    if (extra?.vet_recommendation !== undefined) patch.vet_recommendation = extra.vet_recommendation;

    this.db.claims = this.db.claims.map((c) => (c.id === claimId ? { ...c, ...patch } as Claim : c));
    const action = `claim.${{ submitted: 'submitted', under_review: 'moved_to_review', approved: 'approved', rejected: 'rejected', disbursed: 'disbursed', reconciled: 'reconciled', draft: 'withdrawn' }[status]}`;
    this.caseEvent(actor, before.case_id, 'claim_linked', `Claim ${before.claim_number} → ${status.replace(/_/g, ' ')}${extra?.review_note ? ` — “${extra.review_note.slice(0, 90)}”` : ''}`, { claim_id: claimId, status });
    this.auditWrite(actor, action, 'claims', claimId, { status: before.status }, { status, ...extra });

    // Pool accounting on disbursement
    if (status === 'disbursed' && before.pool_id) {
      this.db.pools = this.db.pools.map((p) => p.id === before.pool_id
        ? { ...p, disbursed_kes: p.disbursed_kes + before.amount_kes, committed_kes: Math.max(0, p.committed_kes - before.amount_kes) }
        : p);
      this.auditWrite(actor, 'pool.disbursed_updated', 'funding_pools', before.pool_id!, null, { disbursed_kes_delta: before.amount_kes });
    }
    // Notifications
    const farmerId = before.requested_by;
    if (farmerId !== actor.id) {
      const msg: Record<ClaimStatus, string> = {
        draft: `Claim ${before.claim_number} moved back to draft.`,
        submitted: `Claim ${before.claim_number} submitted to sponsor for review.`,
        under_review: `Claim ${before.claim_number} is under review by the sponsor.`,
        approved: `Claim ${before.claim_number} approved — KES ${before.amount_kes.toLocaleString()} queued for disbursement.`,
        rejected: `Claim ${before.claim_number} was rejected.${extra?.review_note ? ` Reason: ${extra.review_note}` : ''}`,
        disbursed: `Claim ${before.claim_number} disbursed via M-Pesa (Ref ${patch.disbursement_ref}).`,
        reconciled: `Claim ${before.claim_number} reconciled against pool statement.`,
      };
      this.notify(farmerId, `Claim update — ${before.claim_number}`, msg[status], 'claim');
    }
    this.save();
  }

  createClaim(actor: Profile, input: { case_id: string; sponsor_id: string; pool_id: string; items: Omit<ClaimLineItem, 'id' | 'claim_id'>[]; status: ClaimStatus }) {
    const kase = this.caseById(input.case_id);
    const farm = kase ? this.farmById(kase.farm_id) : undefined;
    const amount = input.items.reduce((s, i) => s + i.qty * i.unit_kes, 0);
    const n = 95 + this.db.claims.length;
    const now = new Date().toISOString();
    const claim: Claim = {
      id: uuid(), claim_number: `CLM-${String(n).padStart(4, '0')}`,
      case_id: input.case_id, farm_id: farm?.id ?? '', requested_by: actor.id,
      sponsor_id: input.sponsor_id, pool_id: input.pool_id, amount_kes: amount,
      status: input.status, vet_recommendation: null, reviewer_id: null, review_note: null,
      disbursement_ref: null, submitted_at: input.status === 'submitted' ? now : null, reviewed_at: null, disbursed_at: null,
      created_at: now, updated_at: now,
    };
    this.db.claims = [claim, ...this.db.claims];
    const items = input.items.map((i) => ({ ...i, id: uuid(), claim_id: claim.id }));
    this.db.claimItems = [...this.db.claimItems, ...items];
    if (input.pool_id) {
      this.db.pools = this.db.pools.map((p) => p.id === input.pool_id ? { ...p, committed_kes: p.committed_kes + amount } : p);
    }
    if (kase) this.caseEvent(actor, kase.id, 'claim_linked', `Claim ${claim.claim_number} (${input.status}) — KES ${amount.toLocaleString()} linked to ${kase.case_number}.`, { claim_id: claim.id });
    this.auditWrite(actor, 'claim.created', 'claims', claim.id, null, { claim_number: claim.claim_number, amount_kes: amount, status: input.status });
    this.save();
    return claim;
  }

  addClaimLineItem(actor: Profile, claimId: string, item: Omit<ClaimLineItem, 'id' | 'claim_id'>) {
    this.db.claimItems = [...this.db.claimItems, { ...item, id: uuid(), claim_id: claimId }];
    const claim = this.claimById(claimId);
    if (claim) {
      const total = this.claimItems(claimId).reduce((s, i) => s + i.qty * i.unit_kes, 0);
      this.db.claims = this.db.claims.map((c) => c.id === claimId ? { ...c, amount_kes: total, updated_at: new Date().toISOString() } : c);
    }
    this.auditWrite(actor, 'claim.line_item_added', 'claim_line_items', claimId, null, { description: item.description, total: item.qty * item.unit_kes });
    this.save();
  }

  upsertTickPlan(actor: Profile, farmId: string, data: Omit<TickControlPlan, 'id' | 'farm_id' | 'created_by'>) {
    const existing = this.db.tickPlans.find((p) => p.farm_id === farmId);
    if (existing) {
      this.db.tickPlans = this.db.tickPlans.map((p) => p.id === existing.id ? { ...p, ...data } : p);
      this.auditWrite(actor, 'tick_plan.updated', 'tick_control_plans', existing.id, existing as unknown as Record<string, unknown>, data as unknown as Record<string, unknown>);
      this.save();
      return existing.id;
    }
    const plan: TickControlPlan = { ...data, id: uuid(), farm_id: farmId, created_by: actor.id };
    this.db.tickPlans = [...this.db.tickPlans, plan];
    this.auditWrite(actor, 'tick_plan.created', 'tick_control_plans', plan.id, null, { farm_id: farmId, product: data.product });
    this.save();
    return plan.id;
  }

  markDipped(actor: Profile, farmId: string) {
    const plan = this.db.tickPlans.find((p) => p.farm_id === farmId);
    if (!plan) return;
    const next = new Date();
    next.setDate(next.getDate() + plan.interval_days);
    const nextDip = next.toISOString().slice(0, 10);
    this.db.tickPlans = this.db.tickPlans.map((p) => p.id === plan.id
      ? { ...p, last_dip_date: new Date().toISOString().slice(0, 10), next_dip_date: nextDip }
      : p);
    this.auditWrite(actor, 'tick_plan.dip_recorded', 'tick_control_plans', plan.id, { last_dip_date: plan.last_dip_date }, { last_dip_date: daysFromNow(0), next_dip_date: nextDip });
    this.save();
  }

  acknowledgeAlert(actor: Profile, alertId: string, status: 'acknowledged' | 'contained' | 'resolved') {
    const before = this.db.alerts.find((a) => a.id === alertId);
    if (!before) return;
    this.db.alerts = this.db.alerts.map((a) => a.id === alertId ? {
      ...a, status,
      acknowledged_by: actor.id, acknowledged_at: new Date().toISOString(),
    } : a);
    this.auditWrite(actor, `alert.${status}`, 'disease_alerts', alertId, { status: before.status }, { status, acknowledged_by: actor.id });
    this.save();
  }

  markNotificationsRead(userId: string, ids?: string[]) {
    this.db.notifications = this.db.notifications.map((n) =>
      n.user_id === userId && (!ids || ids.includes(n.id)) ? { ...n, read: true } : n);
    this.save();
  }

  setVeterinarianAvailability(actor: Profile, vetId: string, available: boolean) {
    this.db.profiles = this.db.profiles.map((p) => p.id === vetId ? { ...p, available } : p);
    this.auditWrite(actor, 'vet.availability_changed', 'profiles', vetId, null, { available });
    this.save();
  }

  updateProfileRole(actor: Profile, profileId: string, role: Role) {
    const before = this.profileById(profileId);
    this.db.profiles = this.db.profiles.map((p) => p.id === profileId ? { ...p, role } : p);
    this.auditWrite(actor, 'rbac.role_changed', 'profiles', profileId, { role: before?.role }, { role });
    this.save();
  }

  sponsorCoverageFor(farmerId: string) {
    const member = this.db.sponsorMembers.find((m) => m.farmer_id === farmerId);
    if (!member) return undefined;
    const sp = this.db.sponsors.find((s) => s.id === member.sponsor_id);
    return { member, sponsor: sp };
  }

  poolsForSponsorProfile(profileId: string) {
    const sp = this.db.sponsors.find((s) => s.profile_id === profileId);
    return sp ? this.db.pools.filter((p) => p.sponsor_id === sp.id) : [];
  }

  screeningsForUser(u: Profile) {
    if (isStaff(u.role)) return this.db.screenings;
    return this.db.screenings.filter((s) => s.performed_by === u.id);
  }

  alertsAll() { return [...this.db.alerts].sort((a, b) => severityRank(b.severity) - severityRank(a.severity) || b.created_at.localeCompare(a.created_at)); }
  auditAll() { return this.db.audit; }
}

const severityRank = (s: DiseaseAlert['severity']) => ({ info: 0, watch: 1, alert: 2, critical: 3 }[s]);

/** Singleton client factory with listener support for cross-tab style refresh */
let client: DataClient | null = null;
export function dataClient(): DataClient {
  if (!client) client = new DataClient();
  return client;
}
export function refreshClient() { client = new DataClient(); }
