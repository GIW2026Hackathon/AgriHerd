/* ==========================================================================
   GLHIS Symptom Triage Engine
   Transparent, weighted rule engine that ranks differential diagnoses from
   farmer-reported signs. Architected behind a single `runTriage` function so
   the Vercel AI SDK + an OpenAI key can replace it server-side without
   touching the UI — this build ships the deterministic engine (no live
   external LLM calls are made; output is fully explainable).
   ========================================================================== */

export interface Symptom {
  id: string;
  label: string;
  group: 'General' | 'Production' | 'Respiratory' | 'Neurological' | 'Skin & Parasites' | 'Digestive' | 'Locomotion';
  weight: number; // base severity contribution
}

export const SYMPTOM_CATALOG: Symptom[] = [
  { id: 'fever', label: 'High fever (40°C+)', group: 'General', weight: 22 },
  { id: 'weakness', label: 'Weakness / collapse', group: 'General', weight: 18 },
  { id: 'appetite', label: 'Loss of appetite', group: 'General', weight: 10 },
  { id: 'milkdrop', label: 'Drop in milk production', group: 'Production', weight: 12 },
  { id: 'clotted_milk', label: 'Clotted / discoloured milk', group: 'Production', weight: 16 },
  { id: 'swollen_udder', label: 'Swollen / painful udder', group: 'Production', weight: 20 },
  { id: 'drooling', label: 'Blisters in mouth / drooling', group: 'General', weight: 16 },
  { id: 'footblister', label: 'Blisters on feet / lameness', group: 'Locomotion', weight: 16 },
  { id: 'lameness', label: 'Lameness (no visible lesions)', group: 'Locomotion', weight: 12 },
  { id: 'cough', label: 'Coughing / nasal discharge', group: 'Respiratory', weight: 14 },
  { id: 'breathing', label: 'Difficulty breathing', group: 'Respiratory', weight: 24 },
  { id: 'seizures', label: 'Seizures / staggering / circling', group: 'Neurological', weight: 30 },
  { id: 'headpress', label: 'Head pressing / disorientation', group: 'Neurological', weight: 26 },
  { id: 'ticks', label: 'Ticks visible on body', group: 'Skin & Parasites', weight: 10 },
  { id: 'nodules', label: 'Skin nodules / lumps', group: 'Skin & Parasites', weight: 17 },
  { id: 'pale_gums', label: 'Pale gums / anaemia', group: 'General', weight: 15 },
  { id: 'jaundice', label: 'Yellow eyes / jaundice', group: 'General', weight: 15 },
  { id: 'bloat', label: 'Bloat / distended abdomen', group: 'Digestive', weight: 22 },
  { id: 'diarrhea', label: 'Diarrhoea / bloody scour', group: 'Digestive', weight: 14 },
  { id: 'eye', label: 'Lacrimation / eye discharge / opacity', group: 'General', weight: 12 },
  { id: 'death_mate', label: 'Sudden death of herd mate', group: 'General', weight: 32 },
  { id: 'muscle_swell', label: 'Muscle swelling with crepitus (crackling)', group: 'Locomotion', weight: 28 },
  { id: 'weight_loss', label: 'Weight loss despite eating', group: 'Production', weight: 9 },
  { id: 'down_cow', label: 'Down cow after calving (milk fever)', group: 'General', weight: 24 },
];

interface DiseaseProfile {
  disease: string;
  signs: Record<string, number>; // symptom id → diagnostic weight
  base: number;
  critical?: boolean;
}

const DISEASE_PROFILES: DiseaseProfile[] = [
  { disease: 'Foot & Mouth Disease', signs: { drooling: 34, footblister: 34, fever: 14, milkdrop: 10, appetite: 8 }, base: 8, critical: true },
  { disease: 'Acute Mastitis', signs: { swollen_udder: 36, clotted_milk: 34, fever: 10, milkdrop: 12 }, base: 6 },
  { disease: 'Anaplasmosis', signs: { pale_gums: 30, fever: 20, weakness: 18, weight_loss: 12, ticks: 12 }, base: 6 },
  { disease: 'East Coast Fever', signs: { ticks: 26, fever: 24, weakness: 16, weight_loss: 12, diarrhea: 6 }, base: 6, critical: true },
  { disease: 'Lumpy Skin Disease', signs: { nodules: 40, fever: 16, weakness: 10, milkdrop: 8 }, base: 6, critical: true },
  { disease: 'Blackleg (Clostridium chauvoei)', signs: { death_mate: 36, muscle_swell: 34, fever: 12, weakness: 8 }, base: 6, critical: true },
  { disease: 'Infectious Bovine Keratoconjunctivitis', signs: { eye: 44, appetite: 6 }, base: 4 },
  { disease: 'Milk Fever', signs: { down_cow: 44, weakness: 18, appetite: 6 }, base: 6, critical: true },
  { disease: 'Bloat', signs: { bloat: 46, breathing: 12, weakness: 8 }, base: 6, critical: true },
  { disease: 'Babesiosis', signs: { pale_gums: 22, fever: 20, jaundice: 22, ticks: 14, diarrhea: 6 }, base: 5, critical: true },
  { disease: 'Trypanosomosis (Nagana)', signs: { weight_loss: 28, fever: 16, weakness: 18, pale_gums: 12 }, base: 5 },
  { disease: 'Clostridial Enterotoxaemia', signs: { death_mate: 30, diarrhea: 24, weakness: 10 }, base: 4, critical: true },
];

export interface TriageResult {
  urgency: number; // 0–100
  level: 'self_care' | 'call_48h' | 'vet_24h' | 'emergency';
  headline: string;
  advice: string[];
  differentials: { disease: string; confidence: number }[];
  suspected: string;
  summary: string;
}

export function runTriage(selectedIds: string[]): TriageResult {
  const selected = SYMPTOM_CATALOG.filter((s) => selectedIds.includes(s.id));
  if (selected.length === 0) {
    return {
      urgency: 5, level: 'self_care',
      headline: 'No signs selected',
      advice: ['Select at least one symptom to run the assessment.'],
      differentials: [], suspected: 'Undetermined',
      summary: 'Insufficient symptom data for triage.',
    };
  }

  // Score diseases
  const scored = DISEASE_PROFILES.map((dp) => {
    let score = dp.base;
    for (const s of selected) {
      const w = dp.signs[s.id];
      if (w) score += w;
    }
    // penalise diseases whose signature sign is absent
    const signature = Object.entries(dp.signs).sort((a, b) => b[1] - a[1])[0];
    if (signature && !selectedIds.includes(signature[0])) score *= 0.45;
    return { disease: dp.disease, score, critical: dp.critical };
  }).sort((a, b) => b.score - a.score);

  const max = scored[0]?.score ?? 1;
  const differentials = scored.slice(0, 3).map((s) => ({
    disease: s.disease,
    confidence: Math.max(4, Math.min(97, Math.round((s.score / max) * 92 * (s.score > 40 ? 1 : 0.6)))),
  }));

  // Urgency: base symptom severity + critical mass
  const severitySum = selected.reduce((acc, s) => acc + s.weight, 0);
  const neuroOrFatal = selected.some((s) => ['seizures', 'headpress', 'death_mate', 'breathing', 'down_cow', 'bloat'].includes(s.id));
  let urgency = Math.min(98, Math.round(severitySum * 1.05 + (scored[0]?.critical ? 6 : 0) + selected.length * 2));
  if (neuroOrFatal) urgency = Math.max(urgency, 78);

  let level: TriageResult['level'];
  let headline: string;
  let advice: string[];
  if (urgency >= 75) {
    level = 'emergency';
    headline = 'EMERGENCY — same-day veterinary attention';
    advice = [
      'Isolate the animal NOW and keep her quiet — no walking, no handling stress.',
      'Call your assigned vet or the GLHIS hotline 0800 723 000 immediately.',
      'Do not administer any medication without a vet directive.',
      'Remove the animal from the herd; FMD/clostridial suspects contaminate shared handling areas.',
    ];
  } else if (urgency >= 55) {
    level = 'vet_24h';
    headline = 'HIGH PRIORITY — veterinary visit within 24 hours';
    advice = [
      'Isolate the sick animal and mark the pen.',
      'Stop milk sales from the affected cow until cleared.',
      'Book the nearest verified GLHIS vet today.',
      'Note when symptoms started and any recent introductions to the herd.',
    ];
  } else if (urgency >= 30) {
    level = 'call_48h';
    headline = 'ATTENTION NEEDED — consult a vet within 48 hours';
    advice = [
      'Monitor temperature morning and evening; log readings in the app.',
      'Check feed and water intake; ensure clean water ad libitum.',
      'If signs worsen or new ones appear, call a vet immediately.',
    ];
  } else {
    level = 'self_care';
    headline = 'LOW RISK — home monitoring with precautions';
    advice = [
      'Observe the animal twice daily for 72 hours.',
      'Maintain hydration and routine feeding.',
      'Re-run this triage if the condition changes or does not improve.',
    ];
  }

  const summary = `${selected.length} sign(s) reported. Leading differential: ${scored[0].disease} (${differentials[0]?.confidence ?? 0}% confidence). Urgency ${urgency}/100 — ${level === 'emergency' ? 'immediate vet action required' : level === 'vet_24h' ? 'vet within 24h' : level === 'call_48h' ? 'vet within 48h' : 'home monitoring'}.`;

  return { urgency, level, headline, advice, differentials, suspected: scored[0].disease, summary };
}
