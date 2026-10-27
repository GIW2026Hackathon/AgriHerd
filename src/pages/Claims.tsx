import { useMemo, useState } from 'react';
import {
  Coins, CheckCircle2, XCircle, Send, Banknote, ShieldCheck, UserCheck, ChevronDown,
  Receipt, ListTree, CircleDollarSign, Hourglass, BadgeCheck, AlertCircle,
} from 'lucide-react';
import { useApp } from '../lib/session';
import { useToast } from '../lib/toast';
import { Card, CardHeader, Badge, claimStatusTone, CLAIM_STATUS_LABEL, Avatar, EmptyState } from '../components/ui';
import { cn, kes, kesExact, timeAgo, fmtDateTime } from '../lib/utils';
import type { ClaimStatus } from '../lib/types';

const PIPELINE: ClaimStatus[] = ['draft', 'submitted', 'under_review', 'approved', 'disbursed'];

export default function Claims() {
  const { db, user, role, client, tick } = useApp();
  const { toast } = useToast();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [note, setNote] = useState('');

  const claims = useMemo(() => {
    const mine = client.claimsForUser(user);
    return [...mine].sort((a, b) => b.created_at.localeCompare(a.created_at));
  }, [client, user, db.claims]);

  const selected = claims.find(c => c.id === selectedId) ?? claims[0] ?? null;
  const items = selected ? client.claimItems(selected.id) : [];
  const farm = selected ? db.farms.find(f => f.id === selected.farm_id) : undefined;
  const kase = selected ? db.cases.find(c => c.id === selected.case_id) : undefined;
  const farmer = selected ? db.profiles.find(p => p.id === selected.requested_by) : undefined;
  const vet = kase?.assigned_vet_id ? db.profiles.find(p => p.id === kase.assigned_vet_id) : undefined;
  const sponsor = selected?.sponsor_id ? db.sponsors.find(s => s.id === selected.sponsor_id) : undefined;
  const pool = selected?.pool_id ? db.pools.find(p => p.id === selected.pool_id) : undefined;

  const isSponsor = role === 'sponsor';
  const isFarmer = role === 'farmer';
  const isVet = role === 'vet';
  const isAdmin = role === 'admin';

  const act = (status: ClaimStatus, opts?: { review_note?: string }) => {
    if (!selected) return;
    client.setClaimStatus(user, selected.id, status, { review_note: note.trim() || opts?.review_note });
    setNote('');
    tick();
    toast(`Claim ${selected.claim_number} → ${CLAIM_STATUS_LABEL[status]}`, {
      body: status === 'disbursed' ? 'Simulated M-Pesa payout recorded with reference.' : 'State change written to the immutable audit log.',
      tone: status === 'rejected' ? 'warning' : 'success',
    });
  };

  const vetRecommend = () => {
    if (!selected) return;
    client.setClaimStatus(user, selected.id, 'under_review', { vet_recommendation: note.trim() || 'Protocol appropriate; costs reasonable. Recommend approval.' });
    setNote('');
    tick();
    toast('Recommendation recorded', { body: 'Sponsor notified — claim moved to under review.', tone: 'success' });
  };

  const stageIndex = selected ? PIPELINE.indexOf(selected.status === 'reconciled' ? 'disbursed' : selected.status) : -1;
  const rejected = selected?.status === 'rejected';

  return (
    <div className="mx-auto max-w-7xl space-y-4 p-4 sm:p-6">
      <div>
        <p className="label-caps text-pine-600">Module · Claims &amp; Disbursement</p>
        <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight text-pine-950">Sponsor-Funded Care — Claims Pipeline</h1>
        <p className="mt-0.5 text-[13px] text-stone-500">Draft → submitted → under review → approved → <strong>disbursed</strong> (M-Pesa-simulated). Every transition is actor-stamped in the audit log.</p>
      </div>

      {claims.length === 0 ? (
        <Card><EmptyState icon={<Coins className="h-8 w-8" />} title="No claims in your scope" body={isFarmer ? 'Log a case first — claims can be drafted from the case detail page.' : 'Claims from linked farmers will appear here.'} /></Card>
      ) : (
        <div className="grid gap-4 xl:grid-cols-5">
          {/* ===== Left: claim list ===== */}
          <div className="space-y-2 xl:col-span-2">
            {claims.map(c => {
              const k = db.cases.find(x => x.id === c.case_id);
              const f = db.farms.find(x => x.id === c.farm_id);
              const isSel = selected?.id === c.id;
              return (
                <button key={c.id} onClick={() => setSelectedId(c.id)} className={cn('w-full rounded-2xl border bg-white p-4 text-left shadow-card transition hover:-translate-y-0.5', isSel ? 'border-pine-700 ring-2 ring-pine-700/25' : 'border-cream-200')}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[12px] font-bold text-pine-900">{c.claim_number}</span>
                    <Badge tone={claimStatusTone(c.status)}>{CLAIM_STATUS_LABEL[c.status].toUpperCase()}</Badge>
                  </div>
                  <p className="mt-1.5 font-display text-xl font-semibold text-pine-950">{kes(c.amount_kes)}</p>
                  <p className="mt-0.5 truncate text-[11px] text-stone-500">{f?.name} · {k?.case_number}{k?.diagnosis ? ` · ${k.diagnosis}` : ''}</p>
                  <p className="mt-1 font-mono text-[9px] uppercase tracking-wider text-stone-400">{timeAgo(c.created_at)} · {client.claimItems(c.id).length} line items</p>
                </button>
              );
            })}
          </div>

          {/* ===== Right: claim detail & actions ===== */}
          {selected && (
            <div className="space-y-4 xl:col-span-3">
              <Card>
                {/* Pipeline stepper */}
                <div className="border-b border-cream-100 p-4">
                  <div className="flex items-center">
                    {PIPELINE.map((stage, i) => {
                      const done = !rejected && stageIndex >= i;
                      const current = !rejected && PIPELINE[stageIndex] === stage;
                      return (
                        <div key={stage} className="flex flex-1 items-center last:flex-none">
                          <div className="flex flex-col items-center gap-1">
                            <span className={cn('flex h-8 w-8 items-center justify-center rounded-full border-2 text-[13px] font-bold transition',
                              done ? 'border-pine-700 bg-pine-800 text-cream-50' : current ? 'border-gold-500 bg-gold-400 text-pine-950' : 'border-cream-300 bg-white text-stone-400')}>
                              {done ? <BadgeCheck className="h-4 w-4" /> : i + 1}
                            </span>
                            <span className={cn('hidden text-[8.5px] font-bold uppercase tracking-wide sm:block', done ? 'text-pine-800' : 'text-stone-400')}>{CLAIM_STATUS_LABEL[stage]}</span>
                          </div>
                          {i < PIPELINE.length - 1 && <div className={cn('mx-1 h-0.5 flex-1 rounded', done && stageIndex > i ? 'bg-pine-700' : 'bg-cream-200')} />}
                        </div>
                      );
                    })}
                  </div>
                  {rejected && <p className="mt-3 flex items-center gap-1.5 rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-[11.5px] font-semibold text-red-800"><AlertCircle className="h-4 w-4" />Rejected — {selected.review_note ?? 'see note below.'} Farmer may revise and resubmit as a new claim.</p>}
                </div>

                <div className="flex flex-wrap items-start justify-between gap-3 p-4">
                  <div>
                    <p className="font-mono text-[13px] font-bold text-pine-900">{selected.claim_number}</p>
                    <p className="mt-0.5 font-display text-2xl font-semibold text-pine-950">{kesExact(selected.amount_kes)}</p>
                    <p className="mt-0.5 text-[11.5px] text-stone-500">{farm?.name} · {farm?.ward} · Case {kase?.case_number}{kase?.diagnosis ? ` — ${kase.diagnosis}` : ''}</p>
                    <p className="text-[11px] text-stone-400">Requested by {farmer?.full_name} · {fmtDateTime(selected.created_at)}</p>
                  </div>
                  <div className="text-right text-[11px] text-stone-500">
                    <p className="flex items-center justify-end gap-1.5"><Avatar name={vet?.full_name ?? '?'} size={20} />{vet?.full_name?.split('—')[0] ?? 'Unassigned'}</p>
                    <p className="mt-1 flex items-center justify-end gap-1"><span className="font-semibold text-pine-900">{sponsor?.company_name}</span></p>
                    {pool && <p className="mt-0.5 font-mono text-[10px] text-stone-400">{pool.name}</p>}
                  </div>
                </div>

                {/* Vet recommendation */}
                {selected.vet_recommendation && (
                  <div className="mx-4 mb-3 rounded-xl border border-sky-200 bg-sky-50 px-4 py-2.5">
                    <p className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-widest text-sky-700"><UserCheck className="h-3.5 w-3.5" />Vet recommendation — {vet?.full_name?.split('—')[0]}</p>
                    <p className="mt-1 text-[12px] leading-snug text-sky-900">{selected.vet_recommendation}</p>
                  </div>
                )}
                {/* Disbursement ref */}
                {selected.disbursement_ref && (
                  <div className="mx-4 mb-3 rounded-xl border border-pine-600/30 bg-pine-50 px-4 py-2.5">
                    <p className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-widest text-pine-700"><ShieldCheck className="h-3.5 w-3.5" />Payment reference (simulated M-Pesa)</p>
                    <p className="mt-1 font-mono text-[13px] font-bold text-pine-900">{selected.disbursement_ref}</p>
                    <p className="text-[10px] text-stone-500">Disbursed {fmtDateTime(selected.disbursed_at)} · {selected.review_note}</p>
                  </div>
                )}
                {/* Review note */}
                {selected.review_note && !selected.disbursement_ref && (
                  <p className="mx-4 mb-3 rounded-xl border border-cream-200 bg-cream-50 px-4 py-2.5 text-[12px] italic text-stone-600">“{selected.review_note}”</p>
                )}

                {/* Line items */}
                <div className="border-t border-cream-100">
                  <p className="flex items-center gap-1.5 px-4 pt-3 font-mono text-[9px] uppercase tracking-widest text-stone-400"><ListTree className="h-3.5 w-3.5" />Line items</p>
                  <div className="overflow-x-auto p-3">
                    <table className="w-full min-w-[520px]">
                      <thead><tr className="text-left text-[9.5px] font-bold uppercase tracking-wider text-stone-400"><th className="pb-1.5 pr-3">Description</th><th className="pb-1.5 pr-3">Category</th><th className="pb-1.5 pr-3 text-right">Qty</th><th className="pb-1.5 pr-3 text-right">Unit KES</th><th className="pb-1.5 text-right">Total KES</th></tr></thead>
                      <tbody className="divide-y divide-cream-100">
                        {items.map(i => (
                          <tr key={i.id} className="text-[12px]">
                            <td className="py-1.5 pr-3 text-pine-950">{i.description}</td>
                            <td className="py-1.5 pr-3"><span className="rounded bg-cream-100 px-1.5 py-0.5 font-mono text-[9.5px] uppercase text-stone-600">{i.category.replace(/_/g, ' ')}</span></td>
                            <td className="py-1.5 pr-3 text-right font-mono">{i.qty}</td>
                            <td className="py-1.5 pr-3 text-right font-mono">{i.unit_kes.toLocaleString()}</td>
                            <td className="py-1.5 text-right font-mono font-bold">{(i.qty * i.unit_kes).toLocaleString()}</td>
                          </tr>
                        ))}
                        <tr><td colSpan={4} className="py-2 text-right text-[11px] font-bold uppercase tracking-wide text-stone-500">Total</td><td className="py-2 text-right font-mono text-[13px] font-bold text-pine-900">{selected.amount_kes.toLocaleString()}</td></tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </Card>

              {/* ===== Action panel (role-gated) ===== */}
              <Card className="border-pine-700/30">
                <div className="p-4">
                  <p className="font-mono text-[9px] uppercase tracking-widest text-pine-700">Workflow actions — {role}</p>

                  {isFarmer && selected.status === 'draft' && (
                    <ActionRow>
                      <button onClick={() => act('submitted')} className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-pine-800 text-[13px] font-bold text-cream-50 hover:bg-pine-700"><Send className="h-4 w-4" />Submit to {sponsor?.company_name.split(' ')[0]}</button>
                    </ActionRow>
                  )}
                  {isFarmer && selected.status !== 'draft' && <p className="mt-2 flex items-center gap-1.5 text-[12px] text-stone-500"><Hourglass className="h-4 w-4" />Waiting on sponsor. You'll get an SMS + in-app notification on every transition.</p>}

                  {isVet && ['submitted', 'under_review'].includes(selected.status) && (
                    <>
                      <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Clinical recommendation for the sponsor (e.g. protocol appropriate, costs reasonable)…" className="input-field mt-2 h-20 resize-none" aria-label="Vet recommendation" />
                      <ActionRow>
                        <button onClick={vetRecommend} className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-sky-700 text-[13px] font-bold text-white hover:bg-sky-800"><UserCheck className="h-4 w-4" />Record recommendation &amp; move to review</button>
                      </ActionRow>
                    </>
                  )}
                  {isVet && !['submitted', 'under_review'].includes(selected.status) && <p className="mt-2 text-[12px] text-stone-500">Claims are actioned by sponsors. Your recommendation slot opens when a claim is submitted for review.</p>}

                  {(isSponsor || isAdmin) && ['submitted', 'under_review', 'draft'].includes(selected.status) && (
                    <>
                      {selected.status === 'submitted' && <p className="mt-2 flex items-center gap-1.5 text-[11.5px] font-semibold text-amber-800"><CircleDollarSign className="h-4 w-4" />Pool “{pool?.name}” — committed after approval, disbursed on payout.</p>}
                      <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Review note (required for rejection)…" className="input-field mt-2 h-16 resize-none" aria-label="Review note" />
                      <ActionRow>
                        <button onClick={() => act('under_review')} className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-amber-400 bg-amber-50 text-[13px] font-bold text-amber-900 hover:bg-amber-100"><Hourglass className="h-4 w-4" />Move to Under Review</button>
                        <button onClick={() => act('approved', { review_note: note.trim() || 'Approved within policy coverage.' })} className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-pine-800 text-[13px] font-bold text-cream-50 hover:bg-pine-700"><CheckCircle2 className="h-4 w-4" />Approve</button>
                        <button onClick={() => { if (!note.trim() && !isAdmin) { toast('A reason is required to reject', { tone: 'warning', body: 'Enter a review note explaining the rejection.' }); return; } act('rejected', { review_note: note.trim() || 'Rejected by administrator.' }); }} className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-red-400 bg-red-50 text-[13px] font-bold text-red-800 hover:bg-red-100"><XCircle className="h-4 w-4" />Reject</button>
                      </ActionRow>
                    </>
                  )}
                  {(isSponsor || isAdmin) && selected.status === 'approved' && (
                    <ActionRow>
                      <button onClick={() => act('disbursed', { review_note: 'Paid via M-Pesa B2C — reference generated.' })} className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-gold-400 text-[14px] font-bold text-pine-950 shadow-lift hover:bg-gold-300"><Banknote className="h-5 w-5" />Disburse {kes(selected.amount_kes)} via M-Pesa (simulated)</button>
                    </ActionRow>
                  )}
                  {(isSponsor || isAdmin) && selected.status === 'disbursed' && (
                    <ActionRow>
                      <button onClick={() => act('reconciled', { review_note: 'Reconciled against pool statement.' })} className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-pine-600/40 bg-pine-50 text-[13px] font-bold text-pine-900 hover:bg-pine-100"><Receipt className="h-4 w-4" />Mark reconciled against pool</button>
                    </ActionRow>
                  )}
                  {isSponsor && ['disbursed', 'reconciled', 'rejected'].includes(selected.status) && <p className="mt-2 flex items-center gap-1.5 text-[12px] text-stone-500"><CheckCircle2 className="h-4 w-4 text-pine-700" />This claim is closed out. Audit trail and M-Pesa reference retained.</p>}
                  {isAdmin && selected.status === 'rejected' && (
                    <ActionRow>
                      <button onClick={() => act('draft')} className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-cream-300 text-[12px] font-semibold text-stone-600 hover:bg-cream-50">Reopen to draft (admin override)</button>
                    </ActionRow>
                  )}
                  {role === 'county' && <p className="mt-2 flex items-center gap-1.5 text-[12px] text-stone-500"><ShieldCheck className="h-4 w-4" />County view is read-only by policy — claims are commercial instruments between farmer and sponsor; you see them for fiscal-oversight reporting only.</p>}
                </div>
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ActionRow({ children }: { children: React.ReactNode }) {
  return <div className="mt-3 flex flex-wrap items-center gap-2">{children}</div>;
}
