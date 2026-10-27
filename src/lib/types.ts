// Domain types — column names mirror schema.sql 1:1 (Supabase-compatible)
export type Role = 'farmer' | 'vet' | 'sponsor' | 'county' | 'admin';

export interface Profile {
  id: string; full_name: string; role: Role; phone: string; national_id: string;
  county: string; ward: string; organization: string | null; avatar_url?: string | null;
  specialty?: string; available?: boolean; years_exp?: number; bio?: string;
}

export interface Farm {
  id: string; farm_code: string; name: string; owner_id: string;
  county: string; sub_county: string; ward: string;
  lat: number; lng: number; herd_size: number; primary_breed: string;
  sponsor_id: string | null; created_at: string;
}

export type AnimalStatus = 'healthy' | 'under_treatment' | 'quarantine' | 'recovered' | 'deceased' | 'sold';
export type LifecycleStage = 'calf' | 'heifer' | 'lactating' | 'dry' | 'bull' | 'bullock';
export interface Animal {
  id: string; tag_number: string; farm_id: string; species: string; breed: string;
  sex: 'female' | 'male'; dob: string; stage: LifecycleStage; parity: number;
  status: AnimalStatus; dam_tag: string | null; last_milk_yield_kg: number | null; created_at: string;
}

export type CaseStatus = 'submitted' | 'triaged' | 'assigned' | 'in_treatment' | 'monitoring' | 'recovered' | 'referred' | 'deceased' | 'closed';
export type CasePriority = 'routine' | 'priority' | 'emergency';
export interface Differential { disease: string; confidence: number; urgency: 'routine' | 'priority' | 'emergency'; advice: string; }
export interface DiseaseCase {
  id: string; case_number: string; animal_id: string; farm_id: string;
  reported_by: string; assigned_vet_id: string | null;
  chief_complaint: string; symptoms: string[]; ai_confidence: number | null;
  ai_differential: Differential[] | null; priority: CasePriority; status: CaseStatus;
  diagnosis: string | null; outcome: string | null;
  ward: string; county: string; created_at: string; updated_at: string; closed_at: string | null;
}

export interface CaseEvent {
  id: string; case_id: string; actor_id: string; actor_role: Role;
  event_type: 'created' | 'triaged' | 'assigned' | 'visit' | 'note' | 'lab' | 'treatment' | 'status_change' | 'claim_linked' | 'escalated' | 'recovered' | 'deceased' | 'closed';
  body: string; meta: Record<string, unknown> | null; created_at: string;
}

export interface Treatment {
  id: string; case_id: string; administered_by: string; drug_name: string; dosage: string;
  route: string; withdrawal_days: number; cost_kes: number; administered_at: string; notes: string | null;
}

export interface Sponsor {
  id: string; profile_id: string; company_name: string; co_op_reg_no: string | null; contact_email: string;
}
export interface SponsorMember { sponsor_id: string; farmer_id: string; joined_at: string; coverage_tier: 'basic' | 'standard' | 'premium'; }
export interface FundingPool {
  id: string; sponsor_id: string; name: string; total_kes: number; committed_kes: number;
  disbursed_kes: number; period_start: string; period_end: string; active: boolean;
}

export type ClaimStatus = 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'disbursed' | 'reconciled';
export interface Claim {
  id: string; claim_number: string; case_id: string; farm_id: string; requested_by: string;
  sponsor_id: string | null; pool_id: string | null; amount_kes: number; status: ClaimStatus;
  vet_recommendation: string | null; reviewer_id: string | null; review_note: string | null;
  disbursement_ref: string | null; submitted_at: string | null; reviewed_at: string | null;
  disbursed_at: string | null; created_at: string; updated_at: string;
}
export interface ClaimLineItem {
  id: string; claim_id: string; description: string;
  category: 'vet_fee' | 'drug' | 'lab' | 'transport' | 'procedure' | 'feed_supplement' | 'other';
  qty: number; unit_kes: number;
}

export interface TickControlPlan {
  id: string; farm_id: string; created_by: string; product: string; interval_days: number;
  last_dip_date: string; next_dip_date: string; deworm_next: string; vaccine_next: string;
  acaricide_note: string;
}

export interface AIScreening {
  id: string; farm_id: string; animal_id: string | null; performed_by: string;
  symptoms: string[]; engine: 'deterministic_rules' | 'vercel_ai_sdk' | 'hybrid';
  differential: Differential[]; urgency: 'routine' | 'priority' | 'emergency';
  case_id: string | null; created_at: string;
}

export type AlertSeverity = 'info' | 'watch' | 'alert' | 'critical';
export type AlertStatus = 'active' | 'acknowledged' | 'contained' | 'resolved';
export interface DiseaseAlert {
  id: string; county: string; ward: string; disease: string; severity: AlertSeverity;
  status: AlertStatus; case_count: number; threshold: number; summary: string;
  acknowledged_by: string | null; acknowledged_at: string | null;
  window_start: string; created_at: string;
}

export interface AppNotification {
  id: string; user_id: string; title: string; body: string;
  kind: 'info' | 'case' | 'claim' | 'alert' | 'system'; read: boolean; sms_sent: boolean; created_at: string;
}

export interface AuditLog {
  id: string; ts: string; actor_id: string; actor_role: Role;
  action: string; entity_table: string; entity_id: string;
  before: Record<string, unknown> | null; after: Record<string, unknown> | null; ip: string;
}

export interface Ward { name: string; county: 'Kisii' | 'Nyamira'; sub_county: string; lat: number; lng: number; elevation_m: number; }

export interface DB {
  profiles: Profile[]; farms: Farm[]; animals: Animal[];
  cases: DiseaseCase[]; events: CaseEvent[]; treatments: Treatment[];
  sponsors: Sponsor[]; sponsorMembers: SponsorMember[]; pools: FundingPool[];
  claims: Claim[]; claimItems: ClaimLineItem[]; tickPlans: TickControlPlan[];
  screenings: AIScreening[]; alerts: DiseaseAlert[];
  notifications: AppNotification[]; audit: AuditLog[];
}
