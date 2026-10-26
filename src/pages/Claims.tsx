/* ==========================================================================
   Claims Desk — sponsor decision queue (approve/reject with reason),
   vet submission tracking, admin oversight, farmer read-only
   ========================================================================== */
import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Banknote, CheckCircle2, XCircle, Hourglass, FileText, Stethoscope, Building2, ShieldCheck, Printer } from 'lucide-react';
import { useStore } from '../lib/store';
import { Card, PageHeader, StatusPill, Button, Avatar, Modal, Field, textareaCls, EmptyState } from '../components/ui';
import { cn } from '../lib/cn';
import { formatKES, fmtDateTime } from '../lib/geo';
import type { Claim } from '../lib/types';

export default function Claims() {
  const { db, currentUser, reviewClaim, decideClaim, payClaim } = useStore();
  const me = currentUser!;
  const isSponsor = me.role === 'sponsor';
  const isVet = me.role === 'vet';
  const isAdmin = me.role === 'admin';
  const isFarmer = me.role === 'farmer';

  const [tab, setTab] = useState<'pending' | 'decided'>('pending');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [decisionModal, setDecisionModal] = useState<'approved' | 'rejected' | null>(null);
  const [reason, setReason] = useState('');

  const myCaseIds = new Set(db.cases.filter((c) => isVet ? c.vet_id === me.id : isFarmer ? c.farmer_id === me.id : true).map((c) => c.id));
  const visible = db.claims.filter((cl) => {
    if (isSponsor) return cl.sponsor_id === me.id;
    if (isAdmin) return true;
    return myCaseIds.has(cl.case_id);
  });
  const pending = visible.filter((c) => c.status === 'submitted' || c.status === 'under_review');
  const decided = visible.filter((c) => !['submitted', 'under_review'].includes(c.status));
  const list = tab === 'pending' ? pending : decided;
  const selected: Claim | null = db.claims.find((c) => c.id === selectedId) ?? list[0] ?? null;
  const selectedCase = selected ? db.cases.find((c) => c.id === selected.case_id) : null;
  const vet = selected ? db.profiles.find((p) => p.id === selected.vet_id) : null;
  const farmer = selectedCase ? db.profiles.find((p) => p.id === selectedCase.farmer_id) : null;
  const records = selectedCase ? db.clinicalRecords.filter((r) => r.case_id === selectedCase.id) : [];
  const treatments = selectedCase ? db.treatments.filter((t) => t.case_id === selectedCase.id) : [];

  const totals = useMemo(() => ({
    submitted: pending.reduce((s, c) => s + c.amount_kes, 0),
    approved: visible.filter((c) => c.status === 'approved').reduce((s, c) => s + c.amount_kes, 0),
    settled: visible.filter((c) => c.status === 'paid').reduce((s, c) => s + c.amount_kes, 0),
  }), [visible, pending]);

  const confirmDecision = () => {
    if (!selected || !decisionModal) return;
    decideClaim(selected.id, decisionModal, reason.trim() || (decisionModal === 'approved' ? 'Treatment verified against clinical records. Approved.' : 'Insufficient documentation for this amount.'));
    setDecisionModal(null); setReason('');
  };

  return (
    <div>
      <PageHeader
        title={isSponsor ? 'Claims Desk — Decision Queue' : isVet ? 'My Claims & Settlements' : isAdmin ? 'Claims Oversight' : 'My Claims'}
        sub={isSponsor ? 'Approve, reject or request review on every claim — each decision is written to the immutable audit ledger and notifies farmer + vet.' : isVet ? 'Track submitted claims until settlement lands.' : isFarmer ? 'Claims filed by your vets on cases for your animals.' : 'Program-wide claim visibility with audit semantics.'}
        actions={<Button variant="outline" size="sm" onClick={() => window.print()}><Printer size={13} /> Print queue</Button>}
      />

      {/* KPI strip */}
      <div className="grid grid-cols-3 gap-3 mb-4 max-w-2xl">
        {[
          { label: 'Pending value', value: formatKES(totals.submitted), icon: <Hourglass size={15} className="text-amber-600" /> },
          { label: 'Approved, unpaid', value: formatKES(totals.approved), icon: <CheckCircle2 size={15} className="text-teal-600" /> },
          { label: 'Settled', value: formatKES(totals.settled), icon: <ShieldCheck size={15} className="text-emerald-600" /> },
        ].map((k) => (
          <div key={k.label} className="bg-white border border-pine-900/10 rounded-xl px-4 py-3">
            <div className="flex items-center gap-1.5 font-mono text-[8.5px] uppercase tracking-[0.18em] text-pine-600">{k.icon}{k.label}</div>
            <div className="mt-1 font-display font-semibold text-[17px] text-pine-950 tabular">{k.value}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-5 gap-4">
        {/* List */}
        <div className="lg:col-span-2 space-y-2">
          <div className="flex gap-1.5 bg-white border border-pine-900/10 rounded-xl p-1 w-fit">
            {([['pending', `Pending (${pending.length})`], ['decided', `Decided (${decided.length})`]] as [typeof tab, string][]).map(([k, l]) => (
              <button key={k} onClick={() => setTab(k)} className={cn('h-8 px-4 rounded-lg text-[11.5px] font-semibold', tab === k ? 'bg-pine-800 text-maize-300' : 'text-pine-800 hover:bg-pine-50')}>{l}</button>
            ))}
          </div>
          <div className="space-y-2 max-h-[68vh] overflow-y-auto">
            {list.map((cl) => {
              const c = db.cases.find((x) => x.id === cl.case_id)!;
              const v = db.profiles.find((p) => p.id === cl.vet_id)!;
              const active = selected?.id === cl.id;
              return (
                <button key={cl.id} onClick={() => setSelectedId(cl.id)} className={cn('w-full text-left rounded-2xl border p-3 transition-all', active ? 'border-pine-600 bg-pine-50 ring-1 ring-pine-600/40 shadow-md' : 'border-pine-900/10 bg-white hover:border-pine-300')}>
                  <div className="flex items-center gap-2"><span className="font-mono text-[10px] font-bold text-pine-900">{cl.claim_number}</span><span className="font-mono text-[9px] text-pine-500">{timeAgoShort(cl.submitted_at)}</span><span className="ml-auto"><StatusPill status={cl.status} /></span></div>
                  <div className="mt-1.5 flex items-center justify-between gap-2"><span className="text-[11.5px] font-semibold text-pine-950 truncate">{c.suspected_dx}</span><b className="tabular text-[12px] text-pine-950">{formatKES(cl.amount_kes)}</b></div>
                  <div className="mt-0.5 text-[10px] text-pine-600 flex items-center gap-1"><Stethoscope size={9} />{v.full_name} · {c.case_number}</div>
                </button>
              );
            })}
            {list.length === 0 && <EmptyState icon={<Banknote size={24} />} title={tab === 'pending' ? 'Queue clear' : 'No decisions yet'} body="Claims appear here as vets submit them for resolved cases." />}
          </div>
        </div>

        {/* Detail */}
        <div className="lg:col-span-3">
          <AnimatePresence mode="wait">
            {selected && selectedCase ? (
              <motion.div key={selected.id} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
                <Card className="overflow-hidden">
                  <div className="px-5 py-4 bg-pine-950 text-pine-100 flex flex-wrap items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-maize-400 text-pine-950"><Banknote size={20} /></div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap"><span className="font-mono text-[10px] text-maize-300">{selected.claim_number}</span><StatusPill status={selected.status} /></div>
                      <div className="font-display font-semibold text-2xl text-maize-50 tabular mt-0.5">{formatKES(selected.amount_kes)}</div>
                      <div className="font-mono text-[8.5px] text-pine-400">Submitted {fmtDateTime(selected.submitted_at)}{selected.decided_at && ` · Decided ${fmtDateTime(selected.decided_at)}`}</div>
                    </div>
                  </div>

                  <div className="p-5 grid md:grid-cols-2 gap-4">
                    <div className="text-[11.5px] space-y-1.5">
                      <div className="font-mono text-[8.5px] uppercase tracking-[0.2em] text-pine-500">Claim dossier</div>
                      <div className="flex items-center gap-2"><FileText size={12} className="text-pine-500" /><span className="text-pine-800">Case</span><b className="text-pine-950">{selectedCase.case_number}</b></div>
                      <div className="flex items-center gap-2"><Stethoscope size={12} className="text-pine-500" /><span className="text-pine-800">Vet</span><b className="text-pine-950">{vet?.full_name}</b></div>
                      <div className="flex items-center gap-2"><Building2 size={12} className="text-pine-500" /><span className="text-pine-800">Farmer</span><b className="text-pine-950">{farmer?.full_name}</b></div>
                      <p className="text-[11px] text-pine-800 leading-snug border border-pine-100 rounded-xl p-2.5 bg-pine-50/60 mt-1.5"><b className="font-mono text-[8.5px] uppercase text-pine-500">Services: </b>{selected.services}</p>
                    </div>
                    <div>
                      <div className="font-mono text-[8.5px] uppercase tracking-[0.2em] text-pine-500">Clinical evidence</div>
                      <div className="mt-1.5 space-y-1.5 max-h-40 overflow-y-auto">
                        {records.map((r) => <div key={r.id} className="text-[10px] border border-pine-100 rounded-lg p-2"><b>Dx:</b> {r.diagnosis} <span className="text-pine-500">· {r.temperature_c}°C</span></div>)}
                        {treatments.map((t) => <div key={t.id} className="text-[10px] border border-pine-100 rounded-lg p-2"><b>{t.drug}</b> — {t.dose} · {formatKES(t.cost_kes)}</div>)}
                        {records.length + treatments.length === 0 && <div className="text-[10px] text-pine-500">No clinical attachments — weak file.</div>}
                      </div>
                    </div>
                  </div>

                  {selected.decision_reason && (
                    <div className="mx-5 mb-4 text-[11px] rounded-xl border border-pine-100 bg-pine-50 px-3 py-2.5 text-pine-900"><b className="font-mono text-[8.5px] uppercase text-pine-500">Decision note: </b>{selected.decision_reason}</div>
                  )}

                  {/* Decision bar */}
                  {(isSponsor || isAdmin) && (selected.status === 'submitted' || selected.status === 'under_review') && (
                    <div className="px-5 py-4 bg-paper border-t border-pine-900/10 flex flex-wrap items-center gap-2">
                      {selected.status === 'submitted' && <Button variant="outline" onClick={() => reviewClaim(selected.id)}><Hourglass size={14} /> Move to review</Button>}
                      <Button variant="primary" onClick={() => { setDecisionModal('approved'); setReason(''); }}><CheckCircle2 size={15} /> Approve {formatKES(selected.amount_kes)}</Button>
                      <Button variant="danger" onClick={() => { setDecisionModal('rejected'); setReason(''); }}><XCircle size={15} /> Reject</Button>
                    </div>
                  )}
                  {(isSponsor || isAdmin) && selected.status === 'approved' && (
                    <div className="px-5 py-4 bg-paper border-t border-pine-900/10 flex items-center gap-3">
                      <span className="text-[11.5px] font-semibold text-pine-800">Approved — release settlement to the vet / farmer:</span>
                      <Button variant="maize" onClick={() => payClaim(selected.id)}><Banknote size={14} /> Pay now</Button>
                    </div>
                  )}
                  {isVet && <div className="px-5 py-3 border-t border-pine-900/10 text-[10.5px] text-pine-600">You will be notified when the sponsor decides. Payouts settle via the agreement terms — target T+3 business days.</div>}
                </Card>
              </motion.div>
            ) : <Card key="empty" className="p-10"><EmptyState icon={<Banknote size={26} />} title="Select a claim" body="Pick a claim from the list to review its dossier." /></Card>}
          </AnimatePresence>
        </div>
      </div>

      {/* Decision modal */}
      <Modal open={decisionModal !== null} onClose={() => setDecisionModal(null)} title={decisionModal === 'approved' ? 'Approve claim' : 'Reject claim'} subtitle={selected ? `${selected.claim_number} · ${formatKES(selected.amount_kes)}` : ''}>
        <form onSubmit={(e) => { e.preventDefault(); confirmDecision(); }} className="space-y-3">
          <Field label={decisionModal === 'approved' ? 'Approval note (audited) *' : 'Rejection reason (audited) *'}>
            <textarea required autoFocus className={textareaCls} value={reason} onChange={(e) => setReason(e.target.value)} placeholder={decisionModal === 'approved' ? 'Verified treatment records, invoice matches tier cap…' : 'Amount exceeds max claim for Gold tier / missing diagnosis…'} />
          </Field>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={() => setDecisionModal(null)} className="flex-1">Cancel</Button>
            <Button type="submit" variant={decisionModal === 'approved' ? 'primary' : 'danger'} className="flex-1">{decisionModal === 'approved' ? 'Approve & debit farmer cap' : 'Reject claim'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

const timeAgoShort = (iso: string) => {
  const m = Math.floor((Date.now() - +new Date(iso)) / 60000);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return h < 24 ? `${h}h` : `${Math.floor(h / 24)}d`;
};
