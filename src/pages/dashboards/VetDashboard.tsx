import { useNavigate } from 'react-router-dom';
import { ClipboardList, Wallet, Star, CheckCircle2, Clock, ArrowRight, Stethoscope } from 'lucide-react';
import { BarChart, Bar, ResponsiveContainer, XAxis, Tooltip, CartesianGrid } from 'recharts';
import { useStore } from '../../lib/store';
import { Card, SectionTitle, StatCard, StatusPill, PriorityDot, Avatar, Button } from '../../components/ui';
import { fmtDateTime } from '../../lib/geo';

export default function VetDashboard() {
  const { db, currentUser } = useStore();
  const navigate = useNavigate();
  const me = currentUser!;
  const vp = db.vetProfiles.find((v) => v.profile_id === me.id)!;

  const myCases = db.cases.filter((c) => c.vet_id === me.id);
  const assigned = myCases.filter((c) => c.status === 'vet_assigned');
  const inTreatment = myCases.filter((c) => c.status === 'in_treatment');
  const resolved = myCases.filter((c) => ['resolved', 'claim_submitted', 'claim_under_review', 'claim_approved', 'claim_paid'].includes(c.status));
  const myClaims = db.claims.filter((c) => c.vet_id === me.id);
  const paidEarnings = myClaims.filter((c) => c.status === 'paid' || c.status === 'approved').reduce((s, c) => s + c.amount_kes, 0);
  const pendingClaims = myClaims.filter((c) => c.status === 'submitted' || c.status === 'under_review').length;

  // synthetic weekly caseload
  const weekly = ['W36', 'W37', 'W38', 'W39', 'W40', 'W41', 'W42', 'W43'].map((wk, i) => ({ wk, cases: Math.max(1, Math.round(6 + Math.sin(i * 1.35) * 3 + (i > 5 ? 2 : 0))) }));

  return (
    <div className="space-y-5">
      <div className="relative overflow-hidden rounded-2xl border border-pine-900/10">
        <img src="/media/vet.jpg" alt="Vet examining cattle" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-pine-950/95 via-pine-950/70 to-pine-950/10" />
        <div className="relative p-5 sm:p-7 max-w-2xl">
          <div className="font-mono text-[9px] uppercase tracking-[0.25em] text-maize-400">Veterinary Console · {me.ward}</div>
          <h1 className="mt-1.5 font-display font-semibold text-2xl sm:text-3xl text-maize-50 leading-tight">Dr. Chacha's desk</h1>
          <p className="mt-1.5 text-[12px] text-pine-100/90">{vp.license_number} · {vp.specialty} · {vp.cases_completed} cases lifetime · ★ {vp.rating}</p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold bg-emerald-400 text-emerald-950 rounded-md px-2 py-1"><CheckCircle2 size={11} />VERIFIED PROVIDER</span>
            <span className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold bg-white/10 border border-white/15 text-pine-100 rounded-md px-2 py-1">{vp.available ? '● ACCEPTING CASES' : '● ON LEAVE'}</span>
            <Button variant="maize" size="sm" onClick={() => navigate('/app/cases')}><ClipboardList size={14} /> Open case queue</Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Awaiting Acceptance" value={assigned.length} sub={assigned[0] ? `${assigned[0].case_number} · needs decision` : 'Queue clear'} icon={<Clock size={18} />} accent="red" />
        <StatCard label="In Treatment" value={inTreatment.length} sub={inTreatment[0]?.case_number ?? 'No active visits'} icon={<Stethoscope size={18} />} accent="sky" />
        <StatCard label="Resolved Lifetime" value={vp.cases_completed} sub="Across Kisii & Nyamira wards" icon={<CheckCircle2 size={18} />} accent="pine" />
        <StatCard label="Claims Earned (lifetime)" value={`KES ${paidEarnings.toLocaleString()}`} sub={`${pendingClaims} pending sponsor decision`} icon={<Wallet size={18} />} accent="maize" />
      </div>

      <div className="grid xl:grid-cols-3 gap-4">
        <Card className="xl:col-span-2 p-5">
          <SectionTitle eyebrow="Case Queue" title="Needs your decision" right={<button onClick={() => navigate('/app/cases')} className="text-[11px] font-bold text-pine-800 flex items-center gap-1">Open queue <ArrowRight size={12} /></button>} />
          {assigned.length === 0 ? (
            <div className="py-8 text-center">
              <CheckCircle2 size={30} className="mx-auto text-emerald-500 mb-2" />
              <div className="text-[13px] font-semibold text-pine-900">Queue clear — no cases waiting on you.</div>
              <p className="text-[11px] text-pine-700 mt-1">Farmers in your ward are assigned to you by the GLHIS matching engine.</p>
            </div>
          ) : (
            <div className="divide-y divide-pine-900/8">
              {assigned.map((c) => {
                const farmer = db.profiles.find((p) => p.id === c.farmer_id)!;
                const animal = db.animals.find((a) => a.id === c.animal_id)!;
                return (
                  <div key={c.id} className="py-3 flex items-center gap-3">
                    <Avatar initials={farmer.initials} tone="maize" size="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2"><span className="font-mono text-[10px] font-semibold text-pine-600">{c.case_number}</span><PriorityDot priority={c.priority} /></div>
                      <div className="text-[12px] font-semibold text-pine-950">{animal.name} · {c.suspected_dx}</div>
                      <div className="text-[10.5px] text-pine-700/85">{farmer.full_name} · urgency {c.triage_urgency}/100 · {fmtDateTime(c.reported_at)}</div>
                    </div>
                    <Button size="sm" onClick={() => navigate('/app/cases')}>Open</Button>
                  </div>
                );
              })}
            </div>
          )}
          {inTreatment.length > 0 && (
            <>
              <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-pine-600 mt-4 mb-1">In treatment now</div>
              {inTreatment.slice(0, 3).map((c) => (
                <div key={c.id} className="flex items-center gap-3 py-2 border-t border-pine-900/8">
                  <span className="h-2 w-2 rounded-full bg-indigo-500 pulse-dot shrink-0" />
                  <span className="text-[12px] font-semibold text-pine-950">{c.case_number}</span>
                  <span className="text-[11px] text-pine-700 truncate">{c.suspected_dx}</span>
                  <span className="ml-auto"><StatusPill status={c.status} /></span>
                </div>
              ))}
            </>
          )}
        </Card>

        <div className="space-y-4">
          <Card className="p-5">
            <SectionTitle eyebrow="Capacity" title={`Weekly caseload — ${vp.cases_completed} lifetime`} />
            <div className="h-36">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weekly} margin={{ left: -18, right: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0efe6" vertical={false} />
                  <XAxis dataKey="wk" tick={{ fontSize: 9, fill: '#357a58' }} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: 'rgba(246,201,69,0.18)' }} contentStyle={{ fontSize: 11, borderRadius: 12, border: '1px solid #c2dfcf' }} />
                  <Bar dataKey="cases" fill="#2b6147" radius={[5, 5, 0, 0]} name="Cases" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
          <Card className="p-5">
            <SectionTitle eyebrow="Reputation" title="Provider standing" />
            <div className="flex items-center gap-4">
              <div className="text-center"><div className="font-display font-semibold text-4xl text-pine-800">{vp.rating}</div><div className="font-mono text-[8.5px] uppercase text-pine-500 mt-0.5">Rating ★</div></div>
              <div className="flex-1 text-[11px] text-pine-800 space-y-1">
                <div className="flex justify-between"><span>Service radius</span><b>{vp.service_radius_km} km</b></div>
                <div className="flex justify-between"><span>Experience</span><b>{vp.years_experience} yrs</b></div>
                <div className="flex justify-between"><span>Specialty</span><b className="text-right">Herd health</b></div>
                <div className="flex justify-between"><span>Verification</span><b className="text-emerald-700">KVB ✓</b></div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
