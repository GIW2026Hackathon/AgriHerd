import { useMemo, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, AlertOctagon, PawPrint, MapPin, User, Pill, Coins, Plus, Check,
  Stethoscope, Clock, FileText, ListPlus, Send, Loader2, ChevronDown,
} from 'lucide-react';
import { useApp } from '../lib/session';
import { useToast } from '../lib/toast';
import { Card, CardHeader, Badge, Avatar, Btn, caseStatusTone, priorityTone, STATUS_LABEL, claimStatusTone, CLAIM_STATUS_LABEL } from '../components/ui';
import { cn, kes, timeAgo, fmtDateTime, ageYears, haversineKm } from '../lib/utils';
import { wardByName } from '../lib/wards';
import type { CaseStatus, ClaimStatus } from '../lib/types';

export default function CaseDetail() {
  const { caseId } = useParams<{ caseId: string }>();
  const { db, user, role, client, tick } = useApp();
  const { toast } = useToast();
  const navigate = useNavigate();

  const kase = db.cases.find(c => c.id === caseId);
  const animal = kase ? db.animals.find(a => a.id === kase.animal_id) : undefined;
  const farm = kase ? db.farms.find(f => f.id === kase.farm_id) : undefined;
  const vet = kase?.assigned_vet_id ? db.profiles.find(p => p.id === kase.assigned_vet_id) : undefined;
  const reporter = kase ? db.profiles.find(p => p.id === kase.reported_by) : undefined;
  const events = useMemo(() => (kase ? client.eventsFor(kase.id) : []), [client, kase, db.events]);
  const treatments = useMemo(() => (kase ? client.treatmentsFor(kase.id) : []), [client, kase, db.treatments]);
  const caseClaims = useMemo(() => db.claims.filter(c => c.case_id === caseId), [db.claims, caseId]);
  const treatmentCost = treatments.reduce((s, t) => s + t.cost_kes, 0);

  const [note, setNote] = useState('');
  const [tx, setTx] = useState({ drug_name: '', dosage: '', route: 'IM', withdrawal_days: '7', cost_kes: '', notes: '' });
  const [showTx, setShowTx] = useState(false);
  const [showClaim, setShowClaim] = useState(false);
  const [claimItems, setClaimItems] = useState<{ description: string; category: 'vet_fee' | 'drug' | 'lab' | 'transport' | 'procedure' | 'feed_supplement' | 'other'; qty: string; unit_kes: string }[]>([
    { description: 'Veterinary farm visit & consultation', category: 'vet_fee', qty: '1', unit_kes: '3000' },
  ]);
  const [busy, setBusy] = useState(false);

  if (!kase) {
    return (
      <div className="mx-auto max-w-lg p-10 text-center">
        <p className="font-display text-2xl font-semibold text-pine-950">Case not found</p>
        <p className="mt-2 text-sm text-stone-500">The case may belong to another role's scope, or the ID is invalid.</p>
        <Link to={`/app/${role}/cases`} className="mt-4 inline-flex h-10 items-center rounded-xl bg-pine-800 px-5 text-sm font-bold text-cream-50">Back to Case Board</Link>
      </div>
    );
  }

  const distance = vet && farm ? haversineKm(farm.lat, farm.lng, wardByName(vet.ward)?.lat ?? farm.lat, wardByName(vet.ward)?.lng ?? farm.lng) : null;
  const canVetAct = role === 'vet' && (kase.assigned_vet_id === user.id || kase.status === 'submitted' || kase.status === 'triaged');
  const canAdminAct = role === 'admin';
  const canActOnCase = canVetAct || canAdminAct;

  const addNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!note.trim()) return;
    client.addCaseNote(user, kase.id, note.trim());
    setNote('');
    tick();
    toast('Note added', { tone: 'success' });
  };

  const addTreatment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tx.drug_name.trim() || !tx.dosage.trim()) return;
    client.addTreatment(user, kase.id, {
      drug_name: tx.drug_name.trim(), dosage: tx.dosage.trim(), route: tx.route,
      withdrawal_days: Number(tx.withdrawal_days) || 0, cost_kes: Number(tx.cost_kes) || 0,
      notes: tx.notes.trim() || null,
    });
    setTx({ drug_name: '', dosage: '', route: 'IM', withdrawal_days: '7', cost_kes: '', notes: '' });
    setShowTx(false);
    tick();
    toast('Treatment logged', { body: 'Case auto-advanced to in-treatment if not already.', tone: 'success' });
  };

  const claimTotal = claimItems.reduce((s, i) => s + (Number(i.qty) || 0) * (Number(i.unit_kes) || 0), 0);

  const submitClaim = (status: ClaimStatus) => {
    setBusy(true);
    const coverage = client.sponsorCoverageFor(farm ? db.farms.find(f => f.id === kase.farm_id)!.owner_id : user.id);
    const pool = coverage ? db.pools.find(p => p.sponsor_id === coverage.sponsor?.id) : undefined;
    const sponsorId = coverage?.sponsor?.id ?? db.sponsors[0]?.id;
    const claim = client.createClaim(user, {
      case_id: kase.id,
      sponsor_id: sponsorId,
      pool_id: pool?.id ?? db.pools[0]?.id,
      status,
      items: claimItems.map(i => ({ description: i.description, category: i.category, qty: Number(i.qty) || 1, unit_kes: Number(i.unit_kes) || 0 })),
    });
    tick();
    setBusy(false);
    setShowClaim(false);
    toast(`${claim.claim_number} ${status === 'draft' ? 'saved as draft' : 'submitted to sponsor'}`, { body: `KES ${claim.amount_kes.toLocaleString()} — ${claimItems.length} line item(s).`, tone: 'success' });
    navigate(`/app/${role}/claims`);
  };

  const statusOptions: CaseStatus[] = ['submitted', 'triaged', 'assigned', 'in_treatment', 'monitoring', 'recovered', 'referred', 'closed'];

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-4 sm:p-6">
      {/* Header band */}
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={() => navigate(-1)} className="rounded-xl border border-cream-300 bg-white p-2 text-pine-900 hover:border-pine-600" aria-label="Back"><ArrowLeft className="h-5 w-5" /></button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-mono text-xl font-bold text-pine-950">{kase.case_number}</h1>
            <Badge tone={priorityTone(kase.priority)} className="!text-[11px]">{kase.priority === 'emergency' && <AlertOctagon className="h-3.5 w-3.5" />}{kase.priority.toUpperCase()}</Badge>
            <Badge tone={caseStatusTone(kase.status)} className="!text-[11px]">{STATUS_LABEL[kase.status].toUpperCase()}</Badge>
            {kase.ai_confidence !== null && <span className="font-mono text-[10.5px] text-stone-400">AI conf. {Math.round(kase.ai_confidence * 100)}%</span>}
          </div>
          <p className="mt-0.5 truncate text-[13px] text-stone-600">{kase.chief_complaint}</p>
        </div>
        {canActOnCase && (
          <div className="relative">
            <select
              aria-label="Change case status"
              value={kase.status}
              onChange={e => { client.setCaseStatus(user, kase.id, e.target.value as CaseStatus); tick(); toast('Status updated', { body: `${kase.case_number} → ${STATUS_LABEL[e.target.value]}`, tone: 'info' }); }}
              className="input-field h-10 w-auto appearance-none pr-8 !text-[12px] font-semibold"
            >
              {statusOptions.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
          </div>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* ===== Left: clinical column ===== */}
        <div className="space-y-4 lg:col-span-2">
          {/* Animal & farm card */}
          <Card>
            <div className="flex flex-wrap items-center gap-4 p-4">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-pine-50 text-pine-800"><PawPrint className="h-7 w-7" strokeWidth={1.6} /></span>
              <div className="min-w-0 flex-1 grid grid-cols-2 gap-x-6 gap-y-1.5 sm:grid-cols-3">
                <Info label="Animal" value={animal ? `${animal.tag_number}` : '—'} mono />
                <Info label="Breed" value={animal?.breed ?? '—'} />
                <Info label="Age / Stage" value={animal ? `${ageYears(animal.dob)}y · ${animal.stage} · P${animal.parity}` : '—'} />
                <Info label="Farm" value={farm?.name ?? '—'} />
                <Info label="Ward" value={`${kase.ward}`} />
                <Info label="Reported" value={`${timeAgo(kase.created_at)} by ${reporter?.full_name.split(' ')[0] ?? 'farmer'}`} />
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-cream-100 bg-cream-50/60 px-4 py-2.5">
              <span className="flex items-center gap-1.5 text-[12px] font-semibold text-pine-900"><Stethoscope className="h-4 w-4 text-pine-700" />{vet ? <>{vet.full_name}{distance !== null && <span className="font-mono text-[10.5px] text-stone-500"> · {distance.toFixed(1)} km away</span>}</> : 'Awaiting vet assignment'}</span>
              {vet && <a href={`tel:${vet.phone.replace(/\s/g, '')}`} className="text-[12px] font-bold text-pine-800 hover:underline">{vet.phone}</a>}
            </div>
          </Card>

          {/* AI differential */}
          {kase.ai_differential && kase.ai_differential.length > 0 && (
            <Card>
              <CardHeader title="AI Differential at Triage" sub="Ranked at intake — treatment may target confirmed diagnosis" />
              <div className="grid gap-2 p-4 sm:grid-cols-2">
                {kase.ai_differential.slice(0, 4).map((d, i) => (
                  <div key={i} className="flex items-center gap-2.5 rounded-xl border border-cream-200 bg-white p-2.5">
                    <span className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded-md font-mono text-[11px] font-bold', i === 0 ? 'bg-pine-800 text-cream-50' : 'bg-cream-100 text-stone-500')}>{i + 1}</span>
                    <div className="min-w-0">
                      <p className="truncate text-[11.5px] font-bold text-pine-950" title={d.disease}>{d.disease.split('(')[0].trim()}</p>
                      <p className="font-mono text-[10px] text-stone-500">{Math.round(d.confidence * 100)}% · {d.urgency.toUpperCase()}</p>
                    </div>
                  </div>
                ))}
              </div>
              {kase.diagnosis && <p className="border-t border-cream-100 px-4 py-2.5 text-[12px]"><span className="label-caps">Confirmed diagnosis</span><br /><span className="font-semibold text-pine-950">{kase.diagnosis}</span></p>}
            </Card>
          )}

          {/* Treatments */}
          <Card>
            <CardHeader title="Treatment Log" sub={`${treatments.length} administration(s) · KES ${treatmentCost.toLocaleString()} total drug & procedure cost`}
              action={canActOnCase && <button onClick={() => setShowTx(v => !v)} className="flex h-8 items-center gap-1 rounded-lg bg-pine-800 px-3 text-[11.5px] font-bold text-cream-50 hover:bg-pine-700">{showTx ? 'Close' : <><Plus className="h-4 w-4" />Log treatment</>}</button>} />
            {showTx && (
              <form onSubmit={addTreatment} className="grid gap-2 border-b border-cream-100 bg-pine-50/50 p-4 sm:grid-cols-6">
                <input required placeholder="Drug name" value={tx.drug_name} onChange={e => setTx({ ...tx, drug_name: e.target.value })} className="input-field h-9 sm:col-span-2" aria-label="Drug name" />
                <input required placeholder="Dosage (e.g. 12 ml IM)" value={tx.dosage} onChange={e => setTx({ ...tx, dosage: e.target.value })} className="input-field h-9 sm:col-span-2" aria-label="Dosage" />
                <select value={tx.route} onChange={e => setTx({ ...tx, route: e.target.value })} className="input-field h-9" aria-label="Route">{['IM', 'IV', 'SC', 'oral', 'topical', 'pour-on', 'intramammary'].map(r => <option key={r}>{r}</option>)}</select>
                <input type="number" min="0" placeholder="Withdrawal (days)" value={tx.withdrawal_days} onChange={e => setTx({ ...tx, withdrawal_days: e.target.value })} className="input-field h-9" aria-label="Milk withdrawal days" />
                <input type="number" min="0" placeholder="Cost KES" value={tx.cost_kes} onChange={e => setTx({ ...tx, cost_kes: e.target.value })} className="input-field h-9" aria-label="Cost in KES" />
                <input placeholder="Notes (optional)" value={tx.notes} onChange={e => setTx({ ...tx, notes: e.target.value })} className="input-field h-9 sm:col-span-4" aria-label="Treatment notes" />
                <button type="submit" className="flex h-9 items-center justify-center gap-1 rounded-xl bg-pine-800 text-[12px] font-bold text-cream-50 hover:bg-pine-700 sm:col-span-2"><Check className="h-4 w-4" />Save treatment</button>
              </form>
            )}
            <ul className="divide-y divide-cream-100">
              {treatments.map(t => (
                <li key={t.id} className="flex items-start gap-3 px-4 py-2.5">
                  <Pill className="mt-0.5 h-4 w-4 shrink-0 text-pine-700" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-semibold leading-snug text-pine-950">{t.drug_name} <span className="font-normal text-stone-500">— {t.dosage}</span></p>
                    <p className="text-[10.5px] text-stone-500">{t.route} · <span className={t.withdrawal_days > 0 ? 'font-semibold text-orange-700' : ''}>{t.withdrawal_days}d withdrawal</span> · KES {t.cost_kes.toLocaleString()} · {fmtDateTime(t.administered_at)}{t.notes && <> · <em>{t.notes}</em></>}</p>
                  </div>
                </li>
              ))}
              {treatments.length === 0 && <li className="px-4 py-6 text-center text-[12px] text-stone-500">No treatments logged yet.</li>}
            </ul>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader title="Clinical Timeline" sub="Immutable, chronological — every event actor-stamped" />
            <ol className="relative ml-6 border-l-2 border-cream-200 py-2 pl-6">
              {events.map(e => {
                const actor = db.profiles.find(p => p.id === e.actor_id);
                const tone: Record<string, string> = { created: 'bg-sky-500', triaged: 'bg-sky-500', assigned: 'bg-violet-500', visit: 'bg-pine-600', treatment: 'bg-pine-600', note: 'bg-stone-400', lab: 'bg-teal-600', status_change: 'bg-amber-500', claim_linked: 'bg-gold-500', escalated: 'bg-red-600', recovered: 'bg-emerald-600', deceased: 'bg-stone-700', closed: 'bg-stone-700' };
                return (
                  <li key={e.id} className="relative pb-4 last:pb-1">
                    <span className={cn('absolute -left-[31px] top-1 h-3.5 w-3.5 rounded-full border-2 border-cream-50', tone[e.event_type] ?? 'bg-stone-400')} />
                    <div className="flex flex-wrap items-baseline justify-between gap-1">
                      <p className="text-[12px] font-bold capitalize text-pine-950">{e.event_type.replace(/_/g, ' ')} <span className="font-normal text-stone-400">· {actor?.full_name.split('—')[0].trim().split(' ')[0] ?? e.actor_role}</span></p>
                      <time className="font-mono text-[9.5px] uppercase text-stone-400">{fmtDateTime(e.created_at)}</time>
                    </div>
                    <p className="mt-0.5 text-[12px] leading-snug text-stone-600">{e.body}</p>
                  </li>
                );
              })}
            </ol>
            <form onSubmit={addNote} className="flex items-center gap-2 border-t border-cream-100 p-3">
              <input value={note} onChange={e => setNote(e.target.value)} placeholder="Add a field note…" className="input-field h-10 flex-1" aria-label="Add note" />
              <button type="submit" className="flex h-10 w-10 items-center justify-center rounded-xl bg-pine-800 text-cream-50 hover:bg-pine-700" aria-label="Add note"><Send className="h-4 w-4" /></button>
            </form>
          </Card>
        </div>

        {/* ===== Right: claims rail ===== */}
        <div className="space-y-4">
          <Card>
            <CardHeader title="Claims" sub="Sponsor-funded care for this case" action={caseClaims.length === 0 && <button onClick={() => setShowClaim(v => !v)} className="flex h-8 items-center gap-1 rounded-lg bg-gold-400 px-3 text-[11.5px] font-bold text-pine-950 hover:bg-gold-300"><Coins className="h-4 w-4" />New claim</button>} />
            <div className="space-y-2 p-3">
              {caseClaims.map(c => (
                <div key={c.id} className="rounded-xl border border-cream-200 bg-white p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[11.5px] font-bold text-pine-900">{c.claim_number}</span>
                    <Badge tone={claimStatusTone(c.status)}>{CLAIM_STATUS_LABEL[c.status].toUpperCase()}</Badge>
                  </div>
                  <p className="mt-1 text-[15px] font-bold text-pine-950">{kes(c.amount_kes)}</p>
                  <button onClick={() => navigate(`/app/${role}/claims`)} className="mt-1 text-[11px] font-semibold text-pine-800 hover:underline">View in claims pipeline →</button>
                </div>
              ))}
              {caseClaims.length === 0 && !showClaim && <p className="px-2 py-4 text-center text-[12px] text-stone-500">No claims linked. Drug costs can be converted to a claim in seconds.</p>}

              {/* Inline claim builder */}
              {showClaim && (
                <div className="rounded-xl border border-gold-400/60 bg-amber-50/50 p-3">
                  <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-amber-900"><ListPlus className="h-4 w-4" />Cost build-up</p>
                  <div className="mt-2 space-y-1.5">
                    {claimItems.map((item, i) => (
                      <div key={i} className="flex items-center gap-1.5">
                        <input value={item.description} onChange={e => setClaimItems(claimItems.map((x, j) => j === i ? { ...x, description: e.target.value } : x))} className="input-field h-8 flex-1 !px-2 !py-0 !text-[11px]" aria-label="Line item description" />
                        <input type="number" min="1" value={item.qty} onChange={e => setClaimItems(claimItems.map((x, j) => j === i ? { ...x, qty: e.target.value } : x))} className="input-field h-8 w-12 !px-1.5 !py-0 !text-[11px]" aria-label="Quantity" />
                        <input type="number" min="0" value={item.unit_kes} onChange={e => setClaimItems(claimItems.map((x, j) => j === i ? { ...x, unit_kes: e.target.value } : x))} className="input-field h-8 w-20 !px-1.5 !py-0 !text-[11px]" aria-label="Unit cost KES" />
                      </div>
                    ))}
                  </div>
                  <button onClick={() => setClaimItems([...claimItems, { description: '', category: 'drug', qty: '1', unit_kes: '' }])} className="mt-1.5 text-[10.5px] font-bold text-pine-800 hover:underline">+ Add line item</button>
                  <div className="mt-2 flex items-center justify-between border-t border-amber-200 pt-2">
                    <span className="text-[12px] font-bold text-amber-900">Total: {kes(claimTotal)}</span>
                    <span className="font-mono text-[9px] uppercase text-amber-700">premium tier covers ≤ 50k</span>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <button disabled={busy} onClick={() => submitClaim('draft')} className="flex h-9 items-center justify-center gap-1 rounded-xl border border-amber-400 bg-white text-[12px] font-bold text-amber-900 hover:bg-amber-100">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save draft'}</button>
                    <button disabled={busy} onClick={() => submitClaim('submitted')} className="flex h-9 items-center justify-center gap-1 rounded-xl bg-pine-800 text-[12px] font-bold text-cream-50 hover:bg-pine-700">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Send className="h-4 w-4" />Submit claim</>}</button>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Role-aware callout */}
          <Card className="border-sky-200 bg-sky-50/60">
            <div className="p-4 text-[11.5px] leading-relaxed text-sky-900">
              <p className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-widest text-sky-700"><FileText className="h-3.5 w-3.5" />Why claims exist</p>
              <p className="mt-1">Every KES spent through this case is traceable: treatment log → line items → sponsor approval → M-Pesa disbursement → pool reconciliation. No cash, no lost receipts, no disputes.</p>
            </div>
          </Card>

          <Card>
            <CardHeader title="Case Facts" />
            <ul className="space-y-1.5 p-4 text-[11.5px] text-stone-600">
              <li className="flex justify-between"><span className="text-stone-400">Symptoms</span><span className="max-w-[60%] text-right">{kase.symptoms.map(s => s.replace(/_/g, ' ')).join(', ')}</span></li>
              <li className="flex justify-between"><span className="text-stone-400">Outcome</span><span className="max-w-[60%] text-right">{kase.outcome ?? 'Pending'}</span></li>
              <li className="flex justify-between"><span className="text-stone-400">Opened</span><span>{fmtDateTime(kase.created_at)}</span></li>
              <li className="flex justify-between"><span className="text-stone-400">Last update</span><span>{timeAgo(kase.updated_at)}</span></li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Info({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="label-caps !text-[9px]">{label}</p>
      <p className={cn('mt-0.5 truncate text-[12px] font-semibold text-pine-950', mono && 'font-mono')} title={value}>{value}</p>
    </div>
  );
}
