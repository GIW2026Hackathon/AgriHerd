import { useNavigate } from 'react-router-dom';
import { Banknote, Users, FileWarning, ArrowRight, BadgeCheck, CircleDollarSign, Hourglass } from 'lucide-react';
import { useStore } from '../../lib/store';
import { Card, SectionTitle, StatCard, StatusPill, Avatar, Button } from '../../components/ui';
import { fmtDateTime } from '../../lib/geo';

export default function SponsorDashboard() {
  const { db, currentUser, payClaim } = useStore();
  const navigate = useNavigate();
  const me = currentUser!;

  const myAgreement = db.agreements.find((a) => a.sponsor_profile_id === me.id)!;
  const myClaims = db.claims.filter((c) => c.sponsor_id === me.id);
  const myEnrollments = db.enrollments.filter((e) => e.agreement_id === myAgreement.id);
  const pending = myClaims.filter((c) => c.status === 'submitted' || c.status === 'under_review');
  const approvedValue = myClaims.filter((c) => c.status === 'approved').reduce((s, c) => s + c.amount_kes, 0);
  const paidValue = myClaims.filter((c) => c.status === 'paid').reduce((s, c) => s + c.amount_kes, 0);
  const used = myEnrollments.reduce((s, e) => s + e.used_to_date_kes, 0);
  const utilization = Math.min(100, (used / Math.max(1, myAgreement.annual_cap_kes * myEnrollments.length)) * 100);

  return (
    <div className="space-y-5">
      <div className="relative overflow-hidden rounded-2xl border border-pine-900/10">
        <img src="/media/coop.jpg" alt="Milk collection" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-pine-950/95 via-pine-950/75 to-pine-950/15" />
        <div className="relative p-5 sm:p-7 max-w-2xl">
          <div className="font-mono text-[9px] uppercase tracking-[0.25em] text-maize-400">Sponsor Console · Kisii Cream Dairy Co-op</div>
          <h1 className="mt-1.5 font-display font-semibold text-2xl sm:text-3xl text-maize-50 leading-tight">Member care desk</h1>
          <p className="mt-1.5 text-[12px] text-pine-100/90">Gold agreement · max claim KES {myAgreement.max_claim_kes.toLocaleString()} · annual cap KES {myAgreement.annual_cap_kes.toLocaleString()} · code <span className="font-mono text-maize-300">{myAgreement.enrollment_code}</span></p>
          <div className="mt-4 flex gap-2">
            <Button variant="maize" size="sm" onClick={() => navigate('/app/claims')}><Banknote size={14} /> Claims desk {pending.length > 0 && `(${pending.length})`}</Button>
            <Button variant="ghost" size="sm" className="text-pine-50 border border-white/20 hover:bg-white/10" onClick={() => navigate('/app/agreements')}>Agreement settings</Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Pending Claims" value={pending.length} sub={pending[0] ? `${pending[0].claim_number} · KES ${pending[0].amount_kes.toLocaleString()}` : 'All claims processed'} icon={<FileWarning size={18} />} accent="red" />
        <StatCard label="Awaiting Payment" value={`KES ${approvedValue.toLocaleString()}`} sub="Approved — release settlement" icon={<Hourglass size={18} />} accent="maize" />
        <StatCard label="Settled Lifetime" value={`KES ${paidValue.toLocaleString()}`} sub="Paid to farmers & vets" icon={<CircleDollarSign size={18} />} accent="pine" />
        <StatCard label="Enrolled Farmers" value={myEnrollments.length} sub={`${utilization.toFixed(1)}% of pooled cap utilized`} icon={<Users size={18} />} accent="sky" />
      </div>

      {/* Claims needing action */}
      <Card className="p-5">
        <SectionTitle eyebrow="Action Required" title="Claims queue" right={<button onClick={() => navigate('/app/claims')} className="text-[11px] font-bold text-pine-800 flex items-center gap-1">Full desk <ArrowRight size={12} /></button>} />
        {pending.length === 0 ? (
          <div className="py-8 text-center">
            <BadgeCheck size={30} className="mx-auto text-emerald-500 mb-2" />
            <div className="text-[13px] font-semibold text-pine-900">Desk clear — nothing awaiting review.</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead><tr className="text-left font-mono text-[9px] uppercase tracking-[0.18em] text-pine-600 border-b border-pine-900/10"><th className="pb-2 pr-4">Claim</th><th className="pb-2 pr-4">Case / Vet</th><th className="pb-2 pr-4">Amount</th><th className="pb-2 pr-4">Submitted</th><th className="pb-2">Status</th><th className="pb-2"></th></tr></thead>
              <tbody className="divide-y divide-pine-900/8">
                {pending.map((cl) => {
                  const c = db.cases.find((x) => x.id === cl.case_id)!;
                  const vet = db.profiles.find((p) => p.id === cl.vet_id)!;
                  return (
                    <tr key={cl.id}>
                      <td className="py-2.5 pr-4 font-mono text-[10.5px] font-semibold text-pine-900">{cl.claim_number}</td>
                      <td className="py-2.5 pr-4"><div className="font-medium text-pine-950">{c.case_number} · {c.suspected_dx}</div><div className="text-[10px] text-pine-600">{vet.full_name}</div></td>
                      <td className="py-2.5 pr-4 font-semibold tabular">KES {cl.amount_kes.toLocaleString()}</td>
                      <td className="py-2.5 pr-4 text-[10.5px] text-pine-700">{fmtDateTime(cl.submitted_at)}</td>
                      <td className="py-2.5 pr-4"><StatusPill status={cl.status} /></td>
                      <td className="py-2.5"><Button size="sm" variant="outline" onClick={() => navigate('/app/claims')}>Review</Button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Approved awaiting payment */}
      {myClaims.filter((c) => c.status === 'approved').length > 0 && (
        <Card className="p-5">
          <SectionTitle eyebrow="Settlement" title="Approved — awaiting payout" />
          <div className="grid sm:grid-cols-2 gap-3">
            {myClaims.filter((c) => c.status === 'approved').map((cl) => (
              <div key={cl.id} className="flex items-center gap-3 border border-maize-500/40 bg-maize-400/10 rounded-xl p-3">
                <Avatar initials="KC" tone="maize" size="sm" />
                <div className="min-w-0 flex-1"><div className="font-mono text-[10px] font-bold text-pine-900">{cl.claim_number}</div><div className="text-[11px] text-pine-800">KES {cl.amount_kes.toLocaleString()} · {cl.services.slice(0, 60)}…</div></div>
                <Button size="sm" variant="primary" onClick={() => payClaim(cl.id)}>Pay</Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Enrolled farmers */}
      <Card className="p-5">
        <SectionTitle eyebrow="Membership" title="Enrolled farmers & benefit utilization" right={<button onClick={() => navigate('/app/enrollments')} className="text-[11px] font-bold text-pine-800 flex items-center gap-1">Manage <ArrowRight size={12} /></button>} />
        <div className="grid md:grid-cols-3 gap-3">
          {myEnrollments.map((e) => {
            const f = db.profiles.find((p) => p.id === e.farmer_profile_id)!;
            const pct = Math.min(100, (e.used_to_date_kes / myAgreement.annual_cap_kes) * 100);
            return (
              <div key={e.id} className="border border-pine-900/10 rounded-xl p-3.5">
                <div className="flex items-center gap-2.5"><Avatar initials={f.initials} tone="pine" size="sm" /><div className="min-w-0"><div className="text-[12px] font-bold text-pine-950 truncate">{f.full_name}</div><div className="font-mono text-[9px] text-pine-600">{f.ward}</div></div></div>
                <div className="mt-2.5 flex justify-between font-mono text-[9px] text-pine-600"><span>Used KES {e.used_to_date_kes.toLocaleString()}</span><span>{pct.toFixed(0)}%</span></div>
                <div className="mt-1 h-2 rounded-full bg-pine-100 overflow-hidden"><div className="h-full bg-pine-600" style={{ width: `${pct}%` }} /></div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
