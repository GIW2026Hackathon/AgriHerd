import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Radar, AlertOctagon, AlertTriangle, MapPinned, Download, FileText, ArrowRight,
  CheckCircle2, ShieldAlert, ListFilter,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import { useApp } from '../../lib/session';
import { WARDS } from '../../lib/wards';
import { useToast } from '../../lib/toast';
import { Card, CardHeader, Stat, Badge, severityTone } from '../../components/ui';
import { cn, timeAgo, downloadFile, csvEscape, fmtDate } from '../../lib/utils';
import type { DiseaseAlert } from '../../lib/types';

export default function CountyHome() {
  const { db, user, client, tick } = useApp();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [countyFilter, setCountyFilter] = useState<'Kisii' | 'Nyamira'>('Kisii');

  const alerts = useMemo(() => client.alertsAll(), [client, db.alerts]);
  const active = alerts.filter(a => a.status === 'active');
  const acked = alerts.filter(a => a.status === 'acknowledged');
  const critical = active.filter(a => a.severity === 'critical');
  const totalCases = db.cases.length;

  // 14-day cases by ward (from case records)
  const wardCounts = useMemo(() => {
    const m = new Map<string, number>();
    db.cases.forEach((c) => m.set(c.ward, (m.get(c.ward) ?? 0) + 1));
    return m;
  }, [db.cases]);
  const topWards = [...wardCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([ward, n]) => ({ ward: ward.split('/')[0].slice(0, 16), n }));

  const countyWards = WARDS.filter(w => w.county === countyFilter);
  const maxWardCount = Math.max(1, ...countyWards.map(w => wardCounts.get(w.name) ?? 0));

  const exportAlert = (a: DiseaseAlert) => {
    const lines = [
      'field,value',
      `alert_id,${a.id}`, `county,${a.county}`, `ward,${a.ward}`, `disease,${a.disease}`,
      `severity,${a.severity}`, `status,${a.status}`, `case_count_14d,${a.case_count}`, `threshold,${a.threshold}`,
      `window_start,${fmtDate(a.window_start)}`, `summary,"${a.summary.replace(/"/g, '""')}"`,
      `generated_by,${csvEscape(user.full_name)}`, `generated_at,${new Date().toISOString()}`,
    ];
    downloadFile(`alert-${a.disease.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-${a.ward.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.csv`, lines.join('\n'));
    toast('Alert exported', { body: 'CSV alert dossier downloaded.', tone: 'success' });
  };

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-pine-800 bg-gradient-to-br from-pine-900 to-pine-950 px-6 py-5 text-cream-100">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-gold-300">National Surveillance Integration · DVS/MoALF</p>
          <h1 className="mt-0.5 font-display text-2xl font-semibold text-cream-50">Disease Surveillance &amp; Early Warning</h1>
          <p className="mt-0.5 text-[12px] text-cream-100/70">65 wards · 14-day rolling window · threshold-triggered alerting · {fmtDate(new Date().toISOString())}</p>
        </div>
        <button onClick={() => navigate('/app/county/reports')} className="group flex h-11 items-center gap-2 rounded-2xl bg-gold-400 px-5 text-[13px] font-bold text-pine-950 hover:bg-gold-300">
          <FileText className="h-5 w-5" /> County report <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
        </button>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Active alerts" value={active.length} tone={active.length ? 'red' : 'pine'} icon={<AlertOctagon className="h-4 w-4" />} sub={`${critical.length} critical · ${active.length - critical.length} watch/alert`} />
        <Stat label="Wards above threshold" value={new Set(active.map(a => a.ward)).size} tone="gold" icon={<MapPinned className="h-4 w-4" />} sub="Rolling 14-day window" />
        <Stat label="Cases (registry)" value={totalCases} tone="blue" icon={<Radar className="h-4 w-4" />} sub="Total logged, all wards & statuses" />
        <Stat label="Acknowledged / resolved" value={acked.length + alerts.filter(a => a.status === 'resolved').length} tone="pine" icon={<CheckCircle2 className="h-4 w-4" />} sub="With audit trail entries" />
      </div>

      {/* Critical banner */}
      {critical.length > 0 && (
        <div className="rounded-2xl border-2 border-red-500/60 bg-red-50 p-4">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-red-700" />
            <p className="text-[13px] font-bold text-red-900">ACTION REQUIRED — {critical.length} critical alert{critical.length > 1 ? 's' : ''} pending acknowledgement</p>
          </div>
          <div className="mt-2 grid gap-2 lg:grid-cols-2">
            {critical.map((a) => (
              <div key={a.id} className="rounded-xl border border-red-300 bg-white px-4 py-2.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[12px] font-bold text-red-900">{a.disease} — {a.ward}</p>
                  <Badge tone="red">{a.case_count} CASES / 14d</Badge>
                </div>
                <p className="mt-1 text-[11px] leading-snug text-red-800/80">{a.summary.slice(0, 150)}…</p>
                <div className="mt-2 flex items-center gap-2">
                  <button onClick={() => { client.acknowledgeAlert(user, a.id, 'acknowledged'); tick(); toast('Alert acknowledged', { body: `${a.ward} — ${a.disease} marked acknowledged. Audit entry written.`, tone: 'warning' }); }} className="h-8 rounded-lg bg-red-700 px-3 text-[11px] font-bold text-white hover:bg-red-800">Acknowledge</button>
                  <button onClick={() => exportAlert(a)} className="flex h-8 items-center gap-1 rounded-lg border border-red-300 px-3 text-[11px] font-semibold text-red-800 hover:bg-red-100"><Download className="h-3.5 w-3.5" /> Dossier</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-5">
        {/* Ward heatmap */}
        <Card className="xl:col-span-3">
          <CardHeader title="Ward Case Density" sub="14-day cases per ward — hover intensity key" action={
            <div className="flex rounded-lg border border-cream-300 bg-cream-50 p-0.5 text-[11px] font-semibold">
              {(['Kisii', 'Nyamira'] as const).map((c) => (
                <button key={c} onClick={() => setCountyFilter(c)} className={cn('rounded-md px-3 py-1.5 transition', countyFilter === c ? 'bg-pine-800 text-cream-50' : 'text-pine-900')}>{c}</button>
              ))}
            </div>
          } />
          <div className="max-h-[430px] overflow-y-auto p-4 scrollbar-thin">
            <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4 lg:grid-cols-5">
              {countyWards.map((w) => {
                const n = wardCounts.get(w.name) ?? 0;
                const t = n / maxWardCount;
                const bg = n === 0 ? 'bg-cream-100 text-stone-400 border-cream-200'
                  : t < 0.34 ? 'bg-amber-100 text-amber-900 border-amber-300'
                  : t < 0.67 ? 'bg-orange-200 text-orange-900 border-orange-400'
                  : 'bg-red-300 text-red-950 border-red-500';
                return (
                  <div key={w.name} title={`${w.sub_county} · ${n} case${n === 1 ? '' : 's'}`} className={cn('rounded-xl border px-2.5 py-2 text-center transition', bg)}>
                    <p className="truncate text-[9.5px] font-bold leading-tight">{w.name}</p>
                    <p className="mt-0.5 font-mono text-[15px] font-bold leading-none">{n}</p>
                    <p className="mt-0.5 text-[8px] uppercase tracking-wide opacity-70">{w.elevation_m}m</p>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-3 text-[10px] font-semibold text-stone-500">
              <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded border border-cream-200 bg-cream-100" />0 cases</span>
              <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded border border-amber-300 bg-amber-100" />Low</span>
              <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded border border-orange-400 bg-orange-200" />Elevated</span>
              <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded border border-red-500 bg-red-300" />Hotspot</span>
            </div>
          </div>
        </Card>

        {/* Right column */}
        <div className="space-y-5 xl:col-span-2">
          <Card>
            <CardHeader title="Top Affected Wards" sub="Case volume, 14-day window" />
            <div className="h-44 px-2 pb-4 pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topWards} layout="vertical" margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e9e5d3" horizontal={false} />
                  <XAxis type="number" hide domain={[0, 'dataMax + 1']} />
                  <YAxis type="category" dataKey="ward" width={110} tick={{ fontSize: 10, fill: '#57534e' }} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: '#f4f1e4' }} contentStyle={{ borderRadius: 12, border: '1px solid #e9e5d3', fontSize: 12 }} />
                  <Bar dataKey="n" name="Cases" radius={[0, 6, 6, 0]} maxBarSize={18}>
                    {topWards.map((e, i) => <Cell key={i} fill={i < 2 ? '#b91c1c' : i < 4 ? '#d97706' : '#1c5740'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* All alerts list */}
          <Card>
            <CardHeader title="All Watches & Alerts" sub="Newest first" action={<ListFilter className="h-4 w-4 text-stone-400" />} />
            <ul className="max-h-80 divide-y divide-cream-100 overflow-y-auto">
              {alerts.map((a) => (
                <li key={a.id} className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className={cn('h-4 w-4 shrink-0', a.severity === 'critical' ? 'text-red-600' : a.severity === 'alert' ? 'text-orange-600' : 'text-amber-600')} />
                    <p className="min-w-0 flex-1 truncate text-[12px] font-semibold text-pine-950">{a.disease}</p>
                    <Badge tone={severityTone(a.severity)}>{a.severity.toUpperCase()}</Badge>
                    <Badge tone={a.status === 'resolved' ? 'green' : a.status === 'acknowledged' ? 'blue' : a.status === 'contained' ? 'amber' : 'slate'}>{a.status.toUpperCase()}</Badge>
                  </div>
                  <p className="mt-1 pl-6 text-[10.5px] text-stone-500">{a.ward} · {a.case_count}/{a.threshold} threshold · {timeAgo(a.created_at)}</p>
                  <div className="mt-1.5 flex items-center gap-2 pl-6">
                    {a.status === 'active' && <button onClick={() => { client.acknowledgeAlert(user, a.id, 'acknowledged'); tick(); toast('Acknowledged', { body: `${a.ward} acknowledged — audit entry written.`, tone: 'warning' }); }} className="text-[10.5px] font-bold text-pine-800 underline hover:text-pine-600">Acknowledge</button>}
                    {a.status === 'acknowledged' && <button onClick={() => { client.acknowledgeAlert(user, a.id, 'contained'); tick(); toast('Containment logged', { tone: 'info' }); }} className="text-[10.5px] font-bold text-pine-800 underline hover:text-pine-600">Mark contained</button>}
                    {a.status === 'contained' && <button onClick={() => { client.acknowledgeAlert(user, a.id, 'resolved'); tick(); toast('Alert resolved', { tone: 'success' }); }} className="text-[10.5px] font-bold text-pine-800 underline hover:text-pine-600">Resolve</button>}
                    <button onClick={() => exportAlert(a)} className="text-[10.5px] font-semibold text-stone-500 hover:text-pine-800">Export CSV</button>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
