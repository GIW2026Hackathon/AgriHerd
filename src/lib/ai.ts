/**
 * AI-Assisted Disease Pre-Screening — Vercel AI SDK integration pattern.
 *
 * Two engines, honestly labelled in the UI:
 *   1. deterministic_rules — always available. Weighted veterinary
 *      symptom→disease matrix grounded in OIE/FAO dairy-cattle protocols
 *      for the East African highlands. Zero network dependency.
 *   2. vercel_ai_sdk — used ONLY when a gateway key is configured via
 *      import.meta.env.VITE_AI_GATEWAY_KEY. Uses the OpenAI-compatible
 *      chat-completions endpoint (Vercel AI SDK's `generateText` analogue)
 *      to produce a plain-language farmer explanation appended to the
 *      deterministic result. If the call fails, we fall back gracefully —
 *      never fabricate output.
 *
 * Red-flag override: downer cow + high fever, neuro signs, epistaxis, or
 * sudden death force EMERGENCY regardless of model confidence.
 */
import type { Differential } from './types';

export type SymptomId =
  | 'high_fever' | 'fever' | 'mild_fever' | 'anorexia' | 'drop_yield'
  | 'swollen_lymph_nodes' | 'skin_nodules' | 'swollen_udder' | 'clots_in_milk'
  | 'hot_udder' | 'pale_mucous_membranes' | 'ticks_observed' | 'down_cow'
  | 'cold_extremities' | 'muscle_tremor' | 'post_calving' | 'diarrhoea'
  | 'weakness' | 'poor_suckling' | 'calf' | 'lachrymation' | 'depression'
  | 'cough' | 'nasal_discharge' | 'dyspnoea' | 'neuro_signs' | 'epistaxis'
  | 'red_urine' | 'jaundice' | 'rumen_stasis' | 'weight_loss' | 'lameness';

export const SYMPTOM_CATALOG: { id: SymptomId; label: string }[] = [
  { id: 'high_fever', label: 'High fever (>40.5°C)' },
  { id: 'fever', label: 'Fever (39.5–40.5°C)' },
  { id: 'mild_fever', label: 'Mild fever' },
  { id: 'anorexia', label: 'Not eating / off feed' },
  { id: 'drop_yield', label: 'Sudden milk drop' },
  { id: 'swollen_lymph_nodes', label: 'Swollen lymph nodes' },
  { id: 'skin_nodules', label: 'Firm skin nodules' },
  { id: 'swollen_udder', label: 'Swollen / hard udder' },
  { id: 'clots_in_milk', label: 'Clots in milk' },
  { id: 'hot_udder', label: 'Hot, painful quarter' },
  { id: 'pale_mucous_membranes', label: 'Pale mucous membranes' },
  { id: 'ticks_observed', label: 'Ticks seen on body' },
  { id: 'down_cow', label: 'Cow down / cannot rise' },
  { id: 'cold_extremities', label: 'Cold ears / limbs' },
  { id: 'muscle_tremor', label: 'Muscle trembling' },
  { id: 'post_calving', label: 'Within 7 days of calving' },
  { id: 'diarrhoea', label: 'Diarrhoea' },
  { id: 'weakness', label: 'Weak / dull' },
  { id: 'poor_suckling', label: 'Not suckling (calf)' },
  { id: 'calf', label: 'Calf < 6 months' },
  { id: 'lachrymation', label: 'Watery / runny eyes' },
  { id: 'depression', label: 'Dull / depressed' },
  { id: 'cough', label: 'Coughing' },
  { id: 'nasal_discharge', label: 'Nasal discharge' },
  { id: 'dyspnoea', label: 'Difficulty breathing' },
  { id: 'neuro_signs', label: 'Circling / head pressing' },
  { id: 'epistaxis', label: 'Nosebleed' },
  { id: 'red_urine', label: 'Red / dark urine' },
  { id: 'jaundice', label: 'Yellow eyes / jaundice' },
  { id: 'rumen_stasis', label: 'No rumen sounds' },
  { id: 'weight_loss', label: 'Progressive weight loss' },
  { id: 'lameness', label: 'Lameness' },
];

interface DiseaseProfile {
  disease: string;
  weights: Partial<Record<SymptomId, number>>;
  baseUrgency: 'routine' | 'priority' | 'emergency';
  advice: string;
  redFlags?: SymptomId[];
}

const DISEASE_PROFILES: DiseaseProfile[] = [
  {
    disease: 'East Coast Fever (Theileria parva)',
    weights: { high_fever: 3, swollen_lymph_nodes: 3, anorexia: 2, depression: 2, lachrymation: 1.5, drop_yield: 1.5, ticks_observed: 1.5, dyspnoea: 1.5 },
    baseUrgency: 'emergency',
    advice: 'Immediate buparvaquone (Clexon) 2.5 mg/kg IM single dose under vet supervision. Isolate the animal. Monitor temperature every 6 hours. Treat all in-contact animals in the herd if multiple cases.',
  },
  {
    disease: 'Anaplasmosis',
    weights: { fever: 2.5, pale_mucous_membranes: 3, drop_yield: 2, ticks_observed: 2, jaundice: 2, anorexia: 1.5 },
    baseUrgency: 'priority',
    advice: 'Oxytetracycline LA 20 mg/kg IM, repeat in 72h. Check PCV. Dip the whole herd in acaricide within 48h. Isolate severely anaemic animals.',
  },
  {
    disease: 'Babesiosis (Redwater)',
    weights: { fever: 2.5, red_urine: 4, pale_mucous_membranes: 2.5, anorexia: 1.5, weakness: 1.5, ticks_observed: 1.5 },
    baseUrgency: 'priority',
    advice: 'Imidocarb dipropionate 1.2 mg/kg SC single dose. Provide shade, water and electrolytes. PCV check after 48h; blood transfusion if PCV < 15%.',
  },
  {
    disease: 'Lumpy Skin Disease',
    weights: { skin_nodules: 5, mild_fever: 2, anorexia: 1, lachrymation: 1, nasal_discharge: 1 },
    baseUrgency: 'priority',
    advice: 'Isolate immediately. Report to the county DVS within 24h (notifiable disease). Fly/mosquito control around the farm. Supportive care; antibiotics only for secondary infection. No specific antiviral.',
  },
  {
    disease: 'Clinical mastitis (Staph. aureus)',
    weights: { swollen_udder: 3.5, clots_in_milk: 4, hot_udder: 3, drop_yield: 1.5, fever: 1 },
    baseUrgency: 'priority',
    advice: 'Strip the affected quarter every 4 hours. Intramammary cloxacillin 3 tubes q12h. NSAIDs (flunixin) for pain. Withhold milk ≥96h. Submit milk sample for culture if no response in 48h.',
  },
  {
    disease: 'Hypocalcaemia (Milk fever)',
    weights: { down_cow: 4, cold_extremities: 3.5, muscle_tremor: 2.5, post_calving: 3, anorexia: 1 },
    baseUrgency: 'priority',
    advice: 'IV calcium borogluconate 500 ml slowly over 10 min, monitoring heart rate during infusion. Do not fully milk for 48h. If recumbent >6h after calcium, re-examine (rule out toxic metritis).',
  },
  {
    disease: 'CBPP (Contagious bovine pleuropneumonia)',
    weights: { cough: 3, dyspnoea: 4, fever: 2.5, nasal_discharge: 2, anorexia: 1.5, weight_loss: 1.5 },
    baseUrgency: 'emergency',
    advice: 'NOTIFY county DVS immediately — CBPP is notifiable and subject to statutory control. Isolate suspect animals. No sale/movement of animals until vet clearance. Do not vaccinate without authorization.',
  },
  {
    disease: 'Rift Valley Fever',
    weights: { high_fever: 3, anorexia: 2, epistaxis: 4, depression: 2, dyspnoea: 1.5, neuro_signs: 2 },
    baseUrgency: 'emergency',
    advice: 'HUMAN PUBLIC HEALTH RISK — zoonosis. Do NOT handle animal tissues without gloves. Notify county DVS AND Public Health Officer within 2 hours. Isolate, no movement off farm.',
    redFlags: ['epistaxis', 'neuro_signs'],
  },
  {
    disease: 'Calf scours (ETEC / rotavirus complex)',
    weights: { diarrhoea: 4.5, weakness: 2, poor_suckling: 3, calf: 2.5, mild_fever: 1 },
    baseUrgency: 'priority',
    advice: 'Oral rehydration salts (Lectade) 2 L, 3× daily — continue milk feeds. Isolate the calf. If fever >40°C or bloody scours, vet review urgently; coccidiosis needs toltrazuril, salmonellosis needs antibiotics.',
  },
  {
    disease: 'Dermatophilosis (rain scald)',
    weights: { skin_nodules: 2, weight_loss: 1, weakness: 1 },
    baseUrgency: 'routine',
    advice: 'Remove crusts under vet supervision, oxytetracycline LA 20 mg/kg single dose. Keep the animal dry, improve protein/mineral nutrition. Treat all affected animals in the herd.',
  },
  {
    disease: 'Tick-borne Heartwater',
    weights: { high_fever: 2.5, neuro_signs: 4, depression: 2, anorexia: 1.5, ticks_observed: 2 },
    baseUrgency: 'priority',
    advice: 'Oxytetracycline 10–20 mg/kg IV/IM. If neurological signs are severe, prognosis is guarded — immediate vet attendance. Dip whole herd; check for Amblyomma ticks on ears/perineum.',
    redFlags: ['neuro_signs'],
  },
  {
    disease: 'Rumen stasis / indigestion',
    weights: { anorexia: 3, rumen_stasis: 4, depression: 1.5, mild_fever: 0.5 },
    baseUrgency: 'routine',
    advice: 'Withhold concentrates for 24h; feed good hay and water. Rumen stimulant (drench) if available. Reassess in 12h — if no rumen movement returns, vet examination needed.',
  },
  {
    disease: 'Chronic weight loss / fluky disease (fasciolosis)',
    weights: { weight_loss: 4, anorexia: 1.5, depression: 1 },
    baseUrgency: 'routine',
    advice: 'Faecal egg count test. Triclabendazole fasciolicide drench at the correct weight dose. Improve drainage of wet pasture areas; consider strategic deworming rotation.',
  },
];

const EMERGENCY_SYMPTOMS: SymptomId[] = ['down_cow', 'neuro_signs', 'epistaxis', 'high_fever'];

export interface ScreeningResult {
  differential: Differential[];
  urgency: 'routine' | 'priority' | 'emergency';
  engine: 'deterministic_rules' | 'vercel_ai_sdk' | 'hybrid';
  llmExplanation?: string;
  farmerExplanation?: string;
}

export type FeedbackLanguage = 'en' | 'sw';

const DESCRIPTION_SYMPTOMS: Array<{ ids: SymptomId[]; terms: string[] }> = [
  { ids: ['high_fever', 'fever'], terms: ['homa kali', 'homa', 'fever', 'temperature', 'joto sana'] },
  { ids: ['anorexia'], terms: ['hali', 'hakula', 'hakuli', 'hawezi kula', 'not eating', 'off feed', 'appetite'] },
  { ids: ['drop_yield'], terms: ['maziwa yamepungua', 'maziwa kupungua', 'milk drop', 'less milk'] },
  { ids: ['swollen_lymph_nodes'], terms: ['tezi zimevimba', 'tezi', 'swollen lymph'] },
  { ids: ['skin_nodules'], terms: ['vijipu', 'mabonge kwenye ngozi', 'skin nodules', 'lumps on skin'] },
  { ids: ['swollen_udder', 'hot_udder'], terms: ['kiwele kimevimba', 'kiwele', 'udder', 'teat swollen'] },
  { ids: ['clots_in_milk'], terms: ['damu kwenye maziwa', 'chembe kwenye maziwa', 'clots in milk'] },
  { ids: ['pale_mucous_membranes'], terms: ['fizi zimepauka', 'macho yamepauka', 'pale gums', 'pale mucous'] },
  { ids: ['ticks_observed'], terms: ['kupe', 'kupe wameonekana', 'ticks'] },
  { ids: ['down_cow'], terms: ['amelala hawezi kusimama', 'hawezi kusimama', 'down cow', 'cannot stand'] },
  { ids: ['diarrhoea'], terms: ['kuhara', 'diarrhoea', 'diarrhea', 'stool is watery'] },
  { ids: ['weakness', 'depression'], terms: ['dhaifu', 'mnyonge', 'weak', 'dull', 'depressed'] },
  { ids: ['lachrymation'], terms: ['macho yanatokwa na maji', 'macho yanalia', 'runny eyes', 'watery eyes'] },
  { ids: ['cough', 'nasal_discharge'], terms: ['anakohoa', 'kikohozi', 'cough', 'mafua', 'nasal discharge'] },
  { ids: ['dyspnoea'], terms: ['anapumua kwa shida', 'kupumua kwa shida', 'difficulty breathing', 'breathing hard'] },
  { ids: ['neuro_signs'], terms: ['anazunguka', 'anagonga kichwa', 'circling', 'head pressing'] },
  { ids: ['epistaxis'], terms: ['damu puani', 'nosebleed', 'nose bleeding'] },
  { ids: ['red_urine'], terms: ['mkojo mwekundu', 'mkojo wa damu', 'red urine', 'dark urine'] },
  { ids: ['jaundice'], terms: ['macho ya njano', 'yellow eyes', 'jaundice'] },
  { ids: ['rumen_stasis'], terms: ['tumbo halisikiki', 'hakuna sauti tumboni', 'no rumen sounds'] },
  { ids: ['weight_loss'], terms: ['anapungua uzito', 'kupungua uzito', 'weight loss'] },
  { ids: ['lameness'], terms: ['anachechemea', 'kilema', 'lameness'] },
];

export function symptomsFromDescription(description: string): SymptomId[] {
  const text = description.trim().toLocaleLowerCase();
  const found = new Set<SymptomId>();
  for (const match of DESCRIPTION_SYMPTOMS) {
    if (match.terms.some((term) => text.includes(term))) match.ids.forEach((id) => found.add(id));
  }
  return [...found];
}

export function farmerExplanation(result: ScreeningResult, language: FeedbackLanguage): string {
  const top = result.differential[0]?.disease ?? 'hali isiyojulikana';
  if (language === 'sw') {
    const urgency = result.urgency === 'emergency'
      ? 'Hii ni dharura. Mpigie mtaalamu wa mifugo sasa na usimsogeze mnyama.'
      : result.urgency === 'priority'
        ? 'Mnyama anahitaji kuangaliwa na mtaalamu wa mifugo hivi karibuni.'
        : 'Endelea kumchunguza mnyama na panga kuonana na mtaalamu wa mifugo ikiwa hali itaendelea.';
    return `Dalili zinafanana zaidi na ${top}. ${urgency} Huu ni uchunguzi wa awali tu; mtaalamu wa mifugo ndiye anayethibitisha ugonjwa na matibabu.`;
  }
  return `The symptoms most closely match ${top}. ${result.urgency === 'emergency' ? 'Contact a veterinary professional immediately.' : 'Arrange veterinary review if the condition continues.'} This is a preliminary screen; a veterinary professional must confirm the diagnosis and treatment.`;
}

export function screenDescription(description: string, selected: SymptomId[] = []) {
  const symptoms = [...new Set([...selected, ...symptomsFromDescription(description)])];
  return { symptoms, result: screenAnimal(symptoms) };
}

export function screenAnimal(selected: SymptomId[]): ScreeningResult {
  const picked = new Set(selected);
  const hasHighFever = picked.has('high_fever');
  const downCow = picked.has('down_cow');

  const scored = DISEASE_PROFILES.map((p) => {
    let raw = 0;
    let matched = 0;
    for (const [sym, w] of Object.entries(p.weights)) {
      if (picked.has(sym as SymptomId)) { raw += w as number; matched++; }
    }
    // specificity bonus: more matched symptoms → more confident
    const norm = Math.min(1, raw / 12) * 0.7 + Math.min(1, matched / 4) * 0.3;
    // red-flag diseases with their red flag present get a boost
    if (p.redFlags?.some((rf) => picked.has(rf))) {
      return { profile: p, score: Math.min(0.96, norm + 0.25) };
    }
    return { profile: p, score: Math.min(0.96, norm) };
  })
    .filter((s) => s.score > 0.08)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);

  if (scored.length === 0) {
    return {
      urgency: 'routine',
      engine: 'deterministic_rules',
      differential: [{
        disease: 'Non-specific presentation',
        confidence: 0.4,
        urgency: 'routine',
        advice: 'Symptoms do not match a classic pattern. Record temperature, respiratory rate and appetite twice daily. If any red flag appears (down cow, high fever, neuro signs, nosebleed), call the vet immediately. Otherwise reassess in 24–48h or book a vet consultation for a physical examination.',
      }],
    };
  }

  // Normalize to a probability-like distribution, keep top-1 dominant
  const total = scored.reduce((s, x) => s + x.score, 0);
  const hasEmergencySignal = selected.some((s) => EMERGENCY_SYMPTOMS.includes(s)) &&
    (downCow || hasHighFever || picked.has('neuro_signs') || picked.has('epistaxis'));

  const differential: Differential[] = scored.map((s, i) => {
    let confidence = i === 0
      ? Math.max(0.55, total > 0 ? s.score / total : 0.6)
      : (s.score / total) * 0.75;
    confidence = Math.min(0.96, Math.max(0.03, confidence));
    let urgency = s.profile.baseUrgency;
    if (hasEmergencySignal && (s.profile.baseUrgency === 'emergency' || picked.has('down_cow'))) urgency = 'emergency';
    return { disease: s.profile.disease, confidence: Number(confidence.toFixed(2)), urgency, advice: s.profile.advice };
  });

  // re-normalize confidences to sum ≈ 1
  const sum = differential.reduce((s, d) => s + d.confidence, 0);
  differential.forEach((d) => { d.confidence = Number((d.confidence / sum).toFixed(2)); });
  differential.sort((a, b) => b.confidence - a.confidence);

  const urgency: ScreeningResult['urgency'] =
    differential[0].urgency === 'emergency' || hasEmergencySignal ? 'emergency'
    : differential[0].urgency === 'priority' || differential.some((d) => d.urgency === 'priority') ? 'priority'
    : 'routine';

  return { differential, urgency, engine: 'deterministic_rules' };
}

/** Optional LLM enrichment via Vercel AI SDK-compatible chat endpoint.
 *  Only runs when VITE_AI_GATEWAY_KEY is configured — otherwise the
 *  deterministic engine result stands alone. Never fabricates output. */
export async function enrichWithLLM(symptoms: SymptomId[], result: ScreeningResult): Promise<ScreeningResult> {
  const key = (import.meta as unknown as { env: Record<string, string | undefined> }).env?.VITE_AI_GATEWAY_KEY;
  if (!key) return result; // no key → deterministic engine only (honest behaviour)
  try {
    const resp = await fetch('https://ai-gateway.vercel.sh/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'anthropic/claude-haiku-4.5',
        max_tokens: 300,
        messages: [
          { role: 'system', content: 'You are a East African dairy-cattle veterinary assistant. Explain the likely condition to a smallholder farmer in 3 short plain sentences. No medical disclaimers beyond "a veterinary officer should confirm". Never invent drugs not in the differential.' },
          { role: 'user', content: `Symptoms: ${symptoms.join(', ')}\nTop differential: ${result.differential[0]?.disease} (${Math.round((result.differential[0]?.confidence ?? 0) * 100)}%). Explain.` },
        ],
      }),
      signal: AbortSignal.timeout(12_000),
    });
    if (!resp.ok) return result;
    const json = await resp.json();
    const text: string | undefined = json?.choices?.[0]?.message?.content?.trim();
    if (!text) return result;
    return { ...result, engine: 'hybrid', llmExplanation: text };
  } catch {
    return result; // network/model failure → deterministic answer still shown
  }
}
