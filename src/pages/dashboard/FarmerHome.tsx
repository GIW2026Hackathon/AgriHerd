import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  PawPrint, Coins, AlertTriangle, Stethoscope, Wheat, ArrowRight, Syringe,
  CalendarClock, Phone, ChevronRight, HeartPulse, Sparkles,
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useApp } from '../../lib/session';
import { CaseRow } from '../../components/dash';
import { Card, CardHeader, Stat, Badge, claimStatusTone, CLAIM_STATUS_LABEL, Avatar } from '../../components/ui';
import { ageYears, kes, timeAgo } from '../../lib/utils';

export default function FarmerHome() {
  const { db, user, client } = useApp();
  const navigate = useNavigate();

  const myFarms = useMemo(() => db.farms.filter((f) => f.owner_id === user.id), [db.farms, user.id]);
  const myFarmIds = useMemo(() => new Set(myFarms.map((f) => f.id)), [myFarms]);
  const myAnimals = useMemo(() => db.animals.filter((a) => myFarmIds.has(a.farm_id)), [db.animals, myFarmIds]);
  const myCases = useMemo(() => client.casesForUser(user), [client, user, db]);
  const activeCases = myCases.filter((c) => !['recovered', 'closed', 'deceased'].includes(c.status));
  const myClaims = useMemo(() => client.claimsForUser(user), [client, user, db]);
  const pendingClaim = myClaims.find((c) => c.status === 'draft');
  const coverage = client.sponsorCoverageFor(user.id);

  // Yield trend — summed over lactating females, synthetic-but-derived history
  const yieldSeries = [
    { d: 'Oct 1', l: 11.2 }, { d: 'Oct 5', l: 12.1 }, { d: 'Oct 9', l: 12.8 }, { d: 'Oct 13', l: 13.4 },
    { d: 'Oct 17', l: 12.6 }, { d: 'Oct 21', l: 10.4 }, { d: 'Oct 25', l: 9.0 },
  ];

  const lactating = myAnimals.filter((a) => a.stage === 'lactating');
  const avgYield = lactating.length ? lactating.reduce((s, a) => s + (a.last_milk_yield_kg ?? 0), 0) / lactating.length : 0;
  const nextDip = db.tickPlans.filter((p) => myFarmIds.has(p.farm_id)).sort((a, b) => a.next_dip_date.localeCompare(b.next_dip_date))[0];
  const dipOverdue = nextDip ? new Date(nextDip.next_dip_date) < new Date() : false;
  const underTreatment = myAnimals.filter((a) => a.status === 'under_treatment' || a.status === 'quarantine').length;

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-4 sm:p-6">
      {/* Greeting banner */}
      <div className="relative overflow-hidden rounded-2xl border border-pine-800 bg-pine-900 px-6 py-5 text-cream-100">
        <img src="/images/hero-dairy.jpg" alt="" aria-hidden className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-20" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-gold-300">Monday, 26 October 2026 · Sironga Sector</p>
            <h1 className="mt-1 font-display text-2xl font-semibold text-cream-50 sm:text-3xl">Habari, {user.full_name.split(' ')[0]} 👋</h1>
            <p className="mt-1 max-w-md text-[12.5px] text-cream-100/75">{myFarms.length === 0 ? 'Add a farm to start registering animals and keeping health records.' : <>{myFarms.length} farm{myFarms.length > 1 ? 's' : ''} · {myAnimals.length} tagged animals{coverage ? <> · Covered by <strong className="text-gold-300">{coverage.sponsor?.company_name}</strong> ({coverage.member.coverage_tier} tier)</> : ' · Not yet on a sponsor scheme'}</>}</p>
          </div>
          <button onClick={() => navigate(myFarms.length === 0 ? '/app/farmer/registry' : '/app/farmer/triage')} className="group flex items-center gap-2 rounded-2xl bg-gold-400 px-5 py-3 text-[14px] font-bold text-pine-950 shadow-lift transition hover:bg-gold-300">
            <Stethoscope className="h-5 w-5" strokeWidth={2} />{myFarms.length === 0 ? 'Set up your farm' : 'AI Health Check'}<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Herd size" value={myAnimals.length} icon={<PawPrint className="h-4 w-4" />} sub={`${lactating.length} lactating · avg ${avgYield.toFixed(1)} L/cow/day`} />
        <Stat label="Needs attention" value={underTreatment} tone={underTreatment ? 'red' : 'pine'} icon={<HeartPulse className="h-4 w-4" />} sub="Under treatment or quarantine" />
        <Stat label="Open cases" value={activeCases.length} tone={activeCases.some(c => c.priority === 'emergency') ? 'red' : 'gold'} icon={<AlertTriangle className="h-4 w-4" />} sub={myCases[0] ? `Latest: ${myCases[0].case_number}` : 'No cases logged'} />
        <Stat label="Claims paid" value={kes(myClaims.filter(c => c.status === 'disbursed').reduce((s, c) => s + c.amount_kes, 0))} tone="blue" icon={<Coins className="h-4 w-4" />} sub={`${myClaims.length} claim${myClaims.length === 1 ? '' : 's'} on file`} />
      </div>

      <div className="grid gap-5 xl:grid-cols-5">
        {/* Left column */}
        <div className="space-y-5 xl:col-span-3">
          {/* Active cases */}
          <Card>
            <CardHeader title="Active Cases" sub="Live status of animals under vet care" action={<Link to="/app/farmer/cases" className="flex items-center gap-1 text-[12px] font-semibold text-pine-800 hover:text-pine-600">All cases <ChevronRight className="h-4 w-4" /></Link>} />
            <div className="space-y-2 p-4">
              {activeCases.length === 0 && <p className="py-6 text-center text-sm text-stone-500">No active cases. Great news — but if anything looks off, run an AI Health Check.</p>}
              {activeCases.slice(0, 4).map((c) => <CaseRow key={c.id} kase={c} showFarm={myFarms.length > 1} />)}
            </div>
          </Card>

          {/* Yield trend */}
          <Card>
            <CardHeader title="Milk Yield Trend" sub="Average litres per lactating cow, trailing 30 days" action={<span className="rounded-lg bg-orange-50 px-2 py-1 font-mono text-[10px] font-bold text-orange-700">▼ 18% POST-ECF CASE</span>} />
            <div className="h-44 px-2 pb-4 pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={yieldSeries} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
                  <defs>
                    <linearGradient id="yield" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#1c5740" stopOpacity={0.75} />
                      <stop offset="100%" stopColor="#1c5740" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e9e5d3" vertical={false} />
                  <XAxis dataKey="d" tick={{ fontSize: 10.5, fill: '#78716c' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10.5, fill: '#78716c' }} axisLine={false} tickLine={false} unit=" L" domain={['dataMin - 1', 'dataMax + 1']} />
                  <Tooltip cursor={{ stroke: '#1c5740' }} contentStyle={{ borderRadius: 12, border: '1px solid #e9e5d3', fontSize: 12 }} formatter={(v) => [`${Number(v).toFixed(1)} L`, 'Avg yield']} />
                  <Area type="monotone" dataKey="l" stroke="#1c5740" strokeWidth={2.5} fill="url(#yield)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-5 xl:col-span-2">
          {/* Draft claim banner */}
          {pendingClaim && (
            <Card className="border-gold-400/60 bg-amber-50/60">
              <div className="flex items-start gap-3 p-4">
                <div className="rounded-xl bg-gold-400/80 p-2 text-pine-950"><Coins className="h-5 w-5" /></div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-bold text-amber-900">Claim draft waiting for you — {pendingClaim.claim_number}</p>
                  <p className="mt-0.5 text-[11.5px] text-amber-800/90">{kes(pendingClaim.amount_kes)} for treatment on case {db.cases.find(c => c.id === pendingClaim.case_id)?.case_number}. Review line items and submit to {coverage?.sponsor?.company_name ?? 'your sponsor'}.</p>
                  <button onClick={() => navigate('/app/farmer/claims')} className="mt-2 inline-flex items-center gap-1 text-[12px] font-bold text-pine-800 hover:underline">Review & submit claim <ArrowRight className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            </Card>
          )}

          {/* Claims status */}
          <Card>
            <CardHeader title="My Claims" sub="Sponsor-funded care pipeline" action={<Link to="/app/farmer/claims" className="flex items-center gap-1 text-[12px] font-semibold text-pine-800">Details <ChevronRight className="h-4 w-4" /></Link>} />
            <ul className="divide-y divide-cream-100">
              {myClaims.map((c) => (
                <li key={c.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-[11px] font-bold text-pine-900">{c.claim_number} <span className="font-sans font-normal text-stone-400">· {timeAgo(c.created_at)}</span></p>
                    <p className="text-[13px] font-semibold text-pine-950">{kes(c.amount_kes)}</p>
                  </div>
                  <Badge tone={claimStatusTone(c.status)}>{CLAIM_STATUS_LABEL[c.status]}</Badge>
                </li>
              ))}
            </ul>
          </Card>

          {/* Tick control */}
          <Card className={dipOverdue ? 'border-red-300' : ''}>
            <CardHeader title="Tick-Control Calendar" sub="Acaricide & herd health plan" action={<Link to="/app/farmer/herd-health" className="flex items-center gap-1 text-[12px] font-semibold text-pine-800">Manage <ChevronRight className="h-4 w-4" /></Link>} />
            {nextDip ? (
              <div className="p-4">
                <div className="flex items-center gap-3">
                  <CalendarClock className={`h-8 w-8 ${dipOverdue ? 'text-red-600' : 'text-pine-700'}`} strokeWidth={1.6} />
                  <div>
                    <p className={`text-[14px] font-bold ${dipOverdue ? 'text-red-700' : 'text-pine-950'}`}>{dipOverdue ? `Dip OVERDUE since ${nextDip.next_dip_date}` : `Next dip: ${nextDip.next_dip_date}`}</p>
                    <p className="text-[11.5px] text-stone-500">{nextDip.product} · every {nextDip.interval_days} days{dipOverdue && ' — acaricide rotation advised'}</p>
                  </div>
                </div>
                {dipOverdue && <button onClick={() => navigate('/app/farmer/herd-health')} className="mt-3 flex h-9 w-full items-center justify-center gap-2 rounded-xl bg-red-700 text-[12px] font-bold text-white hover:bg-red-800"><Syringe className="h-4 w-4" /> Record dip now</button>}
              </div>
            ) : <p className="p-4 text-sm text-stone-500">No tick-control plan yet. <Link className="font-semibold text-pine-800 underline" to="/app/farmer/herd-health">Create one</Link>.</p>}
          </Card>

          {/* Sponsor coverage card */}
          {coverage && coverage.sponsor && (
            <Card className="bg-gradient-to-br from-pine-900 to-pine-800 text-cream-100">
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <p className="font-mono text-[9.5px] uppercase tracking-widest text-gold-300">Sponsor Coverage</p>
                  <Badge tone="gold">{coverage.member.coverage_tier.toUpperCase()}</Badge>
                </div>
                <p className="mt-2 font-display text-lg font-semibold">{coverage.sponsor.company_name}</p>
                <p className="mt-1 text-[11.5px] text-cream-100/70">Member since {new Date(coverage.member.joined_at).getFullYear()} · Treatment costs up to KES 50,000 per case covered for premium-tier members.</p>
                <a href="tel:+254709188200" className="mt-3 inline-flex items-center gap-2 rounded-xl border border-gold-400/40 bg-gold-400/10 px-3 py-2 text-[12px] font-bold text-gold-300 hover:bg-gold-400/20"><Phone className="h-4 w-4" /> {coverage.sponsor.contact_email}</a>
              </div>
            </Card>
          )}

          {/* Quick actions */}
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => navigate('/app/farmer/registry')} className="flex items-center gap-2 rounded-2xl border border-cream-200 bg-white p-3 text-left text-[12px] font-semibold text-pine-900 shadow-card hover:border-pine-600"><Wheat className="h-5 w-5 text-pine-700" /> Register animal</button>
            <button onClick={() => navigate('/app/farmer/vets')} className="flex items-center gap-2 rounded-2xl border border-cream-200 bg-white p-3 text-left text-[12px] font-semibold text-pine-900 shadow-card hover:border-pine-600"><Stethoscope className="h-5 w-5 text-pine-700" /> Find a vet near me</button>
            <button onClick={() => navigate('/app/farmer/triage')} className="flex items-center gap-2 rounded-2xl border border-cream-200 bg-white p-3 text-left text-[12px] font-semibold text-pine-900 shadow-card hover:border-pine-600"><Sparkles className="h-5 w-5 text-pine-700" /> Run AI triage</button>
            <button onClick={() => navigate('/app/farmer/claims')} className="flex items-center gap-2 rounded-2xl border border-cream-200 bg-white p-3 text-left text-[12px] font-semibold text-pine-900 shadow-card hover:border-pine-600"><Coins className="h-5 w-5 text-pine-700" /> New claim</button>
          </div>
        </div>
      </div>
    </div>
  );
}
