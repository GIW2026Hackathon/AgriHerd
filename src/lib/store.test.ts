import { beforeEach, describe, expect, it } from 'vitest';
import { DataClient } from './store';
import { buildSeed } from './seed';
import type { Profile } from './types';

const farmer = () => buildSeed().profiles.find((p) => p.id === 'p-f1') as Profile;
const vet = () => buildSeed().profiles.find((p) => p.id === 'p-v1') as Profile;
const sponsor = () => buildSeed().profiles.find((p) => p.id === 'p-s1') as Profile;
const county = () => buildSeed().profiles.find((p) => p.id === 'p-c1') as Profile;

beforeEach(() => {
  localStorage.clear();
});

describe('DataClient visibility', () => {
  it('limits farmer data to owned farms and cases', () => {
    const client = new DataClient();
    const user = farmer();

    expect(client.farmsForUser(user).every((farm) => farm.owner_id === user.id)).toBe(true);
    expect(client.casesForUser(user).every((kase) => client.farmById(kase.farm_id)?.owner_id === user.id)).toBe(true);
    expect(client.claimsForUser(user).every((claim) => claim.requested_by === user.id)).toBe(true);
  });

  it('limits veterinary cases to assigned or triage-ready cases', () => {
    const client = new DataClient();
    const user = vet();

    expect(client.casesForUser(user).every((kase) =>
      kase.assigned_vet_id === user.id || kase.status === 'submitted' || kase.status === 'triaged'
    )).toBe(true);
  });

  it('provides staff with the complete synthetic dataset', () => {
    const client = new DataClient();

    expect(client.farmsForUser(county())).toHaveLength(client.snapshot().farms.length);
    expect(client.casesForUser(county())).toHaveLength(client.snapshot().cases.length);
  });
});

describe('DataClient workflows', () => {
  it('creates and updates local demo profiles without persisting passwords', () => {
    const client = new DataClient();
    const profile = client.createDemoAccount({
      full_name: 'Amina Demo',
      phone: '+254 700 000 111',
      email: 'AMINA@example.test',
      role: 'farmer',
    });

    expect(profile.email).toBe('amina@example.test');
    expect(new DataClient().profileById(profile.id)?.full_name).toBe('Amina Demo');
    expect(localStorage.getItem('glhvis.db.v1')).not.toContain('password');

    expect(client.updateOwnDemoProfile(profile, {
      full_name: 'Amina Updated',
      phone: '+254 700 000 222',
      email: 'amina.updated@example.test',
    })).toBe(true);
    const reloaded = new DataClient();
    expect(reloaded.profileById(profile.id)?.full_name).toBe('Amina Updated');
    expect(reloaded.profileById(profile.id)?.phone).toBe('+254 700 000 222');
    expect(reloaded.auditFor('profiles', profile.id)).toHaveLength(2);
  });

  it('persists a triage case, screening, event, notification, and audit record', () => {
    const client = new DataClient();
    const user = farmer();
    const farm = client.farmsForUser(user)[0];

    const created = client.createCaseFromScreening(user, {
      animal_id: client.animalsForFarm(farm.id)[0]?.id ?? null,
      farm_id: farm.id,
      chief_complaint: 'Animal has a high temperature',
      symptoms: ['fever'],
      ai_confidence: 0.86,
      ai_differential: [{ disease: 'East Coast fever', confidence: 0.86, urgency: 'emergency', advice: 'Contact a veterinary professional urgently.' }],
      priority: 'emergency',
      assigned_vet_id: null,
    });

    const reloaded = new DataClient();
    expect(reloaded.caseById(created.id)?.case_number).toBe(created.case_number);
    expect(reloaded.snapshot().screenings.some((screening) => screening.case_id === created.id)).toBe(true);
    expect(reloaded.eventsFor(created.id).some((event) => event.event_type === 'created')).toBe(true);
    expect(reloaded.notificationsFor(user.id).some((notification) => notification.kind === 'case')).toBe(true);
    expect(reloaded.auditFor('disease_cases', created.id).some((entry) => entry.action === 'case.created')).toBe(true);
  });

  it('moves an assigned case to treatment and records withdrawal information', () => {
    const client = new DataClient();
    const user = vet();
    const kase = client.casesForUser(user).find((candidate) => candidate.assigned_vet_id === user.id);
    expect(kase).toBeDefined();

    client.addTreatment(user, kase!.id, {
      drug_name: 'Synthetic test treatment',
      dosage: '10 ml',
      route: 'IM',
      withdrawal_days: 7,
      cost_kes: 1200,
      notes: 'Test-only record',
    });

    const reloaded = new DataClient();
    expect(reloaded.caseById(kase!.id)?.status).toBe('in_treatment');
    expect(reloaded.treatmentsFor(kase!.id)[0]?.withdrawal_days).toBe(7);
  });

  it('keeps sponsor claims scoped to the sponsor', () => {
    const client = new DataClient();
    const user = sponsor();

    expect(client.claimsForUser(user).every((claim) => claim.sponsor_id === client.sponsorForProfile(user.id)?.id)).toBe(true);
  });
});
