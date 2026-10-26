/* ==========================================================================
   GLHIS Live Store — client-side domain engine
   Mirrors the Supabase/Postgres design in /schema.sql: the same tables,
   relations, RBAC and audit semantics, persisted to localStorage so the
   whole cross-role workflow survives reloads. Offline-first via outbox.
   ========================================================================== */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type {
  Profile, VetProfile, Farm, Animal, VetCase, CaseEvent, ClinicalRecord, Treatment,
  Claim, SponsorAgreement, SponsorEnrollment, Alert, TickControlPlan, Vaccination,
  AuditLog, AppNotification, Role, CaseStatus, CasePriority,
} from './types';
import {
  seedProfiles, seedVetProfiles, seedFarms, seedAnimals, seedCases, seedClinicalRecords,
  seedTreatments, seedClaims, seedAgreements, seedEnrollments, seedAlerts, seedTickPlans,
  seedVaccinations, seedAuditLogs, seedNotifications, DEMO_IDS,
} from './types';

export interface DB {
  profiles: Profile[];
  vetProfiles: VetProfile[];
  farms: Farm[];
  animals: Animal[];
  cases: VetCase[];
  caseEvents: CaseEvent[];
  clinicalRecords: ClinicalRecord[];
  treatments: Treatment[];
  claims: Claim[];
  agreements: SponsorAgreement[];
  enrollments: SponsorEnrollment[];
  alerts: Alert[];
  tickPlans: TickControlPlan[];
  vaccinations: Vaccination[];
  auditLogs: AuditLog[];
  notifications: AppNotification[];
}

export interface OutboxItem {
  id: string;
  label: string;
  created_at: string;
}

export interface Toast {
  id: number;
  kind: 'success' | 'info' | 'warning' | 'error';
  title: string;
  body?: string;
}

const seedDB = (): DB => ({
  profiles: seedProfiles.map((x) => ({ ...x })),
  vetProfiles: seedVetProfiles.map((x) => ({ ...x })),
  farms: seedFarms.map((x) => ({ ...x })),
  animals: seedAnimals.map((x) => ({ ...x })),
  cases: seedCases.map((x) => ({ ...x })),
  caseEvents: seedCases.map((x, i) => ([
    { id: `ev-${i}-1`, case_id: x.id, actor_id: x.farmer_id, actor_name: seedProfiles.find(p => p.id === x.farmer_id)?.full_name ?? 'Farmer', event: 'CASE_REPORTED', detail: `Symptoms: ${x.symptoms.join(', ')}. Triage urgency ${x.triage_urgency}/100.`, created_at: x.reported_at },
    ...(x.vet_id ? [{ id: `ev-${i}-2`, case_id: x.id, actor_id: x.vet_id, actor_name: seedProfiles.find(p => p.id === x.vet_id)?.full_name ?? 'Vet', event: 'VET_ASSIGNED', detail: `Assigned to ${seedProfiles.find(p => p.id === x.vet_id)?.full_name}.`, created_at: x.assigned_at ?? x.reported_at }] : []),
    ...(x.resolved_at ? [{ id: `ev-${i}-3`, case_id: x.id, actor_id: x.vet_id ?? x.farmer_id, actor_name: seedProfiles.find(p => p.id === (x.vet_id ?? x.farmer_id))?.full_name ?? 'System', event: 'CASE_RESOLVED', detail: x.triage_summary, created_at: x.resolved_at }] : []),
  ])).flat(),
  clinicalRecords: seedClinicalRecords.map((x) => ({ ...x })),
  treatments: seedTreatments.map((x) => ({ ...x })),
  claims: seedClaims.map((x) => ({ ...x })),
  agreements: seedAgreements.map((x) => ({ ...x })),
  enrollments: seedEnrollments.map((x) => ({ ...x })),
  alerts: seedAlerts.map((x) => ({ ...x })),
  tickPlans: seedTickPlans.map((x) => ({ ...x })),
  vaccinations: seedVaccinations.map((x) => ({ ...x })),
  auditLogs: seedAuditLogs.map((x) => ({ ...x })),
  notifications: seedNotifications.map((x) => ({ ...x })),
});

const DB_KEY = 'glhis-db-v1';
const SESSION_KEY = 'glhis-session-v1';
const OUTBOX_KEY = 'glhis-outbox-v1';
const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36);
const now = () => new Date().toISOString();

function loadDB(): DB {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) return JSON.parse(raw) as DB;
  } catch { /* fall through to seed */ }
  return seedDB();
}

interface StoreCtx {
  db: DB;
  currentUser: Profile | null;
  login: (userId: string) => void;
  logout: () => void;
  resetDemoData: () => void;
  offline: boolean;
  toggleOffline: () => void;
  outbox: OutboxItem[];
  syncNow: () => void;
  toasts: Toast[];
  toast: (kind: Toast['kind'], title: string, body?: string) => void;
  dismissToast: (id: number) => void;
  /* domain actions */
  reportCase: (input: { farm_id: string; animal_id: string; symptoms: string[]; triage_urgency: number; triage_summary: string; suspected_dx: string; priority: CasePriority }) => VetCase;
  assignVet: (caseId: string, vetId: string) => void;
  cancelCase: (caseId: string) => void;
  acceptCase: (caseId: string) => void;
  declineCase: (caseId: string) => void;
  resolveCase: (caseId: string) => void;
  escalateCase: (caseId: string, reason: string) => void;
  addClinicalRecord: (caseId: string, data: { examination: string; diagnosis: string; temperature_c: number; heart_rate: number }) => void;
  addTreatment: (caseId: string, data: { drug: string; dose: string; route: string; duration_days: number; cost_kes: number }) => void;
  submitClaim: (caseId: string, amount_kes: number, services: string) => Claim | null;
  reviewClaim: (claimId: string) => void;
  decideClaim: (claimId: string, decision: 'approved' | 'rejected', reason: string) => void;
  payClaim: (claimId: string) => void;
  addFarm: (data: Omit<Farm, 'id'>) => void;
  updateFarm: (id: string, data: Partial<Farm>) => void;
  deleteFarm: (id: string) => void;
  addAnimal: (data: Omit<Animal, 'id'>) => void;
  updateAnimal: (id: string, data: Partial<Animal>) => void;
  markVaccinationComplete: (id: string) => void;
  updateTickCompliance: (id: string, pct: number) => void;
  enrollWithCode: (code: string) => { ok: boolean; message: string };
  sponsorCreateAgreement: (data: Omit<SponsorAgreement, 'id' | 'sponsor_profile_id' | 'enrollment_code' | 'status'>) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  adminVerifyVet: (profileId: string, approve: boolean) => void;
  adminApproveAgreement: (agreementId: string) => void;
  adminSuspendProfile: (profileId: string, suspend: boolean) => void;
  /* derived helpers */
  profileById: (id: string | null | undefined) => Profile | undefined;
  vetProfileById: (id: string) => VetProfile | undefined;
  farmById: (id: string) => Farm | undefined;
  animalById: (id: string) => Animal | undefined;
  caseById: (id: string) => VetCase | undefined;
  coverageFor: (farmerId: string) => { covered: boolean; agreement?: SponsorAgreement; enrollment?: SponsorEnrollment; remainingAnnual: number; maxClaim: number; sponsorName: string };
  claimForCase: (caseId: string) => Claim | undefined;
}

const Ctx = createContext<StoreCtx | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [db, setDb] = useState<DB>(() => loadDB());
  const [currentUserId, setCurrentUserId] = useState<string | null>(() => {
    try { return localStorage.getItem(SESSION_KEY); } catch { return null; }
  });
  const [offline, setOffline] = useState(false);
  const [outbox, setOutbox] = useState<OutboxItem[]>(() => {
    try { return JSON.parse(localStorage.getItem(OUTBOX_KEY) ?? '[]'); } catch { return []; }
  });
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => { try { localStorage.setItem(DB_KEY, JSON.stringify(db)); } catch { /* quota */ } }, [db]);
  useEffect(() => {
    try {
      if (currentUserId) localStorage.setItem(SESSION_KEY, currentUserId); else localStorage.removeItem(SESSION_KEY);
    } catch { /* ignore */ }
  }, [currentUserId]);
  useEffect(() => { try { localStorage.setItem(OUTBOX_KEY, JSON.stringify(outbox)); } catch { /* ignore */ } }, [outbox]);

  const dismissToast = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const toast = useCallback((kind: Toast['kind'], title: string, body?: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-2), { id, kind, title, body }]);
    window.setTimeout(() => dismissToast(id), 5200);
  }, [dismissToast]);

  const currentUser = useMemo(() => db.profiles.find((p) => p.id === currentUserId) ?? null, [db.profiles, currentUserId]);

  const addAudit = useCallback((d: DB, action: string, entity: string, entityId: string, diff: string, actor?: Profile | null) => {
    const a = actor ?? db.profiles.find((p) => p.id === currentUserId) ?? null;
    const entry: AuditLog = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      actor_id: a?.id ?? 'system',
      actor_role: (a?.role ?? 'admin') as Role,
      actor_name: a?.full_name ?? 'GLHIS System',
      action, entity, entity_id: entityId, created_at: now(), diff,
    };
    return { ...d, auditLogs: [entry, ...d.auditLogs] };
  }, [db.profiles, currentUserId]);

  const notify = useCallback((d: DB, profile_id: string, kind: AppNotification['kind'], title: string, body: string, link?: string): DB => ({
    ...d,
    notifications: [{ id: uid(), profile_id, kind, title, body, read: false, created_at: now(), link }, ...d.notifications],
  }), []);

  /** All mutations flow through here → outbox capture when offline */
  const mutate = useCallback((label: string, fn: (d: DB) => DB) => {
    setDb((prev) => fn(prev));
    if (offline) {
      setOutbox((q) => [...q, { id: uid(), label, created_at: now() }]);
      toast('warning', 'Saved offline', `${label} — queued in outbox. Will sync when back online.`);
    }
  }, [offline, toast]);

  const addEvent = useCallback((d: DB, caseId: string, event: string, detail: string, actorName: string, actorId: string): DB => ({
    ...d,
    caseEvents: [...d.caseEvents, { id: uid(), case_id: caseId, actor_id: actorId, actor_name: actorName, event, detail, created_at: now() }],
  }), []);

  /* ------------------------------- auth -------------------------------- */
  const login = useCallback((userId: string) => { setCurrentUserId(userId); }, []);
  const logout = useCallback(() => setCurrentUserId(null), []);
  const resetDemoData = useCallback(() => {
    localStorage.removeItem(DB_KEY);
    setDb(seedDB());
    setOutbox([]);
    toast('info', 'Demo data restored', 'All records were reset to the synthetic seed dataset.');
  }, [toast]);

  /* ------------------------------ offline ------------------------------- */
  const toggleOffline = useCallback(() => {
    setOffline((o) => {
      const next = !o;
      if (!next && outbox.length > 0) {
        // replay: everything was applied in-memory; commit audit trail of sync
        setDb((prev) => addAudit({ ...prev, notifications: prev.notifications }, 'OFFLINE_SYNC', 'outbox', `${outbox.length} item(s)`, outbox.map((o2) => o2.label).join(' · ')));
        setOutbox([]);
        toast('success', 'Back online — synced', `${outbox.length} queued change(s) merged and audited.`);
      } else {
        toast(next ? 'warning' : 'success', next ? 'Offline mode ON' : 'Back online', next ? 'Mutations will be queued in the outbox.' : 'Live sync resumed.');
      }
      return next;
    });
  }, [outbox, toast, addAudit]);

  const syncNow = useCallback(() => {
    if (outbox.length === 0) { toast('info', 'Outbox empty', 'Nothing pending to synchronize.'); return; }
    setDb((prev) => addAudit(prev, 'OFFLINE_SYNC', 'outbox', `${outbox.length} item(s)`, outbox.map((o2) => o2.label).join(' · ')));
    setOutbox([]);
    toast('success', 'Synchronized', `${outbox.length} queued change(s) merged and audited.`);
  }, [outbox, toast, addAudit]);

  /* ------------------------------ cases --------------------------------- */
  const reportCase: StoreCtx['reportCase'] = useCallback((input) => {
    const me = db.profiles.find((p) => p.id === currentUserId)!;
    const farm = db.farms.find((f) => f.id === input.farm_id)!;
    const num = 150 + Math.floor(Math.random() * 850);
    const newCase: VetCase = {
      id: uid(),
      case_number: `GLH-2026-${String(num).padStart(4, '0')}`,
      farm_id: farm.id, animal_id: input.animal_id, farmer_id: me.id,
      vet_id: null, sponsor_id: null,
      symptoms: input.symptoms, triage_urgency: input.triage_urgency, triage_summary: input.triage_summary,
      suspected_dx: input.suspected_dx, priority: input.priority, status: 'pending_vet',
      reported_at: now(), assigned_at: null, resolved_at: null,
      farmer_lat: farm.lat, farmer_lng: farm.lng,
    };
    mutate(`Case ${newCase.case_number} reported`, (d0) => {
      let d = { ...d0, cases: [newCase, ...d0.cases] };
      d = addEvent(d, newCase.id, 'CASE_REPORTED', `Suspected: ${input.suspected_dx}. Urgency ${input.triage_urgency}/100.`, me.full_name, me.id);
      d = notify(d, me.id, 'case', `Case ${newCase.case_number} created`, 'Find a verified vet and assign them to this case.', '/app/cases');
      d = addAudit(d, 'CASE_REPORTED', 'cases', newCase.case_number, `triage ${input.triage_urgency}/100 — ${input.suspected_dx}`, me);
      return d;
    });
    toast('success', 'Case reported', `${newCase.case_number} — ${input.suspected_dx}`);
    return newCase;
  }, [db.profiles, db.farms, currentUserId, mutate, addEvent, notify, addAudit, toast]);

  const assignVet = useCallback((caseId: string, vetId: string) => {
    const vet = db.profiles.find((p) => p.id === vetId)!;
    const me = db.profiles.find((p) => p.id === currentUserId)!;
    const c = db.cases.find((x) => x.id === caseId)!;
    mutate(`Vet assigned to ${c.case_number}`, (d0) => {
      let d = { ...d0, cases: d0.cases.map((x) => x.id === caseId ? { ...x, vet_id: vetId, status: 'vet_assigned' as CaseStatus, assigned_at: now() } : x) };
      d = addEvent(d, caseId, 'VET_ASSIGNED', `Assigned to ${vet.full_name}`, me.full_name, me.id);
      d = notify(d, vetId, 'case', `New assignment — ${c.case_number}`, `${c.suspected_dx} · urgency ${c.triage_urgency}/100. Farmer: ${me.full_name}.`, '/app/cases');
      d = addAudit(d, 'VET_ASSIGNED', 'cases', c.case_number, `vet=${vet.full_name}`, me);
      return d;
    });
    toast('success', 'Vet notified', `${vet.full_name} has been assigned to ${c.case_number}.`);
  }, [db.profiles, db.cases, currentUserId, mutate, addEvent, notify, addAudit, toast]);

  const cancelCase = useCallback((caseId: string) => {
    const me = db.profiles.find((p) => p.id === currentUserId)!;
    const c = db.cases.find((x) => x.id === caseId)!;
    mutate(`Case ${c.case_number} cancelled`, (d0) => {
      let d = { ...d0, cases: d0.cases.map((x) => x.id === caseId ? { ...x, status: 'cancelled' as CaseStatus } : x) };
      d = addEvent(d, caseId, 'CASE_CANCELLED', 'Cancelled by reporter', me.full_name, me.id);
      d = addAudit(d, 'CASE_CANCELLED', 'cases', c.case_number, 'cancelled', me);
      return d;
    });
    toast('info', 'Case cancelled', c.case_number);
  }, [db.profiles, db.cases, currentUserId, mutate, addEvent, addAudit, toast]);

  const acceptCase = useCallback((caseId: string) => {
    const me = db.profiles.find((p) => p.id === currentUserId)!;
    const c = db.cases.find((x) => x.id === caseId)!;
    mutate(`${c.case_number} accepted`, (d0) => {
      let d = { ...d0, cases: d0.cases.map((x) => x.id === caseId ? { ...x, status: 'in_treatment' as CaseStatus } : x) };
      d = addEvent(d, caseId, 'CASE_ACCEPTED', 'Vet accepted the case — farm visit underway', me.full_name, me.id);
      d = notify(d, c.farmer_id, 'case', `${me.full_name} is on the way`, `${c.case_number} — treatment started.`, '/app/cases');
      d = addAudit(d, 'CASE_ACCEPTED', 'cases', c.case_number, 'vet_assigned → in_treatment', me);
      return d;
    });
    toast('success', 'Case accepted', `${c.case_number} is now in treatment.`);
  }, [db.profiles, db.cases, currentUserId, mutate, addEvent, notify, addAudit, toast]);

  const declineCase = useCallback((caseId: string) => {
    const me = db.profiles.find((p) => p.id === currentUserId)!;
    const c = db.cases.find((x) => x.id === caseId)!;
    mutate(`${c.case_number} declined`, (d0) => {
      let d = { ...d0, cases: d0.cases.map((x) => x.id === caseId ? { ...x, vet_id: null, status: 'pending_vet' as CaseStatus, assigned_at: null } : x) };
      d = addEvent(d, caseId, 'CASE_DECLINED', `${me.full_name} declined — awaiting reassignment`, me.full_name, me.id);
      d = notify(d, c.farmer_id, 'case', `${c.case_number} — vet unavailable`, 'Please assign another verified vet.', '/app/find-vet');
      d = addAudit(d, 'CASE_DECLINED', 'cases', c.case_number, 'vet_assigned → pending_vet', me);
      return d;
    });
    toast('info', 'Case declined', 'Farmer has been asked to pick another vet.');
  }, [db.profiles, db.cases, currentUserId, mutate, addEvent, notify, addAudit, toast]);

  const resolveCase = useCallback((caseId: string) => {
    const me = db.profiles.find((p) => p.id === currentUserId)!;
    const c = db.cases.find((x) => x.id === caseId)!;
    mutate(`${c.case_number} resolved`, (d0) => {
      let d = { ...d0, cases: d0.cases.map((x) => x.id === caseId ? { ...x, status: 'resolved' as CaseStatus, resolved_at: now() } : x) };
      d = addEvent(d, caseId, 'CASE_RESOLVED', 'Clinical outcome: recovered / stable', me.full_name, me.id);
      d = notify(d, c.farmer_id, 'case', `${c.case_number} resolved`, 'Your vet closed the case. A claim can now be submitted.', '/app/cases');
      d = addAudit(d, 'CASE_RESOLVED', 'cases', c.case_number, 'in_treatment → resolved', me);
      return d;
    });
    toast('success', 'Case resolved', `${c.case_number} — ready for claim submission.`);
  }, [db.profiles, db.cases, currentUserId, mutate, addEvent, notify, addAudit, toast]);

  const escalateCase = useCallback((caseId: string, reason: string) => {
    const me = db.profiles.find((p) => p.id === currentUserId)!;
    const c = db.cases.find((x) => x.id === caseId)!;
    mutate(`${c.case_number} escalated`, (d0) => {
      let d = { ...d0, cases: d0.cases.map((x) => x.id === caseId ? { ...x, status: 'escalated' as CaseStatus } : x) };
      d = addEvent(d, caseId, 'CASE_ESCALATED', reason, me.full_name, me.id);
      const authority = d0.profiles.find((p) => p.role === 'authority');
      if (authority) d = notify(d, authority.id, 'alert', `Escalation — ${c.case_number}`, reason, '/app/surveillance');
      d = addAudit(d, 'CASE_ESCALATED', 'cases', c.case_number, reason, me);
      return d;
    });
    toast('warning', 'Case escalated', reason);
  }, [db.profiles, db.cases, currentUserId, mutate, addEvent, notify, addAudit, toast]);

  /* --------------------------- clinical data ---------------------------- */
  const addClinicalRecord = useCallback((caseId: string, data: { examination: string; diagnosis: string; temperature_c: number; heart_rate: number }) => {
    const me = db.profiles.find((p) => p.id === currentUserId)!;
    const c = db.cases.find((x) => x.id === caseId)!;
    mutate(`Clinical record on ${c.case_number}`, (d0) => {
      let d = { ...d0, clinicalRecords: [...d0.clinicalRecords, { id: uid(), case_id: caseId, vet_id: me.id, created_at: now(), ...data }] };
      d = addEvent(d, caseId, 'CLINICAL_RECORD', `Dx: ${data.diagnosis} · T ${data.temperature_c}°C · HR ${data.heart_rate}`, me.full_name, me.id);
      d = addAudit(d, 'CLINICAL_RECORD_ADDED', 'clinical_records', c.case_number, data.diagnosis, me);
      return d;
    });
    toast('success', 'Clinical record saved', data.diagnosis);
  }, [db.profiles, db.cases, currentUserId, mutate, addEvent, addAudit, toast]);

  const addTreatment = useCallback((caseId: string, data: { drug: string; dose: string; route: string; duration_days: number; cost_kes: number }) => {
    const me = db.profiles.find((p) => p.id === currentUserId)!;
    const c = db.cases.find((x) => x.id === caseId)!;
    mutate(`Treatment logged on ${c.case_number}`, (d0) => {
      let d = { ...d0, treatments: [...d0.treatments, { id: uid(), case_id: caseId, administered_at: now(), ...data }] };
      d = addEvent(d, caseId, 'TREATMENT_LOGGED', `${data.drug} · ${data.dose} · ${data.route} · ${data.duration_days}d`, me.full_name, me.id);
      d = addAudit(d, 'TREATMENT_LOGGED', 'treatments', c.case_number, data.drug, me);
      return d;
    });
    toast('success', 'Treatment recorded', data.drug);
  }, [db.profiles, db.cases, currentUserId, mutate, addEvent, addAudit, toast]);

  /* ------------------------------- claims ------------------------------- */
  const submitClaim: StoreCtx['submitClaim'] = useCallback((caseId, amount_kes, services) => {
    const me = db.profiles.find((p) => p.id === currentUserId)!;
    const c = db.cases.find((x) => x.id === caseId)!;
    const cov = coverageForRef.current(c.farmer_id);
    // link sponsor via farmer coverage
    const agreement = cov.agreement;
    const sponsorId = agreement?.sponsor_profile_id ?? db.agreements.find((a) => a.status === 'active')?.sponsor_profile_id ?? DEMO_IDS.sponsorMain;
    const claim: Claim = {
      id: uid(),
      claim_number: `CLM-2026-${String(43 + Math.floor(Math.random() * 50)).padStart(4, '0')}`,
      case_id: caseId, vet_id: me.id, sponsor_id: sponsorId,
      amount_kes, services, status: 'submitted',
      submitted_at: now(), decided_at: null, decided_by: null, decision_reason: null,
    };
    mutate(`Claim ${claim.claim_number} submitted`, (d0) => {
      let d = { ...d0, claims: [claim, ...d0.claims], cases: d0.cases.map((x) => x.id === caseId ? { ...x, status: 'claim_submitted' as CaseStatus, sponsor_id: sponsorId } : x) };
      d = addEvent(d, caseId, 'CLAIM_SUBMITTED', `${claim.claim_number} — KES ${amount_kes.toLocaleString()} to ${agreement?.sponsor_name ?? 'sponsor'}`, me.full_name, me.id);
      const sponsorProfile = d0.profiles.find((p) => p.id === sponsorId);
      if (sponsorProfile) d = notify(d, sponsorId, 'claim', `New claim — ${claim.claim_number}`, `${services} · KES ${amount_kes.toLocaleString()}`, '/app/claims');
      d = addAudit(d, 'CLAIM_SUBMITTED', 'claims', claim.claim_number, `amount=${amount_kes}`, me);
      return d;
    });
    toast('success', 'Claim submitted', `${claim.claim_number} — awaiting sponsor review.`);
    return claim;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db.profiles, db.cases, db.agreements, currentUserId, mutate, addEvent, notify, addAudit, toast]);

  const reviewClaim = useCallback((claimId: string) => {
    const me = db.profiles.find((p) => p.id === currentUserId)!;
    mutate('Claim moved to review', (d0) => {
      const cl = d0.claims.find((x) => x.id === claimId)!;
      let d = { ...d0, claims: d0.claims.map((x) => x.id === claimId ? { ...x, status: 'under_review' as const } : x), cases: d0.cases.map((x) => x.id === cl.case_id ? { ...x, status: 'claim_under_review' as CaseStatus } : x) };
      d = addEvent(d, cl.case_id, 'CLAIM_UNDER_REVIEW', `${cl.claim_number} under review`, me.full_name, me.id);
      d = addAudit(d, 'CLAIM_MOVED_TO_REVIEW', 'claims', cl.claim_number, 'submitted → under_review', me);
      return d;
    });
    toast('info', 'Under review', 'Claim is now marked under review.');
  }, [db.profiles, currentUserId, mutate, addEvent, addAudit, toast]);

  const decideClaim = useCallback((claimId: string, decision: 'approved' | 'rejected', reason: string) => {
    const me = db.profiles.find((p) => p.id === currentUserId)!;
    mutate(decision === 'approved' ? 'Claim approved' : 'Claim rejected', (d0) => {
      const cl = d0.claims.find((x) => x.id === claimId)!;
      let d = { ...d0, claims: d0.claims.map((x) => x.id === claimId ? { ...x, status: decision, decided_at: now(), decided_by: me.id, decision_reason: reason } : x) };
      d = { ...d, cases: d.cases.map((x) => x.id === cl.case_id ? { ...x, status: (decision === 'approved' ? 'claim_approved' : 'claim_rejected') as CaseStatus } : x) };
      // debit farmer coverage on approval
      if (decision === 'approved') {
        const c = d.cases.find((x) => x.id === cl.case_id)!;
        d = { ...d, enrollments: d.enrollments.map((e) => {
          const agreement = d.agreements.find((a) => a.id === e.agreement_id);
          if (e.farmer_profile_id === c.farmer_id && agreement?.sponsor_profile_id === cl.sponsor_id) {
            return { ...e, used_to_date_kes: e.used_to_date_kes + cl.amount_kes };
          }
          return e;
        }) };
      }
      d = addEvent(d, cl.case_id, decision === 'approved' ? 'CLAIM_APPROVED' : 'CLAIM_REJECTED', `${cl.claim_number}: ${reason}`, me.full_name, me.id);
      const c = d.cases.find((x) => x.id === cl.case_id)!;
      const vet = d0.profiles.find((p) => p.id === cl.vet_id);
      if (vet) d = notify(d, cl.vet_id, 'claim', decision === 'approved' ? `${cl.claim_number} approved` : `${cl.claim_number} rejected`, reason, '/app/claims');
      d = notify(d, c.farmer_id, 'claim', decision === 'approved' ? 'Claim approved' : 'Claim rejected', `${cl.claim_number} — ${reason}`, '/app/claims');
      d = addAudit(d, decision === 'approved' ? 'CLAIM_APPROVED' : 'CLAIM_REJECTED', 'claims', cl.claim_number, reason, me);
      return d;
    });
    toast(decision === 'approved' ? 'success' : 'warning', decision === 'approved' ? 'Claim approved' : 'Claim rejected', reason);
  }, [db.profiles, currentUserId, mutate, addEvent, notify, addAudit, toast]);

  const payClaim = useCallback((claimId: string) => {
    const me = db.profiles.find((p) => p.id === currentUserId)!;
    mutate('Claim paid', (d0) => {
      const cl = d0.claims.find((x) => x.id === claimId)!;
      let d = { ...d0, claims: d0.claims.map((x) => x.id === claimId ? { ...x, status: 'paid' as const } : x), cases: d0.cases.map((x) => x.id === cl.case_id ? { ...x, status: 'claim_paid' as CaseStatus } : x) };
      d = addEvent(d, cl.case_id, 'CLAIM_PAID', `${cl.claim_number} paid — KES ${cl.amount_kes.toLocaleString()} via sponsor settlement`, me.full_name, me.id);
      const c = d.cases.find((x) => x.id === cl.case_id)!;
      d = notify(d, c.farmer_id, 'claim', 'Claim paid', `${cl.claim_number} — KES ${cl.amount_kes.toLocaleString()} settled by sponsor.`, '/app/claims');
      d = addAudit(d, 'CLAIM_PAID', 'claims', cl.claim_number, `KES ${cl.amount_kes}`, me);
      return d;
    });
    toast('success', 'Payment recorded', 'Claim marked as paid and audit trail updated.');
  }, [db.profiles, currentUserId, mutate, addEvent, notify, addAudit, toast]);

  /* --------------------------- registry CRUD ---------------------------- */
  const addFarm = useCallback((data: Omit<Farm, 'id'>) => {
    mutate(`Farm "${data.name}" added`, (d0) => addAudit({ ...d0, farms: [{ ...data, id: uid() }, ...d0.farms] }, 'FARM_ADDED', 'farms', data.name, `${data.ward} · ${data.hectares} ha`));
    toast('success', 'Farm added', data.name);
  }, [mutate, addAudit, toast]);

  const updateFarm = useCallback((id: string, data: Partial<Farm>) => {
    mutate('Farm updated', (d0) => addAudit({ ...d0, farms: d0.farms.map((f) => (f.id === id ? { ...f, ...data } : f)) }, 'FARM_UPDATED', 'farms', id, JSON.stringify(data)));
    toast('success', 'Farm updated');
  }, [mutate, addAudit, toast]);

  const deleteFarm = useCallback((id: string) => {
    mutate('Farm removed', (d0) => {
      const animalIds = new Set(d0.animals.filter((a) => a.farm_id === id).map((a) => a.id));
      return addAudit({
        ...d0,
        farms: d0.farms.filter((f) => f.id !== id),
        animals: d0.animals.filter((a) => a.farm_id !== id),
        vaccinations: d0.vaccinations.filter((v) => !animalIds.has(v.animal_id)),
      }, 'FARM_DELETED', 'farms', id, 'farm + animals removed');
    });
    toast('info', 'Farm removed');
  }, [mutate, addAudit, toast]);

  const addAnimal = useCallback((data: Omit<Animal, 'id'>) => {
    mutate(`Animal ${data.tag_number} added`, (d0) => addAudit({ ...d0, animals: [{ ...data, id: uid() }, ...d0.animals] }, 'ANIMAL_ADDED', 'animals', data.tag_number, `${data.breed} · ${data.sex}`));
    toast('success', 'Animal registered', `${data.tag_number} — ${data.breed}`);
  }, [mutate, addAudit, toast]);

  const updateAnimal = useCallback((id: string, data: Partial<Animal>) => {
    mutate('Animal updated', (d0) => addAudit({ ...d0, animals: d0.animals.map((a) => (a.id === id ? { ...a, ...data } : a)) }, 'ANIMAL_UPDATED', 'animals', id, JSON.stringify(data)));
    toast('success', 'Animal updated');
  }, [mutate, addAudit, toast]);

  /* ----------------------- prevention & enrollment ---------------------- */
  const markVaccinationComplete = useCallback((id: string) => {
    mutate('Vaccination administered', (d0) => addAudit({
      ...d0,
      vaccinations: d0.vaccinations.map((v) => (v.id === id ? { ...v, administered_date: now().slice(0, 10), status: 'complete' as const } : v)),
    }, 'VACCINATION_COMPLETE', 'vaccinations', id, 'administered today'));
    toast('success', 'Vaccination recorded');
  }, [mutate, addAudit, toast]);

  const updateTickCompliance = useCallback((id: string, pct: number) => {
    mutate('Tick compliance updated', (d0) => ({ ...d0, tickPlans: d0.tickPlans.map((t) => (t.id === id ? { ...t, compliance_pct: pct } : t)) }));
    toast('success', 'Compliance updated', `${pct}% of scheduled dippings on time.`);
  }, [mutate, toast]);

  const enrollWithCode = useCallback((code: string) => {
    const me = db.profiles.find((p) => p.id === currentUserId)!;
    const agr = db.agreements.find((a) => a.enrollment_code.trim().toLowerCase() === code.trim().toLowerCase());
    if (!agr) return { ok: false, message: 'Enrollment code not found. Check the code on your sponsor contract.' };
    if (agr.status !== 'active') return { ok: false, message: 'This sponsorship agreement is pending approval and cannot enroll farmers yet.' };
    if (db.enrollments.some((e) => e.agreement_id === agr.id && e.farmer_profile_id === me.id)) {
      return { ok: false, message: `You are already enrolled with ${agr.sponsor_name}.` };
    }
    mutate(`Enrolled with ${agr.sponsor_name}`, (d0) => {
      let d = { ...d0, enrollments: [...d0.enrollments, { id: uid(), agreement_id: agr.id, farmer_profile_id: me.id, used_to_date_kes: 0, enrolled_at: now() }] };
      d = notify(d, me.id, 'enrollment', `Welcome to ${agr.sponsor_name}`, `Annual cap ${agr.annual_cap_kes.toLocaleString()} KES · max claim ${agr.max_claim_kes.toLocaleString()} KES.`, '/app/coverage');
      d = addAudit(d, 'FARMER_ENROLLED', 'sponsor_enrollments', agr.enrollment_code, `${me.full_name} → ${agr.sponsor_name}`, me);
      return d;
    });
    return { ok: true, message: `Enrolled with ${agr.sponsor_name}. Max claim KES ${agr.max_claim_kes.toLocaleString()} · annual cap KES ${agr.annual_cap_kes.toLocaleString()}.` };
  }, [db.profiles, db.agreements, db.enrollments, currentUserId, mutate, notify, addAudit]);

  const sponsorCreateAgreement = useCallback((data: Omit<SponsorAgreement, 'id' | 'sponsor_profile_id' | 'enrollment_code' | 'status'>) => {
    const me = db.profiles.find((p) => p.id === currentUserId)!;
    const code = `GLH-${Math.random().toString(36).slice(2, 6).toUpperCase()}-${Date.now().toString().slice(-4)}`;
    mutate(`Agreement "${data.sponsor_name}" created`, (d0) => addAudit({
      ...d0,
      agreements: [...d0.agreements, { ...data, id: uid(), sponsor_profile_id: me.id, enrollment_code: code, status: 'active' as const }],
    }, 'AGREEMENT_CREATED', 'sponsorship_agreements', data.sponsor_name, `code=${code}`, me));
    toast('success', 'Agreement live', `Enrollment code: ${code}`);
  }, [db.profiles, currentUserId, mutate, addAudit, toast]);

  /* -------------------------- notifications ----------------------------- */
  const markNotificationRead = useCallback((id: string) => {
    setDb((d0) => ({ ...d0, notifications: d0.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)) }));
  }, []);
  const markAllNotificationsRead = useCallback(() => {
    setDb((d0) => ({ ...d0, notifications: d0.notifications.map((n) => ({ ...n, read: true })) }));
  }, []);

  /* ------------------------------ admin --------------------------------- */
  const adminVerifyVet = useCallback((profileId: string, approve: boolean) => {
    const me = db.profiles.find((p) => p.id === currentUserId)!;
    const vet = db.profiles.find((p) => p.id === profileId)!;
    mutate(approve ? 'Vet verified' : 'Vet suspended', (d0) => {
      let d = { ...d0, vetProfiles: d0.vetProfiles.map((v) => v.profile_id === profileId ? { ...v, verification: (approve ? 'verified' : 'suspended') as VetProfile['verification'] } : v) };
      d = notify(d, profileId, 'system', approve ? 'License verified' : 'Account suspended', approve ? 'You are now a verified GLHIS service provider.' : 'Contact the platform administrator.', '/app/dashboard');
      d = addAudit(d, approve ? 'VET_VERIFIED' : 'VET_SUSPENDED', 'vet_profiles', vet.full_name, approve ? 'pending → verified' : '→ suspended', me);
      return d;
    });
    toast(approve ? 'success' : 'warning', approve ? 'Vet verified' : 'Vet suspended', vet.full_name);
  }, [db.profiles, currentUserId, mutate, notify, addAudit, toast]);

  const adminApproveAgreement = useCallback((agreementId: string) => {
    const me = db.profiles.find((p) => p.id === currentUserId)!;
    mutate('Sponsor agreement approved', (d0) => {
      const agr = d0.agreements.find((a) => a.id === agreementId)!;
      let d = { ...d0, agreements: d0.agreements.map((a) => a.id === agreementId ? { ...a, status: 'active' as const } : a) };
      d = notify(d, agr.sponsor_profile_id, 'system', 'Agreement approved', `${agr.sponsor_name} is now live. Enrollment code ${agr.enrollment_code} is active.`, '/app/agreements');
      d = addAudit(d, 'AGREEMENT_APPROVED', 'sponsorship_agreements', agr.sponsor_name, 'pending → active', me);
      return d;
    });
    toast('success', 'Sponsor approved', 'Agreement is now active.');
  }, [db.profiles, currentUserId, mutate, notify, addAudit, toast]);

  const adminSuspendProfile = useCallback((profileId: string, suspend: boolean) => {
    const me = db.profiles.find((p) => p.id === currentUserId)!;
    const target = db.profiles.find((p) => p.id === profileId)!;
    mutate(suspend ? 'User suspended' : 'User reinstated', (d0) => addAudit({
      ...d0,
      profiles: d0.profiles.map((p) => (p.id === profileId ? { ...p, active: !suspend } : p)),
    }, suspend ? 'USER_SUSPENDED' : 'USER_REINSTATED', 'profiles', target.full_name, suspend ? 'active=false' : 'active=true', me));
    toast(suspend ? 'warning' : 'success', suspend ? 'User suspended' : 'User reinstated', target.full_name);
  }, [db.profiles, currentUserId, mutate, addAudit, toast]);

  /* --------------------------- derived reads ---------------------------- */
  const profileById = useCallback((id: string | null | undefined) => db.profiles.find((p) => p.id === id), [db.profiles]);
  const vetProfileById = useCallback((id: string) => db.vetProfiles.find((v) => v.profile_id === id), [db.vetProfiles]);
  const farmById = useCallback((id: string) => db.farms.find((f) => f.id === id), [db.farms]);
  const animalById = useCallback((id: string) => db.animals.find((a) => a.id === id), [db.animals]);
  const caseById = useCallback((id: string) => db.cases.find((c) => c.id === id), [db.cases]);
  const claimForCase = useCallback((caseId: string) => db.claims.find((c) => c.case_id === caseId), [db.claims]);

  const coverageFor = useCallback((farmerId: string) => {
    const enrollment = db.enrollments.find((e) => e.farmer_profile_id === farmerId);
    const agreement = enrollment ? db.agreements.find((a) => a.id === enrollment.agreement_id) : undefined;
    const active = agreement && agreement.status === 'active';
    return {
      covered: !!active,
      agreement: active ? agreement : undefined,
      enrollment,
      remainingAnnual: active ? agreement.annual_cap_kes - (enrollment?.used_to_date_kes ?? 0) : 0,
      maxClaim: active ? agreement.max_claim_kes : 0,
      sponsorName: active && agreement ? agreement.sponsor_name : 'No active sponsor',
    };
  }, [db.enrollments, db.agreements]);

  // ref so submitClaim can call coverageFor without circular deps
  const coverageForRef = useMemo(() => ({ current: coverageFor }), [coverageFor]);

  const value: StoreCtx = {
    db, currentUser, login, logout, resetDemoData,
    offline, toggleOffline, outbox, syncNow, toasts, toast, dismissToast,
    reportCase, assignVet, cancelCase, acceptCase, declineCase, resolveCase, escalateCase,
    addClinicalRecord, addTreatment, submitClaim, reviewClaim, decideClaim, payClaim,
    addFarm, updateFarm, deleteFarm, addAnimal, updateAnimal,
    markVaccinationComplete, updateTickCompliance, enrollWithCode, sponsorCreateAgreement,
    markNotificationRead, markAllNotificationsRead,
    adminVerifyVet, adminApproveAgreement, adminSuspendProfile,
    profileById, vetProfileById, farmById, animalById, caseById, coverageFor, claimForCase,
  };

  return React.createElement(Ctx.Provider, { value }, children);
}

export function useStore() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useStore must be used within <StoreProvider>');
  return ctx;
}
