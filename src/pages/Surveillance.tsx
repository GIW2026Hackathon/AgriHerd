import { useMemo, useState } from 'react';
import { Radar, AlertTriangle, MapPin, Syringe, CalendarDays, CheckCircle2, Circle, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../lib/session';
import { useToast } from '../lib/toast';
import { Card, CardHeader, Badge, EmptyState } from '../components/ui';
import { cn, timeAgo } from '../lib/utils';
import { WARDS } from '../lib/wards';

/** Surveillance — deep-linked alert workbench for county/admin (vets see read view) */
export default function Surveillance() {
  const { db, user, role, client, tick } = useApp();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'acknowledged' | 'contained' | 'resolved'>('all');

  const alerts = useMemo(() => client.alertsAll().filter(a => statusFilter === 'all' || a.status === statusFilter), [client, db.alerts, statusFilter]);
  const LSD = db.cases.filter(c => (c.diagnosis ?? '').includes('Lumpy'));
  const hotWards = useMemo(() => {
    const m = new Map<string, number>();
    db.cases.forEach(c => m.set(c.ward, (m.get(c.ward) ?? 0) + 1));
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [db.cases]);

  if (role !== 'county' && role !== 'admin' && role !== 'vet') {
    return <div className="mx-auto max-w-lg p-10 text-center"><p className="font-display text-xl font-semibold text-pine-950">County &amp; admin access only</p><button onClick={() => navigate(`/app/${role}`)} className="mt-4 h-10 rounded-xl bg-pine-800 px-5 text-sm font-bold text-cream-50">Back to dashboard</button></div>;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5 p-4 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="label-caps text-pine-600">Module · Early Warning</p>
          <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight text-pine-950">Surveillance Workbench</h1>
          <p className="mt-0.5 max-w-xl text-[13px] text-stone-500">Ward-level aggregation of every case logged through GLHVIS against disease-specific thresholds. Acknowledge → contain → resolve. All actions are audit-logged.</p>
        </div>
        <div className="flex items-center gap-1 rounded-xl border border-cream-300 bg-white p-1">
          {(['all', 'active', 'acknowledged', 'contained', 'resolved'] as const).map(s => (
            <button key={s} onClick={() => setStatusFilter(s)} className={cn('h-8 rounded-lg px-3 text-[11px] font-bold capitalize transition', statusFilter === s ? 'bg-pine-800 text-cream-50' : 'text-stone-500')}>{s}</button>
          ))}
        </div>
      </div>

      {/* ECF / LSD notifiable incidents */}
      <Card className="border-red-300">
        <CardHeader title="Notifiable-Disease Watchlist" sub="Active clusters involving notifiable/zoonotic disease — linked directly to cases" action={<Badge tone="red">{LSD.length + 1} SUSPECTS</Badge>} />
        <div className="grid gap-2 p-4 md:grid-cols-2">
          {db.cases.filter(c => ['FS-2041', 'FS-2033'].includes(c.case_number)).map(c => {
            const farm = db.farms.find(f => f.id === c.farm_id);
            return (
              <button key={c.id} onClick={() => navigate(`/app/${role}/cases/${c.id}`)} className="rounded-xl border border-red-200 bg-red-50/60 p-3 text-left transition hover:border-red-400">
                <p className="font-mono text-[11px] font-bold text-red-900">{c.case_number} · {c.ward}</p>
                <p className="mt-0.5 text-[12px] font-semibold text-pine-950">{c.diagnosis}</p>
                <p className="text-[10.5px] text-stone-500">{farm?.name} · {timeAgo(c.created_at)} · priority {c.priority.toUpperCase()}</p>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Hot wards */}
      <Card>
        <CardHeader title="Hottest Wards (14 days)" sub="Ranked by case volume across the registry" />
        <div className="flex flex-wrap gap-2 p-4">
          {hotWards.map(([ward, n]) => (
            <div key={ward} className="flex items-center gap-2 rounded-xl border border-orange-300 bg-orange-50 px-3 py-2">
              <MapPin className="h-4 w-4 text-orange-700" />
              <div><p className="text-[12px] font-bold leading-none text-orange-900">{ward}</p><p className="mt-0.5 font-mono text-[9px] uppercase text-orange-700/80">{n} cases</p></div>
            </div>
          ))}
        </div>
      </Card>

      {/* Full alert table */}
      <Card>
        <CardHeader title="Alert Register" sub={`${alerts.length} record(s)`} />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead className="border-b border-cream-200 bg-cream-50">
              <tr>{['Severity', 'Disease / Ward', 'Cases vs threshold', 'Status', 'Age', 'Action'].map(h => <th key={h} className="px-4 py-2.5 text-left text-[10.5px] font-bold uppercase tracking-wider text-stone-500">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-cream-100">
              {alerts.map(a => (
                <tr key={a.id} className="align-top hover:bg-pine-50/40">
                  <td className="px-4 py-3"><Badge tone={a.severity === 'critical' ? 'red' : a.severity === 'alert' ? 'gold' : a.severity === 'watch' ? 'amber' : 'blue'}>{a.severity.toUpperCase()}</Badge></td>
                  <td className="max-w-[280px] px-4 py-3"><p className="text-[12.5px] font-semibold leading-snug text-pine-950">{a.disease}</p><p className="mt-0.5 text-[10.5px] text-stone-500">{a.ward}, {a.county}</p></td>
                  <td className="px-4 py-3 font-mono text-[12px] font-bold text-pine-900">{a.case_count}<span className="text-stone-400"> / {a.threshold}</span></td>
                  <td className="px-4 py-3"><Badge tone={a.status === 'resolved' ? 'green' : a.status === 'acknowledged' ? 'blue' : a.status === 'contained' ? 'amber' : 'slate'}>{a.status.toUpperCase()}</Badge></td>
                  <td className="px-4 py-3 font-mono text-[11px] text-stone-500">{timeAgo(a.created_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {a.status === 'active' && <button onClick={() => { client.acknowledgeAlert(user, a.id, 'acknowledged'); tick(); toast('Acknowledged', { tone: 'warning' }); }} className="text-[11px] font-bold text-pine-800 hover:underline">Ack</button>}
                      {a.status === 'acknowledged' && <button onClick={() => { client.acknowledgeAlert(user, a.id, 'contained'); tick(); toast('Containment logged', { tone: 'info' }); }} className="text-[11px] font-bold text-pine-800 hover:underline">Contain</button>}
                      {a.status === 'contained' && <button onClick={() => { client.acknowledgeAlert(user, a.id, 'resolved'); tick(); toast('Resolved', { tone: 'success' }); }} className="text-[11px] font-bold text-pine-800 hover:underline">Resolve</button>}
                      {a.status === 'resolved' && <CheckCircle2 className="h-4 w-4 text-pine-700" />}
                    </div>
                  </td>
                </tr>
              ))}
              {alerts.length === 0 && <tr><td colSpan={6}><EmptyState icon={<Radar className="h-7 w-7" />} title="No alerts in this filter" /></td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
