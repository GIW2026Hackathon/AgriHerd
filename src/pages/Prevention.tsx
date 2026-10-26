/* ==========================================================================
   Prevention — Tick-control plans, vaccination schedule, herd health planning
   ========================================================================== */
import { Syringe, CalendarClock, CheckCircle2, TriangleAlert, Droplets, ClipboardList } from 'lucide-react';
import { useStore } from '../lib/store';
import { Card, PageHeader, Button, StatusPill } from '../components/ui';
import { fmtDate } from '../lib/geo';

export default function Prevention() {
  const { db, currentUser, markVaccinationComplete, updateTickCompliance } = useStore();
  const me = currentUser!;
  const isFarmer = me.role === 'farmer';
  const myFarms = isFarmer ? db.farms.filter((f) => f.farmer_id === me.id) : db.farms;
  const myFarmIds = new Set(myFarms.map((f) => f.id));
  const myAnimalIds = new Set(db.animals.filter((a) => myFarmIds.has(a.farm_id)).map((a) => a.id));
  const vaccinations = db.vaccinations.filter((v) => (isFarmer ? myAnimalIds.has(v.animal_id) : true));
  const tickPlans = db.tickPlans.filter((t) => (isFarmer ? myFarmIds.has(t.farm_id) : true));
  const overdue = vaccinations.filter((v) => v.status === 'overdue');
  const upcoming = vaccinations.filter((v) => v.status === 'scheduled');
  const complete = vaccinations.filter((v) => v.status === 'complete');

  return (
    <div className="max-w-6xl">
      <PageHeader
        title="Prevention & Herd Health Planning"
        sub="Tick-control calendars with acaricide rotation, vaccination schedules with automatic overdue escalation — prevention is cheaper than a claim."
      />

      {overdue.length > 0 && (
        <div className="mb-4 flex items-center gap-3 bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
          <TriangleAlert size={18} className="text-red-600 shrink-0" /><div className="text-[12px] text-red-900"><b>{overdue.length} overdue vaccination{overdue.length > 1 ? 's' : ''}</b> — {overdue.map((v) => db.animals.find((a) => a.id === v.animal_id)?.name ?? 'animal').join(', ')}. Book a visit or mark administered below.</div>
        </div>
      )}

      <div className="grid lg:grid-cols-5 gap-4">
        {/* ============ VACCINATION SCHEDULE ============ */}
        <Card className="lg:col-span-3 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="font-mono text-[9.5px] uppercase tracking-[0.2em] text-pine-600 flex items-center gap-1.5"><Syringe size={12} /> Vaccination schedule · {vaccinations.length} records</div>
            <div className="font-mono text-[9px] text-pine-500">{overdue.length} overdue · {upcoming.length} upcoming · {complete.length} done</div>
          </div>
          <div className="divide-y divide-pine-900/8">
            {vaccinations.map((v) => {
              const a = db.animals.find((x) => x.id === v.animal_id)!;
              const f = db.farms.find((x) => x.id === a.farm_id);
              return (
                <div key={v.id} className="py-2.5 flex items-center gap-3">
                  <span className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${v.status === 'overdue' ? 'bg-red-100 text-red-600' : v.status === 'complete' ? 'bg-emerald-100 text-emerald-700' : 'bg-sky-100 text-sky-700'}`}><Syringe size={16} /></span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[12px] font-semibold text-pine-950">{v.vaccine}</div>
                    <div className="text-[10px] text-pine-700">{a.name} · {a.tag_number}{f ? ` · ${f.name}` : ''} · due <b>{fmtDate(v.due_date)}</b></div>
                  </div>
                  <StatusPill status={v.status} />
                  {v.status !== 'complete' && <Button size="sm" variant="outline" onClick={() => markVaccinationComplete(v.id)}><CheckCircle2 size={12} /> Done</Button>}
                </div>
              );
            })}
            {vaccinations.length === 0 && <div className="py-8 text-center text-[12px] text-pine-600">No vaccination records yet for {isFarmer ? 'your herd' : 'any farm'}.</div>}
          </div>
        </Card>

        {/* ============ TICK CONTROL ============ */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="p-5">
            <div className="font-mono text-[9.5px] uppercase tracking-[0.2em] text-pine-600 mb-3 flex items-center gap-1.5"><Droplets size={12} /> Tick-control program</div>
            {tickPlans.map((t) => {
              const f = db.farms.find((x) => x.id === t.farm_id)!;
              return (
                <div key={t.id} className="border border-pine-900/10 rounded-xl p-4 mb-2.5 last:mb-0">
                  <div className="flex items-center justify-between gap-2">
                    <b className="text-[12px] text-pine-950">{f.name}</b>
                    <span className="font-mono text-[9px] bg-sky-100 text-sky-900 rounded-md px-2 py-0.5">Dipping {t.dipping_day}</span>
                  </div>
                  <div className="mt-1.5 text-[10.5px] text-pine-800">{t.acaricide}</div>
                  <div className="mt-1 font-mono text-[9px] text-pine-600 flex items-center gap-1"><CalendarClock size={9} /> Next due: {fmtDate(t.next_due)}</div>
                  <div className="mt-2 flex items-center gap-2">
                    <input type="range" min={0} max={100} value={t.compliance_pct} onChange={(e) => updateTickCompliance(t.id, Number(e.target.value))} className="flex-1 accent-pine-700 h-1.5" aria-label="Compliance" />
                    <span className="font-mono text-[11px] font-bold text-pine-900 tabular w-9">{t.compliance_pct}%</span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-pine-100 overflow-hidden"><div className={`h-full ${t.compliance_pct >= 85 ? 'bg-emerald-500' : t.compliance_pct >= 70 ? 'bg-amber-400' : 'bg-red-500'}`} style={{ width: `${t.compliance_pct}%` }} /></div>
                  <div className="mt-1 font-mono text-[8px] text-pine-500">Target ≥85% on-time dippings. Slide to log this month's compliance.</div>
                </div>
              );
            })}
            {tickPlans.length === 0 && <p className="text-[12px] text-pine-600">No tick plan — register a farm to generate one.</p>}
          </Card>

          <Card className="p-5">
            <div className="font-mono text-[9.5px] uppercase tracking-[0.2em] text-pine-600 mb-2 flex items-center gap-1.5"><ClipboardList size={12} /> Herd-health calendar</div>
            <ul className="text-[11px] text-pine-900 space-y-1.5 leading-snug">
              <li className="flex gap-2"><span className="font-mono text-maize-600 font-bold">TUE</span> Dipping day — Riabai (flumethrin rotation)</li>
              <li className="flex gap-2"><span className="font-mono text-maize-600 font-bold">30 Oct</span> FMD booster due — KES-RBM-001 & KES-GEB-001 (overdue)</li>
              <li className="flex gap-2"><span className="font-mono text-maize-600 font-bold">02 Nov</span> CMT subclinical scan — all lactating cows</li>
              <li className="flex gap-2"><span className="font-mono text-maize-600 font-bold">09 Nov</span> BCS & hoof check — with Dr. Chacha (routine)</li>
              <li className="flex gap-2"><span className="font-mono text-maize-600 font-bold">15 Nov</span> LSD vaccine — KES-RBM-002</li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
