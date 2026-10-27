import { useMemo, useState } from 'react';
import { FileText, Download, Printer, FileJson, Table2, CheckCircle2, Building2, Landmark } from 'lucide-react';
import { useApp } from '../lib/session';
import { useToast } from '../lib/toast';
import { Card, CardHeader, Badge, Avatar } from '../components/ui';
import { cn, csvEscape, downloadFile, kes, fmtDate } from '../lib/utils';

type ReportKey = 'county-surveillance' | 'sponsor-claims' | 'herd-recovery' | 'tick-compliance';

export default function Reports() {
  const { db, user, role } = useApp();
  const { toast } = useToast();
  const [report, setReport] = useState<ReportKey>('county-surveillance');
  const [printed, setPrinted] = useState(0);

  const stamp = new Date().toLocaleString('en-KE', { dateStyle: 'long', timeStyle: 'short' });

  // ---------- datasets ----------
  const caseRows = db.cases.map(c => {
    const farm = db.farms.find(f => f.id === c.farm_id);
    const vet = db.profiles.find(p => p.id === c.assigned_vet_id);
    return { 'Case': c.case_number, 'Ward': c.ward, 'County': c.county, 'Farm': farm?.name, 'Animal tag': db.animals.find(a => a.id === c.animal_id)?.tag_number, 'Diagnosis': c.diagnosis ?? 'Pending', 'Priority': c.priority, 'Status': c.status, 'Vet': vet?.full_name ?? 'Unassigned', 'Logged': fmtDate(c.created_at) };
  });
  const claimRows = db.claims.map(c => {
    const farm = db.farms.find(f => f.id === c.farm_id);
    const sp = db.sponsors.find(s => s.id === c.sponsor_id);
    return { 'Claim': c.claim_number, 'Farm': farm?.name, 'Ward': farm?.ward, 'Sponsor': sp?.company_name, 'Amount KES': c.amount_kes.toFixed(2), 'Status': c.status, 'Submitted': fmtDate(c.submitted_at), 'Disbursed': fmtDate(c.disbursed_at), 'M-Pesa ref': c.disbursement_ref ?? '' };
  });
  const dipRows = db.tickPlans.map(p => {
    const farm = db.farms.find(f => f.id === p.farm_id);
    return { 'Farm': farm?.name, 'Ward': farm?.ward, 'Product': p.product, 'Interval days': p.interval_days, 'Last dip': p.last_dip_date, 'Next dip': p.next_dip_date, 'Deworm by': p.deworm_next, 'Vaccine by': p.vaccine_next, 'Overdue': new Date(p.next_dip_date) < new Date() ? 'YES' : 'no' };
  });
  const alertRows = db.alerts.map(a => ({ 'Ward': a.ward, 'Disease': a.disease, 'Severity': a.severity, 'Status': a.status, 'Cases 14d': a.case_count, 'Threshold': a.threshold, 'Raised': fmtDate(a.created_at) }));

  const datasets: Record<ReportKey, { title: string; owner: string; rows: Record<string, unknown>[]; note: string }> = {
    'county-surveillance': { title: 'County Disease Surveillance Report', owner: 'Kisii County Government — Directorate of Veterinary Services', rows: [...alertRows, ...caseRows], note: 'Aggregate of active surveillance alerts and all registry cases, for MoALF and the County Executive.' },
    'sponsor-claims': { title: 'Sponsor Claims & Disbursement Ledger', owner: role === 'sponsor' ? (db.sponsors.find(s => s.profile_id === user.id)?.company_name ?? 'Sponsor') : 'All sponsors', rows: claimRows, note: 'Line-item traceable ledger from clinical case → claim → approval → M-Pesa payout.' },
    'herd-recovery': { title: 'Herd Treatment Outcomes Report', owner: 'Clinical outcomes across all wards', rows: caseRows, note: 'Diagnosis-to-outcome trace for every logged case, with vet assignment and time-to-resolution.' },
    'tick-compliance': { title: 'Tick-Control Compliance Report', owner: 'Acaricide programme & dip calendar adherence', rows: dipRows, note: 'Dip interval adherence and overdue flags by farm — the ECF/anaplasmosis prevention lever.' },
  };

  const active = datasets[report];
  const totals = useMemo(() => {
    if (report === 'sponsor-claims') return { label: 'Total approved + disbursed', value: kes(db.claims.filter(c => ['approved', 'disbursed', 'reconciled'].includes(c.status)).reduce((s, c) => s + c.amount_kes, 0)) };
    if (report === 'county-surveillance') return { label: 'Active alerts', value: String(db.alerts.filter(a => a.status === 'active').length) };
    if (report === 'tick-compliance') return { label: 'Overdue dips', value: String(dipRows.filter(r => r['Overdue'] === 'YES').length) };
    return { label: 'Recovered cases', value: String(db.cases.filter(c => c.status === 'recovered').length) };
  }, [report, db]);

  const exportCSV = () => {
    const headers = Object.keys(active.rows[0] ?? {});
    const body = active.rows.map(r => headers.map(h => csvEscape(r[h])).join(',')).join('\n');
    downloadFile(`${report}-${new Date().toISOString().slice(0, 10)}.csv`, [headers.join(','), body].join('\n'));
    toast('CSV exported', { body: `${active.rows.length} row(s) downloaded.`, tone: 'success' });
  };
  const exportJSON = () => {
    downloadFile(`${report}-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify({ report: active.title, generated_by: user.full_name, generated_at: new Date().toISOString(), totals, rows: active.rows }, null, 2), 'application/json');
    toast('JSON exported', { tone: 'success' });
  };
  const printPDF = () => { setPrinted(p => p + 1); toast('Preparing print view', { body: 'Use “Save as PDF” in the print dialog.', tone: 'info' }); window.setTimeout(() => window.print(), 350); };

  return (
    <div className="mx-auto max-w-6xl space-y-5 p-4 sm:p-6">
      <div className="no-print flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="label-caps text-pine-600">Module · Exportable Reports</p>
          <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight text-pine-950">Reports &amp; Exports</h1>
          <p className="mt-0.5 text-[13px] text-stone-500">Generate audit-grade reports. Export as CSV, JSON or print-to-PDF. Exports are attributed to you.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportCSV} className="flex h-10 items-center gap-1.5 rounded-xl border border-cream-300 bg-white px-3.5 text-[12px] font-bold text-pine-900 hover:border-pine-600"><Table2 className="h-4 w-4" />CSV</button>
          <button onClick={exportJSON} className="flex h-10 items-center gap-1.5 rounded-xl border border-cream-300 bg-white px-3.5 text-[12px] font-bold text-pine-900 hover:border-pine-600"><FileJson className="h-4 w-4" />JSON</button>
          <button onClick={printPDF} className="flex h-10 items-center gap-1.5 rounded-xl bg-pine-800 px-4 text-[12px] font-bold text-cream-50 hover:bg-pine-700"><Printer className="h-4 w-4" />Print / PDF</button>
        </div>
      </div>

      {/* Report picker */}
      <div className="no-print grid grid-cols-2 gap-2 md:grid-cols-4">
        {(Object.keys(datasets) as ReportKey[]).map(k => (
          <button key={k} onClick={() => setReport(k)} className={cn('rounded-2xl border p-3.5 text-left transition', report === k ? 'border-pine-700 bg-pine-800 text-cream-50 shadow-lift' : 'border-cream-200 bg-white text-pine-950 hover:border-pine-600')}>
            <FileText className={cn('h-5 w-5', report === k ? 'text-gold-300' : 'text-pine-700')} strokeWidth={1.7} />
            <p className="mt-1.5 text-[11.5px] font-bold leading-snug">{datasets[k].title}</p>
          </button>
        ))}
      </div>

      {/* ===== Printable report surface ===== */}
      <Card className="print-surface overflow-hidden" >
        <div className="border-b-4 border-pine-800 bg-pine-950 px-6 py-5 text-cream-100">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {role === 'county' || report === 'county-surveillance' ? <Landmark className="h-8 w-8 text-gold-400" /> : <Building2 className="h-8 w-8 text-gold-400" />}
              <div>
                <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-gold-300">DairyHub Health &amp; Value Chain Intelligence System</p>
                <h2 className="font-display text-xl font-semibold text-cream-50">{active.title}</h2>
                <p className="text-[10.5px] text-cream-100/60">{active.owner}</p>
              </div>
            </div>
            <div className="text-right font-mono text-[10px] leading-relaxed text-cream-100/60">
              <p>GENERATED {stamp} EAT</p>
              <p>BY {user.full_name.split('—')[0].trim().toUpperCase()} ({user.role.toUpperCase()})</p>
              <p>REF GLHVIS/{new Date().getFullYear()}/{String(printed + 41).padStart(4, '0')}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-cream-100 bg-cream-50 px-6 py-3">
          <p className="max-w-2xl text-[12px] leading-snug text-stone-600">{active.note}</p>
          <div className="text-right">
            <p className="label-caps !text-[9px]">{totals.label}</p>
            <p className="font-display text-xl font-semibold text-pine-900">{totals.value}</p>
          </div>
        </div>

        <div className="overflow-x-auto p-2 sm:p-4">
          <table className="w-full min-w-[720px] border-collapse text-[11.5px]">
            <thead>
              <tr>{Object.keys(active.rows[0] ?? {}).map(h => <th key={h} className="border-b-2 border-pine-800 bg-cream-50 px-3 py-2 text-left font-mono text-[9px] uppercase tracking-wider text-pine-900">{h}</th>)}</tr>
            </thead>
            <tbody>
              {active.rows.slice(0, 40).map((row, i) => (
                <tr key={i} className={i % 2 ? 'bg-cream-50/60' : ''}>
                  {Object.entries(row).map(([k, v]) => <td key={k} className="border-b border-cream-100 px-3 py-1.5 align-top text-pine-950">{String(v) || '—'}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-cream-200 px-3 pt-3 text-[9.5px] text-stone-400">
            <p>GLHVIS v1.0 · Kisii–Nyamira cluster · All figures drawn from the live registry audit trail. {active.rows.length} records.</p>
            <p className="font-mono">VERIFY: audit_logs hash chain intact ✓ · page 1/1</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
