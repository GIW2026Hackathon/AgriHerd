import { useNavigate } from 'react-router-dom';
import { Activity, TriangleAlert, PawPrint, Stethoscope, ArrowRight, Siren, Globe, FileBarChart2 } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell } from 'recharts';
import { useStore } from '../../lib/store';
import { Card, SectionTitle, StatCard, StatusPill, Button } from '../../components/ui';
import { GUSII_WARDS } from '../../lib/types';

const DISEASE_COLORS: Record<string, string> = {
  'Foot & Mouth Disease': '#dc2626', 'Lumpy Skin Disease': '#d1930c', 'East Coast Fever': '#7c3aed',
  'Anaplasmosis': '#0284c7', 'Acute Mastitis': '#059669', 'Infectious Bovine Keratoconjunctivitis': '#94a3b8',
  'Blackleg (Clostridium chauvoei)': '#0f172a',
};

export default function AuthorityDashboard() {
  const { db } = useStore();
  const navigate = useNavigate();

  const wardOfFarm = (farmId: string) => db.farms.find((f) => f.id === farmId)?.ward ?? 'Unknown';
  const diseaseByWard = GUSII_WARDS.map((w) => ({
    ward: w.name.replace(' Chache', ' C.').replace('Masaba', 'Mas.'),
    cases: db.cases.filter((c) => wardOfFarm(c.farm_id) === w.name).length,
  }));
  const diseaseMix = Object.entries(
    db.cases.reduce<Record<string, number>>((acc, c) => { acc[c.suspected_dx] = (acc[c.suspected_dx] ?? 0) + 1; return acc; }, {})
  ).map(([name, value]) => ({ name: name.split(' (')[0], value })).sort((a, b) => b.value - a.value);

  const fmd14d = db.cases.filter((c) => c.suspected_dx === 'Foot & Mouth Disease').length;
  const totalCases = db.cases.length;
  const critical = db.alerts.filter((a) => a.active && a.severity === 'critical');
  const activeAlerts = db.alerts.filter((a) => a.active);
  const coverageByWard = GUSII_WARDS.map((w) => ({ ward: w.name, farms: db.farms.filter((f) => f.ward === w.name).length, vets: db.profiles.filter((p) => p.role === 'vet' && p.ward === w.name).length }));

  return (
    <div className="space-y-5">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-950 via-pine-950 to-pine-950 border border-violet-400/20 p-5 sm:p-7">
        <div className="absolute -right-10 -top-10 h-56 w-56 rounded-full bg-violet-600/20 blur-3xl" />
        <div className="relative max-w-2xl">
          <div className="font-mono text-[9px] uppercase tracking-[0.25em] text-violet-300 flex items-center gap-2"><Globe size={11} /> County Surveillance · Kisii & Nyamira Directorates</div>
          <h1 className="mt-1.5 font-display font-semibold text-2xl sm:text-3xl text-violet-50 leading-tight">Anthrax watch board — FMD <span className="text-maize-400">critical</span> in Nyaribari Masaba</h1>
          <p className="mt-1.5 text-[12px] text-violet-100/80">Anonymised, aggregate intelligence. No farmer or vet PII is visible at this tier — per the GLHIS data governance charter.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="maize" size="sm" onClick={() => navigate('/app/surveillance')}><Activity size={14} /> Open full surveillance</Button>
            <Button variant="ghost" size="sm" className="text-violet-100 border border-white/20 hover:bg-white/10" onClick={() => navigate('/app/reports')}><FileBarChart2 size={14} /> Export report</Button>
          </div>
        </div>
      </div>

      {critical.length > 0 && (
        <div className="flex items-center gap-3 bg-red-600 text-white rounded-2xl px-4 py-3">
          <Siren size={19} className="shrink-0" />
          <div className="text-[12px]"><b>OUTBREAK THRESHOLD EXCEEDED</b> — {critical[0].zone}: {critical[0].case_count} FMD cases in 14 days (threshold 3). Ring vaccination and movement control advised.</div>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Total Cases (all wards)" value={totalCases} sub="Rolling program lifetime" icon={<PawPrint size={18} />} accent="sky" />
        <StatCard label="FMD Cases · 14 days" value={fmd14d} sub="Threshold: ≥3 in one ward" icon={<TriangleAlert size={18} />} accent="red" />
        <StatCard label="Active Alerts" value={activeAlerts.length} sub={`${critical.length} critical · ${activeAlerts.length - critical.length} warning/info`} icon={<Activity size={18} />} accent="maize" />
        <StatCard label="Verified Vets" value={db.vetProfiles.filter(v => v.verification === 'verified').length} sub="On-call across 5 wards" icon={<Stethoscope size={18} />} accent="pine" />
      </div>

      <div className="grid xl:grid-cols-5 gap-4">
        <Card className="xl:col-span-3 p-5">
          <SectionTitle eyebrow="Geographic Incidence" title="Cases by ward" right={<button onClick={() => navigate('/app/surveillance')} className="text-[11px] font-bold text-pine-800 flex items-center gap-1">Details <ArrowRight size={12} /></button>} />
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={diseaseByWard} margin={{ left: -14, right: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0efe6" vertical={false} />
                <XAxis dataKey="ward" tick={{ fontSize: 9.5, fill: '#357a58' }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: 'rgba(124,58,237,0.08)' }} contentStyle={{ fontSize: 11, borderRadius: 12 }} />
                <Bar dataKey="cases" fill="#6d28d9" radius={[6, 6, 0, 0]} name="Cases" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="xl:col-span-2 p-5">
          <SectionTitle eyebrow="Disease Mix" title="All recorded cases" />
          <div className="h-52 flex items-center">
            <ResponsiveContainer width="55%" height="100%">
              <PieChart>
                <Pie data={diseaseMix} dataKey="value" innerRadius={46} outerRadius={76} paddingAngle={3}>
                  {diseaseMix.map((d) => <Cell key={d.name} fill={DISEASE_COLORS[d.name] ?? '#438f6d'} />)}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 12 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-1.5">
              {diseaseMix.map((d) => (
                <div key={d.name} className="flex items-center gap-1.5 text-[10.5px]"><span className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ background: DISEASE_COLORS[d.name] ?? '#438f6d' }} /><span className="text-pine-900 truncate">{d.name}</span><b className="ml-auto tabular">{d.value}</b></div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Alerts + service coverage grid */}
      <div className="grid xl:grid-cols-5 gap-4">
        <Card className="xl:col-span-3 p-5">
          <SectionTitle eyebrow="Signal Feed" title="Active outbreak alerts" />
          <div className="space-y-2.5">
            {db.alerts.filter(a => a.active).map((a) => (
              <div key={a.id} className="flex items-start gap-3 border border-pine-900/10 rounded-xl p-3">
                <span className={`mt-1 h-2.5 w-2.5 rounded-full shrink-0 ${a.severity === 'critical' ? 'bg-red-500 pulse-dot' : a.severity === 'warning' ? 'bg-amber-500' : 'bg-sky-500'}`} />
                <div className="min-w-0"><div className="flex items-center gap-2 flex-wrap"><b className="text-[12px] text-pine-950">{a.disease}</b><span className="font-mono text-[9.5px] text-pine-600">{a.zone}</span><StatusPill status={a.severity} /></div><p className="text-[11px] text-pine-800/90 leading-snug mt-1">{a.message}</p></div>
              </div>
            ))}
          </div>
        </Card>
        <Card className="xl:col-span-2 p-5">
          <SectionTitle eyebrow="Access Equity" title="Farms & vets per ward" />
          <table className="w-full text-[11px]">
            <thead><tr className="font-mono text-[8.5px] uppercase tracking-[0.18em] text-pine-600 text-left border-b border-pine-900/10"><th className="pb-1.5">Ward</th><th className="pb-1.5 text-right">Farms</th><th className="pb-1.5 text-right">Vets</th><th className="pb-1.5 text-right">Ratio</th></tr></thead>
            <tbody className="divide-y divide-pine-900/8">
              {coverageByWard.map((w) => (
                <tr key={w.ward}><td className="py-1.5 font-medium text-pine-950">{w.ward}</td><td className="py-1.5 text-right tabular">{w.farms}</td><td className="py-1.5 text-right tabular">{w.vets}</td><td className="py-1.5 text-right tabular font-semibold">{w.vets === 0 ? '—' : (w.farms / w.vets).toFixed(1)}</td></tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 font-mono text-[8.5px] text-pine-500">Ideal ≤ 25 farms per verified vet. Mugirango West is under-served — recruitment dispatched.</p>
        </Card>
      </div>
    </div>
  );
}
