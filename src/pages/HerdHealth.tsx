import { useMemo, useState } from 'react';
import {
  Syringe, CalendarClock, AlertTriangle, CheckCircle2, ShieldCheck, Bug, CalendarPlus, Loader2,
} from 'lucide-react';
import { useApp } from '../lib/session';
import { useToast } from '../lib/toast';
import { Card, CardHeader, Badge, Btn } from '../components/ui';
import { cn, daysFromNow } from '../lib/utils';

export default function HerdHealth() {
  const { db, user, role, client, tick } = useApp();
  const { toast } = useToast();
  const [busyFarm, setBusyFarm] = useState<string | null>(null);

  const farms = useMemo(() => client.farmsForUser(user), [client, user, db.farms]);
  const plans = useMemo(() => db.tickPlans.filter(p => farms.some(f => f.id === p.farm_id)), [db.tickPlans, farms]);
  const today = new Date();

  const [form, setForm] = useState({ product: 'Amitraz 12.5% EC (Triatix)', interval_days: '14', last_dip_date: daysFromNow(0), deworm_next: daysFromNow(45), vaccine_next: daysFromNow(120), acaricide_note: '' });
  const [targetFarm, setTargetFarm] = useState('');

  const createPlan = (e: React.FormEvent) => {
    e.preventDefault();
    const farmId = targetFarm || farms[0]?.id;
    if (!farmId) return;
    const next = new Date(form.last_dip_date);
    next.setDate(next.getDate() + Number(form.interval_days));
    client.upsertTickPlan(user, farmId, {
      product: form.product, interval_days: Number(form.interval_days) || 14,
      last_dip_date: form.last_dip_date, next_dip_date: next.toISOString().slice(0, 10),
      deworm_next: form.deworm_next, vaccine_next: form.vaccine_next,
      acaricide_note: form.acaricide_note || 'Standard 14-day rotation.',
    });
    tick();
    toast('Tick-control plan saved', { tone: 'success' });
  };

  return (
    <div className="mx-auto max-w-6xl space-y-5 p-4 sm:p-6">
      <div>
        <p className="label-caps text-pine-600">Module · Tick Control &amp; Herd Health</p>
        <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight text-pine-950">Tick-Control &amp; Herd Health Planning</h1>
        <p className="mt-0.5 max-w-2xl text-[13px] text-stone-500">Acaricide rotation to manage resistance, deworming and vaccination calendars. ECF and anaplasmosis are both tick-borne — dip compliance is the single highest-leverage prevention lever in Kisii &amp; Nyamira.</p>
      </div>

      {/* Plan list */}
      <div className="grid gap-4 lg:grid-cols-2">
        {plans.map(plan => {
          const farm = db.farms.find(f => f.id === plan.farm_id);
          const next = new Date(plan.next_dip_date);
          const overdue = next < today;
          const dueSoon = !overdue && (next.getTime() - today.getTime()) < 4 * 86400_000;
          const dipCount = db.audit.filter(a => a.action === 'tick_plan.dip_recorded' && a.entity_id === plan.id).length;
          return (
            <Card key={plan.id} className={cn(overdue && 'border-red-300', dueSoon && !overdue && 'border-amber-300')}>
              <CardHeader title={farm?.name ?? 'Farm'} sub={`${plan.product} · cycle ${plan.interval_days} days`} action={
                <Badge tone={overdue ? 'red' : dueSoon ? 'amber' : 'green'}>{overdue ? 'DIP OVERDUE' : dueSoon ? 'DIP DUE SOON' : 'ON SCHEDULE'}</Badge>
              } />
              <div className="space-y-3 p-4">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-xl border border-cream-200 bg-cream-50 p-2.5">
                    <p className="label-caps !text-[8.5px]">Last dip</p>
                    <p className="mt-0.5 font-mono text-[12px] font-bold text-pine-950">{plan.last_dip_date}</p>
                  </div>
                  <div className={cn('rounded-xl border p-2.5', overdue ? 'border-red-300 bg-red-50' : 'border-cream-200 bg-cream-50')}>
                    <p className="label-caps !text-[8.5px]">Next dip</p>
                    <p className={cn('mt-0.5 font-mono text-[12px] font-bold', overdue ? 'text-red-700' : 'text-pine-950')}>{plan.next_dip_date}</p>
                  </div>
                  <div className="rounded-xl border border-cream-200 bg-cream-50 p-2.5">
                    <p className="label-caps !text-[8.5px]">Dips logged</p>
                    <p className="mt-0.5 font-mono text-[12px] font-bold text-pine-950">{dipCount + 1}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] text-stone-600">
                  <p className="flex items-center gap-1.5 rounded-lg border border-cream-200 px-2.5 py-1.5"><Bug className="h-3.5 w-3.5 text-pine-700" />Deworm by <b>{plan.deworm_next}</b></p>
                  <p className="flex items-center gap-1.5 rounded-lg border border-cream-200 px-2.5 py-1.5"><ShieldCheck className="h-3.5 w-3.5 text-pine-700" />Vaccine by <b>{plan.vaccine_next}</b></p>
                </div>
                <p className="text-[11px] leading-snug text-stone-500"><span className="font-semibold text-stone-600">Acaricide note:</span> {plan.acaricide_note}</p>
                <div className="flex items-center justify-between gap-2 border-t border-cream-100 pt-3">
                  <span className="flex items-center gap-1.5 text-[10.5px] text-stone-400"><CalendarClock className="h-4 w-4" />Auto-advances on “Record dip”</span>
                  <button
                    disabled={busyFarm === plan.farm_id}
                    onClick={() => { setBusyFarm(plan.farm_id); client.markDipped(user, plan.farm_id); tick(); setBusyFarm(null); toast('Dip recorded', { body: `Next dip scheduled in ${plan.interval_days} days.`, tone: 'success' }); }}
                    className="flex h-10 items-center gap-1.5 rounded-xl bg-pine-800 px-4 text-[12px] font-bold text-cream-50 hover:bg-pine-700 disabled:opacity-60"
                  >{busyFarm === plan.farm_id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Syringe className="h-4 w-4" />}Record dip today</button>
                </div>
              </div>
            </Card>
          );
        })}
        {plans.length === 0 && <Card className="lg:col-span-2"><p className="p-8 text-center text-sm text-stone-500">No tick-control plans for farms in your scope yet. Create the first below.</p></Card>}
      </div>

      {/* Create plan */}
      <Card>
        <CardHeader title="Create / Update Plan" sub="Per farm — one plan, auto-advancing calendar" />
        <form onSubmit={createPlan} className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-6">
          <div className="lg:col-span-2">
            <label className="label-caps" htmlFor="tfarm">Farm</label>
            <select id="tfarm" value={targetFarm} onChange={e => setTargetFarm(e.target.value)} className="input-field mt-1.5">
              {farms.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>
          <div className="lg:col-span-2">
            <label className="label-caps" htmlFor="prod">Acaricide product</label>
            <select id="prod" value={form.product} onChange={e => setForm({ ...form, product: e.target.value })} className="input-field mt-1.5">
              {['Amitraz 12.5% EC (Triatix)', 'Cypermethrin 10% EC (Cypertex)', 'Deltamethrin 5% EC', 'Alphacypermethrin 10% SC'].map(p => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="label-caps" htmlFor="int">Cycle (days)</label>
            <input id="int" type="number" min="7" max="28" value={form.interval_days} onChange={e => setForm({ ...form, interval_days: e.target.value })} className="input-field mt-1.5" />
          </div>
          <div>
            <label className="label-caps" htmlFor="ldip">Last dip date</label>
            <input id="ldip" type="date" value={form.last_dip_date} onChange={e => setForm({ ...form, last_dip_date: e.target.value })} className="input-field mt-1.5" />
          </div>
          <div>
            <label className="label-caps" htmlFor="dew">Deworm by</label>
            <input id="dew" type="date" value={form.deworm_next} onChange={e => setForm({ ...form, deworm_next: e.target.value })} className="input-field mt-1.5" />
          </div>
          <div>
            <label className="label-caps" htmlFor="vax">Vaccine by</label>
            <input id="vax" type="date" value={form.vaccine_next} onChange={e => setForm({ ...form, vaccine_next: e.target.value })} className="input-field mt-1.5" />
          </div>
          <div className="sm:col-span-2 lg:col-span-6">
            <label className="label-caps" htmlFor="note">Acaricide rotation note</label>
            <input id="note" value={form.acaricide_note} onChange={e => setForm({ ...form, acaricide_note: e.target.value })} placeholder="e.g. Rotate to Cypermethrin after 6 months to manage amitraz resistance" className="input-field mt-1.5" />
          </div>
          <div className="sm:col-span-2 lg:col-span-6"><Btn type="submit" size="md"><CalendarPlus className="h-4 w-4" />Save plan</Btn></div>
        </form>
      </Card>

      {/* Eclectus — vet advisory box */}
      <div className="grid gap-3 md:grid-cols-3 text-[11.5px] text-stone-600">
        {[
          { icon: AlertTriangle, title: 'Resistance management', body: 'Rotate chemical classes every 2 dips or quarterly — whichever comes first. Amitraz and synthetic pyrethroids are NOT chemically related; rotate between them.' },
          { icon: CheckCircle2, title: 'Correct dip concentration', body: 'Amitraz 12.5%: 1 ml per litre of water. Always measure plunge-dip volume, charge with concentrate, and top-up weekly. Never dip thirsty animals.' },
          { icon: ShieldCheck, title: 'Withdrawal discipline', body: 'Milk withdrawal after pour-on cypermethrin: 0 days. Amitraz pour-on: 2 days. Injectable doramectin: 14 days. Record it in the treatment log every time.' },
        ].map((a, i) => (
          <div key={i} className="rounded-2xl border border-cream-200 bg-white p-4">
            <a.icon className="h-5 w-5 text-pine-700" strokeWidth={1.7} />
            <p className="mt-1.5 text-[12px] font-bold text-pine-950">{a.title}</p>
            <p className="mt-1 leading-snug">{a.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
