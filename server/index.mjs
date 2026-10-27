import { createServer } from 'node:http';

const port = Number(process.env.PORT || 8787);
const geminiKey = process.env.GEMINI_API_KEY;
const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const frontendOrigins = (process.env.FRONTEND_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const maxBodyBytes = 32 * 1024;
const emergencySymptoms = new Set(['down_cow', 'neuro_signs', 'epistaxis', 'high_fever']);

const json = (res, status, body, origin = frontendOrigin) => {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin',
  });
  res.end(JSON.stringify(body));
};

function isAllowedOrigin(origin) {
  return !origin || frontendOrigins.includes(origin) || origin === 'http://localhost:5173' || origin === 'http://127.0.0.1:5173';
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    let data = '';
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > maxBodyBytes) {
        reject(new Error('Request body is too large'));
        req.destroy();
        return;
      }
      data += chunk;
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(data || '{}'));
      } catch {
        reject(new Error('Request body must be valid JSON'));
      }
    });
    req.on('error', reject);
  });
}

function validateRequest(body) {
  const description = typeof body.description === 'string' ? body.description.trim() : '';
  const language = body.language === 'en' ? 'en' : body.language === 'sw' ? 'sw' : null;
  const symptoms = Array.isArray(body.selectedSymptoms)
    ? body.selectedSymptoms.filter((value) => typeof value === 'string').slice(0, 40)
    : [];
  if (!language) throw new Error('language must be "sw" or "en"');
  if (!description && symptoms.length === 0) throw new Error('description or selectedSymptoms is required');
  if (description.length > 5000) throw new Error('description must not exceed 5000 characters');
  return { description, language, symptoms, deterministicResult: body.deterministicResult };
}

function safeUrgency(deterministicResult, symptoms, modelUrgency) {
  if (deterministicResult?.urgency === 'emergency' || symptoms.some((symptom) => emergencySymptoms.has(symptom))) return 'emergency';
  return ['routine', 'priority', 'emergency'].includes(modelUrgency) ? modelUrgency : (deterministicResult?.urgency || 'routine');
}

function fallbackMessage(language, urgency) {
  if (language === 'sw') {
    return urgency === 'emergency'
      ? 'Hii ni dharura. Mpigie mtaalamu wa mifugo sasa; uchambuzi huu hauwezi kuthibitisha ugonjwa.'
      : 'Uchambuzi wa AI haupatikani kwa sasa. Tumia uchambuzi wa awali wa mfumo na wasiliana na mtaalamu wa mifugo.';
  }
  return urgency === 'emergency'
    ? 'This may be an emergency. Contact a veterinary professional now; this screen cannot confirm a diagnosis.'
    : 'AI analysis is temporarily unavailable. Use the local preliminary screen and contact a veterinary professional.';
}

async function callGemini(input) {
  if (!geminiKey) return null;
  const instruction = `You are a cautious East African livestock-health triage assistant.
Explain possible concerns to a smallholder farmer. Do not claim a confirmed diagnosis.
Do not prescribe medicines or dosages. Recommend a qualified veterinary officer.
If red flags are present, advise immediate contact. Return JSON only:
{"summary":"string","possibleConditions":[{"name":"string","reason":"string","confidence":"low|medium|high"}],"urgency":"routine|priority|emergency","actions":["string"],"avoid":["string"],"veterinaryAdvice":"string"}
Respond in ${input.language === 'sw' ? 'simple Swahili' : 'simple English'}.`;
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(geminiKey)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: instruction }] },
      contents: [{ role: 'user', parts: [{ text: JSON.stringify({
        farmerDescription: input.description,
        selectedSymptoms: input.symptoms,
        deterministicScreen: input.deterministicResult,
      }) }] }],
      generationConfig: { responseMimeType: 'application/json', temperature: 0.2 },
    }),
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw new Error(`Gemini request failed with HTTP ${response.status}`);
  const payload = await response.json();
  const text = payload?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof text !== 'string') throw new Error('Gemini returned no text');
  const parsed = JSON.parse(text);
  if (typeof parsed.summary !== 'string' || !Array.isArray(parsed.possibleConditions) || !Array.isArray(parsed.actions)) {
    throw new Error('Gemini returned an invalid triage response');
  }
  return parsed;
}

const server = createServer(async (req, res) => {
  const origin = req.headers.origin;
  if (!isAllowedOrigin(origin)) return json(res, 403, { error: 'Origin is not allowed' }, 'null');
  if (req.method === 'OPTIONS') return json(res, 204, {}, origin || frontendOrigin);
  if (req.url === '/api/ai/health' && req.method === 'GET') {
    return json(res, 200, { ok: true, providerConfigured: Boolean(geminiKey), model }, origin || frontendOrigins[0]);
  }
  if (req.url !== '/api/ai/triage' || req.method !== 'POST') {
    return json(res, 404, { error: 'Not found' }, origin || frontendOrigin);
  }
  try {
    const input = validateRequest(await parseJsonBody(req));
    const modelResult = await callGemini(input).catch(() => null);
    const urgency = safeUrgency(input.deterministicResult, input.symptoms, modelResult?.urgency);
    return json(res, 200, {
      ok: true,
      provider: modelResult ? 'gemini' : 'deterministic_fallback',
      urgency,
      farmerExplanation: modelResult?.summary || fallbackMessage(input.language, urgency),
      modelResult,
    }, origin || frontendOrigins[0]);
  } catch (error) {
    return json(res, 400, { error: error instanceof Error ? error.message : 'Invalid request' }, origin || frontendOrigin);
  }
});

server.listen(port, () => console.log(`AgriHerd AI API listening on port ${port}`));
