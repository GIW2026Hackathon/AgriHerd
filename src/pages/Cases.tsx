/* ==========================================================================
   Cases & Treatment — queue, case dossier drawer, clinical recording,
   claim submission, lifecycle actions (accept/resolve/escalate/cancel)
   ========================================================================== */
import { useMemo, useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ClipboardList, Thermometer, Heart, Pill, X, Stethoscope, Banknote, TriangleAlert,
  CheckCircle2, ChevronRight, User, PawPrint, Building2, Navigation, FileText, BadgeCheck, Plus, ShieldCheck,
} from 'lucide-react';
import { useStore } from '../lib/store';
import { Card, PageHeader, StatusPill, PriorityDot, Button, Avatar, Field, inputCls, selectCls, textareaCls, Modal, EmptyState } from '../components/ui';
import { cn } from '../lib/cn';
import { fmtDateTime, timeAgo, formatKES } from '../lib/geo';
import type { VetCase } from '../lib/types';

type Filter = 'all' | 'mine' | 'open' | 'closed';

export default function Cases() {
  const store = useStore();
  const { db, currentUser, acceptCase, declineCase, resolveCase, escalateCase, cancelCase, addClinicalRecord, addTreatment, submitClaim, coverageFor, toast } = store;
  const me = currentUser!;
  const isVet = me.role === 'vet';
  const location = useLocation();
  const navigate = useNavigate();
  const highlight = (location.state as { highlight?: string } | null)?.highlight;

  const [filter, setFilter] = useState<Filter>('all');
  const [selectedId, setSelectedId] = useState<string | null>(highlight ?? (isVet ? (db.cases.find(c => c.vet_id === me.id)?.id ?? db.cases[0]?.id ?? null) : (db.cases.find(c => c.farmer_id === me.id)?.id ?? null)));
  const [clinicalOpen, setClinicalOpen] = useState(false);
  const [treatmentOpen, setTreatmentOpen] = useState(false);
  const [claimOpen, setClaimOpen] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');

  const myCases = useMemo(() => {
    let list = db.cases.filter((c) => (isVet ? c.vet_id === me.id : c.farmer_id === me.id));
    if (highlight) list = [...list].sort((a, b) => (a.id === highlight ? -1 : b.id === highlight ? 1 : 0));
    switch (filter) {
      case 'open': return list.filter((c) => !['resolved', 'claim_paid', 'cancelled', 'escalated'].includes(c.status));
      case 'closed': return list.filter((c) => ['resolved', 'claim_paid', 'cancelled', 'claim_rejected'].includes(c.status));
      default: return list;
    }
  }, [db.cases, isVet, me.id, filter, highlight]);

  const selected: VetCase | null = db.cases.find((c) => c.id === selectedId) ?? myCases[0] ?? null;
  const animal = selected ? db.animals.find((a) => a.id === selected.animal_id) : undefined;
  const farm = selected ? db.farms.find((f) => f.id === selected.farm_id) : undefined;
  const farmer = selected ? db.profiles.find((p) => p.id === selected.farmer_id) : undefined;
  const vet = selected?.vet_id ? db.profiles.find((p) => p.id === selected.vet_id) : undefined;
  const events = selected ? db.caseEvents.filter((e) => e.case_id === selected.id).sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at)) : [];
  const records = selected ? db.clinicalRecords.filter((r) => r.case_id === selected.id) : [];
  const treatments = selected ? db.treatments.filter((t) => t.case_id === selected.id) : [];
  const existingClaim = selected ? db.claims.find((cl) => cl.case_id === selected.id) : undefined;
  const cov = selected ? coverageFor(selected.farmer_id) : null;
  const treatmentTotal = treatments.reduce((s, t) => s + t.cost_kes, 0);

  /* form states */
  const [crForm, setCrForm] = useState({ examination: '', diagnosis: '', temperature_c: '39.5', heart_rate: '80' });
  const [txForm, setTxForm] = useState({ drug: '', dose: '', route: 'IM', duration_days: '3', cost_kes: '1500' });
  const [claimForm, setClaimForm] = useState({ amount_kes: '', services: '' });

  const submitClinical = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    addClinicalRecord(selected.id, { examination: crForm.examination, diagnosis: crForm.diagnosis, temperature_c: Number(crForm.temperature_c), heart_rate: Number(crForm.heart_rate) });
    setCrForm({ examination: '', diagnosis: '', temperature_c: '39.5', heart_rate: '80' });
    setClinicalOpen(false);
  };
  const submitTreatment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    addTreatment(selected.id, { drug: txForm.drug, dose: txForm.dose, route: txForm.route, duration_days: Number(txForm.duration_days), cost_kes: Number(txForm.cost_kes) });
    setTxForm({ drug: '', dose: '', route: 'IM', duration_days: '3', cost_kes: '1500' });
    setTreatmentOpen(false);
  };
  const openClaimModal = () => {
    if (!selected) return;
    const items = treatments.map((t) => `${t.drug} ${t.dose}`).join('; ');
    const cap = cov?.maxClaim ?? 5000;
    setClaimForm({ amount_kes: String(Math.min(cap, treatmentTotal + 800)), services: `Farm call-out · Clinical exam · ${items || 'treatment per protocol'}` });
    setClaimOpen(true);
  };
  const submitClaimForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    const max = cov?.maxClaim ?? 5000;
    const amount = Number(claimForm.amount_kes);
    if (amount > max) { toast('error', 'Exceeds agreement cap', `Max claim per case is ${formatKES(max)} for this sponsor tier.`); return; }
    submitClaim(selected.id, amount, claimForm.services);
    setClaimOpen(false);
  };

  return (
    <div>
      <PageHeader
        title="Cases & Treatment"
        sub={isVet ? 'Your assigned case queue — accept, examine, treat, resolve, claim.' : 'Every animal health event across your farms, tracked to resolution and payout.'}
        actions={!isVet && <Button variant="maize" onClick={() => navigate('/app/triage')}><Plus size={15} /> Report sick animal</Button>}
      />

      <div className="grid lg:grid-cols-5 gap-4">
        {/* ============ QUEUE ============ */}
        <div className="lg:col-span-2 space-y-2">
          <div className="flex items-center gap-1.5 bg-white border border-pine-900/10 rounded-xl p-1 w-fit">
            {([['all', 'All'], ['open', 'Open'], ['closed', 'Closed']] as [Filter, string][]).map(([k, l]) => (
              <button key={k} onClick={() => setFilter(k)} className={cn('h-8 px-4 rounded-lg text-[11.5px] font-semibold transition-colors', filter === k ? 'bg-pine-800 text-maize-300' : 'text-pine-800 hover:bg-pine-50')}>{l}</button>
            ))}
          </div>
          <div className="space-y-2 max-h-[72vh] overflow-y-auto pr-0.5">
            {myCases.map((c) => {
              const a = db.animals.find((x) => x.id === c.animal_id)!;
              const active = selected?.id === c.id;
              return (
                <button key={c.id} onClick={() => setSelectedId(c.id)} className={cn('w-full text-left rounded-2xl border p-3 transition-all', active ? 'border-pine-600 bg-pine-50 shadow-md ring-1 ring-pine-600/40' : 'border-pine-900/10 bg-white hover:border-pine-300', highlight === c.id && 'ring-2 ring-maize-400')}>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[9.5px] font-bold text-pine-600">{c.case_number}</span>
                    <PriorityDot priority={c.priority} />
                    <span className="ml-auto font-mono text-[9px] text-pine-500">{timeAgo(c.reported_at)}</span>
                  </div>
                  <div className="mt-1 text-[12.5px] font-bold text-pine-950 leading-snug">{a.name} · {c.suspected_dx}</div>
                  <div className="mt-1.5 flex items-center justify-between gap-2">
                    <div className="flex flex-wrap gap-1">{c.symptoms.slice(0, 2).map((s) => <span key={s} className="text-[9px] bg-pine-100/70 text-pine-800 rounded-full px-1.5 py-0.5">{s}</span>)}</div>
                    <StatusPill status={c.status} />
                  </div>
                </button>
              );
            })}
            {myCases.length === 0 && <EmptyState icon={<ClipboardList size={26} />} title="No cases yet" body={isVet ? 'Assigned cases will appear here.' : 'Report a sick animal from the Symptom Check page.'} action={!isVet && <Button onClick={() => navigate('/app/triage')}><HeartPulseIcon /> Start triage</Button>} />}
          </div>
        </div>

        {/* ============ DOSSIER ============ */}
        <div className="lg:col-span-3">
          <AnimatePresence mode="wait">
            {selected && animal && farm ? (
              <motion.div key={selected.id} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
                <Card className="overflow-hidden">
                  <div className="bg-pine-950 text-pine-100 px-5 py-4 flex flex-wrap items-center gap-4">
                    <Avatar initials={animal.name.slice(0, 2).toUpperCase()} tone="maize" size="lg" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-[10px] text-maize-300">{selected.case_number}</span>
                        <StatusPill status={selected.status} />
                        <PriorityDot priority={selected.priority} />
                      </div>
                      <h2 className="font-display font-semibold text-xl text-maize-50 mt-0.5">{animal.name} <span className="text-pine-300 text-sm font-sans font-normal">· {animal.breed} · {animal.sex === 'female' ? 'Cow' : 'Bull'} · {animal.tag_number}</span></h2>
                      <div className="font-mono text-[9px] text-pine-300 mt-0.5">{farm.name} · {farm.ward} · reported {fmtDateTime(selected.reported_at)}</div>
                    </div>
                    {/* Triage dial */}
                    <div className="text-center">
                      <div className={cn('h-16 w-16 rounded-full border-4 flex items-center justify-center font-display font-bold text-lg', selected.triage_urgency >= 75 ? 'border-red-400 text-red-300' : selected.triage_urgency >= 55 ? 'border-amber-400 text-amber-300' : 'border-emerald-400 text-emerald-300')}>{selected.triage_urgency}</div>
                      <div className="font-mono text-[7px] uppercase tracking-[0.2em] text-pine-400 mt-1">Urgency</div>
                    </div>
                  </div>

                  <div className="p-5 grid md:grid-cols-2 gap-4">
                    {/* People */}
                    <div className="space-y-2 text-[11.5px]">
                      <div className="font-mono text-[8.5px] uppercase tracking-[0.2em] text-pine-500">People</div>
                      <div className="flex items-center gap-2"><User size={13} className="text-pine-500 shrink-0" /><span className="text-pine-800">Farmer:</span><b className="text-pine-950">{farmer?.full_name}</b></div>
                      <div className="flex items-center gap-2"><Stethoscope size={13} className="text-pine-500 shrink-0" /><span className="text-pine-800">Vet:</span><b className="text-pine-950">{vet ? vet.full_name : 'Unassigned'}</b></div>
                      <div className="flex items-center gap-2"><Building2 size={13} className="text-pine-500 shrink-0" /><span className="text-pine-800">Sponsor:</span><b className="text-pine-950">{cov?.covered ? cov.sponsorName : 'None'}</b></div>
                      <div className="flex items-center gap-2"><PawPrint size={13} className="text-pine-500 shrink-0" /><span className="text-pine-800">Suspected:</span><b className="text-pine-950">{selected.suspected_dx}</b></div>
                    </div>
                    {/* Symptoms */}
                    <div>
                      <div className="font-mono text-[8.5px] uppercase tracking-[0.2em] text-pine-500">Reported signs</div>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">{selected.symptoms.map((s) => <span key={s} className="text-[10px] bg-red-50 border border-red-200 text-red-900 rounded-md px-2 py-1">{s}</span>)}</div>
                      <p className="mt-2 text-[10.5px] text-pine-700 leading-snug italic border-l-2 border-pine-200 pl-2">{selected.triage_summary}</p>
                    </div>
                  </div>

                  {/* Clinical records & treatments */}
                  <div className="px-5 pb-4 grid md:grid-cols-2 gap-4">
                    <div className="border border-pine-900/10 rounded-xl p-3">
                      <div className="flex items-center justify-between"><div className="font-mono text-[8.5px] uppercase tracking-[0.2em] text-pine-500">Clinical records ({records.length})</div>{isVet && <button className="text-[10px] font-bold text-pine-700 hover:text-pine-950 flex items-center gap-1" onClick={() => setClinicalOpen(true)}><Plus size={11} /> Add</button>}</div>
                      <div className="mt-2 space-y-2 max-h-40 overflow-y-auto">
                        {records.map((r) => (
                          <div key={r.id} className="text-[10.5px] border border-pine-100 rounded-lg p-2 bg-pine-50/50">
                            <div className="flex items-center gap-2 font-semibold text-pine-950"><Thermometer size={10} />{r.temperature_c}°C <Heart size={10} className="ml-1" />{r.heart_rate} bpm<span className="ml-auto font-mono text-[8.5px] text-pine-500">{timeAgo(r.created_at)}</span></div>
                            <div className="mt-1 text-pine-900"><b>Dx:</b> {r.diagnosis}</div>
                            <div className="text-pine-700 mt-0.5 leading-snug">{r.examination}</div>
                          </div>
                        ))}
                        {records.length === 0 && <div className="text-[10.5px] text-pine-500 py-3 text-center">{isVet ? 'No examination logged yet.' : 'Awaiting vet examination.'}</div>}
                      </div>
                    </div>
                    <div className="border border-pine-900/10 rounded-xl p-3">
                      <div className="flex items-center justify-between"><div className="font-mono text-[8.5px] uppercase tracking-[0.2em] text-pine-500">Treatments ({treatments.length}) · <span className="text-pine-800">{formatKES(treatmentTotal)}</span></div>{isVet && <button className="text-[10px] font-bold text-pine-700 hover:text-pine-950 flex items-center gap-1" onClick={() => setTreatmentOpen(true)}><Plus size={11} /> Add</button>}</div>
                      <div className="mt-2 space-y-1.5 max-h-40 overflow-y-auto">
                        {treatments.map((t) => (
                          <div key={t.id} className="flex items-start gap-2 text-[10.5px] border border-pine-100 rounded-lg p-2 bg-pine-50/50">
                            <Pill size={12} className="text-pine-600 mt-0.5 shrink-0" />
                            <span className="min-w-0"><b className="text-pine-950">{t.drug}</b><br /><span className="text-pine-700">{t.dose} · {t.route} · {t.duration_days}d · {formatKES(t.cost_kes)}</span></span>
                          </div>
                        ))}
                        {treatments.length === 0 && <div className="text-[10.5px] text-pine-500 py-3 text-center">No treatments logged yet.</div>}
                      </div>
                    </div>
                  </div>

                  {/* Timeline */}
                  <div className="px-5 pb-4">
                    <div className="font-mono text-[8.5px] uppercase tracking-[0.2em] text-pine-500 mb-1.5">Lifecycle timeline</div>
                    <div className="relative border-l-2 border-pine-100 pl-4 space-y-1.5 max-h-36 overflow-y-auto">
                      {events.map((e) => (
                        <div key={e.id} className="text-[10.5px] relative">
                          <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-pine-500" />
                          <b className="text-pine-900">{e.event.replace(/_/g, ' ')}</b> <span className="text-pine-500 font-mono text-[9px]">· {fmtDateTime(e.created_at)}</span>
                          <div className="text-pine-700 leading-snug">{e.detail} — <span className="italic">{e.actor_name}</span></div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Action bar */}
                  <div className="px-5 py-4 bg-paper border-t border-pine-900/10 flex flex-wrap items-center gap-2">
                    {isVet && selected.status === 'vet_assigned' && (<>
                      <Button variant="primary" onClick={() => acceptCase(selected.id)}><CheckCircle2 size={15} /> Accept & visit farm</Button>
                      <Button variant="outline" onClick={() => declineCase(selected.id)}><X size={14} /> Decline</Button>
                    </>)}
                    {isVet && selected.status === 'in_treatment' && (<>
                      <Button variant="primary" onClick={() => resolveCase(selected.id)}><CheckCircle2 size={15} /> Mark resolved</Button>
                      <Button variant="outline" onClick={() => setClinicalOpen(true)}><Stethoscope size={14} /> Clinical record</Button>
                      <Button variant="outline" onClick={() => setTreatmentOpen(true)}><Pill size={14} /> Log treatment</Button>
                      <Button variant="ghost" className="text-red-700 hover:bg-red-50" onClick={() => escalateCase(selected.id, 'Clinical deterioration — county notified')}><TriangleAlert size={14} /> Escalate</Button>
                    </>)}
                    {isVet && selected.status === 'resolved' && !existingClaim && (
                      <Button variant="maize" onClick={openClaimModal}><Banknote size={15} /> Submit claim to sponsor</Button>
                    )}
                    {existingClaim && (
                      <Link to="/app/claims" className="inline-flex items-center gap-2 text-[11.5px] font-bold text-pine-900 bg-maize-400/40 border border-maize-500/50 rounded-xl h-10 px-4 hover:bg-maize-400/60"><ShieldCheck size={14} /> {existingClaim.claim_number} · <StatusPill status={existingClaim.status} /> <ChevronRight size={13} /></Link>
                    )}
                    {!isVet && ['pending_vet', 'vet_assigned'].includes(selected.status) && (
                      <Button variant="dark" onClick={() => navigate(`/app/find-vet?case=${selected.id}`)}><Navigation size={14} /> {selected.status === 'pending_vet' ? 'Assign a vet' : 'Change vet'}</Button>
                    )}
                    {!isVet && selected.status === 'pending_vet' && <Button variant="ghost" className="text-red-700" onClick={() => cancelCase(selected.id)}>Cancel case</Button>}
                    {!isVet && ['resolved', 'claim_submitted', 'claim_under_review', 'claim_approved', 'claim_paid'].includes(selected.status) && <span className="text-[11px] font-semibold text-pine-700 flex items-center gap-1.5"><CheckCircle2 size={13} className="text-emerald-600" /> {existingClaim ? `Claim ${existingClaim.claim_number} — ${existingClaim.status}` : 'Awaiting vet claim submission'}</span>}
                  </div>
                </Card>
                {adminNotes !== '' && <div className="hidden">{adminNotes}</div>}
              </motion.div>
            ) : (
              <Card key="none" className="p-10 text-center text-pine-600 text-[13px]">Select a case from the queue.</Card>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ============ MODALS ============ */}
      <Modal open={clinicalOpen} onClose={() => setClinicalOpen(false)} title="Clinical Examination" subtitle={selected ? `${selected.case_number} · ${animal?.name}` : ''}>
        <form onSubmit={submitClinical} className="space-y-3">
          <Field label="Examination findings *"><textarea required className={textareaCls} value={crForm.examination} onChange={(e) => setCrForm({ ...crForm, examination: e.target.value })} placeholder="Vesicles on dental pad…" /></Field>
          <Field label="Diagnosis *"><input required className={inputCls} value={crForm.diagnosis} onChange={(e) => setCrForm({ ...crForm, diagnosis: e.target.value })} placeholder="Foot & Mouth Disease (serotype O)" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Temperature (°C)"><input required type="number" step="0.1" className={inputCls} value={crForm.temperature_c} onChange={(e) => setCrForm({ ...crForm, temperature_c: e.target.value })} /></Field>
            <Field label="Heart rate (bpm)"><input required type="number" className={inputCls} value={crForm.heart_rate} onChange={(e) => setCrForm({ ...crForm, heart_rate: e.target.value })} /></Field>
          </div>
          <Button type="submit" className="w-full"><Stethoscope size={15} /> Save clinical record</Button>
        </form>
      </Modal>

      <Modal open={treatmentOpen} onClose={() => setTreatmentOpen(false)} title="Log Treatment" subtitle={selected ? `${selected.case_number} · ${animal?.name}` : ''}>
        <form onSubmit={submitTreatment} className="space-y-3">
          <Field label="Drug / intervention *"><input required className={inputCls} value={txForm.drug} onChange={(e) => setTxForm({ ...txForm, drug: e.target.value })} placeholder="Oxytetracycline LA 20%" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Dose *"><input required className={inputCls} value={txForm.dose} onChange={(e) => setTxForm({ ...txForm, dose: e.target.value })} placeholder="20 mg/kg IM" /></Field>
            <Field label="Route"><select className={selectCls} value={txForm.route} onChange={(e) => setTxForm({ ...txForm, route: e.target.value })}>{['IM', 'IV', 'SC', 'Oral', 'Topical', 'Intramammary'].map((r) => <option key={r}>{r}</option>)}</select></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Duration (days)"><input required type="number" min={1} className={inputCls} value={txForm.duration_days} onChange={(e) => setTxForm({ ...txForm, duration_days: e.target.value })} /></Field>
            <Field label="Cost (KES)"><input required type="number" min={0} className={inputCls} value={txForm.cost_kes} onChange={(e) => setTxForm({ ...txForm, cost_kes: e.target.value })} /></Field>
          </div>
          <Button type="submit" className="w-full"><Pill size={15} /> Record treatment — {formatKES(Number(txForm.cost_kes) || 0)}</Button>
        </form>
      </Modal>

      <Modal open={claimOpen} onClose={() => setClaimOpen(false)} title="Submit Claim to Sponsor" subtitle={cov?.covered ? `${cov.sponsorName} · cap ${formatKES(cov.maxClaim)} per case` : 'No active sponsor coverage detected'} wide>
        <form onSubmit={submitClaimForm} className="space-y-3">
          <div className="bg-pine-50 border border-pine-100 rounded-xl p-3 text-[11px] text-pine-900">
            <div className="font-mono text-[8.5px] uppercase tracking-[0.2em] text-pine-500 mb-1">Itemized services (auto-generated from treatments)</div>
            {treatments.length === 0 ? 'No treatment lines — claim will be call-out only.' : treatments.map((t) => <div key={t.id} className="flex justify-between"><span>{t.drug}</span><b className="tabular">{formatKES(t.cost_kes)}</b></div>)}
            <div className="flex justify-between border-t border-pine-200 mt-1.5 pt-1.5 font-bold"><span>Treatment subtotal</span><span className="tabular">{formatKES(treatmentTotal)}</span></div>
          </div>
          <Field label="Services rendered *"><textarea required className={textareaCls} value={claimForm.services} onChange={(e) => setClaimForm({ ...claimForm, services: e.target.value })} /></Field>
          <Field label={`Claim amount (KES) — max ${formatKES(cov?.maxClaim ?? 5000)}`}><input required type="number" min={1} max={cov?.maxClaim ?? 5000} className={inputCls} value={claimForm.amount_kes} onChange={(e) => setClaimForm({ ...claimForm, amount_kes: e.target.value })} /></Field>
          <div className="flex items-start gap-2 text-[10px] text-pine-600 bg-amber-50 border border-amber-200 rounded-xl p-2.5"><BadgeCheck size={13} className="shrink-0 mt-0.5 text-amber-600" />Sponsors may reject claims lacking clinical documentation. This claim auto-attaches the case dossier, clinical records and treatment lines.</div>
          <Button type="submit" variant="maize" className="w-full"><Banknote size={15} /> Submit claim</Button>
        </form>
      </Modal>
    </div>
  );
}

function HeartPulseIcon() { return <Stethoscope size={15} />; }
