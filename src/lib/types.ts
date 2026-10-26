/* ==========================================================================
   Gusii Livestock Health & Value Chain Intelligence System
   Typed domain model + seeded synthetic dataset (Kisii / Nyamira, Kenya)
   ========================================================================== */

export type Role = 'farmer' | 'vet' | 'sponsor' | 'authority' | 'admin';

export interface Profile {
  id: string;
  role: Role;
  full_name: string;
  phone: string;
  email: string;
  ward: string;
  lat: number;
  lng: number;
  initials: string;
  active: boolean;
}

export interface VetProfile {
  profile_id: string;
  license_number: string;
  specialty: string;
  years_experience: number;
  verification: 'pending' | 'verified' | 'suspended';
  rating: number;
  cases_completed: number;
  service_radius_km: number;
  available: boolean;
}

export interface Farm {
  id: string;
  farmer_id: string;
  name: string;
  ward: string;
  hectares: number;
  lat: number;
  lng: number;
}

export type AnimalSpecies = 'dairy_cattle' | 'beef_cattle';

export interface Animal {
  id: string;
  farm_id: string;
  tag_number: string;
  name: string;
  species: AnimalSpecies;
  breed: string;
  sex: 'female' | 'male';
  dob: string;
  weight_kg: number;
  status: 'active' | 'quarantine' | 'sold' | 'deceased';
}

export type CaseStatus =
  | 'pending_vet' | 'vet_assigned' | 'in_treatment' | 'resolved' | 'escalated'
  | 'claim_submitted' | 'claim_under_review' | 'claim_approved' | 'claim_paid' | 'claim_rejected';

export type CasePriority = 'routine' | 'urgent' | 'emergency';

export interface VetCase {
  id: string;
  case_number: string;
  farm_id: string;
  animal_id: string;
  farmer_id: string;
  vet_id: string | null;
  sponsor_id: string | null;
  symptoms: string[];
  triage_urgency: number;        // 0-100
  triage_summary: string;
  suspected_dx: string;
  priority: CasePriority;
  status: CaseStatus;
  reported_at: string;
  assigned_at: string | null;
  resolved_at: string | null;
  farmer_lat: number;
  farmer_lng: number;
}

export interface CaseEvent {
  id: string;
  case_id: string;
  actor_id: string;
  actor_name: string;
  event: string;
  detail: string;
  created_at: string;
}

export interface ClinicalRecord {
  id: string;
  case_id: string;
  vet_id: string;
  examination: string;
  diagnosis: string;
  temperature_c: number;
  heart_rate: number;
  created_at: string;
}

export interface Treatment {
  id: string;
  case_id: string;
  drug: string;
  dose: string;
  route: string;
  duration_days: number;
  cost_kes: number;
  administered_at: string;
}

export type ClaimStatus = 'submitted' | 'under_review' | 'approved' | 'rejected' | 'paid';

export interface Claim {
  id: string;
  claim_number: string;
  case_id: string;
  vet_id: string;
  sponsor_id: string;
  amount_kes: number;
  services: string;
  status: ClaimStatus;
  submitted_at: string;
  decided_at: string | null;
  decided_by: string | null;
  decision_reason: string | null;
}

export interface SponsorAgreement {
  id: string;
  sponsor_profile_id: string;
  sponsor_name: string;
  tier: 'Bronze' | 'Silver' | 'Gold';
  max_claim_kes: number;
  annual_cap_kes: number;
  covered_diagnoses: string[];
  enrollment_code: string;
  status: 'pending' | 'active' | 'suspended';
  starts_on: string;
  ends_on: string;
}

export interface SponsorEnrollment {
  id: string;
  agreement_id: string;
  farmer_profile_id: string;
  used_to_date_kes: number;
  enrolled_at: string;
}

export interface Alert {
  id: string;
  disease: string;
  zone: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  case_count: number;
  active: boolean;
  created_at: string;
}

export interface TickControlPlan {
  id: string;
  farm_id: string;
  dipping_day: string;
  acaricide: string;
  next_due: string;
  compliance_pct: number;
}

export interface Vaccination {
  id: string;
  animal_id: string;
  vaccine: string;
  due_date: string;
  administered_date: string | null;
  status: 'scheduled' | 'complete' | 'overdue';
}

export interface AuditLog {
  id: number;
  actor_id: string;
  actor_role: Role;
  actor_name: string;
  action: string;
  entity: string;
  entity_id: string;
  created_at: string;
  diff: string;
}

export interface AppNotification {
  id: string;
  profile_id: string;
  kind: 'case' | 'claim' | 'alert' | 'system' | 'enrollment';
  title: string;
  body: string;
  read: boolean;
  created_at: string;
  link?: string;
}

export interface KnowledgeArticle {
  id: string;
  title: string;
  category: 'Disease Prevention' | 'Tick Control' | 'Nutrition' | 'Breeding' | 'Records & Finance';
  excerpt: string;
  read_minutes: number;
  body: string[];
}

/* ------------------------------------------------------------------ */
/*  SEED DATA — synthetic, Gusii region (2026-10-26 reference date)     */
/* ------------------------------------------------------------------ */

const d = (daysAgo: number, h = 9, m = 0) => {
  const t = new Date('2026-10-26T12:00:00Z');
  t.setUTCDate(t.getUTCDate() - daysAgo);
  t.setUTCHours(h, m, 0, 0);
  return t.toISOString();
};
const dFuture = (days: number) => {
  const t = new Date('2026-10-26T12:00:00Z');
  t.setUTCDate(t.getUTCDate() + days);
  return t.toISOString().slice(0, 10);
};

export const DEMO_IDS = {
  farmerMain: 'f-main-001',
  vetMain: 'v-main-001',
  sponsorMain: 's-main-001',
  sponsorPending: 's-pending-002',
  authority: 'a-auth-001',
  admin: 'ad-root-001',
};

export const seedProfiles: Profile[] = [
  { id: DEMO_IDS.farmerMain, role: 'farmer', full_name: 'Beatrice Nyaboke Momanyi', phone: '+254 712 345 678', email: 'beatrice.momanyi@gmail.com', ward: 'Kitutu Chache North', lat: -0.6817, lng: 34.7717, initials: 'BM', active: true },
  { id: 'f-002', role: 'farmer', full_name: 'Samson Onkoba Omwamba', phone: '+254 722 881 004', email: 's.omwamba@yahoo.co.ke', ward: 'Mugirango West', lat: -0.8231, lng: 34.8123, initials: 'SO', active: true },
  { id: 'f-003', role: 'farmer', full_name: 'Esther Kerubo Ongeri', phone: '+254 733 210 990', email: 'esther.ongeri@outlook.com', ward: 'Nyaribari Masaba', lat: -0.7156, lng: 34.8135, initials: 'EO', active: true },
  { id: 'f-004', role: 'farmer', full_name: 'Josephat Moseti Osiemo', phone: '+254 701 445 781', email: 'j.osiemo@gmail.com', ward: 'Bomachoge Chache', lat: -0.7052, lng: 34.9533, initials: 'JO', active: true },
  { id: DEMO_IDS.vetMain, role: 'vet', full_name: 'Dr. Grace Kemunto Chacha', phone: '+254 720 118 204', email: 'g.chacha@glvs.co.ke', ward: 'Kitutu Chache North', lat: -0.6755, lng: 34.7790, initials: 'GC', active: true },
  { id: 'v-002', role: 'vet', full_name: 'Dr. Brian Omondi Were', phone: '+254 745 902 117', email: 'b.were@niatechvets.co.ke', ward: 'Nyaribari Masaba', lat: -0.7188, lng: 34.8081, initials: 'BW', active: true },
  { id: 'v-003', role: 'vet', full_name: 'Dr. Mercy Atema Isaboke', phone: '+254 710 566 432', email: 'm.isaboke@goldenhorns.co.ke', ward: 'Mugirango East', lat: -0.7820, lng: 34.9001, initials: 'MI', active: false },
  { id: 'v-004', role: 'vet', full_name: 'Dr. Peter Ombati Nyandoro', phone: '+254 798 334 556', email: 'p.nyandoro@gusiivets.co.ke', ward: 'Bomachoge Chache', lat: -0.7098, lng: 34.9475, initials: 'PN', active: true },
  { id: DEMO_IDS.sponsorMain, role: 'sponsor', full_name: 'Kisii Cream Dairy Co-op — Claims Office', phone: '+254 20 232 1188', email: 'claims@kisicream.co.ke', ward: 'Kitutu Chache North', lat: -0.6812, lng: 34.7678, initials: 'KC', active: true },
  { id: DEMO_IDS.sponsorPending, role: 'sponsor', full_name: 'Nyamira Gold Beef Co-operative', phone: '+254 20 235 7712', email: 'onboarding@nyamiragold.co.ke', ward: 'Mugirango East', lat: -0.7901, lng: 34.9120, initials: 'NG', active: true },
  { id: DEMO_IDS.authority, role: 'authority', full_name: 'Kisii County Livestock Directorate', phone: '+254 58 203 4410', email: 'livestock@kisii.go.ke', ward: 'County HQ — Kisii Town', lat: -0.6817, lng: 34.7680, initials: 'KD', active: true },
  { id: DEMO_IDS.admin, role: 'admin', full_name: 'Root Administrator — GLHIS', phone: '+254 700 000 001', email: 'root@glhis.go.ke', ward: 'Kisii Town', lat: -0.6817, lng: 34.7700, initials: 'RA', active: true },
];

export const seedVetProfiles: VetProfile[] = [
  { profile_id: DEMO_IDS.vetMain, license_number: 'KVB-2021-0341', specialty: 'Dairy Herd Health & Population Medicine', years_experience: 9, verification: 'verified', rating: 4.9, cases_completed: 412, service_radius_km: 18, available: true },
  { profile_id: 'v-002', license_number: 'KVB-2019-0277', specialty: 'Surgery & Obstetrics', years_experience: 12, verification: 'verified', rating: 4.7, cases_completed: 538, service_radius_km: 25, available: true },
  { profile_id: 'v-003', license_number: 'KVB-2023-0512', specialty: 'Ruminant Nutrition', years_experience: 4, verification: 'pending', rating: 4.2, cases_completed: 67, service_radius_km: 12, available: false },
  { profile_id: 'v-004', license_number: 'KVB-2022-0408', specialty: 'Infectious Disease Control & Vaccination', years_experience: 7, verification: 'verified', rating: 4.8, cases_completed: 296, service_radius_km: 20, available: true },
];

export const seedFarms: Farm[] = [
  { id: 'farm-001', farmer_id: DEMO_IDS.farmerMain, name: 'Riabai Dairy — Main Unit', ward: 'Kitutu Chache North', hectares: 2.4, lat: -0.6817, lng: 34.7717 },
  { id: 'farm-002', farmer_id: DEMO_IDS.farmerMain, name: 'Gesero Satellite Paddock', ward: 'Kitutu Chache North', hectares: 1.1, lat: -0.6742, lng: 34.7833 },
  { id: 'farm-003', farmer_id: 'f-002', name: 'Ongata Borabu Home Farm', ward: 'Mugirango West', hectares: 3.2, lat: -0.8231, lng: 34.8123 },
  { id: 'farm-004', farmer_id: 'f-003', name: 'Masimba Green Pastures', ward: 'Nyaribari Masaba', hectares: 1.8, lat: -0.7156, lng: 34.8135 },
  { id: 'farm-005', farmer_id: 'f-004', name: 'Bomachoge Beef Ranch', ward: 'Bomachoge Chache', hectares: 5.6, lat: -0.7052, lng: 34.9533 },
];

export const seedAnimals: Animal[] = [
  { id: 'an-001', farm_id: 'farm-001', tag_number: 'KES-RBM-001', name: 'Nyachaki', species: 'dairy_cattle', breed: 'Friesian', sex: 'female', dob: '2021-03-14', weight_kg: 540, status: 'active' },
  { id: 'an-002', farm_id: 'farm-001', tag_number: 'KES-RBM-002', name: 'Moka', species: 'dairy_cattle', breed: 'Ayrshire', sex: 'female', dob: '2020-11-02', weight_kg: 505, status: 'active' },
  { id: 'an-003', farm_id: 'farm-001', tag_number: 'KES-RBM-003', name: 'Riba', species: 'dairy_cattle', breed: 'Jersey', sex: 'female', dob: '2022-06-28', weight_kg: 420, status: 'active' },
  { id: 'an-004', farm_id: 'farm-001', tag_number: 'KES-RBM-004', name: 'Toto', species: 'dairy_cattle', breed: 'Friesian × Ayrshire', sex: 'female', dob: '2019-08-19', weight_kg: 585, status: 'active' },
  { id: 'an-005', farm_id: 'farm-001', tag_number: 'KES-RBM-005', name: 'Kerubo', species: 'dairy_cattle', breed: 'Friesian', sex: 'female', dob: '2023-01-30', weight_kg: 380, status: 'active' },
  { id: 'an-006', farm_id: 'farm-001', tag_number: 'KES-RBM-006', name: 'Bongo', species: 'beef_cattle', breed: 'Boran cross', sex: 'male', dob: '2020-05-11', weight_kg: 620, status: 'active' },
  { id: 'an-007', farm_id: 'farm-002', tag_number: 'KES-GEB-001', name: 'Gesero Star', species: 'dairy_cattle', breed: 'Friesian', sex: 'female', dob: '2021-09-07', weight_kg: 512, status: 'active' },
  { id: 'an-008', farm_id: 'farm-002', tag_number: 'KES-GEB-002', name: 'Nyaenya', species: 'dairy_cattle', breed: 'Jersey', sex: 'female', dob: '2022-12-15', weight_kg: 405, status: 'active' },
  { id: 'an-009', farm_id: 'farm-003', tag_number: 'KES-ONG-014', name: 'Borabu King', species: 'beef_cattle', breed: 'Boran', sex: 'male', dob: '2019-02-23', weight_kg: 640, status: 'active' },
  { id: 'an-010', farm_id: 'farm-004', tag_number: 'KES-MAS-031', name: 'Masimba Pride', species: 'dairy_cattle', breed: 'Ayrshire', sex: 'female', dob: '2021-06-05', weight_kg: 495, status: 'active' },
  { id: 'an-011', farm_id: 'farm-004', tag_number: 'KES-MAS-032', name: 'Nyamusi', species: 'dairy_cattle', breed: 'Friesian', sex: 'female', dob: '2020-07-21', weight_kg: 530, status: 'active' },
  { id: 'an-012', farm_id: 'farm-005', tag_number: 'KES-BOM-007', name: 'Bomachoge Bull', species: 'beef_cattle', breed: 'Boran × Sahiwal', sex: 'male', dob: '2018-10-30', weight_kg: 710, status: 'active' },
];

export const seedCases: VetCase[] = [
  /* --- Live case that drives the acceptance walkthrough (Nyachaki, FMD) --- */
  { id: 'case-001', case_number: 'GLH-2026-0147', farm_id: 'farm-001', animal_id: 'an-001', farmer_id: DEMO_IDS.farmerMain, vet_id: DEMO_IDS.vetMain, sponsor_id: DEMO_IDS.sponsorMain, symptoms: ['Blisters in mouth / drooling', 'Blisters on feet / lameness', 'High fever', 'Drop in milk production'], triage_urgency: 82, triage_summary: 'Classic vesicular presentation with pyrexia and agalactia — high suspicion of Foot & Mouth Disease. Isolate immediately; same-day vet visit required.', suspected_dx: 'Foot & Mouth Disease', priority: 'urgent', status: 'in_treatment', reported_at: d(1, 8, 20), assigned_at: d(1, 9, 5), resolved_at: null, farmer_lat: -0.6817, farmer_lng: 34.7717 },
  /* --- Historical, fully paid case (Riba, mastitis) --- */
  { id: 'case-002', case_number: 'GLH-2026-0119', farm_id: 'farm-001', animal_id: 'an-003', farmer_id: DEMO_IDS.farmerMain, vet_id: DEMO_IDS.vetMain, sponsor_id: DEMO_IDS.sponsorMain, symptoms: ['Swollen / painful udder', 'Clotted / discoloured milk', 'Fever'], triage_urgency: 64, triage_summary: 'Acute mastitis, left quarter. CMT positive. Responded well to intramammary + systemic antibiotics.', suspected_dx: 'Acute Mastitis', priority: 'urgent', status: 'claim_paid', reported_at: d(24, 10, 15), assigned_at: d(24, 11, 0), resolved_at: d(19, 14, 30), farmer_lat: -0.6817, farmer_lng: 34.7717 },
  /* --- Claim under review (Gesero Star) --- */
  { id: 'case-003', case_number: 'GLH-2026-0138', farm_id: 'farm-002', animal_id: 'an-007', farmer_id: DEMO_IDS.farmerMain, vet_id: DEMO_IDS.vetMain, sponsor_id: DEMO_IDS.sponsorMain, symptoms: ['Ticks visible on body', 'Weight loss despite eating', 'Pale gums / anaemia'], triage_urgency: 58, triage_summary: 'Tick-borne disease complex — anaplasmosis likely. Imidocarb administered; babesia excluded clinically.', suspected_dx: 'Anaplasmosis', priority: 'routine', status: 'claim_under_review', reported_at: d(6, 7, 45), assigned_at: d(6, 8, 30), resolved_at: d(2, 16, 0), farmer_lat: -0.6742, farmer_lng: 34.7833 },
  /* --- Claim submitted, awaiting sponsor decision --- */
  { id: 'case-004', case_number: 'GLH-2026-0144', farm_id: 'farm-001', animal_id: 'an-005', farmer_id: DEMO_IDS.farmerMain, vet_id: DEMO_IDS.vetMain, sponsor_id: DEMO_IDS.sponsorMain, symptoms: ['Lacrimation / eye discharge', 'Corneal opacity', 'Photophobia'], triage_urgency: 46, triage_summary: 'Infectious bovine keratoconjunctivitis (pink eye). Topical + systemic oxytetracycline. Good prognosis.', suspected_dx: 'Infectious Bovine Keratoconjunctivitis', priority: 'routine', status: 'claim_submitted', reported_at: d(3, 9, 10), assigned_at: d(3, 10, 0), resolved_at: d(0, 8, 30), farmer_lat: -0.6817, farmer_lng: 34.7717 },
  /* --- Case pending vet (other farmers) --- */
  { id: 'case-005', case_number: 'GLH-2026-0148', farm_id: 'farm-003', animal_id: 'an-009', farmer_id: 'f-002', vet_id: null, sponsor_id: null, symptoms: ['Sudden death of herd mate', 'Bloat / distended abdomen', 'Muscle swelling with crepitus'], triage_urgency: 91, triage_summary: 'Suspected blackleg / clostridial myositis — emergency. Post-mortem and ring vaccination of the herd strongly advised.', suspected_dx: 'Blackleg (Clostridium chauvoei)', priority: 'emergency', status: 'pending_vet', reported_at: d(0, 6, 15), assigned_at: null, resolved_at: null, farmer_lat: -0.8231, farmer_lng: 34.8123 },
  /* --- Resolved, escalated earlier (surveillance fodder) --- */
  { id: 'case-006', case_number: 'GLH-2026-0126', farm_id: 'farm-004', animal_id: 'an-010', farmer_id: 'f-003', vet_id: 'v-002', sponsor_id: DEMO_IDS.sponsorMain, symptoms: ['Blisters in mouth / drooling', 'Blisters on feet / lameness', 'Reduced appetite'], triage_urgency: 78, triage_summary: 'FMD, mild — isolated, supportive care, herd notified. Local authorities informed per protocol.', suspected_dx: 'Foot & Mouth Disease', priority: 'urgent', status: 'resolved', reported_at: d(11, 13, 0), assigned_at: d(11, 14, 20), resolved_at: d(5, 10, 0), farmer_lat: -0.7156, farmer_lng: 34.8135 },
  { id: 'case-007', case_number: 'GLH-2026-0131', farm_id: 'farm-004', animal_id: 'an-011', farmer_id: 'f-003', vet_id: 'v-002', sponsor_id: null, symptoms: ['Skin nodules / lumps', 'Fever', 'Swollen limbs'], triage_urgency: 70, triage_summary: 'Lumpy skin disease, early stage. Nursing care, anti-histamines, wound fly control.', suspected_dx: 'Lumpy Skin Disease', priority: 'urgent', status: 'resolved', reported_at: d(9, 8, 0), assigned_at: d(9, 9, 30), resolved_at: d(4, 15, 0), farmer_lat: -0.7156, farmer_lng: 34.8135 },
  { id: 'case-008', case_number: 'GLH-2026-0113', farm_id: 'farm-005', animal_id: 'an-012', farmer_id: 'f-004', vet_id: 'v-004', sponsor_id: null, symptoms: ['Ticks visible on body', 'Fever', 'Weakness / collapse'], triage_urgency: 66, triage_summary: 'East Coast Fever — treated with Buparvaquone. Guarded prognosis, recovered.', suspected_dx: 'East Coast Fever', priority: 'urgent', status: 'claim_paid', reported_at: d(18, 11, 0), assigned_at: d(18, 12, 10), resolved_at: d(13, 9, 0), farmer_lat: -0.7052, farmer_lng: 34.9533 },
];

export const seedClinicalRecords: ClinicalRecord[] = [
  { id: 'cr-001', case_id: 'case-001', vet_id: DEMO_IDS.vetMain, examination: 'Vesicles on dental pad, tongue and interdigital skin. Profuse ptyalism. Lameness gr.2 RF. No cardiac involvement auscultated.', diagnosis: 'Foot & Mouth Disease (FMDV, serotype O suspected) — notifiable, county alerted', temperature_c: 40.3, heart_rate: 96, created_at: d(1, 10, 15) },
  { id: 'cr-002', case_id: 'case-002', vet_id: DEMO_IDS.vetMain, examination: 'Left hind quarter hard, hot, painful. Clotted milk with blood flecks. CMT 3+ left hind.', diagnosis: 'Acute catarrhal mastitis, left hind quarter', temperature_c: 39.8, heart_rate: 88, created_at: d(24, 12, 0) },
  { id: 'cr-003', case_id: 'case-003', vet_id: DEMO_IDS.vetMain, examination: 'Tick burden moderate (Boophilus). Pale mucous membranes. PCV estimated low. No babesia piroplasms on smear.', diagnosis: 'Anaplasmosis (anaplasma marginale), uncomplicated', temperature_c: 39.6, heart_rate: 92, created_at: d(6, 9, 40) },
  { id: 'cr-004', case_id: 'case-004', vet_id: DEMO_IDS.vetMain, examination: 'Ulcerative keratitis OD, perilimbal injection. No aqueous flare. Epiphora ++. DIB negative.', diagnosis: 'Infectious bovine keratoconjunctivitis (Moraxella bovis)', temperature_c: 38.9, heart_rate: 74, created_at: d(3, 10, 45) },
];

export const seedTreatments: Treatment[] = [
  { id: 'tx-001', case_id: 'case-001', drug: 'Potassium permanganate mouth wash 0.1%', dose: 'Topical, BID', route: 'Topical', duration_days: 5, cost_kes: 400, administered_at: d(1, 10, 30) },
  { id: 'tx-001b', case_id: 'case-001', drug: 'Meloxicam', dose: '15 mg IV once', route: 'IV', duration_days: 1, cost_kes: 900, administered_at: d(1, 10, 32) },
  { id: 'tx-002', case_id: 'case-002', drug: 'Oxytetracycline LA 20%', dose: '20 mg/kg IM once', route: 'IM', duration_days: 3, cost_kes: 1500, administered_at: d(24, 12, 10) },
  { id: 'tx-002b', case_id: 'case-002', drug: 'Masti-Clear intramammary', dose: '1 tube per quarter BID', route: 'Intramammary', duration_days: 3, cost_kes: 2200, administered_at: d(24, 12, 12) },
  { id: 'tx-003', case_id: 'case-003', drug: 'Imidocarb dipropionate', dose: '3 mg/kg SC once', route: 'SC', duration_days: 1, cost_kes: 1800, administered_at: d(6, 10, 0) },
  { id: 'tx-003b', case_id: 'case-003', drug: 'Vitamin B complex + Iron dextran', dose: '10 ml IM once', route: 'IM', duration_days: 1, cost_kes: 600, administered_at: d(6, 10, 5) },
  { id: 'tx-004', case_id: 'case-004', drug: 'Oxytetracycline eye ointment', dose: 'BID both eyes', route: 'Topical', duration_days: 5, cost_kes: 500, administered_at: d(3, 11, 0) },
  { id: 'tx-004b', case_id: 'case-004', drug: 'Oxytetracycline LA 20%', dose: '20 mg/kg IM once', route: 'IM', duration_days: 1, cost_kes: 1500, administered_at: d(3, 11, 5) },
];

export const seedClaims: Claim[] = [
  { id: 'claim-001', claim_number: 'CLM-2026-0038', case_id: 'case-002', vet_id: DEMO_IDS.vetMain, sponsor_id: DEMO_IDS.sponsorMain, amount_kes: 4250, services: 'Farm call-out · Clinical exam · Oxytetracycline LA · Masti-Clear intramammary · 3-day follow-up', status: 'paid', submitted_at: d(19, 9, 0), decided_at: d(18, 14, 0), decided_by: DEMO_IDS.sponsorMain, decision_reason: 'Verified treatment record and invoice. Approved in full.' },
  { id: 'claim-002', claim_number: 'CLM-2026-0041', case_id: 'case-003', vet_id: DEMO_IDS.vetMain, sponsor_id: DEMO_IDS.sponsorMain, amount_kes: 3200, services: 'Farm call-out · PCV smear · Imidocarb 3 mg/kg · Iron/B12 · Anaplasmosis protocol', status: 'under_review', submitted_at: d(2, 17, 0), decided_at: null, decided_by: null, decision_reason: null },
  { id: 'claim-003', claim_number: 'CLM-2026-0042', case_id: 'case-004', vet_id: DEMO_IDS.vetMain, sponsor_id: DEMO_IDS.sponsorMain, amount_kes: 2500, services: 'Farm call-out · Clinical exam · Oxytetracycline eye ointment ×5d · Oxytetracycline LA IM', status: 'submitted', submitted_at: d(0, 9, 15), decided_at: null, decided_by: null, decision_reason: null },
];

export const seedAgreements: SponsorAgreement[] = [
  { id: 'agr-001', sponsor_profile_id: DEMO_IDS.sponsorMain, sponsor_name: 'Kisii Cream Dairy Co-op', tier: 'Gold', max_claim_kes: 5000, annual_cap_kes: 60000, covered_diagnoses: ['Acute Mastitis', 'Foot & Mouth Disease', 'Anaplasmosis', 'East Coast Fever', 'Lumpy Skin Disease', 'Infectious Bovine Keratoconjunctivitis', 'Milk Fever', 'Tick-borne diseases'], enrollment_code: 'KCREAM-2026-GOLD-114', status: 'active', starts_on: '2026-01-01', ends_on: '2026-12-31' },
  { id: 'agr-002', sponsor_profile_id: DEMO_IDS.sponsorPending, sponsor_name: 'Nyamira Gold Beef Co-operative', tier: 'Silver', max_claim_kes: 3000, annual_cap_kes: 25000, covered_diagnoses: ['Blackleg', 'East Coast Fever', 'Anaplasmosis', 'Bloat'], enrollment_code: 'NGOLD-2026-SLVR-207', status: 'pending', starts_on: '2026-11-01', ends_on: '2027-10-31' },
];

export const seedEnrollments: SponsorEnrollment[] = [
  { id: 'enr-001', agreement_id: 'agr-001', farmer_profile_id: DEMO_IDS.farmerMain, used_to_date_kes: 7450, enrolled_at: d(200, 8, 0) },
  { id: 'enr-002', agreement_id: 'agr-001', farmer_profile_id: 'f-003', used_to_date_kes: 3100, enrolled_at: d(150, 8, 0) },
  { id: 'enr-003', agreement_id: 'agr-001', farmer_profile_id: 'f-002', used_to_date_kes: 0, enrolled_at: d(90, 8, 0) },
];

export const seedAlerts: Alert[] = [
  { id: 'al-001', disease: 'Foot & Mouth Disease', zone: 'Nyaribari Masaba', severity: 'critical', message: 'FMD cluster: 3 confirmed cases in 14 days. Movement restriction advised. Ring vaccination being scheduled.', case_count: 3, active: true, created_at: d(2, 10, 0) },
  { id: 'al-002', disease: 'Lumpy Skin Disease', zone: 'Nyaribari Masaba', severity: 'warning', message: 'LSD incidence rising — 2 cases this week. Recommend LSD vaccine boosters for at-risk herds.', case_count: 2, active: true, created_at: d(4, 11, 30) },
  { id: 'al-003', disease: 'East Coast Fever', zone: 'Bomachoge Chache', severity: 'warning', message: 'ECF seasonal uptick in tick pressure. Acaricide rotation recommended before wet season.', case_count: 2, active: true, created_at: d(7, 9, 0) },
  { id: 'al-004', disease: 'Anaplasmosis', zone: 'Kitutu Chache North', severity: 'info', message: 'Sporadic anaplasmosis — 2 cases this month. Monitor anaemic animals.', case_count: 2, active: false, created_at: d(10, 8, 30) },
];

export const seedTickPlans: TickControlPlan[] = [
  { id: 'tcp-001', farm_id: 'farm-001', dipping_day: 'Tuesday', acaricide: 'Flumethrin 1% (Bayticol) rotate → Amitraz', next_due: dFuture(6), compliance_pct: 92 },
  { id: 'tcp-002', farm_id: 'farm-002', dipping_day: 'Friday', acaricide: 'Amitraz 12.5% EC', next_due: dFuture(2), compliance_pct: 85 },
  { id: 'tcp-003', farm_id: 'farm-003', dipping_day: 'Wednesday', acaricide: 'Flumethrin 1%', next_due: dFuture(9), compliance_pct: 78 },
];

export const seedVaccinations: Vaccination[] = [
  { id: 'vac-001', animal_id: 'an-001', vaccine: 'FMD (serotype O & A)', due_date: dFuture(14), administered_date: null, status: 'scheduled' },
  { id: 'vac-002', animal_id: 'an-002', vaccine: 'Lumpy Skin Disease', due_date: dFuture(21), administered_date: null, status: 'scheduled' },
  { id: 'vac-003', animal_id: 'an-003', vaccine: 'FMD (serotype O & A)', due_date: dFuture(-6), administered_date: null, status: 'overdue' },
  { id: 'vac-004', animal_id: 'an-004', vaccine: 'Anthrax', due_date: dFuture(45), administered_date: null, status: 'scheduled' },
  { id: 'vac-005', animal_id: 'an-005', vaccine: 'LSD', due_date: dFuture(-40), administered_date: d(40).slice(0, 10), status: 'complete' },
  { id: 'vac-006', animal_id: 'an-006', vaccine: 'Blackleg', due_date: dFuture(30), administered_date: null, status: 'scheduled' },
  { id: 'vac-007', animal_id: 'an-007', vaccine: 'FMD (serotype O & A)', due_date: dFuture(-3), administered_date: null, status: 'overdue' },
  { id: 'vac-008', animal_id: 'an-008', vaccine: 'ECF (Corridor)', due_date: dFuture(60), administered_date: null, status: 'scheduled' },
  { id: 'vac-009', animal_id: 'an-009', vaccine: 'Blackleg', due_date: dFuture(10), administered_date: null, status: 'scheduled' },
  { id: 'vac-010', animal_id: 'an-010', vaccine: 'FMD (serotype O & A)', due_date: dFuture(25), administered_date: null, status: 'scheduled' },
];

export const seedAuditLogs: AuditLog[] = [
  { id: 1, actor_id: DEMO_IDS.vetMain, actor_role: 'vet', actor_name: 'Dr. Grace Kemunto Chacha', action: 'CLAIM_SUBMITTED', entity: 'claims', entity_id: 'CLM-2026-0042', created_at: d(0, 9, 15), diff: 'claim_submitted → case GLH-2026-0144' },
  { id: 2, actor_id: DEMO_IDS.vetMain, actor_role: 'vet', actor_name: 'Dr. Grace Kemunto Chacha', action: 'CASE_RESOLVED', entity: 'cases', entity_id: 'GLH-2026-0144', created_at: d(0, 8, 30), diff: 'in_treatment → resolved' },
  { id: 3, actor_id: DEMO_IDS.vetMain, actor_role: 'vet', actor_name: 'Dr. Grace Kemunto Chacha', action: 'CLINICAL_RECORD_ADDED', entity: 'clinical_records', entity_id: 'GLH-2026-0144', created_at: d(3, 10, 45), diff: 'diagnosis: IBK' },
  { id: 4, actor_id: DEMO_IDS.sponsorMain, actor_role: 'sponsor', actor_name: 'Kisii Cream Dairy Co-op', action: 'CLAIM_MOVED_TO_REVIEW', entity: 'claims', entity_id: 'CLM-2026-0041', created_at: d(1, 16, 0), diff: 'submitted → under_review' },
  { id: 5, actor_id: DEMO_IDS.farmerMain, actor_role: 'farmer', actor_name: 'Beatrice Nyaboke Momanyi', action: 'CASE_REPORTED', entity: 'cases', entity_id: 'GLH-2026-0147', created_at: d(1, 8, 20), diff: 'triage 82/100 — FMD suspected' },
  { id: 6, actor_id: DEMO_IDS.admin, actor_role: 'admin', actor_name: 'Root Administrator', action: 'VET_VERIFIED', entity: 'vet_profiles', entity_id: 'KVB-2022-0408', created_at: d(3, 12, 0), diff: 'verification: pending → verified' },
  { id: 7, actor_id: DEMO_IDS.sponsorMain, actor_role: 'sponsor', actor_name: 'Kisii Cream Dairy Co-op', action: 'CLAIM_PAID', entity: 'claims', entity_id: 'CLM-2026-0038', created_at: d(18, 15, 0), diff: 'approved → paid, KES 4,250' },
];

export const seedNotifications: AppNotification[] = [
  { id: 'ntf-001', profile_id: DEMO_IDS.farmerMain, kind: 'case', title: 'Vet on the way — GLH-2026-0147', body: 'Dr. Grace Kemunto Chacha accepted your FMD case and treated Nyachaki this morning.', read: false, created_at: d(1, 9, 5), link: '/app/cases' },
  { id: 'ntf-002', profile_id: DEMO_IDS.farmerMain, kind: 'claim', title: 'Claim CLM-2026-0042 submitted', body: 'Your vet submitted KES 2,500 to Kisii Cream Dairy Co-op for GLH-2026-0144.', read: false, created_at: d(0, 9, 15), link: '/app/claims' },
  { id: 'ntf-003', profile_id: DEMO_IDS.farmerMain, kind: 'alert', title: 'FMD alert — Nyaribari Masaba', body: '3 FMD cases in 14 days. Isolate new arrivals and avoid shared watering points.', read: false, created_at: d(2, 10, 0), link: '/app/alerts' },
  { id: 'ntf-004', profile_id: DEMO_IDS.vetMain, kind: 'case', title: 'New assignment — GLH-2026-0147', body: 'Beatrice Momanyi reported FMD symptoms. Urgency 82/100. 1.2 km away.', read: true, created_at: d(1, 9, 5), link: '/app/cases' },
  { id: 'ntf-005', profile_id: DEMO_IDS.sponsorMain, kind: 'claim', title: 'New claim — CLM-2026-0042', body: 'Dr. Grace Kemunto Chacha claims KES 2,500 for IBK treatment (case GLH-2026-0144).', read: false, created_at: d(0, 9, 15), link: '/app/claims' },
  { id: 'ntf-006', profile_id: DEMO_IDS.sponsorMain, kind: 'claim', title: 'Review requested — CLM-2026-0041', body: 'Anaplasmosis protocol, KES 3,200. Supporting records attached.', read: false, created_at: d(2, 17, 0), link: '/app/claims' },
  { id: 'ntf-007', profile_id: DEMO_IDS.admin, kind: 'system', title: 'Verification request — Dr. Mercy Atema Isaboke', body: 'KVB-2023-0512 submitted license for verification. Pending admin review.', read: false, created_at: d(0, 7, 30), link: '/app/admin' },
  { id: 'ntf-008', profile_id: DEMO_IDS.admin, kind: 'enrollment', title: 'Sponsor onboarding — Nyamira Gold Beef Co-op', body: 'Agreement NGOLD-2026-SLVR-207 awaiting approval.', read: false, created_at: d(1, 10, 0), link: '/app/admin' },
  { id: 'ntf-009', profile_id: DEMO_IDS.authority, kind: 'alert', title: 'FMD outbreak threshold exceeded', body: 'Nyaribari Masaba ward: 3 FMD cases in 14 days (threshold 3). Action plan required.', read: false, created_at: d(2, 10, 0), link: '/app/surveillance' },
];

export const knowledgeArticles: KnowledgeArticle[] = [
  { id: 'ka-001', title: 'Foot & Mouth Disease: what every Gusii farmer must know', category: 'Disease Prevention', excerpt: 'Recognition, isolation protocol, and movement control during an FMD outbreak.', read_minutes: 6, body: ['FMD is caused by an apthovirus attacking cloven-hoofed animals. Look for blisters on the tongue, dental pad, gums and between the claws, drooling, and sudden milk drop.', 'Immediately isolate symptomatic animals. Stop all animal movement — buying, selling, and lending — and alert your nearest vet and the ward livestock office.', 'Disinfect pens with 4% sodium carbonate or citric acid. Disinfect footwear and equipment before entering other herds.', 'Recovered animals may carry virus; keep them separate for at least 60 days and vaccinate in-contact stock per county protocol.', 'Report to the hotline 0800 723 000. It is free and confidential.'] },
  { id: 'ka-002', title: 'Strategic tick control in high-prevalence wards', category: 'Tick Control', excerpt: 'Rotation calendars, acaricide resistance, and pasture spelling for East Coast Fever zones.', read_minutes: 5, body: ['Ticks transmit ECF, babesiosis and anaplasmosis — the three biggest killers of crossbreeds in kisii highlands.', 'Rotate acaricide classes: pyrethroids (flumethrin) ↔ amidines (amitraz) ↔ organophosphates — never the same class for more than two consecutive dippings.', 'Dip or spray every 10–14 days in rainy season, every 21 days in dry season. Count 30 animals, treat 100% of the herd.', 'Spell pasture for 120 days where feasible. Clear bush in grazing and milking areas — brown ear ticks quest in humid scrub.', 'Monitor compliance: aim for ≥85% of scheduled dippings on time. GLHIS tracks this per farm.'] },
  { id: 'ka-003', title: 'Feeding the crossbred Friesian for 25 litres+ per day', category: 'Nutrition', excerpt: 'Rations balancing protein, energy and minerals for Kisii smallholders.', read_minutes: 7, body: ['A 550 kg lactating cross yields 20–28 L/day on 2.5–3% body weight DMI. Quality napier or brachiaria is the backbone.', 'Supplement 1 kg concentrate per 2.5–3 L of milk above maintenance, plus 60–80 g mineral lick per day.', 'Magnesium oxide prevents grass tetany during lush growth. Add 50 g per cow daily during flush.', 'Transition cows (3 weeks before/after calving) need controlled concentrate ramp-up to avoid milk fever and ketosis.', 'Body condition score monthly: target 3.0–3.5 at calving, ≤2.5 is production-limiting, ≥4.0 invites dystocia.'] },
  { id: 'ka-004', title: 'Artificial insemination: timing and records that pay back', category: 'Breeding', excerpt: 'Heat detection, conception windows, and calving records every farm should keep.', read_minutes: 4, body: ['Heat lasts 6–24 h; inseminate 12 h after first standing heat for best conception rates.', 'Keep a calving book: date, service date, bull/AI code, expected calving, actual calving, sex, birth weight, complications.', 'Pregnancy check by palpation at 60–90 days or ultrasound at 30 days. Re-serve repeat breeders at the following heat.', 'Target calving interval ≤ 420 days. Longer intervals quietly destroy profitability.'] },
  { id: 'ka-005', title: 'Tick-borne anaemia: PCV triage at the farm gate', category: 'Disease Prevention', excerpt: 'Spot the pale-gummed cow before she collapses — a field guide for farmers.', read_minutes: 5, body: ['Anaplasmosis and babesiosis can fell a cow in 72 hours. Early signs: pale gums, rapid breathing, exercise intolerance, jaundiced sclera, dark urine (babesia).', 'A haematocrit capillary tube and centrifuge tells you PCV; under 24% needs vet attention within hours.', 'Treatment is oxytetracycline LA (anaplasma) or imidocarb (babesia/anaplasma). Do not dose antibiotics without a diagnosis.', 'Build a relationship with your GLHIS-verified vet — response time decides the outcome.'] },
  { id: 'ka-006', title: 'Mastitis control: five points that survive contact with reality', category: 'Disease Prevention', excerpt: 'Gold-standard milking hygiene adapted to one-cow-hand-milking systems.', read_minutes: 6, body: ['1) Fore-strip every quarter into a dark cup — clots are the first tell. 2) Dip teats post-milking. 3) Treat clinical cases immediately. 4) Dry-cow therapy at drying off. 5) Cull chronic cases.', 'Pre-milking teat cleaning with a strip of paper towel per cow. One cloth per cow, never shared.', 'California Mastitis Test (CMT) monthly catches subclinical infections before they explode.', 'Milk the mastitic cow LAST. Discard her milk. Her quarters need to be emptied and treated, not saved for the family.'] },
];

export const GUSII_WARDS = [
  { name: 'Kitutu Chache North', lat: -0.6817, lng: 34.7717 },
  { name: 'Nyaribari Masaba', lat: -0.7156, lng: 34.8135 },
  { name: 'Mugirango West', lat: -0.8231, lng: 34.8123 },
  { name: 'Mugirango East', lat: -0.7820, lng: 34.9001 },
  { name: 'Bomachoge Chache', lat: -0.7052, lng: 34.9533 },
];

export const DISEASES = [
  'Foot & Mouth Disease', 'Acute Mastitis', 'Anaplasmosis', 'East Coast Fever',
  'Lumpy Skin Disease', 'Infectious Bovine Keratoconjunctivitis', 'Blackleg (Clostridium chauvoei)',
  'Milk Fever', 'Bloat', 'Babesiosis', 'Trypanosomosis', 'Worm Infestation',
];
