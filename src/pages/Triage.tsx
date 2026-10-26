import { useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { HeartPulse, Check, AlertOctagon, Clock, PhoneCall, ChevronRight, Sparkles, ArrowRight, RotateCcw } from 'lucide-react';
import { useStore } from '../lib/store';
import { SYMPTOM_CATALOG, runTriage, type TriageResult } from '../lib/triage';
import { Card, PageHeader, Field, selectCls, textareaCls, Button, PriorityDot } from '../components/ui';
import { cn } from '../lib/cn';

const GROUPS = ['General', 'Production', 'Respiratory', 'Digestive', 'Locomotion', 'Neurological', 'Skin & Parasites'] as const;

export default function Triage() {
  const { db, currentUser, reportCase, toast } = useStore();
  const navigate = useNavigate();
  const location = useLocation();
  const me = currentUser!;

  const farms = db.farms.filter((f) => f.farmer_id === me.id);
  const [farmId, setFarmId] = useState(farms[0]?.id ?? '');
  const farmAnimals = db.animals.filter((a) => a.farm_id === farmId);
  const [animalId, setAnimalId] = useState(farmAnimals[0]?.id ?? '');
  const [selected, setSelected] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [result, setResult] = useState<TriageResult | null>(null);

  const selectedFarmAnimals = useMemo(() => db.animals.filter((a) => a.farm_id === farmId), [db.animals, farmId]);

  const toggle = (id: string) => setSelected((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);

  const analyze = () => {
    if (selected.length === 0) { toast('warning', 'Nothing to analyze', 'Select at least one symptom first.'); return; }
    setResult(runTriage(selected));
  };

  const createCase = () => {
    if (!result) return;
    const animal = selectedFarmAnimals.find((a) => a.id === animalId) ?? selectedFarmAnimals[0];
    if (!animal) { toast('error', 'No animal selected', 'Add an animal to this farm first.'); return; }
    const priority = result.level === 'emergency' ? 'emergency' : result.level === 'vet_24h' ? 'urgent' : 'routine';
    const newCase = reportCase({
      farm_id: farmId, animal_id: animal.id,
      symptoms: SYMPTOM_CATALOG.filter((s) => selected.includes(s.id)).map((s) => s.label),
      triage_urgency: result.urgency, triage_summary: result.summary, suspected_dx: result.suspected, priority,
    });
    navigate('/app/cases', { state: { highlight: newCase.id, autoAssign: true } });
  };

  const levelStyle = result ? {
    emergency: 'bg-red-600', vet_24h: 'bg-orange-500', call_48h: 'bg-amber-500', self_care: 'bg-emerald-600',
  }[result.level] : '';

  return (
    <div className="max-w-6xl">
      <PageHeader
        title="AI-Assisted Symptom Triage"
        sub="Describe what you see — the engine ranks likely diagnoses with an explainable urgency score. Not a substitute for veterinary judgement; it accelerates it."
      />

      <div className="grid lg:grid-cols-5 gap-5">
        {/* ============ INPUT PANEL ============ */}
        <Card className="lg:col-span-3 p-5">
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-pine-600 mb-2 flex items-center gap-1.5"><Sparkles size={11} className="text-maize-600" /> Step 1 — Clinical context</div>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Farm">
              <select className={selectCls} value={farmId} onChange={(e) => { setFarmId(e.target.value); const first = db.animals.find((a) => a.farm_id === e.target.value); setAnimalId(first?.id ?? ''); }}>
                {farms.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </Field>
            <Field label="Animal">
              <select className={selectCls} value={animalId} onChange={(e) => setAnimalId(e.target.value)}>
                {selectedFarmAnimals.map((a) => <option key={a.id} value={a.id}>{a.name} · {a.tag_number} · {a.breed}</option>)}
              </select>
            </Field>
          </div>

          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-pine-600 mt-5 mb-2">Step 2 — Observed signs <span className="text-pine-400">({selected.length} selected)</span></div>
          <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
            {GROUPS.map((group) => {
              const items = SYMPTOM_CATALOG.filter((s) => s.group === group);
              return (
                <div key={group}>
                  <div className="font-mono text-[8.5px] uppercase tracking-[0.22em] text-pine-500 mb-1">{group}</div>
                  <div className="flex flex-wrap gap-1.5">
                    {items.map((s) => {
                      const on = selected.includes(s.id);
                      return (
                        <button
                          key={s.id}
                          onClick={() => toggle(s.id)}
                          className={cn('h-8 px-2.5 rounded-full border text-[10.5px] font-medium flex items-center gap-1.5 transition-all', on ? 'bg-pine-800 border-pine-800 text-maize-300 shadow-sm' : 'bg-white border-pine-200 text-pine-900 hover:border-pine-400')}
                        >
                          {on && <Check size={11} strokeWidth={3} />}{s.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <Field label="Farmer notes (optional)" >
            <textarea className={textareaCls + ' mt-1.5'} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. 'Started this morning; two other cows licking the fence post…'" />
          </Field>

          <div className="mt-4 flex items-center gap-2">
            <Button size="lg" onClick={analyze}><HeartPulse size={17} /> Analyze with AI triage</Button>
            <Button size="lg" variant="ghost" onClick={() => { setSelected([]); setResult(null); setNotes(''); }}><RotateCcw size={15} /> Reset</Button>
          </div>
          <p className="mt-2 font-mono text-[8.5px] text-pine-500">Transparent weighted engine · 12 bovine disease profiles · deterministic & explainable · no external LLM calls in this build</p>
        </Card>

        {/* ============ RESULT PANEL ============ */}
        <div className="lg:col-span-2">
          <AnimatePresence mode="wait">
            {!result ? (
              <Card key="empty" className="p-8 text-center h-full flex flex-col items-center justify-center min-h-[320px]">
                <div className="h-16 w-16 rounded-2xl bg-pine-50 border border-pine-100 flex items-center justify-center text-pine-400"><HeartPulse size={30} /></div>
                <h3 className="mt-4 font-display font-semibold text-lg text-pine-900">Awaiting assessment</h3>
                <p className="mt-1 text-[12px] text-pine-700 max-w-[260px]">Select symptoms on the left, then run the analysis. Differential diagnoses and urgency will appear here.</p>
              </Card>
            ) : (
              <motion.div key="result" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }} className="space-y-3">
                {/* Urgency gauge */}
                <Card className="overflow-hidden">
                  <div className={cn(levelStyle, 'px-5 py-4 text-white flex items-center gap-3')}>
                    <AlertOctagon size={24} className="shrink-0" />
                    <div>
                      <div className="font-mono text-[8.5px] uppercase tracking-[0.25em] opacity-90">Triage verdict</div>
                      <div className="font-display font-semibold text-[15px] leading-snug">{result.headline}</div>
                    </div>
                  </div>
                  <div className="p-5">
                    <div className="flex items-end justify-between">
                      <div><div className="font-mono text-[9px] uppercase tracking-[0.2em] text-pine-600">Urgency score</div><div className="font-display font-semibold text-5xl text-pine-950 tabular leading-none mt-1">{result.urgency}<span className="text-xl text-pine-400">/100</span></div></div>
                      <PriorityDot priority={result.level === 'emergency' ? 'emergency' : result.level === 'vet_24h' ? 'urgent' : 'routine'} />
                    </div>
                    <div className="mt-3 h-3 rounded-full bg-pine-100 overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${result.urgency}%` }} transition={{ duration: 0.8, delay: 0.2 }} className={cn('h-full rounded-full', result.urgency >= 75 ? 'bg-red-500' : result.urgency >= 55 ? 'bg-orange-500' : result.urgency >= 30 ? 'bg-amber-400' : 'bg-emerald-500')} />
                    </div>
                    <p className="mt-3 text-[11px] text-pine-800 leading-snug bg-pine-50 border border-pine-100 rounded-xl px-3 py-2">{result.summary}</p>
                  </div>
                </Card>

                {/* Differentials */}
                <Card className="p-5">
                  <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-pine-600 mb-2">Ranked differentials</div>
                  <div className="space-y-2">
                    {result.differentials.map((d, i) => (
                      <div key={d.disease} className="flex items-center gap-2">
                        <span className="font-mono text-[9px] text-pine-500 w-4">{i + 1}.</span>
                        <span className="text-[11.5px] font-medium text-pine-950 flex-1">{d.disease}</span>
                        <div className="w-20 h-1.5 rounded-full bg-pine-100 overflow-hidden"><motion.div initial={{ width: 0 }} animate={{ width: `${d.confidence}%` }} transition={{ duration: 0.6, delay: 0.15 * i }} className="h-full bg-pine-600" /></div>
                        <span className="font-mono text-[10px] text-pine-800 tabular w-8 text-right">{d.confidence}%</span>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* Action protocol */}
                <Card className="p-5">
                  <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-pine-600 mb-2 flex items-center gap-1.5"><Clock size={10} /> First-response protocol</div>
                  <ol className="space-y-1.5">
                    {result.advice.map((a, i) => (
                      <li key={i} className="flex items-start gap-2 text-[11.5px] text-pine-900 leading-snug"><span className="font-mono text-[9px] font-bold text-maize-600 mt-0.5">{i + 1}.</span>{a}</li>
                    ))}
                  </ol>
                  <Button variant="dark" size="lg" className="w-full mt-4" onClick={createCase}>Create case & assign vet <ChevronRight size={16} /></Button>
                  <a href="tel:0800723000" className="mt-2 flex items-center justify-center gap-1.5 text-[11px] font-mono font-semibold text-pine-700 hover:text-pine-950"><PhoneCall size={11} /> Livestock hotline 0800 723 000</a>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Incoming deep-link from triage CTA */}
      {location.state?.autoAssign && <div className="hidden" />}
    </div>
  );
}
