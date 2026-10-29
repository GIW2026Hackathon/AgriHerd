import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Stethoscope, Sparkles, AlertOctagon, ShieldCheck, Plus, Check, Loader2, PawPrint,
  ChevronDown, Ban, BadgeCheck, Mic, Square, Languages,
} from 'lucide-react';
import { useApp } from '../lib/session';
import { useToast } from '../lib/toast';
import { screenDescription, farmerExplanation, requestGeminiTriage, SYMPTOM_CATALOG, type FeedbackLanguage, type SymptomId } from '../lib/ai';
import { Card, CardHeader, Badge, Btn } from '../components/ui';
import { cn, haversineKm } from '../lib/utils';
import { wardByName } from '../lib/wards';

export default function AITriage() {
  const { db, user, role, client, tick } = useApp();
  const { toast } = useToast();
  const navigate = useNavigate();

  const farms = useMemo(() => client.farmsForUser(user), [client, user, db.farms]);
  const [farmId, setFarmId] = useState(farms[0]?.id ?? '');
  const farmAnimals = useMemo(() => db.animals.filter(a => a.farm_id === farmId && a.status !== 'deceased' && a.status !== 'sold'), [db.animals, farmId]);
  const [animalId, setAnimalId] = useState<string>('');
  const [selected, setSelected] = useState<SymptomId[]>([]);
  const [description, setDescription] = useState('');
  const [language, setLanguage] = useState<FeedbackLanguage>('sw');
  const [listening, setListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [interimTranscript, setInterimTranscript] = useState('');
  type SpeechResultEvent = { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal?: boolean }> };
  type SpeechRecognitionLike = {
    start: () => void;
    stop: () => void;
    lang: string;
    continuous: boolean;
    interimResults: boolean;
    onresult: ((event: SpeechResultEvent) => void) | null;
    onend: (() => void) | null;
    onerror: (() => void) | null;
  };
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const listeningRef = useRef(false);
  const recordingStartedAtRef = useRef<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ReturnType<typeof screenDescription>['result'] & { farmerExplanation?: string } | null>(null);
  const [logging, setLogging] = useState(false);

  useEffect(() => {
    const speech = window as Window & {
      SpeechRecognition?: new () => SpeechRecognitionLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    };
    setSpeechSupported(Boolean(speech.SpeechRecognition || speech.webkitSpeechRecognition));
  }, []);

  useEffect(() => {
    if (!listening) return;
    const timer = window.setInterval(() => {
      if (recordingStartedAtRef.current) {
        setRecordingSeconds(Math.floor((Date.now() - recordingStartedAtRef.current) / 1000));
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [listening]);

  useEffect(() => () => {
    listeningRef.current = false;
    recognitionRef.current?.stop();
  }, []);

  const toggle = (id: SymptomId) => setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);

  const runScreen = async () => {
    if (selected.length === 0 && !description.trim()) { toast('Add symptoms or describe what you see', { tone: 'warning' }); return; }
    setBusy(true);
    setResult(null);
    const screened = screenDescription(description, selected);
    const gemini = await requestGeminiTriage(description, language, screened.symptoms, screened.result);
    const enriched = gemini
      ? { ...screened.result, urgency: gemini.urgency, engine: 'hybrid' as const, farmerExplanation: gemini.farmerExplanation }
      : { ...screened.result, farmerExplanation: farmerExplanation(screened.result, language) };
    setSelected(screened.symptoms);
    setResult(enriched);
    setBusy(false);
  };

  const stopVoice = () => {
    listeningRef.current = false;
    setListening(false);
    setInterimTranscript('');
    recognitionRef.current?.stop();
    recognitionRef.current = null;
  };

  const startVoice = () => {
    const speech = window as Window & {
      SpeechRecognition?: new () => SpeechRecognitionLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    };
    const Recognition = speech.SpeechRecognition || speech.webkitSpeechRecognition;
    if (!Recognition) {
      toast('Voice notes are not supported in this browser', { body: 'Type the description instead, or use Chrome/Edge on a secure connection.', tone: 'warning' });
      return;
    }
    const recognition = new Recognition();
    recognition.lang = language === 'sw' ? 'sw-KE' : 'en-KE';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onresult = (event) => {
      let finalText = '';
      let interimText = '';
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const item = event.results[index];
        if (item?.[0]?.transcript) {
          if (item.isFinal) finalText += item[0].transcript;
          else interimText += item[0].transcript;
        }
      }
      if (finalText) setDescription((current) => `${current} ${finalText}`.trim());
      setInterimTranscript(interimText);
    };
    recognition.onend = () => {
      if (!listeningRef.current) return;
      window.setTimeout(() => {
        if (listeningRef.current) {
          try { recognition.start(); } catch { /* browser is already restarting */ }
        }
      }, 150);
    };
    recognition.onerror = () => {
      if (listeningRef.current) toast('Microphone needs attention', { body: 'Keep speaking or check microphone permission. The recording will continue where possible.', tone: 'warning' });
    };
    recognitionRef.current = recognition;
    listeningRef.current = true;
    recordingStartedAtRef.current = Date.now();
    setRecordingSeconds(0);
    setInterimTranscript('');
    setListening(true);
    try {
      recognition.start();
    } catch {
      stopVoice();
      toast('Could not start the microphone', { body: 'Please allow microphone access and try again.', tone: 'warning' });
    }
  };

  // nearest available vet to the farm (Haversine)
  const recommendedVet = useMemo(() => {
    const farm = db.farms.find(f => f.id === farmId);
    if (!farm) return null;
    return db.profiles.filter(p => p.role === 'vet' && p.available !== false)
      .map(v => {
        const vw = wardByName(v.ward);
        const vLat = vw?.lat ?? farm.lat, vLng = vw?.lng ?? farm.lng;
        return { vet: v, km: haversineKm(farm.lat, farm.lng, vLat, vLng) };
      })
      .sort((a, b) => a.km - b.km)[0]?.vet ?? null;
  }, [db.farms, db.profiles, farmId]);

  if (role === 'farmer' && farms.length === 0) {
    return (
      <div className="mx-auto max-w-2xl p-4 sm:p-6">
        <Card>
          <CardHeader title="Add your farm to get started" sub="Farm details are needed to save health reports and connect them to the right animals." />
          <div className="p-4 pt-0">
            <button onClick={() => navigate('/app/farmer/registry')} className="h-11 rounded-xl bg-pine-800 px-5 text-[13px] font-bold text-cream-50 hover:bg-pine-700">Add my farm</button>
          </div>
        </Card>
      </div>
    );
  }

  const logCase = () => {
    if (!result) return;
    setLogging(true);
    const animal = db.animals.find(a => a.id === animalId);
    const c = client.createCaseFromScreening(user, {
      animal_id: animalId || null,
      farm_id: farmId,
      chief_complaint: description.trim() || `AI triage (${selected.length} symptoms): ${selected.slice(0, 4).map(s => SYMPTOM_CATALOG.find(c => c.id === s)?.label).join(', ')}`,
      symptoms: selected,
      ai_confidence: result.differential[0]?.confidence ?? null,
      ai_differential: result.differential,
      priority: result.urgency,
      assigned_vet_id: recommendedVet?.id ?? null,
    });
    tick();
    setLogging(false);
    toast(`${c.case_number} logged`, { body: recommendedVet ? `${recommendedVet.full_name} auto-assigned — ${result.urgency.toUpperCase()} priority.` : 'Case submitted. Awaiting vet triage.', tone: result.urgency === 'emergency' ? 'warning' : 'success' });
    navigate(`/app/${role}/cases/${c.id}`);
  };

  const urgencyStyle = {
    emergency: 'border-red-400 bg-red-50', priority: 'border-amber-400 bg-amber-50', routine: 'border-pine-600/40 bg-pine-50',
  } as const;

  return (
    <div className="mx-auto max-w-6xl space-y-5 p-4 sm:p-6">
      <div>
        <p className="label-caps text-pine-600">Module · AI Pre-Screening</p>
        <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight text-pine-950">AI Disease Pre-Screening</h1>
        <p className="mt-0.5 max-w-2xl text-[13px] text-stone-500">Andika au sema kwa Kiswahili unachoona. Uchambuzi wa awali husaidia kupanga haraka; daktari wa mifugo ndiye anayethibitisha ugonjwa na matibabu.</p>
      </div>

      <div className="grid gap-5 lg:grid-cols-5">
        {/* ===== Left: intake ===== */}
        <Card className="lg:col-span-3">
          <CardHeader title="1 · Animal & Farm" sub="We attach the screening to the animal's clinical record" />
          <div className="grid gap-3 border-b border-cream-100 p-4 sm:grid-cols-2">
            <div>
              <label className="label-caps" htmlFor="farm">Farm</label>
              <select id="farm" value={farmId} onChange={e => { setFarmId(e.target.value); setAnimalId(''); }} className="input-field mt-1.5">
                {farms.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label-caps" htmlFor="animal">Animal</label>
              <select id="animal" value={animalId} onChange={e => setAnimalId(e.target.value)} className="input-field mt-1.5">
                <option value="">— No specific animal / general query —</option>
                {farmAnimals.map(a => <option key={a.id} value={a.id}>{a.tag_number} · {a.breed} · {a.stage}</option>)}
              </select>
            </div>
          </div>

          <CardHeader title="2 · Symptoms observed" sub={`${selected.length} selected — tap all that apply`} />
          <div className="border-b border-cream-100 p-4">
            <div className="flex items-center justify-between gap-3">
              <label className="label-caps" htmlFor="description">Maelezo ya mkulima / Farmer description</label>
              <label className="flex items-center gap-1.5 text-[11px] font-semibold text-stone-600"><Languages className="h-3.5 w-3.5" /> Feedback
                <select value={language} onChange={(event) => setLanguage(event.target.value as FeedbackLanguage)} className="rounded-lg border border-cream-300 bg-white px-2 py-1 text-[11px]">
                  <option value="sw">Kiswahili</option><option value="en">English</option>
                </select>
              </label>
            </div>
            <textarea id="description" value={description} onChange={(event) => setDescription(event.target.value)} className="input-field mt-1.5 min-h-24 resize-y" placeholder="Mfano: Ng'ombe ana homa kali, hakuli, na kupe wameonekana..." />
            <div className="mt-2 rounded-xl border border-pine-100 bg-pine-50/60 p-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <span className={cn('flex h-9 w-9 items-center justify-center rounded-full', listening ? 'bg-red-100 text-red-700' : 'bg-pine-100 text-pine-800')}>
                    <Mic className={cn('h-4 w-4', listening && 'animate-pulse')} />
                  </span>
                  <div>
                    <p className="text-[12px] font-bold text-pine-950">{listening ? `Inarekodi… ${Math.floor(recordingSeconds / 60)}:${String(recordingSeconds % 60).padStart(2, '0')}` : 'Ongea badala ya kuandika'}</p>
                    <p className="text-[10.5px] text-stone-500">{listening ? 'Endelea kuzungumza. Bonyeza Stop ukimaliza.' : 'Bonyeza mara moja, sema kwa utulivu, kisha bonyeza Stop.'}</p>
                  </div>
                </div>
                <button type="button" onClick={listening ? stopVoice : startVoice} disabled={!speechSupported && !listening} className={cn('inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2 text-[12px] font-bold shadow-sm transition sm:min-w-36', listening ? 'border border-red-300 bg-red-600 text-white hover:bg-red-700' : 'bg-pine-800 text-cream-50 hover:bg-pine-700', !speechSupported && !listening && 'cursor-not-allowed opacity-50')}>
                  {listening ? <><Square className="h-4 w-4" /> Stop</> : <><Mic className="h-4 w-4" /> Anza kusema</>}
                </button>
              </div>
              {interimTranscript && <p className="mt-2 rounded-lg bg-white/80 px-2.5 py-2 text-[11px] italic text-stone-500">“{interimTranscript}”</p>}
              <p className="mt-2 text-[10px] leading-relaxed text-stone-400">{speechSupported ? 'Unaweza kurekodi kwa muda mrefu; mfumo utaendelea kusikiliza hadi ubonyeze Stop. Maelezo yataonekana kwenye kisanduku hapo juu.' : 'Kivinjari hiki hakitumii kurekodi kwa sauti. Andika maelezo hapo juu au tumia Chrome/Edge.'}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5 p-4">
            {SYMPTOM_CATALOG.map(s => {
              const on = selected.includes(s.id);
              const isRed = ['high_fever', 'down_cow', 'neuro_signs', 'epistaxis'].includes(s.id);
              return (
                <button key={s.id} onClick={() => toggle(s.id)} aria-pressed={on} className={cn(
                  'flex items-center gap-1 rounded-full border px-2.5 py-1.5 text-[11.5px] font-semibold transition-all',
                  on
                    ? isRed ? 'border-red-500 bg-red-600 text-white shadow-sm' : 'border-pine-700 bg-pine-800 text-cream-50 shadow-sm'
                    : isRed ? 'border-red-200 bg-red-50/50 text-red-800 hover:border-red-400' : 'border-cream-300 bg-white text-stone-600 hover:border-pine-600 hover:text-pine-800'
                )}>
                  {on ? <Check className="h-3 w-3" /> : <Plus className="h-3 w-3" />}{s.label}
                </button>
              );
            })}
          </div>
          <div className="border-t border-cream-100 p-4">
            <Btn size="lg" className="w-full !h-12 text-[15px]" onClick={runScreen} disabled={busy}>
              {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Sparkles className="h-5 w-5" /> Run AI Screening</>}
            </Btn>
            <p className="mt-2 flex items-center justify-center gap-1.5 text-[10.5px] text-stone-400"><ShieldCheck className="h-3.5 w-3.5" /> Deterministic veterinary engine always active · red-flag symptoms force EMERGENCY</p>
          </div>
        </Card>

        {/* ===== Right: result ===== */}
        <div className="space-y-4 lg:col-span-2">
          {!result && !busy && (
            <Card className="flex h-full min-h-[320px] flex-col items-center justify-center border-dashed p-8 text-center">
              <Stethoscope className="h-12 w-12 text-pine-700/40" strokeWidth={1.3} />
              <p className="mt-3 font-display text-lg font-semibold text-pine-950">Screening awaits symptoms</p>
              <p className="mt-1 max-w-[240px] text-[12px] text-stone-500">Pick the symptoms you observe and run the engine. Try: <em>high fever + swollen lymph nodes + runny eyes + ticks seen</em> — that's the ECF signature.</p>
            </Card>
          )}
          {busy && (
            <Card className="flex h-full min-h-[320px] flex-col items-center justify-center gap-3 p-8 text-center">
              <Loader2 className="h-9 w-9 animate-spin text-pine-700" />
              <p className="text-[13px] font-semibold text-pine-900">Ranking differentials against 12 disease profiles…</p>
            </Card>
          )}
          {result && (
            <Card className={cn('border-2', urgencyStyle[result.urgency])}>
              <CardHeader title="Screening Result" sub={`Engine: ${result.engine === 'hybrid' ? 'Deterministic rules + AI Gateway (hybrid)' : 'Deterministic veterinary rule engine'}`}
                action={<Badge tone={result.urgency === 'emergency' ? 'red' : result.urgency === 'priority' ? 'amber' : 'green'} className="!px-3 !py-1 !text-[12px]">{result.urgency === 'emergency' && <AlertOctagon className="h-3.5 w-3.5" />}{result.urgency.toUpperCase()}</Badge>} />
              <div className="space-y-2 p-4">
                {result.farmerExplanation && <div className="rounded-xl border border-pine-200 bg-white/70 p-3 text-[12px] leading-relaxed text-pine-950"><p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-pine-600">{language === 'sw' ? 'Maelezo kwa mkulima' : 'Farmer explanation'}</p>{result.farmerExplanation}</div>}
                {result.differential.map((d, i) => (
                  <div key={i} className="flex items-start gap-3 rounded-xl border border-cream-200 bg-white p-3">
                    <span className={cn('mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg font-mono text-[12px] font-bold', i === 0 ? 'bg-pine-800 text-cream-50' : 'bg-cream-100 text-stone-500')}>{i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-[13px] font-bold leading-snug text-pine-950">{d.disease}</p>
                        <span className="font-mono text-[12px] font-bold text-pine-800">{Math.round(d.confidence * 100)}%</span>
                      </div>
                      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-cream-200"><div className={cn('h-full rounded-full', d.urgency === 'emergency' ? 'bg-red-500' : d.urgency === 'priority' ? 'bg-amber-500' : 'bg-pine-600')} style={{ width: `${d.confidence * 100}%` }} /></div>
                      <p className="mt-1.5 text-[11px] leading-snug text-stone-600">{d.advice}</p>
                    </div>
                  </div>
                ))}
              </div>
              {result.llmExplanation && <div className="mx-4 mb-3 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-[12px] leading-relaxed text-violet-900"><p className="mb-1 flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-widest text-violet-500"><Sparkles className="h-3.5 w-3.5" /> AI explanation (gateway)</p>{result.llmExplanation}</div>}
              <div className="border-t border-cream-200 bg-cream-50/60 p-4">
                {result.urgency === 'emergency' && <p className="mb-2 flex items-center gap-2 text-[12px] font-bold text-red-800"><AlertOctagon className="h-4 w-4" />Possible emergency — do not wait. Call the vet now: <a className="underline" href="tel:+254709312400">+254 709 312 400</a></p>}
                <Btn className="w-full" variant="primary" onClick={logCase} disabled={logging}>
                  {logging ? <Loader2 className="h-4 w-4 animate-spin" /> : <PawPrint className="h-4 w-4" />}
                  Log as case{recommendedVet ? ` — auto-assign ${recommendedVet.full_name.split('—')[0].trim().split(' ').slice(0, 2).join(' ')}` : ''}
                </Btn>
                <button onClick={() => { setResult(null); setSelected([]); setDescription(''); }} className="mt-2 flex w-full items-center justify-center gap-1 text-[11px] font-semibold text-stone-500 hover:text-pine-800"><Ban className="h-3.5 w-3.5" />Clear screening</button>
              </div>
            </Card>
          )}
          {result?.engine === 'deterministic_rules' && (
            <p className="flex items-center justify-center gap-1.5 text-[10px] text-stone-400"><BadgeCheck className="h-3.5 w-3.5" />Answered by the built-in veterinary engine — no AI gateway key configured.</p>
          )}
        </div>
      </div>
    </div>
  );
}
