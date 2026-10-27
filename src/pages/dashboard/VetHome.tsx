import { useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ClipboardList, AlertOctagon, Clock, CheckCircle2, MapPin, Phone, Stethoscope,
  ChevronRight, CalendarClock, HeartPulse, Pill,
} from 'lucide-react';
import { useApp } from '../../lib/session';
import { CaseRow } from '../../components/dash';
import { Card, CardHeader, Stat, Badge, Avatar, caseStatusTone, STATUS_LABEL } from '../../components/ui';
import { haversineKm, timeAgo } from '../../lib/utils';

export default function VetHome() {
  const { db, user, client, tick } = useApp();
  const navigate = useNavigate();
  const [onDuty, setOnDuty] = useState(user.available ?? true);

  const caseload = useMemo(() => db.cases.filter((c) => c.assigned_vet_id === user.id), [db.cases, user.id]);
  const open = caseload.filter((c) => !['recovered', 'closed', 'deceased'].includes(c.status));
  const emergency = open.filter((c) => c.priority === 'emergency');
  const unassigned = db.cases.filter((c) => c.status === 'submitted');
  const todayVisits = caseload.filter((c) => ['assigned', 'triaged'].includes(c.status));
  const recovered7d = caseload.filter((c) => c.status === 'recovered').length;

  const toggleDuty = () => {
    client.setVeterinarianAvailability(user, user.id, !onDuty);
    setOnDuty((v) => !v);
    tick();
  };

  const nearest = useMemo(() => {
    // farms in caseload with distances from vet's ward centroid
    const vetFarm = db.farms.find((f) => f.ward === user.ward);
    const origin = vetFarm ?? db.farms[0];
    return caseload
      .map((c) => {
        const farm = db.farms.find((f) => f.id === c.farm_id);
        return farm ? { kase: c, farm, km: haversineKm(origin.lat, origin.lng, farm.lat, farm.lng) } : null;
      })
      .filter(Boolean)
      .sort((a, b) => a!.km - b!.km)
      .slice(0, 3);
  }, [caseload, db.farms, user.ward]);

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-pine-800 bg-gradient-to-br from-pine-900 to-pine-950 px-6 py-5 text-cream-100">
        <div className="flex items-center gap-4">
          <Avatar name={user.full_name} size={56} className="ring-2 ring-gold-400" />
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-gold-300">{user.specialty ?? 'Veterinary Officer'} · KVB 2211</p>
            <h1 className="mt-0.5 font-display text-2xl font-semibold text-cream-50">{user.full_name}</h1>
            <p className="mt-0.5 flex items-center gap-1.5 text-[12px] text-cream-100/70"><MapPin className="h-3.5 w-3.5" /> {user.ward} Ward · {user.years_exp ?? 0} yrs practice · {user.organization}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <button onClick={toggleDuty} role="switch" aria-checked={onDuty} className={`flex h-11 items-center gap-2 rounded-2xl border px-4 text-[13px] font-bold transition ${onDuty ? 'border-emerald-400/50 bg-emerald-500/15 text-emerald-300' : 'border-white/15 bg-white/5 text-cream-100/60'}`}>
            <span className={`relative h-5 w-9 rounded-full transition ${onDuty ? 'bg-emerald-500' : 'bg-stone-600'}`}>
              <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${onDuty ? 'left-[18px]' : 'left-0.5'}`} />
            </span>
            {onDuty ? 'ON DUTY — accepting cases' : 'OFF DUTY'}
          </button>
          <a href="tel:+254709312400" className="flex items-center gap-1.5 text-[11px] text-cream-100/60 hover:text-gold-300"><Phone className="h-3.5 w-3.5" /> County duty room: +254 709 312 400</a>
        </div>
      </div>

      {/* Emergency banner */}
      {emergency.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border-2 border-red-500/60 bg-red-50 px-5 py-3.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-600 text-white"><AlertOctagon className="h-5 w-5" /></span>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-bold text-red-900">EMERGENCY — {emergency[0].case_number}: {emergency[0].diagnosis ?? emergency[0].chief_complaint.slice(0, 80)}</p>
            <p className="text-[11.5px] text-red-800/90">Ombati Valley Farm (Daniel Ombati). Animal under treatment — Buparvaquone protocol day 2. Farmer reports standing and nibbling.</p>
          </div>
          <button onClick={() => navigate(`/app/vet/cases/${emergency[0].id}`)} className="flex h-10 items-center gap-1.5 rounded-xl bg-red-700 px-4 text-[12.5px] font-bold text-white hover:bg-red-800">Open case <ChevronRight className="h-4 w-4" /></button>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="My caseload (open)" value={open.length} tone="gold" icon={<ClipboardList className="h-4 w-4" />} sub={`${caseload.length} total assigned all-time`} />
        <Stat label="Emergency" value={emergency.length} tone={emergency.length ? 'red' : 'slate'} icon={<AlertOctagon className="h-4 w-4" />} sub="Require immediate attendance" />
        <Stat label="Awaiting first visit" value={todayVisits.length} tone="blue" icon={<Clock className="h-4 w-4" />} sub="Triaged / assigned, not yet treated" />
        <Stat label="Recovered (all-time)" value={recovered7d} tone="pine" icon={<CheckCircle2 className="h-4 w-4" />} sub="Closed with outcome" />
      </div>

      <div className="grid gap-5 xl:grid-cols-5">
        {/* Caseload kanban-lite */}
        <div className="space-y-5 xl:col-span-3">
          <Card>
            <CardHeader title="Active Caseload" sub="Sorted by urgency — tap any case for the full clinical timeline" action={<Link to="/app/vet/cases" className="flex items-center gap-1 text-[12px] font-semibold text-pine-800">Board view <ChevronRight className="h-4 w-4" /></Link>} />
            <div className="space-y-2 p-4">
              {[...open].sort((a, b) => ({ emergency: 0, priority: 1, routine: 2 }[a.priority] - { emergency: 0, priority: 1, routine: 2 }[b.priority])).map((c) => <CaseRow key={c.id} kase={c} />)}
              {open.length === 0 && <p className="py-8 text-center text-sm text-stone-500">Caseload is clear. New assignments appear here automatically.</p>}
            </div>
          </Card>

          {/* Unassigned triage queue */}
          <Card>
            <CardHeader title="Unassigned — Triage Queue" sub="Cases awaiting a vet. Take one with a single tap." />
            <div className="space-y-2 p-4">
              {unassigned.map((c) => {
                const farm = db.farms.find((f) => f.id === c.farm_id);
                return (
                  <div key={c.id} className="flex items-center gap-3 rounded-xl border border-dashed border-pine-600/40 bg-pine-50/50 p-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2"><span className="font-mono text-[11px] font-bold text-pine-900">{c.case_number}</span><Badge tone="blue">AWAITING VET</Badge></div>
                      <p className="mt-0.5 truncate text-[12px] font-medium text-stone-600">{farm?.ward} · {c.chief_complaint}</p>
                      <p className="text-[10.5px] text-stone-400">{timeAgo(c.created_at)}</p>
                    </div>
                    <button onClick={() => { client.assignVet(user, c.id, user.id); tick(); }} className="h-9 shrink-0 rounded-xl bg-pine-800 px-4 text-[12px] font-bold text-cream-50 hover:bg-pine-700">Accept</button>
                  </div>
                );
              })}
              {unassigned.length === 0 && <p className="py-4 text-center text-[12px] text-stone-500">Triage queue empty — all cases have a vet.</p>}
            </div>
          </Card>
        </div>

        {/* Right rail */}
        <div className="space-y-5 xl:col-span-2">
          <Card>
            <CardHeader title="Nearest Assigned Farms" sub="Haversine distance from your ward" />
            <ul className="divide-y divide-cream-100">
              {nearest.map((n) => n && (
                <li key={n.kase.id} className="px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-[13px] font-semibold text-pine-950">{n.farm.name}</p>
                    <span className="shrink-0 font-mono text-[12px] font-bold text-pine-800">{n.km.toFixed(1)} km</span>
                  </div>
                  <p className="mt-0.5 flex items-center justify-between text-[11px] text-stone-500"><span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{n.farm.ward} · {n.farm.herd_size} head</span><Link to={`/app/vet/cases/${n.kase.id}`} className="font-semibold text-pine-800 hover:underline">{n.kase.case_number} →</Link></p>
                </li>
              ))}
              {nearest.length === 0 && <li className="px-4 py-6 text-center text-[12px] text-stone-500">No active assignments.</li>}
            </ul>
          </Card>

          {/* Withdrawals & treatment log */}
          <Card>
            <CardHeader title="Recent Treatment Log" sub="Your last administered protocols" />
            <ul className="divide-y divide-cream-100">
              {db.treatments.filter(t => t.administered_by === user.id).slice(0, 4).map((t) => {
                const kase = db.cases.find(c => c.id === t.case_id);
                return (
                  <li key={t.id} className="px-4 py-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="flex items-center gap-1.5 text-[12px] font-semibold text-pine-950"><Pill className="h-3.5 w-3.5 text-pine-700" />{t.drug_name}</p>
                      <span className="font-mono text-[10px] text-stone-400">{timeAgo(t.administered_at)}</span>
                    </div>
                    <p className="mt-0.5 pl-5 text-[10.5px] text-stone-500">{t.dosage} · {t.route} · <span className={t.withdrawal_days > 0 ? 'font-semibold text-orange-700' : ''}>{t.withdrawal_days}d milk withdrawal</span>{kase && <> · {kase.case_number}</>}</p>
                  </li>
                );
              })}
            </ul>
          </Card>

          {/* In-field guidance */}
          <Card className="border-sky-200 bg-sky-50/50">
            <div className="p-4">
              <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-sky-900"><CalendarClock className="h-4 w-4" /> ECF protocol reminder</p>
              <p className="mt-1.5 text-[12px] leading-relaxed text-sky-900/90">Buparvaquone day-2 review: monitor temperature q6h. If fever persists &gt;39.5°C at 48h post-dose, re-dose 2.5 mg/kg and re-smear. Report confirmed deaths within 24h — Meru County has activated border surveillance.</p>
            </div>
          </Card>

          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => navigate('/app/vet/triage')} className="flex items-center gap-2 rounded-2xl border border-cream-200 bg-white p-3 text-left text-[12px] font-semibold text-pine-900 shadow-card hover:border-pine-600"><Stethoscope className="h-5 w-5 text-pine-700" /> AI differentials</button>
            <button onClick={() => navigate('/app/vet/herd-health')} className="flex items-center gap-2 rounded-2xl border border-cream-200 bg-white p-3 text-left text-[12px] font-semibold text-pine-900 shadow-card hover:border-pine-600"><HeartPulse className="h-5 w-5 text-pine-700" /> Herd health plans</button>
          </div>
        </div>
      </div>

      {/* Recovery outcomes strip */}
      <Card>
        <CardHeader title="Recently Closed Outcomes" />
        <div className="flex flex-wrap gap-2 p-4">
          {caseload.filter(c => c.status === 'recovered').map((c) => (
            <div key={c.id} className="flex items-center gap-2 rounded-xl border border-pine-600/25 bg-pine-50 px-3 py-2">
              <CheckCircle2 className="h-4 w-4 text-pine-700" />
              <span className="font-mono text-[11px] font-bold text-pine-900">{c.case_number}</span>
              <Badge tone={caseStatusTone(c.status)}>{STATUS_LABEL[c.status]}</Badge>
              <span className="text-[11px] text-stone-500">{c.outcome?.slice(0, 60)}…</span>
            </div>
          ))}
          {caseload.filter(c => c.status === 'recovered').length === 0 && <p className="text-[12px] text-stone-500">No recoveries recorded yet.</p>}
        </div>
      </Card>
    </div>
  );
}
