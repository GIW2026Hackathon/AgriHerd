import type {
  DB, Profile, Farm, Animal, DiseaseCase, CaseEvent, Treatment, Sponsor,
  SponsorMember, FundingPool, Claim, ClaimLineItem, TickControlPlan,
  AIScreening, DiseaseAlert, AppNotification, AuditLog, Role,
} from './types';

const hoursAgo = (h: number) => new Date(Date.now() - h * 3600_000).toISOString();
const daysAgo = (d: number, h = 0) => hoursAgo(d * 24 + h);
const dateOnly = (d: Date) => d.toISOString().slice(0, 10);
const inDays = (n: number) => dateOnly(new Date(Date.now() + n * 86400_000));
const agoDays = (n: number) => dateOnly(new Date(Date.now() - n * 86400_000));

// ---------------------------------------------------------------------------
// PROFILES (demo personas — password for all: demo2026)
// ---------------------------------------------------------------------------
export const DEMO_PASSWORD = 'demo2026';

const profiles: Profile[] = [
  // Farmers
  { id: 'p-f1', full_name: 'Grace Moraa Nyamweya', role: 'farmer', phone: '+254 722 314 508', national_id: '27341096', county: 'Kisii', ward: 'Kiogoro/Riomaguka', organization: null, bio: 'Smallholder dairy farmer, 14-cow Friesian unit. Chair of Riomaguka Dairy Farmers Group.' },
  { id: 'p-f2', full_name: 'Peter Ombasa Ondieki', role: 'farmer', phone: '+254 734 118 260', national_id: '31982241', county: 'Kisii', ward: 'Nyamasocho', organization: null },
  { id: 'p-f3', full_name: 'Esther Kerubo Ogega', role: 'farmer', phone: '+254 710 552 914', national_id: '28874510', county: 'Kisii', ward: 'Rigiro', organization: null },
  { id: 'p-f4', full_name: 'Samuel Mokaya Barongo', role: 'farmer', phone: '+254 725 907 334', national_id: '35120678', county: 'Kisii', ward: 'Gewancha', organization: null },
  { id: 'p-f5', full_name: 'Ruth Nyaboke Omwocha', role: 'farmer', phone: '+254 769 441 027', national_id: '26041789', county: 'Kisii', ward: 'Sironga', organization: null },
  { id: 'p-f6', full_name: 'Daniel Ombati Masinde', role: 'farmer', phone: '+254 701 665 833', national_id: '39441102', county: 'Kisii', ward: 'Nyagoe', organization: null },
  // Veterinary officers
  { id: 'p-v1', full_name: 'Dr. Brian Ongeri', role: 'vet', phone: '+254 722 804 113', national_id: '30219455', county: 'Kisii', ward: 'Kiogoro/Riomaguka', organization: 'Kisii County Veterinary Services', specialty: 'Cattle medicine & ECF', available: true, years_exp: 9, bio: 'ECF and piroplasmosis specialist. LAVS-licensed, KVB No. 2211. Covers Kitutu Chache & Nyaribari.' },
  { id: 'p-v2', full_name: 'Dr. Linet Kemunto', role: 'vet', phone: '+254 733 291 478', national_id: '33550712', county: 'Kisii', ward: 'Rigiro', organization: 'Maziwa Co-operative Veterinary Unit', specialty: 'Dairy herd health & milk QC', available: true, years_exp: 6, bio: 'Milk quality, mastitis control and fertility programmes for co-op farmers.' },
  { id: 'p-v3', full_name: 'Dr. Kevin Mwagi', role: 'vet', phone: '+254 745 118 904', national_id: '35891230', county: 'Kisii', ward: 'Itibo', organization: 'Kisii County Veterinary Services', specialty: 'Field surgery & obstetrics', available: true, years_exp: 11, bio: 'Emergency obstetrics, Caesarean sections and field surgery across Bobasi.' },
  { id: 'p-v4', full_name: 'Dr. Sharon Nyanchama', role: 'vet', phone: '+254 720 667 541', national_id: '36620145', county: 'Kisii', ward: 'Nyamasocho', organization: 'Nyaribari Veterinary Practice', specialty: 'Udder health & mastitis', available: true, years_exp: 7, bio: 'Mastitis diagnostics (CMT, culture) and treatment protocols. Nyaribari & Kitutu.' },
  { id: 'p-v5', full_name: 'Dr. Job Ocharo', role: 'vet', phone: '+254 782 340 119', national_id: '31445567', county: 'Nyamira', ward: 'Kegonga', organization: 'Nyamira County Veterinary Services', specialty: 'Tick-borne diseases', available: false, years_exp: 13, bio: 'Tick-borne disease programmes, acaricide rotation advisory. Currently on annual leave.' },
  { id: 'p-v6', full_name: 'Dr. Purity Moraa', role: 'vet', phone: '+254 711 982 660', national_id: '37819034', county: 'Kisii', ward: 'Manga', organization: 'Manga Animal Clinic', specialty: 'Small ruminants & poultry', available: true, years_exp: 5, bio: 'Goats, sheep and poultry health. Compound feeds and vaccination campaigns.' },
  // Sponsors
  { id: 'p-s1', full_name: 'Maziwa Co-operative — Admin', role: 'sponsor', phone: '+254 709 188 200', national_id: 'ORG-0001', county: 'Kisii', ward: 'Kiogoro/Riomaguka', organization: 'Maziwa Co-operative Union Ltd' },
  { id: 'p-s2', full_name: 'Gusii Fresh Dairy — Admin', role: 'sponsor', phone: '+254 709 456 600', national_id: 'ORG-0002', county: 'Kisii', ward: 'Gewancha', organization: 'Gusii Fresh Dairy Ltd' },
  // County authority
  { id: 'p-c1', full_name: 'Dr. Caroline Mongare — County Director of Veterinary Services', role: 'county', phone: '+254 709 312 400', national_id: 'GOV-2211', county: 'Kisii', ward: 'Ogembo', organization: 'Kisii County Government — Department of Agriculture, Livestock & Fisheries' },
  // Platform admin
  { id: 'p-a1', full_name: 'Daniel Ndubi — GLHVIS Platform Administrator', role: 'admin', phone: '+254 709 000 001', national_id: 'SYS-0001', county: 'Nairobi', ward: 'CBD', organization: 'Gusii Livestock Intelligence Platform' },
];

// ---------------------------------------------------------------------------
// FARMS (8)
// ---------------------------------------------------------------------------
const farms: Farm[] = [
  { id: 'farm-001', farm_code: 'KIS-2026-0147', name: 'Nyagiro Green Dairy', owner_id: 'p-f1', county: 'Kisii', sub_county: 'Kitutu Chache South', ward: 'Kiogoro/Riomaguka', lat: -0.7389, lng: 34.7622, herd_size: 14, primary_breed: 'Friesian × Sahiwal', sponsor_id: 'spn-001', created_at: daysAgo(420) },
  { id: 'farm-002', farm_code: 'KIS-2026-0033', name: 'Ondieki Dairy Unit', owner_id: 'p-f2', county: 'Kisii', sub_county: 'Kitutu Chache South', ward: 'Nyamasocho', lat: -0.7598, lng: 34.7346, herd_size: 9, primary_breed: 'Ayrshire', sponsor_id: 'spn-002', created_at: daysAgo(610) },
  { id: 'farm-003', farm_code: 'KIS-2026-0211', name: 'Kerubo Mixed Farm', owner_id: 'p-f3', county: 'Kisii', sub_county: 'Nyaribari Masaba', ward: 'Rigiro', lat: -0.8411, lng: 34.7369, herd_size: 16, primary_breed: 'Guernsey', sponsor_id: 'spn-001', created_at: daysAgo(380) },
  { id: 'farm-004', farm_code: 'KIS-2026-0176', name: 'Mwagi Highland Dairy', owner_id: 'p-f4', county: 'Kisii', sub_county: 'Nyaribari Chache', ward: 'Gewancha', lat: -0.7241, lng: 34.7929, herd_size: 7, primary_breed: 'Friesian cross', sponsor_id: 'spn-002', created_at: daysAgo(290) },
  { id: 'farm-005', farm_code: 'KIS-2026-0089', name: 'Nyaboke Acres', owner_id: 'p-f5', county: 'Kisii', sub_county: 'Kitutu Chache North', ward: 'Sironga', lat: -0.6683, lng: 34.7431, herd_size: 11, primary_breed: 'Friesian', sponsor_id: 'spn-001', created_at: daysAgo(720) },
  { id: 'farm-006', farm_code: 'KIS-2026-0264', name: 'Ombati Valley Farm', owner_id: 'p-f6', county: 'Kisii', sub_county: 'South Mugirango', ward: 'Nyagoe', lat: -0.8794, lng: 34.8461, herd_size: 12, primary_breed: 'Brown Swiss cross', sponsor_id: 'spn-001', created_at: daysAgo(240) },
  { id: 'farm-007', farm_code: 'KIS-2026-0298', name: 'Kiogoro Annex Pasture Unit', owner_id: 'p-f1', county: 'Kisii', sub_county: 'Kitutu Chache South', ward: 'Nyweri', lat: -0.7358, lng: 34.7248, herd_size: 6, primary_breed: 'Friesian × Sahiwal', sponsor_id: 'spn-001', created_at: daysAgo(150) },
  { id: 'farm-008', farm_code: 'KIS-2026-0355', name: 'Masige Ridge Dairy', owner_id: 'p-f2', county: 'Kisii', sub_county: 'Nyaribari Masaba', ward: 'Masige East', lat: -0.8051, lng: 34.7714, herd_size: 5, primary_breed: 'Ayrshire', sponsor_id: 'spn-002', created_at: daysAgo(90) },
];

// ---------------------------------------------------------------------------
// ANIMALS (23)
// ---------------------------------------------------------------------------
const animals: Animal[] = [
  // farm-001 — Grace (farmer1)
  { id: 'ani-001', tag_number: 'KIS-0147-A1041', farm_id: 'farm-001', species: 'cattle', breed: 'Friesian × Sahiwal', sex: 'female', dob: '2021-03-14', stage: 'lactating', parity: 2, status: 'under_treatment', dam_tag: null, last_milk_yield_kg: 14.5, created_at: daysAgo(420) },
  { id: 'ani-002', tag_number: 'KIS-0147-A1042', farm_id: 'farm-001', species: 'cattle', breed: 'Friesian', sex: 'female', dob: '2019-11-02', stage: 'dry', parity: 4, status: 'healthy', dam_tag: 'KIS-0147-A0975', last_milk_yield_kg: null, created_at: daysAgo(420) },
  { id: 'ani-003', tag_number: 'KIS-0147-A1043', farm_id: 'farm-001', species: 'cattle', breed: 'Friesian × Sahiwal', sex: 'female', dob: '2023-06-21', stage: 'heifer', parity: 0, status: 'healthy', dam_tag: 'KIS-0147-A1041', last_milk_yield_kg: null, created_at: daysAgo(200) },
  { id: 'ani-004', tag_number: 'KIS-0147-A1044', farm_id: 'farm-001', species: 'cattle', breed: 'Friesian', sex: 'female', dob: '2026-07-30', stage: 'calf', parity: 0, status: 'healthy', dam_tag: 'KIS-0147-A1042', last_milk_yield_kg: null, created_at: daysAgo(88) },
  { id: 'ani-005', tag_number: 'KIS-0298-C2210', farm_id: 'farm-007', species: 'cattle', breed: 'Sahiwal', sex: 'female', dob: '2022-01-08', stage: 'lactating', parity: 1, status: 'healthy', dam_tag: null, last_milk_yield_kg: 9.5, created_at: daysAgo(150) },
  // farm-002 — Peter (farmer2)
  { id: 'ani-006', tag_number: 'KIS-0033-B0317', farm_id: 'farm-002', species: 'cattle', breed: 'Ayrshire', sex: 'female', dob: '2020-05-19', stage: 'lactating', parity: 3, status: 'recovered', dam_tag: null, last_milk_yield_kg: 16.0, created_at: daysAgo(610) },
  { id: 'ani-007', tag_number: 'KIS-0033-B0318', farm_id: 'farm-002', species: 'cattle', breed: 'Ayrshire', sex: 'female', dob: '2023-02-11', stage: 'heifer', parity: 0, status: 'healthy', dam_tag: 'KIS-0033-B0317', last_milk_yield_kg: null, created_at: daysAgo(380) },
  { id: 'ani-008', tag_number: 'KIS-0033-B0319', farm_id: 'farm-002', species: 'cattle', breed: 'Ayrshire', sex: 'male', dob: '2022-08-27', stage: 'bullock', parity: 0, status: 'healthy', dam_tag: null, last_milk_yield_kg: null, created_at: daysAgo(500) },
  { id: 'ani-009', tag_number: 'KIS-0355-B1245', farm_id: 'farm-008', species: 'cattle', breed: 'Ayrshire', sex: 'female', dob: '2024-10-05', stage: 'heifer', parity: 0, status: 'healthy', dam_tag: null, last_milk_yield_kg: null, created_at: daysAgo(90) },
  // farm-003 — Esther (farmer3)
  { id: 'ani-010', tag_number: 'KIS-0211-C0871', farm_id: 'farm-003', species: 'cattle', breed: 'Guernsey', sex: 'female', dob: '2021-07-15', stage: 'lactating', parity: 2, status: 'healthy', dam_tag: null, last_milk_yield_kg: 13.5, created_at: daysAgo(380) },
  { id: 'ani-011', tag_number: 'KIS-0211-C0872', farm_id: 'farm-003', species: 'cattle', breed: 'Guernsey', sex: 'female', dob: '2018-09-23', stage: 'lactating', parity: 5, status: 'recovered', dam_tag: null, last_milk_yield_kg: 11.0, created_at: daysAgo(380) },
  { id: 'ani-012', tag_number: 'KIS-0211-C0873', farm_id: 'farm-003', species: 'cattle', breed: 'Guernsey cross', sex: 'female', dob: '2026-09-02', stage: 'calf', parity: 0, status: 'healthy', dam_tag: 'KIS-0211-C0871', last_milk_yield_kg: null, created_at: daysAgo(54) },
  // farm-004 — Samuel (farmer4)
  { id: 'ani-013', tag_number: 'KIS-0176-D0920', farm_id: 'farm-004', species: 'cattle', breed: 'Friesian cross', sex: 'female', dob: '2020-02-08', stage: 'lactating', parity: 3, status: 'under_treatment', dam_tag: null, last_milk_yield_kg: 12.0, created_at: daysAgo(290) },
  { id: 'ani-014', tag_number: 'KIS-0176-D0921', farm_id: 'farm-004', species: 'cattle', breed: 'Friesian', sex: 'female', dob: '2022-05-30', stage: 'lactating', parity: 1, status: 'healthy', dam_tag: null, last_milk_yield_kg: 15.5, created_at: daysAgo(290) },
  { id: 'ani-015', tag_number: 'KIS-0176-D0922', farm_id: 'farm-004', species: 'cattle', breed: 'Friesian cross', sex: 'female', dob: '2025-01-17', stage: 'heifer', parity: 0, status: 'healthy', dam_tag: 'KIS-0176-D0920', last_milk_yield_kg: null, created_at: daysAgo(290) },
  // farm-005 — Ruth (farmer5)
  { id: 'ani-016', tag_number: 'KIS-0089-E0411', farm_id: 'farm-005', species: 'cattle', breed: 'Friesian', sex: 'female', dob: '2021-12-01', stage: 'lactating', parity: 2, status: 'healthy', dam_tag: null, last_milk_yield_kg: 17.0, created_at: daysAgo(720) },
  { id: 'ani-017', tag_number: 'KIS-0089-E0412', farm_id: 'farm-005', species: 'cattle', breed: 'Friesian × Sahiwal', sex: 'female', dob: '2019-06-25', stage: 'lactating', parity: 4, status: 'quarantine', dam_tag: null, last_milk_yield_kg: 8.0, created_at: daysAgo(720) },
  { id: 'ani-018', tag_number: 'KIS-0089-E0413', farm_id: 'farm-005', species: 'cattle', breed: 'Friesian', sex: 'female', dob: '2024-03-09', stage: 'heifer', parity: 0, status: 'healthy', dam_tag: 'KIS-0089-E0411', last_milk_yield_kg: null, created_at: daysAgo(400) },
  // farm-006 — Daniel (farmer6)
  { id: 'ani-019', tag_number: 'KIS-0264-F0715', farm_id: 'farm-006', species: 'cattle', breed: 'Brown Swiss cross', sex: 'female', dob: '2021-04-18', stage: 'lactating', parity: 2, status: 'under_treatment', dam_tag: null, last_milk_yield_kg: 10.0, created_at: daysAgo(240) },
  { id: 'ani-020', tag_number: 'KIS-0264-F0716', farm_id: 'farm-006', species: 'cattle', breed: 'Brown Swiss', sex: 'female', dob: '2023-08-14', stage: 'heifer', parity: 0, status: 'healthy', dam_tag: null, last_milk_yield_kg: null, created_at: daysAgo(240) },
  { id: 'ani-021', tag_number: 'KIS-0264-F0717', farm_id: 'farm-006', species: 'cattle', breed: 'Holstein', sex: 'female', dob: '2020-10-29', stage: 'dry', parity: 3, status: 'healthy', dam_tag: null, last_milk_yield_kg: null, created_at: daysAgo(240) },
  { id: 'ani-022', tag_number: 'KIS-0264-F0718', farm_id: 'farm-006', species: 'cattle', breed: 'Brown Swiss cross', sex: 'male', dob: '2022-03-05', stage: 'bullock', parity: 0, status: 'healthy', dam_tag: null, last_milk_yield_kg: null, created_at: daysAgo(240) },
  { id: 'ani-023', tag_number: 'KIS-0264-F0719', farm_id: 'farm-006', species: 'cattle', breed: 'Holstein', sex: 'female', dob: '2025-06-12', stage: 'calf', parity: 0, status: 'healthy', dam_tag: 'KIS-0264-F0715', last_milk_yield_kg: null, created_at: daysAgo(120) },
];

// ---------------------------------------------------------------------------
// CASES (6) — FS-2041 is the flagship ECF emergency
// ---------------------------------------------------------------------------
const cases: DiseaseCase[] = [
  { id: 'case-2041', case_number: 'FS-2041', animal_id: 'ani-019', farm_id: 'farm-006', reported_by: 'p-f6', assigned_vet_id: 'p-v1',
    chief_complaint: 'Cow down, high fever 40.9°C, not eating, swollen parotid lymph nodes, lacrimation',
    symptoms: ['high_fever', 'anorexia', 'swollen_lymph_nodes', 'lachrymation', 'depression', 'drop_yield'],
    ai_confidence: 0.87, priority: 'emergency', status: 'in_treatment', ward: 'Nyagoe', county: 'Kisii',
    diagnosis: 'East Coast Fever (Theileria parva)', outcome: null,
    ai_differential: [
      { disease: 'East Coast Fever', confidence: 0.87, urgency: 'emergency', advice: 'Immediate buparvaquone (Clexon) 2.5 mg/kg IM single dose under vet supervision. Isolate animal. Monitor temperature every 6h.' },
      { disease: 'Anaplasmosis', confidence: 0.06, urgency: 'priority', advice: 'Oxytetracycline LA 20 mg/kg; check PCV if no response in 48h.' },
      { disease: 'Heartwater', confidence: 0.04, urgency: 'priority', advice: 'Oxytetracycline if neurological signs develop; differentiate by post-mortem brain smear.' },
      { disease: 'Rift Valley Fever', confidence: 0.03, urgency: 'emergency', advice: 'Notify county within 2h. Isolate. No movement of animals off farm.' },
    ],
    created_at: daysAgo(2, 6), updated_at: hoursAgo(5), closed_at: null },
  { id: 'case-2039', case_number: 'FS-2039', animal_id: 'ani-013', farm_id: 'farm-004', reported_by: 'p-f4', assigned_vet_id: 'p-v4',
    chief_complaint: 'Right hind quarter hard, hot, painful; clots in milk; reduced yield 16→11 L',
    symptoms: ['swollen_udder', 'clots_in_milk', 'drop_yield', 'pain', 'hot_udder'],
    ai_confidence: 0.81, priority: 'priority', status: 'in_treatment', ward: 'Gewancha', county: 'Kisii',
    diagnosis: 'Clinical mastitis (Staphylococcus aureus suspected)', outcome: null,
    ai_differential: [
      { disease: 'Clinical mastitis (Staph. aureus)', confidence: 0.81, urgency: 'priority', advice: 'Intramammary cloxacillin 3 tubes 12h apart + flunixin meglumine. Strip quarter every 4h. Withhold milk 96h.' },
      { disease: 'Environmental mastitis (E. coli)', confidence: 0.12, urgency: 'priority', advice: 'If fever >40°C and watery milk, switch to systemic ceftiofur; fluids IV.' },
      { disease: 'Udder oedema', confidence: 0.07, urgency: 'routine', advice: 'Monitor; usually resolves post-calving. NSAIDs only if painful.' },
    ],
    created_at: daysAgo(4, 3), updated_at: hoursAgo(9), closed_at: null },
  { id: 'case-2033', case_number: 'FS-2033', animal_id: 'ani-017', farm_id: 'farm-005', reported_by: 'p-f5', assigned_vet_id: 'p-v1',
    chief_complaint: 'Raised firm skin nodules 1–3 cm on neck, flanks and perineum; mild fever; reduced grazing',
    symptoms: ['skin_nodules', 'mild_fever', 'anorexia', 'lacrimation'],
    ai_confidence: 0.78, priority: 'priority', status: 'monitoring', ward: 'Sironga', county: 'Kisii',
    diagnosis: 'Lumpy Skin Disease (suspected)', outcome: null,
    ai_differential: [
      { disease: 'Lumpy Skin Disease', confidence: 0.78, urgency: 'priority', advice: 'Isolate cow, strict fly control, report to county vet office within 24h. Secondary bacterial control with oxytetracycline if needed.' },
      { disease: 'Dermatophilosis', confidence: 0.14, urgency: 'routine', advice: 'Crust removal + oxytetracycline LA. Keep skin dry, improve nutrition.' },
      { disease: 'Pseudo-lumpy skin disease', confidence: 0.08, urgency: 'routine', advice: 'Self-limiting; symptomatic care only. Monitor herd contacts.' },
    ],
    created_at: daysAgo(8), updated_at: hoursAgo(26), closed_at: null },
  { id: 'case-2028', case_number: 'FS-2028', animal_id: 'ani-006', farm_id: 'farm-002', reported_by: 'p-f2', assigned_vet_id: 'p-v4',
    chief_complaint: 'Down cow 6 days post-calving, cold ears, muscle tremors, unresponsive to shouting',
    symptoms: ['down_cow', 'cold_extremities', 'muscle_tremor', 'post_calving'],
    ai_confidence: 0.9, priority: 'priority', status: 'recovered', ward: 'Nyamasocho', county: 'Kisii',
    diagnosis: 'Hypocalcaemia (milk fever)', outcome: 'Recovered after IV calcium borogluconate; standing within 6 hours.',
    ai_differential: [
      { disease: 'Hypocalcaemia (milk fever)', confidence: 0.9, urgency: 'priority', advice: 'IV calcium borogluconate 500 ml slowly over 10 min. Monitor heart during infusion. Do not milk fully for 48h.' },
      { disease: 'Ketosis', confidence: 0.06, urgency: 'routine', advice: 'Check urine/milk ketones; propylene glycol drench if positive.' },
      { disease: 'Toxaemic metritis', confidence: 0.04, urgency: 'emergency', advice: 'If foul discharge + fever >40°C: ceftiofur + uterine lavage. Re-examine.' },
    ],
    created_at: daysAgo(16), updated_at: daysAgo(13), closed_at: daysAgo(13) },
  { id: 'case-2024', case_number: 'FS-2024', animal_id: 'ani-001', farm_id: 'farm-001', reported_by: 'p-f1', assigned_vet_id: 'p-v1',
    chief_complaint: 'Pale mucous membranes, temperature 39.8°C, sudden yield drop 14.5→9 L, ticks seen on perineum',
    symptoms: ['pale_mucous_membranes', 'fever', 'drop_yield', 'ticks_observed'],
    ai_confidence: 0.66, priority: 'routine', status: 'triaged', ward: 'Kiogoro/Riomaguka', county: 'Kisii',
    diagnosis: 'Anaplasmosis (suspected tick-borne)', outcome: null,
    ai_differential: [
      { disease: 'Anaplasmosis', confidence: 0.66, urgency: 'priority', advice: 'Oxytetracycline LA 20 mg/kg repeat in 72h. Tick dip whole herd. Check PCV.' },
      { disease: 'Babesiosis', confidence: 0.22, urgency: 'priority', advice: 'Imidocarb dipropionate 1.2 mg/kg SC if red urine observed.' },
      { disease: 'Nutritional anaemia', confidence: 0.12, urgency: 'routine', advice: 'Review protein/mineral intake; recheck in 14 days.' },
    ],
    created_at: daysAgo(1, 7), updated_at: hoursAgo(14), closed_at: null },
  { id: 'case-2019', case_number: 'FS-2019', animal_id: 'ani-012', farm_id: 'farm-003', reported_by: 'p-f3', assigned_vet_id: null,
    chief_complaint: 'Calf 7 weeks — profuse watery diarrhoea 2 days, weak, not suckling well',
    symptoms: ['diarrhoea', 'weakness', 'poor_suckling', 'calf'],
    ai_confidence: 0.72, priority: 'routine', status: 'submitted', ward: 'Rigiro', county: 'Kisii',
    diagnosis: null, outcome: null,
    ai_differential: [
      { disease: 'Calf scours (mixed — ETEC/rotavirus)', confidence: 0.72, urgency: 'priority', advice: 'Oral rehydration (Lectade) 2 L 3× daily; continue milk feeding. Isolate calf. If fever, vet review.' },
      { disease: 'Coccidiosis', confidence: 0.18, urgency: 'routine', advice: 'Toltrazuril drench if blood in faeces or >2 weeks duration.' },
      { disease: 'Salmonellosis', confidence: 0.10, urgency: 'priority', advice: 'If septicaemia signs (very high fever, recumbency): emergency vet + antibiotics.' },
    ],
    created_at: daysAgo(0, 3), updated_at: hoursAgo(3), closed_at: null },
];

// ---------------------------------------------------------------------------
// CASE EVENTS
// ---------------------------------------------------------------------------
const events: CaseEvent[] = [
  { id: 'ev-1', case_id: 'case-2041', actor_id: 'p-f6', actor_role: 'farmer', event_type: 'created', body: 'Farmer reported sick cow via AI triage — screening flagged emergency (87% confidence, anaemia/ECF differential).', meta: null, created_at: daysAgo(2, 6) },
  { id: 'ev-2', case_id: 'case-2041', actor_id: 'p-v1', actor_role: 'vet', event_type: 'assigned', body: 'Assigned to Dr. Brian Ongeri (nearest available vet, 4.2 km). SMS alert sent.', meta: { eta_min: 35 }, created_at: daysAgo(2, 6) },
  { id: 'ev-3', case_id: 'case-2041', actor_id: 'p-v1', actor_role: 'vet', event_type: 'visit', body: 'Farm visit: cow down in pen, 40.9°C, enlarged parotid LN (grapefruit), pale sclera, T. parva schizonts on LN smear. ECF confirmed presumptive.', meta: null, created_at: daysAgo(2, 5) },
  { id: 'ev-4', case_id: 'case-2041', actor_id: 'p-v1', actor_role: 'vet', event_type: 'treatment', body: 'Buparvaquone 2.5 mg/kg (12 ml IM) + oxytetracycline LA 20 mg/kg + IV fluids 5 L. Advised isolation and fly control.', meta: { drug: 'Buparvaquone', dose_mg_kg: 2.5 }, created_at: daysAgo(2, 5) },
  { id: 'ev-5', case_id: 'case-2041', actor_id: 'p-v1', actor_role: 'vet', event_type: 'treatment', body: 'Day 2 review: temperature 39.4°C (improving), cow standing and nibbling hay. Continue oxytetracycline; recheck tomorrow.', meta: null, created_at: daysAgo(1, 2) },
  { id: 'ev-6', case_id: 'case-2041', actor_id: 'p-f6', actor_role: 'farmer', event_type: 'note', body: 'Cow stood up this morning and took water. Willing to re-treat if temperature rises again.', meta: null, created_at: hoursAgo(6) },

  { id: 'ev-7', case_id: 'case-2039', actor_id: 'p-f4', actor_role: 'farmer', event_type: 'created', body: 'Right hind quarter hot and painful; clots in milk this morning.', meta: null, created_at: daysAgo(4, 3) },
  { id: 'ev-8', case_id: 'case-2039', actor_id: 'p-v4', actor_role: 'vet', event_type: 'assigned', body: 'Assigned to Dr. Sharon Nyanchama (mastitis specialist, 6.1 km).', meta: null, created_at: daysAgo(4, 3) },
  { id: 'ev-9', case_id: 'case-2039', actor_id: 'p-v4', actor_role: 'vet', event_type: 'visit', body: 'CMT positive (3+) right hind; quarter hard and hot. Collected milk sample for culture. Started intramammary cloxacillin + flunixin.', meta: { cmt: '3+' }, created_at: daysAgo(4, 2) },
  { id: 'ev-10', case_id: 'case-2039', actor_id: 'p-v4', actor_role: 'vet', event_type: 'treatment', body: 'Day 3: quarter still firm, clots reducing, cow eating normally. Continue intramammary series; strip every 4h.', meta: null, created_at: hoursAgo(9) },

  { id: 'ev-11', case_id: 'case-2033', actor_id: 'p-f5', actor_role: 'farmer', event_type: 'created', body: 'Multiple firm skin nodules observed on neck and flanks. Cow still eating.', meta: null, created_at: daysAgo(8) },
  { id: 'ev-12', case_id: 'case-2033', actor_id: 'p-v1', actor_role: 'vet', event_type: 'assigned', body: 'Assigned to Dr. Brian Ongeri. County DVS notified as LSD is notifiable.', meta: null, created_at: daysAgo(8) },
  { id: 'ev-13', case_id: 'case-2033', actor_id: 'p-v1', actor_role: 'vet', event_type: 'visit', body: 'Nodules 1–3 cm firm on neck/flanks/perineum; 39.2°C. Presumptive LSD. Samples sent to KALRO — results pending. Strict isolation + vector control advised.', meta: null, created_at: daysAgo(7) },
  { id: 'ev-14', case_id: 'case-2033', actor_id: 'p-v1', actor_role: 'vet', event_type: 'escalated', body: 'Reported to Kisii County DVS under disease surveillance protocol (LSD suspected). Ward alert watch status raised.', meta: { ward: 'Sironga' }, created_at: daysAgo(7) },

  { id: 'ev-15', case_id: 'case-2028', actor_id: 'p-f2', actor_role: 'farmer', event_type: 'created', body: 'Calving cow down, cold ears, trembling — please come urgently.', meta: null, created_at: daysAgo(16) },
  { id: 'ev-16', case_id: 'case-2028', actor_id: 'p-v4', actor_role: 'vet', event_type: 'assigned', body: 'Assigned to Dr. Sharon Nyanchama.', meta: null, created_at: daysAgo(16) },
  { id: 'ev-17', case_id: 'case-2028', actor_id: 'p-v4', actor_role: 'vet', event_type: 'treatment', body: 'IV calcium borogluconate 500 ml over 10 min. Cow attempted to rise at 4h; standing and eating at 6h.', meta: null, created_at: daysAgo(16) },
  { id: 'ev-18', case_id: 'case-2028', actor_id: 'p-v4', actor_role: 'vet', event_type: 'recovered', body: 'Day 3 re-check: bright, alert, yield recovering (12 L). Withdrawal period observed — milk fit for delivery from day 5. Case closed.', meta: null, created_at: daysAgo(13) },

  { id: 'ev-19', case_id: 'case-2024', actor_id: 'p-f1', actor_role: 'farmer', event_type: 'created', body: 'Yield dropped from 14.5 to 9 litres overnight; cow looks pale; ticks on perineum.', meta: null, created_at: daysAgo(1, 7) },
  { id: 'ev-20', case_id: 'case-2024', actor_id: 'p-v1', actor_role: 'vet', event_type: 'triaged', body: 'Triage: likely anaplasmosis — same tick-borne complex hitting Kitutu Chache. Out-of-station, farm visit scheduled tomorrow 7:30 AM.', meta: null, created_at: hoursAgo(14) },

  { id: 'ev-21', case_id: 'case-2019', actor_id: 'p-f3', actor_role: 'farmer', event_type: 'created', body: 'Calf with watery diarrhoea since yesterday; weak and not suckling well. Seeking vet advice.', meta: null, created_at: hoursAgo(3) },
];

// ---------------------------------------------------------------------------
// TREATMENTS
// ---------------------------------------------------------------------------
const treatments: Treatment[] = [
  { id: 'tr-1', case_id: 'case-2041', administered_by: 'p-v1', drug_name: 'Buparvaquone 5% (Clexon)', dosage: '12 ml (2.5 mg/kg) IM', route: 'IM', withdrawal_days: 2, cost_kes: 4800, administered_at: daysAgo(2, 5), notes: 'Single-dose ECF therapy, right neck muscle.' },
  { id: 'tr-2', case_id: 'case-2041', administered_by: 'p-v1', drug_name: 'Oxytetracycline LA 20%', dosage: '24 ml (20 mg/kg) IM', route: 'IM', withdrawal_days: 7, cost_kes: 1200, administered_at: daysAgo(2, 5), notes: 'Supportive broad-spectrum cover.' },
  { id: 'tr-3', case_id: 'case-2041', administered_by: 'p-v1', drug_name: 'Ringers Lactate IV', dosage: '5 L IV over 2 h', route: 'IV', withdrawal_days: 0, cost_kes: 900, administered_at: daysAgo(2, 5), notes: 'Rehydration.' },
  { id: 'tr-4', case_id: 'case-2041', administered_by: 'p-v1', drug_name: 'Oxytetracycline LA 20% (Day 2)', dosage: '24 ml IM', route: 'IM', withdrawal_days: 7, cost_kes: 1100, administered_at: daysAgo(1, 2), notes: 'Follow-up dose.' },
  { id: 'tr-5', case_id: 'case-2039', administered_by: 'p-v4', drug_name: 'Cloxacillin intramammary (Orbeseal-type)', dosage: '1 tube per quarter, 3 tubes q12h', route: 'intramammary', withdrawal_days: 4, cost_kes: 1800, administered_at: daysAgo(4, 2), notes: 'Right hind only. Milk withheld 96h.' },
  { id: 'tr-6', case_id: 'case-2039', administered_by: 'p-v4', drug_name: 'Flunixin meglumine (Finixin)', dosage: '10 ml IV once daily × 3', route: 'IV', withdrawal_days: 2, cost_kes: 650, administered_at: daysAgo(4, 2), notes: 'Anti-inflammatory + analgesic.' },
  { id: 'tr-7', case_id: 'case-2028', administered_by: 'p-v4', drug_name: 'Calcium borogluconate 24%', dosage: '500 ml IV slow over 10 min', route: 'IV', withdrawal_days: 0, cost_kes: 850, administered_at: daysAgo(16), notes: 'Standard milk-fever dose, heart monitored during infusion.' },
  { id: 'tr-8', case_id: 'case-2024', administered_by: 'p-v1', drug_name: 'Oxytetracycline LA 20%', dosage: '25 ml IM', route: 'IM', withdrawal_days: 7, cost_kes: 900, administered_at: hoursAgo(14), notes: 'First dose; repeat in 72h.' },
];

// ---------------------------------------------------------------------------
// SPONSORS & POOLS
// ---------------------------------------------------------------------------
const sponsors: Sponsor[] = [
  { id: 'spn-001', profile_id: 'p-s1', company_name: 'Maziwa Co-operative Union Ltd', co_op_reg_no: 'COOP/KIS/2019/0452', contact_email: 'health@maziwacoop.co.ke' },
  { id: 'spn-002', profile_id: 'p-s2', company_name: 'Gusii Fresh Dairy Ltd', co_op_reg_no: null, contact_email: 'farmerhealth@gusiifreshdairy.co.ke' },
];

const sponsorMembers: SponsorMember[] = [
  { sponsor_id: 'spn-001', farmer_id: 'p-f1', joined_at: daysAgo(400), coverage_tier: 'premium' },
  { sponsor_id: 'spn-001', farmer_id: 'p-f3', joined_at: daysAgo(300), coverage_tier: 'standard' },
  { sponsor_id: 'spn-001', farmer_id: 'p-f5', joined_at: daysAgo(650), coverage_tier: 'standard' },
  { sponsor_id: 'spn-001', farmer_id: 'p-f6', joined_at: daysAgo(200), coverage_tier: 'premium' },
  { sponsor_id: 'spn-002', farmer_id: 'p-f2', joined_at: daysAgo(500), coverage_tier: 'standard' },
  { sponsor_id: 'spn-002', farmer_id: 'p-f4', joined_at: daysAgo(220), coverage_tier: 'basic' },
];

const pools: FundingPool[] = [
  { id: 'pool-001', sponsor_id: 'spn-001', name: 'Dairy Wellness Fund FY2026', total_kes: 4_500_000, committed_kes: 2_845_000, disbursed_kes: 1_412_500, period_start: '2026-01-01', period_end: '2026-12-31', active: true },
  { id: 'pool-002', sponsor_id: 'spn-001', name: 'Tick Eradication Drive 2026', total_kes: 850_000, committed_kes: 612_000, disbursed_kes: 388_000, period_start: '2026-07-01', period_end: '2026-12-31', active: true },
  { id: 'pool-003', sponsor_id: 'spn-002', name: 'Farmer Health Pool 2026', total_kes: 6_200_000, committed_kes: 3_150_000, disbursed_kes: 1_980_000, period_start: '2026-01-01', period_end: '2026-12-31', active: true },
];

// ---------------------------------------------------------------------------
// CLAIMS — one per lifecycle state
// ---------------------------------------------------------------------------
const claims: Claim[] = [
  { id: 'clm-001', claim_number: 'CLM-0094', case_id: 'case-2024', farm_id: 'farm-001', requested_by: 'p-f1',
    sponsor_id: 'spn-001', pool_id: 'pool-001', amount_kes: 3900, status: 'draft',
    vet_recommendation: null, reviewer_id: null, review_note: null, disbursement_ref: null,
    submitted_at: null, reviewed_at: null, disbursed_at: null, created_at: hoursAgo(10), updated_at: hoursAgo(10) },
  { id: 'clm-002', claim_number: 'CLM-0093', case_id: 'case-2039', farm_id: 'farm-004', requested_by: 'p-f4',
    sponsor_id: 'spn-002', pool_id: 'pool-003', amount_kes: 6750, status: 'under_review',
    vet_recommendation: 'Treatment protocol followed correctly; cloxacillin appropriate for confirmed CMT 3+. Recommend approval.',
    reviewer_id: null, review_note: null, disbursement_ref: null,
    submitted_at: daysAgo(2, 4), reviewed_at: null, disbursed_at: null, created_at: daysAgo(2, 5), updated_at: daysAgo(1, 2) },
  { id: 'clm-003', claim_number: 'CLM-0088', case_id: 'case-2028', farm_id: 'farm-002', requested_by: 'p-f2',
    sponsor_id: 'spn-002', pool_id: 'pool-003', amount_kes: 5150, status: 'approved',
    vet_recommendation: 'Milk fever responded fully to single IV calcium. Claim is reasonable and within policy.',
    reviewer_id: 'p-s2', review_note: 'Approved — within premium tier cover. Pay out on next EFT batch.', disbursement_ref: null,
    submitted_at: daysAgo(13), reviewed_at: daysAgo(11), disbursed_at: null, created_at: daysAgo(14), updated_at: daysAgo(11) },
  { id: 'clm-004', claim_number: 'CLM-0092', case_id: 'case-2041', farm_id: 'farm-006', requested_by: 'p-f6',
    sponsor_id: 'spn-001', pool_id: 'pool-001', amount_kes: 11900, status: 'disbursed',
    vet_recommendation: 'ECF — buparvaquone first-line, correct dose and route. Animal recovering.',
    reviewer_id: 'p-s1', review_note: 'Approved within Dairy Wellness Fund coverage (premium tier). Disbursed via M-Pesa.',
    disbursement_ref: 'MOCK-MPESA-SD76K2918ATM', submitted_at: daysAgo(2, 2), reviewed_at: daysAgo(1, 6), disbursed_at: daysAgo(1),
    created_at: daysAgo(2, 3), updated_at: daysAgo(1) },
];

const claimItems: ClaimLineItem[] = [
  { id: 'li-1', claim_id: 'clm-001', description: 'Farm visit — vet call-out (Nyamasocho corridor)', category: 'vet_fee', qty: 1, unit_kes: 3000 },
  { id: 'li-2', claim_id: 'clm-001', description: 'Oxytetracycline LA 20%, 25 ml', category: 'drug', qty: 1, unit_kes: 900 },

  { id: 'li-3', claim_id: 'clm-002', description: 'Farm visit — Dr. Sharon Nyanchama', category: 'vet_fee', qty: 1, unit_kes: 3500 },
  { id: 'li-4', claim_id: 'clm-002', description: 'Cloxacillin intramammary — full course', category: 'drug', qty: 3, unit_kes: 600 },
  { id: 'li-5', claim_id: 'clm-002', description: 'Flunixin meglumine — 3-day course', category: 'drug', qty: 3, unit_kes: 217 },
  { id: 'li-6', claim_id: 'clm-002', description: 'Transport — Nyaribari Chache', category: 'transport', qty: 1, unit_kes: 800 },

  { id: 'li-7', claim_id: 'clm-003', description: 'Farm visit — Dr. Sharon Nyanchama', category: 'vet_fee', qty: 1, unit_kes: 3500 },
  { id: 'li-8', claim_id: 'clm-003', description: 'Calcium borogluconate 24% — 500 ml', category: 'drug', qty: 1, unit_kes: 850 },
  { id: 'li-9', claim_id: 'clm-003', description: 'Transport — Nyamasocho', category: 'transport', qty: 1, unit_kes: 800 },

  { id: 'li-10', claim_id: 'clm-004', description: 'Farm visit — Dr. Brian Ongeri (emergency ECF)', category: 'vet_fee', qty: 1, unit_kes: 3500 },
  { id: 'li-11', claim_id: 'clm-004', description: 'Buparvaquone 5% (Clexon) — single dose', category: 'drug', qty: 1, unit_kes: 4800 },
  { id: 'li-12', claim_id: 'clm-004', description: 'Oxytetracycline LA 20%', category: 'drug', qty: 2, unit_kes: 1100 },
  { id: 'li-13', claim_id: 'clm-004', description: 'IV fluids Ringers Lactate 5 L', category: 'drug', qty: 1, unit_kes: 900 },
  { id: 'li-14', claim_id: 'clm-004', description: 'LN smear microscopy — presumptive ECF confirmation', category: 'lab', qty: 1, unit_kes: 1500 },
];

// ---------------------------------------------------------------------------
// TICK-CONTROL PLANS
// ---------------------------------------------------------------------------
const tickPlans: TickControlPlan[] = [
  { id: 'tp-1', farm_id: 'farm-001', created_by: 'p-f1', product: 'Amitraz 12.5% EC (Triatix)', interval_days: 14, last_dip_date: agoDays(11), next_dip_date: inDays(3), deworm_next: inDays(45), vaccine_next: inDays(120), acaricide_note: 'Rotate to Cypermethrin 10% EC after 6 months to manage amitraz resistance in Kitutu Chache. Dip on Tuesdays 8 AM at Nyagiro crush.' },
  { id: 'tp-2', farm_id: 'farm-003', created_by: 'p-f3', product: 'Cypermethrin 10% EC (Cypertex)', interval_days: 14, last_dip_date: agoDays(6), next_dip_date: inDays(8), deworm_next: inDays(30), vaccine_next: inDays(75), acaricide_note: 'Standard rotation. Guernsey herd dips well on Sundays.' },
  { id: 'tp-3', farm_id: 'farm-005', created_by: 'p-f5', product: 'Amitraz 12.5% EC', interval_days: 14, last_dip_date: agoDays(17), next_dip_date: inDays(-3), deworm_next: inDays(12), vaccine_next: inDays(60), acaricide_note: 'OVERDUE — LSD quarantine in progress; dip around quarantine yard. County has been notified.' },
  { id: 'tp-4', farm_id: 'farm-006', created_by: 'p-f6', product: 'Amitraz 12.5% EC', interval_days: 10, last_dip_date: agoDays(2), next_dip_date: inDays(8), deworm_next: inDays(20), vaccine_next: inDays(90), acaricide_note: 'Accelerated 10-day cycle after ECF case — tick vector pressure high at Nyagoe.' },
];

// ---------------------------------------------------------------------------
// AI SCREENINGS
// ---------------------------------------------------------------------------
const screenings: AIScreening[] = [
  { id: 'scr-1', farm_id: 'farm-006', animal_id: 'ani-019', performed_by: 'p-f6',
    symptoms: ['high_fever', 'anorexia', 'swollen_lymph_nodes', 'lachrymation', 'depression', 'drop_yield'],
    engine: 'deterministic_rules', urgency: 'emergency', case_id: 'case-2041',
    differential: cases[0].ai_differential!,
    created_at: daysAgo(2, 6) },
  { id: 'scr-2', farm_id: 'farm-003', animal_id: 'ani-012', performed_by: 'p-f3',
    symptoms: ['diarrhoea', 'weakness', 'poor_suckling', 'calf'],
    engine: 'deterministic_rules', urgency: 'priority', case_id: 'case-2019',
    differential: cases[5].ai_differential!,
    created_at: hoursAgo(3) },
];

// ---------------------------------------------------------------------------
// SURVEILLANCE ALERTS
// ---------------------------------------------------------------------------
const alerts: DiseaseAlert[] = [
  { id: 'al-1', county: 'Kisii', ward: 'Kiogoro/Riomaguka', disease: 'East Coast Fever', severity: 'critical', status: 'active',
    case_count: 6, threshold: 4, summary: 'Six confirmed/suspected ECF cases in Kitutu Chache South within 14 days (threshold 4). Vectors abundant post-short-rains; tick dip compliance at 61%. Immediate acaricide programme and farmer SMS advisory recommended.',
    acknowledged_by: null, acknowledged_at: null, window_start: agoDays(14), created_at: hoursAgo(7) },
  { id: 'al-2', county: 'Kisii', ward: 'Sironga', disease: 'Lumpy Skin Disease', severity: 'critical', status: 'active',
    case_count: 5, threshold: 4, summary: 'Five LSD-suspect cases across Sironga and Matara in 14 days. One case confirmed by KALRO PCR (index case). Movement control recommended for Sironga sub-location.',
    acknowledged_by: null, acknowledged_at: null, window_start: agoDays(14), created_at: hoursAgo(15) },
  { id: 'al-3', county: 'Kisii', ward: 'Gewancha', disease: 'Mastitis (cluster)', severity: 'watch', status: 'acknowledged',
    case_count: 4, threshold: 4, summary: 'Four clinical mastitis cases in Nyaribari Chache linked to single bulk tank at a co-op collection point. Hygiene audit of collection equipment scheduled.',
    acknowledged_by: 'p-c1', acknowledged_at: hoursAgo(30), window_start: agoDays(14), created_at: daysAgo(2) },
  { id: 'al-4', county: 'Kisii', ward: 'Itibo', disease: 'CBPP (contagious bovine pleuropneumonia)', severity: 'alert', status: 'acknowledged',
    case_count: 3, threshold: 3, summary: 'Three CBPP-suspect pneumonia cases in Bobasi. Samples at KALRO Kabete. Movement restriction notices issued to three sub-locations.',
    acknowledged_by: 'p-c1', acknowledged_at: daysAgo(3), window_start: agoDays(14), created_at: daysAgo(4) },
  { id: 'al-5', county: 'Nyamira', ward: 'Kebirigo', disease: 'Rift Valley Fever (vector surveillance)', severity: 'info', status: 'active',
    case_count: 1, threshold: 2, summary: 'Seasonal RVF vector (Aedes) larval sites detected near dams in Kebirigo. Adult trapping underway; no animal cases yet. Stand-by notifiable disease reporting.',
    acknowledged_by: null, acknowledged_at: null, window_start: agoDays(14), created_at: daysAgo(5) },
  { id: 'al-6', county: 'Kisii', ward: 'Mosobeti', disease: 'Anaplasmosis', severity: 'watch', status: 'resolved',
    case_count: 5, threshold: 4, summary: 'Anaplasmosis cluster in South Mugirango — 5 cases over 14 days, now resolved after co-ordinated dip campaign (17 Oct) and oxytetracycline treatment of affected herds.',
    acknowledged_by: 'p-c1', acknowledged_at: daysAgo(9), window_start: agoDays(28), created_at: daysAgo(11) },
];

// ---------------------------------------------------------------------------
// NOTIFICATIONS
// ---------------------------------------------------------------------------
const notifications: AppNotification[] = [
  { id: 'ntf-1', user_id: 'p-f6', title: 'Emergency vet dispatched', body: 'Dr. Brian Ongeri is en route to Ombati Valley Farm (ETA 35 min) for FS-2041 — ECF treatment.', kind: 'case', read: true, sms_sent: true, created_at: daysAgo(2, 6) },
  { id: 'ntf-2', user_id: 'p-f6', title: 'Claim CLM-0092 disbursed', body: 'KES 11,900 has been sent via M-Pesa (Ref MOCK-MPESA-SD76K2918ATM) for FS-2041 treatment.', kind: 'claim', read: false, sms_sent: true, created_at: daysAgo(1) },
  { id: 'ntf-3', user_id: 'p-f1', title: 'FS-2024 triaged — visit scheduled', body: 'Dr. Brian Ongeri will visit tomorrow 7:30 AM for anaplasmosis review. Cow is on oxytetracycline day 1 of 2.', kind: 'case', read: false, sms_sent: true, created_at: hoursAgo(14) },
  { id: 'ntf-4', user_id: 'p-f1', title: 'Claim CLM-0094 ready to submit', body: 'Draft claim for FS-2024 (KES 3,900) is waiting for your review and submission to Maziwa Co-operative.', kind: 'claim', read: false, sms_sent: false, created_at: hoursAgo(10) },
  { id: 'ntf-5', user_id: 'p-v1', title: 'New assignment: FS-2024', body: 'Grace Moraa Nyamweya (Nyagiro Green Dairy, Kiogoro/Riomaguka) — suspected anaplasmosis. Farm visit tomorrow 7:30 AM.', kind: 'case', read: false, sms_sent: true, created_at: hoursAgo(14) },
  { id: 'ntf-6', user_id: 'p-v1', title: 'Critical ECF alert — Kitutu Chache', body: 'County has flagged 6 ECF cases in 14 days. Your assigned farms (Kiogoro, Nyagoe) are both in the hotspot. Extra vigilance on tomorrow’s visits.', kind: 'alert', read: false, sms_sent: true, created_at: hoursAgo(7) },
  { id: 'ntf-7', user_id: 'p-v4', title: 'Claim review requested: CLM-0093', body: 'Gusii Fresh Dairy asked for your clinical recommendation on Samuel Mokaya’s mastitis claim (KES 6,750).', kind: 'claim', read: true, sms_sent: true, created_at: daysAgo(2, 4) },
  { id: 'ntf-8', user_id: 'p-s1', title: 'Claim awaiting your approval: CLM-0093', body: 'FS-2039 — mastitis treatment at Mwagi Highland Dairy. Amount KES 6,750, premium pool utilisation 63%.', kind: 'claim', read: false, sms_sent: false, created_at: daysAgo(2, 4) },
  { id: 'ntf-9', user_id: 'p-c1', title: '2 critical alerts need acknowledgement', body: 'ECF surge (Kiogoro/Riomaguka, 6 cases) and LSD cluster (Sironga, 5 cases) exceed ward thresholds and await your acknowledgement.', kind: 'alert', read: false, sms_sent: true, created_at: hoursAgo(7) },
  { id: 'ntf-10', user_id: 'p-f5', title: 'LSD quarantine notice remains active', body: 'E0412 must remain isolated. Do not move cattle off Nyaboke Acres until KALRO results and county sign-off.', kind: 'alert', read: false, sms_sent: true, created_at: daysAgo(7) },
  { id: 'ntf-11', user_id: 'p-f2', title: 'Claim CLM-0088 approved', body: 'Your milk fever claim of KES 5,150 was approved by Gusii Fresh Dairy. Disbursement on next EFT batch.', kind: 'claim', read: true, sms_sent: true, created_at: daysAgo(11) },
  { id: 'ntf-12', user_id: 'p-a1', title: 'Weekly audit digest ready', body: '184 auditable state changes recorded last week. 3 claim transitions, 41 case events, 12 tick-plan updates.', kind: 'system', read: true, sms_sent: false, created_at: daysAgo(1) },
];

// ---------------------------------------------------------------------------
// AUDIT LOGS — immutable state-change trail
// ---------------------------------------------------------------------------
const audit: AuditLog[] = [
  { id: 'au-1', ts: daysAgo(2, 6), actor_id: 'p-f6', actor_role: 'farmer', action: 'case.created', entity_table: 'disease_cases', entity_id: 'case-2041', before: null, after: { case_number: 'FS-2041', priority: 'emergency', status: 'submitted' }, ip: '196.201.214.58' },
  { id: 'au-2', ts: daysAgo(2, 6), actor_id: 'p-v1', actor_role: 'vet', action: 'case.assigned', entity_table: 'disease_cases', entity_id: 'case-2041', before: { assigned_vet_id: null, status: 'submitted' }, after: { assigned_vet_id: 'p-v1', status: 'assigned' }, ip: '196.201.214.102' },
  { id: 'au-3', ts: daysAgo(2, 5), actor_id: 'p-v1', actor_role: 'vet', action: 'treatment.logged', entity_table: 'treatments', entity_id: 'tr-1', before: null, after: { case_id: 'case-2041', drug: 'Buparvaquone 5%', cost_kes: 4800 }, ip: '196.201.214.102' },
  { id: 'au-4', ts: daysAgo(2, 5), actor_id: 'p-v1', actor_role: 'vet', action: 'case.status_changed', entity_table: 'disease_cases', entity_id: 'case-2041', before: { status: 'assigned' }, after: { status: 'in_treatment' }, ip: '196.201.214.102' },
  { id: 'au-5', ts: daysAgo(2, 3), actor_id: 'p-f6', actor_role: 'farmer', action: 'claim.created', entity_table: 'claims', entity_id: 'clm-004', before: null, after: { claim_number: 'CLM-0092', amount_kes: 11900, status: 'draft' }, ip: '196.201.214.58' },
  { id: 'au-6', ts: daysAgo(2, 2), actor_id: 'p-f6', actor_role: 'farmer', action: 'claim.submitted', entity_table: 'claims', entity_id: 'clm-004', before: { status: 'draft' }, after: { status: 'submitted' }, ip: '196.201.214.58' },
  { id: 'au-7', ts: daysAgo(1, 6), actor_id: 'p-s1', actor_role: 'sponsor', action: 'claim.approved', entity_table: 'claims', entity_id: 'clm-004', before: { status: 'under_review' }, after: { status: 'approved', reviewer_id: 'p-s1' }, ip: '105.163.155.211' },
  { id: 'au-8', ts: daysAgo(1), actor_id: 'p-s1', actor_role: 'sponsor', action: 'claim.disbursed', entity_table: 'claims', entity_id: 'clm-004', before: { status: 'approved', disbursement_ref: null }, after: { status: 'disbursed', disbursement_ref: 'MOCK-MPESA-SD76K2918ATM' }, ip: '105.163.155.211' },
  { id: 'au-9', ts: daysAgo(1), actor_id: 'p-s1', actor_role: 'sponsor', action: 'pool.committed_updated', entity_table: 'funding_pools', entity_id: 'pool-001', before: { disbursed_kes: 1400600 }, after: { disbursed_kes: 1412500 }, ip: '105.163.155.211' },
  { id: 'au-10', ts: daysAgo(2), actor_id: 'p-c1', actor_role: 'county', action: 'alert.acknowledged', entity_table: 'disease_alerts', entity_id: 'al-3', before: { status: 'active' }, after: { status: 'acknowledged', acknowledged_by: 'p-c1' }, ip: '41.90.64.13' },
  { id: 'au-11', ts: daysAgo(3), actor_id: 'p-c1', actor_role: 'county', action: 'alert.acknowledged', entity_table: 'disease_alerts', entity_id: 'al-4', before: { status: 'active' }, after: { status: 'acknowledged', acknowledged_by: 'p-c1' }, ip: '41.90.64.13' },
  { id: 'au-12', ts: daysAgo(9), actor_id: 'p-c1', actor_role: 'county', action: 'alert.resolved', entity_table: 'disease_alerts', entity_id: 'al-6', before: { status: 'acknowledged' }, after: { status: 'resolved' }, ip: '41.90.64.13' },
  { id: 'au-13', ts: daysAgo(13), actor_id: 'p-v4', actor_role: 'vet', action: 'case.closed', entity_table: 'disease_cases', entity_id: 'case-2028', before: { status: 'monitoring' }, after: { status: 'recovered', closed_at: daysAgo(13) }, ip: '196.201.214.233' },
  { id: 'au-14', ts: daysAgo(11), actor_id: 'p-s2', actor_role: 'sponsor', action: 'claim.approved', entity_table: 'claims', entity_id: 'clm-003', before: { status: 'under_review' }, after: { status: 'approved', reviewer_id: 'p-s2' }, ip: '105.163.155.96' },
  { id: 'au-15', ts: hoursAgo(5), actor_id: 'p-v4', actor_role: 'vet', action: 'treatment.logged', entity_table: 'treatments', entity_id: 'tr-6', before: null, after: { case_id: 'case-2039', drug: 'Flunixin meglumine', cost_kes: 650 }, ip: '196.201.214.233' },
  { id: 'au-16', ts: daysAgo(4), actor_id: 'p-f3', actor_role: 'farmer', action: 'farm.created', entity_table: 'farms', entity_id: 'farm-003', before: null, after: { farm_code: 'KIS-2026-0211', ward: 'Rigiro' }, ip: '196.207.243.8' },
];

export function buildSeed(): DB {
  return {
    profiles, farms, animals, cases, events, treatments,
    sponsors, sponsorMembers, pools, claims, claimItems, tickPlans,
    screenings, alerts, notifications, audit,
  };
}

export const ROLES: { role: Role; label: string; blurb: string }[] = [
  { role: 'farmer', label: 'Farmer', blurb: 'Register herds, run AI triage, claim treatment costs' },
  { role: 'vet', label: 'Veterinary Officer', blurb: 'Caseload, treatment protocols, field notes' },
  { role: 'sponsor', label: 'Sponsor / Co-op', blurb: 'Fund care, review & approve claims, monitor pools' },
  { role: 'county', label: 'County Authority', blurb: 'Surveillance, early-warning alerts, county reports' },
  { role: 'admin', label: 'Platform Admin', blurb: 'Users, sponsors, audit trail, system health' },
];
