import { Link, useNavigate } from 'react-router-dom';
import { PawPrint, Building2, Syringe, ShieldCheck, HeartPulse, ArrowRight, TriangleAlert, ClipboardList, BellRing, Stethoscope, CircleDollarSign, Sparkles } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import { useStore } from '../../lib/store';
import { Card, SectionTitle, StatCard, StatusPill, PriorityDot, Button, Avatar } from '../../components/ui';
import { vetsNearby } from './shared';
import { fmtDate } from '../../lib/geo';

export default function FarmerDashboard() {
  const { db, currentUser, coverageFor } = useStore();
  const navigate = useNavigate();
  const me = currentUser!;

  const myFarms = db.farms.filter((f) => f.farmer_id === me.id);
  const myFarmIds = new Set(myFarms.map((f) => f.id));
  const myAnimals = db.animals.filter((a) => myFarmIds.has(a.farm_id));
  const myAnimalIds = new Set(myAnimals.map((a) => a.id));
  const myCases = db.cases.filter((c) => c.farmer_id === me.id);
  const openCases = myCases.filter((c) => !['resolved', 'claim_paid', 'cancelled'].includes(c.status));
  const myClaims = db.claims.filter((cl) => myCases.some((c) => c.id === cl.case_id));
  const paidTotal = myClaims.filter((c) => c.status === 'paid' || c.status === 'approved').reduce((s, c) => s + c.amount_kes, 0);
  const cov = coverageFor(me.id);
  const nearest = vetsNearby(db.profiles.filter((p) => p.role === 'vet'), db.vetProfiles, me.lat, me.lng).slice(0, 3);
  const myVaccinations = db.vaccinations.filter((v) => myAnimalIds.has(v.animal_id));
  const overdue = myVaccinations.filter((v) => v.status === 'overdue');
  const alerts = db.alerts.filter((a) => a.active);
  const myTickPlan = db.tickPlans.find((t) => myFarmIds.has(t.farm_id));

  // last 8 weeks synthetic yield trend seeded from animal count
  const base = Math.max(120, myAnimals.length * 18);
  const yieldTrend = Array.from({ length: 8 }, (_, i) => ({ wk: `W${i + 38}`, litres: Math.round(base * (0.82 + Math.sin(i * 1.7) * 0.18 + i * 0.035)) }));

  return (
    <div className="space-y-5">
      {/* Greeting band */}
      <div className="relative overflow-hidden rounded-2xl border border-pine-900/10">
        <img src="/media/farmer.jpg" alt="Beatrice milking" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-pine-950/95 via-pine-950/75 to-pine-950/15" />
        <div className="relative p-5 sm:p-7 max-w-2xl">
          <div className="font-mono text-[9px] uppercase tracking-[0.25em] text-maize-400">Farmer Console · Kitutu Chache North</div>
          <h1 className="mt-1.5 font-display font-semibold text-2xl sm:text-3xl text-maize-50 leading-tight">Karibu, Beatrice 👋</h1>
          <p className="mt-1.5 text-[12px] text-pine-100/90 leading-relaxed">{myAnimals.length} head across {myFarms.length} farms · {openCases.length} open case{openCases.length === 1 ? '' : 's'} · coverage <b className="text-maize-300">{cov.covered ? cov.agreement?.tier + ' via ' + cov.sponsorName : 'None'}</b></p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="maize" onClick={() => navigate('/app/triage')}><HeartPulse size={15} /> Report sick animal</Button>
            <Button variant="ghost" className="text-pine-50 border border-white/20 hover:bg-white/10" onClick={() => navigate('/app/find-vet')}><Stethoscope size={15} /> Find a vet</Button>
          </div>
        </div>
      </div>

      {/* Alert strip */}
      {alerts.length > 0 && (
        <button onClick={() => navigate('/app/prevention')} className="w-full flex items-center gap-3 bg-red-50 border border-red-200 rounded-2xl px-4 py-2.5 text-left hover:bg-red-100/70 transition-colors">
          <span className="relative flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-60" /><span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" /></span>
          <span className="text-[11.5px] text-red-900"><b>{alerts[0].disease} — {alerts[0].zone}:</b> {alerts[0].message}</span>
          <ArrowRight size={14} className="ml-auto text-red-700 shrink-0" />
        </button>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Herd Size" value={myAnimals.length} sub={`${myAnimals.filter(a => a.species === 'dairy_cattle').length} dairy · ${myAnimals.filter(a => a.species === 'beef_cattle').length} beef`} icon={<PawPrint size={18} />} accent="pine" />
        <StatCard label="Open Cases" value={openCases.length} sub={openCases[0] ? `${openCases[0].case_number} · ${openCases[0].suspected_dx}` : 'No active treatment'} icon={<ClipboardList size={18} />} accent="sky" />
        <StatCard label="Claims Settled" value={`KES ${paidTotal.toLocaleString()}`} sub={`${myClaims.filter(c => c.status === 'paid').length} paid · ${myClaims.filter(c => c.status === 'submitted' || c.status === 'under_review').length} pending`} icon={<CircleDollarSign size={18} />} accent="maize" />
        <StatCard label="Vaccinations Due" value={myVaccinations.filter(v => v.status !== 'complete').length} sub={overdue.length > 0 ? `${overdue.length} OVERDUE — action needed` : 'All schedules current'} icon={<Syringe size={18} />} accent={overdue.length > 0 ? 'red' : 'pine'} />
      </div>

      <div className="grid xl:grid-cols-3 gap-4">
        {/* Cases */}
        <Card className="xl:col-span-2 p-5">
          <SectionTitle eyebrow="Treatment Desk" title="Active & recent cases" right={<Link to="/app/cases" className="text-[11px] font-bold text-pine-800 flex items-center gap-1 hover:gap-2 transition-all">All cases <ArrowRight size={12} /></Link>} />
          <div className="divide-y divide-pine-900/8">
            {myCases.slice(0, 4).map((c) => {
              const animal = db.animals.find((a) => a.id === c.animal_id)!;
              const vet = c.vet_id ? db.profiles.find((p) => p.id === c.vet_id) : null;
              return (
                <Link key={c.id} to="/app/cases" className="flex items-center gap-3 py-3 group">
                  <Avatar initials={animal.name.slice(0, 2).toUpperCase()} tone="pine" size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-[10px] font-semibold text-pine-600">{c.case_number}</span>
                      <PriorityDot priority={c.priority} />
                    </div>
                    <div className="text-[12px] font-semibold text-pine-950 leading-snug mt-0.5">{animal.name} · {c.suspected_dx}</div>
                    <div className="text-[10.5px] text-pine-700/80 mt-0.5">{vet ? `Vet: ${vet.full_name}` : 'Awaiting vet assignment'} · {fmtDate(c.reported_at)}</div>
                  </div>
                  <StatusPill status={c.status} />
                </Link>
              );
            })}
          </div>
        </Card>

        {/* Coverage panel */}
        <Card className="p-5">
          <SectionTitle eyebrow="Sponsor Coverage" title={cov.covered ? cov.sponsorName : 'No active coverage'} right={<Link to="/app/coverage" className="text-[11px] font-bold text-pine-800 flex items-center gap-1">Details <ArrowRight size={12} /></Link>} />
          {cov.covered && cov.agreement ? (
            <>
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold bg-maize-400 text-pine-950 rounded-md px-2 py-1"><Sparkles size={11} />{cov.agreement.tier.toUpperCase()} TIER</span>
                <span className="font-mono text-[10px] text-pine-600">Annual cap {cov.agreement.annual_cap_kes.toLocaleString()}</span>
              </div>
              {/* utilization bar */}
              <div className="mt-4">
                <div className="flex justify-between font-mono text-[9.5px] uppercase tracking-wider text-pine-600"><span>Benefit used</span><span>{(cov.enrollment?.used_to_date_kes ?? 0).toLocaleString()} / {cov.agreement.annual_cap_kes.toLocaleString()}</span></div>
                <div className="mt-1.5 h-2.5 rounded-full bg-pine-100 overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-pine-500 to-pine-700" style={{ width: `${Math.min(100, ((cov.enrollment?.used_to_date_kes ?? 0) / cov.agreement.annual_cap_kes) * 100)}%` }} />
                </div>
                <div className="mt-2 font-mono text-[11px] text-pine-900"><b className="text-pine-700">KES {cov.remainingAnnual.toLocaleString()}</b> remaining · max claim <b>KES {cov.maxClaim.toLocaleString()}</b></div>
              </div>
              <div className="mt-3 pt-3 border-t border-pine-900/10">
                <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-pine-600 mb-1.5">Covered diagnoses</div>
                <div className="flex flex-wrap gap-1">{cov.agreement.covered_diagnoses.slice(0, 6).map((d) => <span key={d} className="text-[9.5px] bg-pine-50 border border-pine-200 text-pine-800 rounded-full px-2 py-0.5">{d}</span>)}</div>
              </div>
            </>
          ) : (
            <div className="text-[12px] text-pine-800">Redeem an enrollment code from your sponsor to unlock covered care. <Link className="font-bold text-pine-950 underline" to="/app/coverage">Enroll now →</Link></div>
          )}
        </Card>
      </div>

      <div className="grid xl:grid-cols-3 gap-4">
        {/* Yield trend */}
        <Card className="xl:col-span-2 p-5">
          <SectionTitle eyebrow="Production Intelligence" title="Litres collected · last 8 weeks" right={<span className="font-mono text-[10px] text-pine-600">+9.4% vs last month</span>} />
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={yieldTrend} margin={{ top: 5, right: 4, left: -8, bottom: 0 }}>
                <XAxis dataKey="wk" tick={{ fontSize: 10, fill: '#357a58' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 12, border: '1px solid #c2dfcf' }} />
                <Area type="monotone" dataKey="litres" stroke="#2b6147" strokeWidth={2.5} fill="#97c9b0" fillOpacity={0.45} name="Litres" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Nearest vets + tick plan */}
        <div className="space-y-4">
          <Card className="p-5">
            <SectionTitle eyebrow="Verified Network" title="Nearest vets to Riabai" right={<Link to="/app/find-vet" className="text-[11px] font-bold text-pine-800 flex items-center gap-1">Map <ArrowRight size={12} /></Link>} />
            <div className="space-y-2.5">
              {nearest.map((v) => (
                <div key={v.id} className="flex items-center gap-2.5">
                  <Avatar initials={v.initials} tone="blue" size="xs" />
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-semibold text-pine-950 truncate">{v.full_name}</div>
                    <div className="font-mono text-[9px] text-pine-600">{v.distance.toFixed(1)} km · ★{v.rating}</div>
                  </div>
                  <span className="h-2 w-2 rounded-full bg-emerald-500" title="Available" />
                </div>
              ))}
            </div>
          </Card>
          {myTickPlan && (
            <Card className="p-5">
              <SectionTitle eyebrow="Prevention Program" title="Tick control — Riabai" />
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[12px] font-semibold text-pine-950">Dipping every {myTickPlan.dipping_day}</div>
                  <div className="text-[10.5px] text-pine-700">Next: {fmtDate(myTickPlan.next_due)} · {myTickPlan.acaricide.split(' rotate')[0]}</div>
                </div>
                <div className="text-right"><div className="font-display font-semibold text-2xl text-pine-800 tabular">{myTickPlan.compliance_pct}%</div><div className="font-mono text-[8px] uppercase text-pine-500">compliance</div></div>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Overdue vaccinations banner */}
      {overdue.length > 0 && (
        <Card className="p-4 border-red-200 bg-red-50/60 flex flex-wrap items-center gap-3">
          <TriangleAlert size={18} className="text-red-600 shrink-0" />
          <div className="text-[12px] text-red-900 min-w-0"><b>{overdue.length} overdue vaccination{overdue.length > 1 ? 's' : ''}:</b> {overdue.map((v) => `${db.animals.find(a => a.id === v.animal_id)?.name} (${v.vaccine.split(' (')[0]})`).join(', ')}</div>
          <Button size="sm" variant="danger" className="ml-auto" onClick={() => navigate('/app/prevention')}><BellRing size={13} /> Book vaccines</Button>
        </Card>
      )}
    </div>
  );
}
