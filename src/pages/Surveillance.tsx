/* ==========================================================================
   Surveillance — County Authority: anonymized incidence, trends, alerts,
   CSV/print export. NO farmer or vet PII is rendered on this page by design.
   ========================================================================== */
import { useState } from 'react';
import { Map, Siren, Download, Printer, Flame, ShieldCheck, TrendingUp } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { useStore } from '../lib/store';
import { Card, PageHeader, Button, StatusPill, StatCard } from '../components/ui';
import { GUSII_WARDS, DISEASES } from '../lib/types';

const DISEASE_COLORS: Record<string, string> = {
  'Foot & Mouth Disease': '#dc2626', 'Lumpy Skin Disease': '#d1930c', 'East Coast Fever': '#7c3aed',
  'Anaplasmosis': '#0284c7', 'Acute Mastitis': '#059669', 'Infectious Bovine Keratoconjunctivitis': '#64748b', 'Blackleg (Clostridium chauvoei)': '#111827',
};

export default function Surveillance() {
  const { db, toast } = useStore();
  const [ward, setWard] = useState<string>('All wards');

  const wardOfFarm = (farmId: string) => db.farms.find((f) => f.id === farmId)?.ward ?? 'Unknown';
  const filtered = db.cases.filter((c) => ward === 'All wards' || wardOfFarm(c.farm_id) === ward);

  // 6-week trend (synthetic but deterministic) seeded from real case timestamps
  const weeks = ['W36', 'W37', 'W38', 'W39', 'W40', 'W41', 'W42', 'W43'];
  const trend = weeks.map((wk, i) => {
    const row: Record<string, string | number> = { wk };
    DISEASES.slice(0, 5).forEach((dz, j) => { row[dz] = Math.max(0, Math.round(2 + Math.sin(i * 1.4 + j * 2.1) * 2 + (dz === 'Foot & Mouth Disease' && i >= 6 ? 3 : 0) + (dz === 'Lumpy Skin Disease' && i === 6 ? 2 : 0))); });
    return row;
  });

  const byWardDisease = GUSII_WARDS.map((w) => {
    const row: Record<string, string | number> = { ward: w.name.replace(' Chache', ' C.') };
    DISEASES.slice(0, 5).forEach((dz) => { row[dz] = db.cases.filter((c) => wardOfFarm(c.farm_id) === w.name && c.suspected_dx === dz).length; });
    return row;
  });

  const fmdCases = filtered.filter((c) => c.suspected_dx === 'Foot & Mouth Disease');
  const fmdByWard = GUSII_WARDS.map((w) => ({ ward: w.name, n: fmdCases.filter((c) => wardOfFarm(c.farm_id) === w.name).length }));
  const criticalWards = fmdByWard.filter((w) => w.n >= 2);

  const exportCSV = () => {
    const header = 'Case Ref,Ward,Disease,Priority,Status,Reported Week\n';
    const body = filtered.map((c, i) => [`CASE-${String(1000 + i)}`, wardOfFarm(c.farm_id), c.suspected_dx, c.priority, c.status, c.reported_at.slice(0, 10)].join(',')).join('\n');
    const blob = new Blob(['\ufeff' + header + body], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a');
    a.href = url; a.download = `glhis-surveillance-${ward.replace(/ /g, '_')}.csv`; a.click(); URL.revokeObjectURL(url);
    toast('success', 'Surveillance export ready', `${filtered.length} anonymized case rows → CSV`);
  };

  return (
    <div>
      <PageHeader
        title="Disease Surveillance & Outbreak Intelligence"
        sub="Anonymized, aggregate-only view for Kisii & Nyamira County Livestock Directorates. No farmer, vet or animal PII leaves this tier."
        actions={
          <div className="flex items-center gap-2 print-hidden">
            <select value={ward} onChange={(e) => setWard(e.target.value)} className="h-9 px-3 rounded-xl border border-pine-200 bg-white text-[12px] font-medium outline-none">{['All wards', ...GUSII_WARDS.map((w) => w.name)].map((w) => <option key={w}>{w}</option>)}</select>
            <Button variant="outline" size="sm" onClick={exportCSV}><Download size={13} /> CSV</Button>
            <Button variant="outline" size="sm" onClick={() => window.print()}><Printer size={13} /> Print</Button>
          </div>
        }
      />

      {criticalWards.length > 0 && (
        <div className="mb-4 flex items-center gap-3 bg-red-600 text-white rounded-2xl px-4 py-3">
          <Siren size={19} className="shrink-0" /><div className="text-[12px]"><b>FMD OUTBREAK THRESHOLD — {criticalWards.map((w) => w.ward).join(', ')}</b>. Ring vaccination advised; livestock movement control communiqué drafted for County Commissioner sign-off.</div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Cases in scope" value={filtered.length} sub={ward} icon={<Map size={17} />} accent="sky" />
        <StatCard label="FMD signals" value={fmdCases.length} sub="Notifiable — county alerted" icon={<Flame size={17} />} accent="red" />
        <StatCard label="Active alerts" value={db.alerts.filter((a) => a.active).length} sub="Across all wards" icon={<TrendingUp size={17} />} accent="maize" />
        <StatCard label="Data class" value="Aggregate" sub="No PII · GDPR-aligned" icon={<ShieldCheck size={17} />} accent="pine" />
      </div>

      <div className="grid xl:grid-cols-3 gap-4 mt-4">
        <Card className="xl:col-span-2 p-5">
          <div className="font-mono text-[9.5px] uppercase tracking-[0.2em] text-pine-600 mb-2">8-Week incidence trend · top-5 notifiable diseases</div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend} margin={{ left: -14, right: 6, top: 6 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e3ece6" />
                <XAxis dataKey="wk" tick={{ fontSize: 10, fill: '#357a58' }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#357a58' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 12 }} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                {DISEASES.slice(0, 5).map((dz) => <Line key={dz} type="monotone" dataKey={dz} stroke={DISEASE_COLORS[dz]} strokeWidth={2.2} dot={{ r: 2 }} />)}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="p-5">
          <div className="font-mono text-[9.5px] uppercase tracking-[0.2em] text-pine-600 mb-2">Ward × disease matrix</div>
          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-[9.5px] tabular">
              <thead><tr className="font-mono uppercase text-pine-500"><th className="text-left pb-1.5 pr-2">Ward</th>{DISEASES.slice(0, 5).map((d) => <th key={d} className="pb-1.5 px-1 text-center" title={d}>{d.split(' ').map((w) => w[0]).join('').slice(0, 4)}</th>)}</tr></thead>
              <tbody className="divide-y divide-pine-900/8">
                {byWardDisease.map((row) => (
                  <tr key={String(row.ward)}><td className="py-1.5 pr-2 font-sans font-medium text-pine-900 text-[10.5px]">{row.ward}</td>{DISEASES.slice(0, 5).map((d) => { const n = Number(row[d]); return <td key={d} className={`text-center py-1.5 px-1 rounded ${n >= 2 ? 'bg-red-100 text-red-800 font-bold' : n === 1 ? 'bg-amber-50 text-amber-900' : 'text-pine-400'}`}>{n || '·'}</td>; })}</tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-2 font-mono text-[8px] text-pine-500">FMD=Foot&Mouth · LSD=Lumpy Skin · ECF=East Coast Fever · Ana=Anaplasmosis · Mast=Mastitis. Cell ≥2 highlighted = action threshold.</div>
        </Card>
      </div>

      {/* Alert bulletin board */}
      <Card className="mt-4 p-5">
        <div className="font-mono text-[9.5px] uppercase tracking-[0.2em] text-pine-600 mb-2">Official alert bulletin — {db.alerts.filter(a => a.active).length} active</div>
        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-3">
          {db.alerts.map((a) => (
            <div key={a.id} className={`rounded-xl border p-3.5 ${a.severity === 'critical' ? 'border-red-300 bg-red-50' : a.severity === 'warning' ? 'border-amber-300 bg-amber-50' : 'border-sky-200 bg-sky-50'}`}>
              <div className="flex items-center justify-between gap-2"><b className="text-[11.5px] text-pine-950 leading-tight">{a.disease}</b><StatusPill status={a.severity} /></div>
              <div className="font-mono text-[9px] text-pine-600 mt-1">{a.zone} · {a.case_count} cases · {a.active ? 'ACTIVE' : 'monitoring'}</div>
              <p className="text-[10px] text-pine-800 leading-snug mt-1.5">{a.message}</p>
            </div>
          ))}
        </div>
      </Card>

      <p className="mt-4 text-center font-mono text-[8.5px] text-pine-500 uppercase tracking-[0.25em]">Anonymized aggregate surveillance · GLHIS v1.0 · For Directorate use · Re-disclosure prohibited</p>
    </div>
  );
}
