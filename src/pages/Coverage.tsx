/* ==========================================================================
   Coverage & Claims (Farmer view) — sponsorship entitlement, redemption,
   claim history, benefits ledger
   ========================================================================== */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Sparkles, TicketCheck, CircleDollarSign, FileText, ChevronRight, BadgeCheck, XCircle, ArrowRight } from 'lucide-react';
import { useStore } from '../lib/store';
import { Card, PageHeader, Button, StatusPill, StatCard, Field, inputCls } from '../components/ui';
import { formatKES, fmtDateTime } from '../lib/geo';

export default function Coverage() {
  const { db, currentUser, coverageFor, enrollWithCode } = useStore();
  const me = currentUser!;
  const cov = coverageFor(me.id);
  const myCases = db.cases.filter((c) => c.farmer_id === me.id);
  const myClaims = db.claims.filter((cl) => myCases.some((c) => c.id === cl.case_id));
  const [code, setCode] = useState('');
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null);

  const redeem = (e: React.FormEvent) => {
    e.preventDefault();
    const res = enrollWithCode(code);
    setFeedback(res);
    if (res.ok) setCode('');
  };

  const paid = myClaims.filter((c) => c.status === 'paid').reduce((s, c) => s + c.amount_kes, 0);
  const pending = myClaims.filter((c) => c.status === 'submitted' || c.status === 'under_review');

  return (
    <div className="max-w-6xl">
      <PageHeader
        title="Sponsor Care Coverage"
        sub="Your entitlement under sponsor agreements — what's covered, what's left, and every shilling claimed."
      />

      <div className="grid lg:grid-cols-5 gap-4">
        {/* ============ ENTITLEMENT CARD ============ */}
        <Card className="lg:col-span-3 overflow-hidden">
          <div className="bg-gradient-to-br from-maize-400 via-maize-500 to-maize-600 p-6 relative">
            <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/15 blur-2xl" />
            <div className="relative flex items-start justify-between gap-4">
              <div>
                <div className="font-mono text-[9px] uppercase tracking-[0.25em] text-pine-950/70">GLHIS Care Card</div>
                <h2 className="font-display font-semibold text-2xl text-pine-950 mt-1 leading-tight">{cov.covered ? cov.sponsorName : 'Not enrolled'}</h2>
                <div className="mt-2 flex items-center gap-2">
                  {cov.covered && cov.agreement && <span className="inline-flex items-center gap-1 bg-pine-950 text-maize-300 font-mono text-[9.5px] font-bold rounded-md px-2 py-1"><Sparkles size={10} />{cov.agreement.tier.toUpperCase()} TIER</span>}
                  <span className="font-mono text-[9.5px] text-pine-950/70">{me.full_name}</span>
                </div>
              </div>
              <ShieldCheck size={44} className="text-pine-950/80 shrink-0" strokeWidth={1.5} />
            </div>
          </div>
          <div className="p-5">
            {cov.covered && cov.agreement && cov.enrollment ? (
              <>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-xl border border-pine-900/10 bg-pine-50 py-3"><div className="font-display font-semibold text-xl text-pine-900 tabular">{formatKES(cov.maxClaim)}</div><div className="font-mono text-[8px] uppercase tracking-wider text-pine-600 mt-0.5">Max / case</div></div>
                  <div className="rounded-xl border border-pine-900/10 bg-pine-50 py-3"><div className="font-display font-semibold text-xl text-pine-900 tabular">{formatKES(cov.remainingAnnual)}</div><div className="font-mono text-[8px] uppercase tracking-wider text-pine-600 mt-0.5">Annual balance</div></div>
                  <div className="rounded-xl border border-pine-900/10 bg-pine-50 py-3"><div className="font-display font-semibold text-xl text-pine-900 tabular">{formatKES(paid)}</div><div className="font-mono text-[8px] uppercase tracking-wider text-pine-600 mt-0.5">Claimed to date</div></div>
                </div>
                <div className="mt-4">
                  <div className="flex justify-between font-mono text-[9px] uppercase tracking-[0.18em] text-pine-600"><span>Annual benefit used</span><span>{Math.round(((cov.enrollment.used_to_date_kes) / cov.agreement.annual_cap_kes) * 100)}% of {formatKES(cov.agreement.annual_cap_kes)}</span></div>
                  <div className="mt-1.5 h-3 rounded-full bg-pine-100 overflow-hidden"><div className="h-full bg-gradient-to-r from-maize-400 to-maize-600 rounded-full" style={{ width: `${(cov.enrollment.used_to_date_kes / cov.agreement.annual_cap_kes) * 100}%` }} /></div>
                </div>
                <div className="mt-4">
                  <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-pine-600 mb-1.5">Covered diagnoses ({cov.agreement.covered_diagnoses.length})</div>
                  <div className="flex flex-wrap gap-1.5">{cov.agreement.covered_diagnoses.map((d) => <span key={d} className="text-[10px] bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-full px-2 py-0.5">{d}</span>)}</div>
                </div>
                <div className="mt-4 text-[10px] font-mono text-pine-500 border-t border-pine-900/10 pt-3">Agreement {cov.agreement.id.slice(0, 8).toUpperCase()} · valid {cov.agreement.starts_on} → {cov.agreement.ends_on} · enrollment #{cov.enrollment.id.slice(0, 8).toUpperCase()}</div>
              </>
            ) : (
              <div className="text-center py-6">
                <ShieldCheck size={36} className="mx-auto text-pine-300" />
                <h3 className="mt-2 font-display font-semibold text-lg text-pine-900">No active sponsor coverage</h3>
                <p className="text-[12px] text-pine-700 mt-1">Redeem the enrollment code from your milk buyer or co-operative to unlock fully or partially covered veterinary care.</p>
              </div>
            )}
          </div>
        </Card>

        {/* ============ REDEEM CODE ============ */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="p-5">
            <div className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-pine-600 flex items-center gap-1.5"><TicketCheck size={12} /> Redeem enrollment code</div>
            <form onSubmit={redeem} className="mt-3">
              <Field label="Code from your sponsor contract">
                <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="KCREAM-2026-GOLD-114" className={inputCls + ' font-mono uppercase tracking-wider'} />
              </Field>
              <Button type="submit" variant="dark" className="w-full mt-2">Unlock coverage <ArrowRight size={14} /></Button>
            </form>
            {feedback && (
              <div className={`mt-2.5 flex items-start gap-2 text-[11.5px] rounded-xl border px-3 py-2 ${feedback.ok ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-red-50 border-red-200 text-red-900'}`}>
                {feedback.ok ? <BadgeCheck size={14} className="shrink-0 mt-0.5" /> : <XCircle size={14} className="shrink-0 mt-0.5" />}{feedback.message}
              </div>
            )}
            <p className="mt-2 font-mono text-[8.5px] text-pine-500">Demo codes: <button className="underline hover:text-pine-800" onClick={() => setCode('KCREAM-2026-GOLD-114')}>KCREAM-2026-GOLD-114</button> (needs a fresh farmer profile — already redeemed by Beatrice)</p>
          </Card>

          <div className="grid grid-cols-2 gap-3">
            <StatCard label="Claims Filed" value={myClaims.length} sub="Lifetime" icon={<FileText size={17} />} accent="sky" />
            <StatCard label="Total Settled" value={formatKES(paid)} sub="Via sponsor" icon={<CircleDollarSign size={17} />} accent="maize" />
          </div>
        </div>
      </div>

      {/* ============ CLAIM HISTORY ============ */}
      <Card className="mt-4 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-pine-900/10">
          <SectionTitleLite title="My claims history" sub={`${myClaims.length} total · ${pending.length} pending decision`} />
          <Link to="/app/claims" className="text-[11px] font-bold text-pine-800 flex items-center gap-1 hover:gap-2 transition-all">Open claims desk <ChevronRight size={12} /></Link>
        </div>
        {myClaims.length === 0 ? (
          <div className="py-10 text-center text-[12px] text-pine-600">No claims yet — claims appear here after your vet submits one for a resolved case.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[11.5px]">
              <thead><tr className="text-left font-mono text-[9px] uppercase tracking-[0.18em] text-pine-600 border-b border-pine-900/10"><th className="px-5 py-2.5">Claim</th><th className="px-5 py-2.5">Case · Diagnosis</th><th className="px-5 py-2.5">Amount</th><th className="px-5 py-2.5">Submitted</th><th className="px-5 py-2.5">Status</th></tr></thead>
              <tbody className="divide-y divide-pine-900/8">
                {myClaims.map((cl) => {
                  const c = myCases.find((x) => x.id === cl.case_id)!;
                  return (
                    <tr key={cl.id} className="hover:bg-pine-50/60">
                      <td className="px-5 py-2.5 font-mono font-semibold text-pine-900">{cl.claim_number}</td>
                      <td className="px-5 py-2.5 text-pine-900">{c.case_number} · {c.suspected_dx}</td>
                      <td className="px-5 py-2.5 font-semibold tabular">{formatKES(cl.amount_kes)}</td>
                      <td className="px-5 py-2.5 text-pine-700">{fmtDateTime(cl.submitted_at)}</td>
                      <td className="px-5 py-2.5"><StatusPill status={cl.status} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function SectionTitleLite({ title, sub }: { title: string; sub?: string }) {
  return <div><h2 className="font-display font-semibold text-[15px] text-pine-950">{title}</h2>{sub && <p className="text-[10.5px] text-pine-600">{sub}</p>}</div>;
}
