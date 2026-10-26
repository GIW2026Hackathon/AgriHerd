/* ==========================================================================
   Reports — role-scoped, print-optimized + CSV export
   ========================================================================== */
import { FileBarChart2, Download, Printer, ShieldCheck } from 'lucide-react';
import { useStore } from '../lib/store';
import { Card, PageHeader, Button, StatusPill } from '../components/ui';
import { roleLabel } from '../components/AppLayout';
import { formatKES, fmtDate, fmtDateTime } from '../lib/geo';

function downloadCSV(filename: string, rows: (string | number)[][]) {
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\r\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url);
}

export default function Reports() {
  const { db, currentUser, toast, coverageFor } = useStore();
  const me = currentUser!;
  const isFarmer = me.role === 'farmer';
  const isVet = me.role === 'vet';
  const isSponsor = me.role === 'sponsor';
  const isAuthority = me.role === 'authority';
  const isAdmin = me.role === 'admin';

  const myFarms = db.farms.filter((f) => f.farmer_id === me.id);
  const myFarmIds = new Set(myFarms.map((f) => f.id));
  const scopedCases = db.cases.filter((c) => isFarmer ? c.farmer_id === me.id : isVet ? c.vet_id === me.id : isSponsor ? c.sponsor_id === me.id : true);
  const scopedClaims = db.claims.filter((cl) => {
    if (isAdmin || isAuthority) return true;
    const c = db.cases.find((x) => x.id === cl.case_id);
    if (isFarmer) return c?.farmer_id === me.id;
    if (isVet) return cl.vet_id === me.id;
    return cl.sponsor_id === me.id;
  });
  const scopedAnimals = db.animals.filter((a) => isAdmin || isAuthority ? true : myFarmIds.has(a.farm_id));
  const cov = isFarmer ? coverageFor(me.id) : null;

  const totalPaid = scopedClaims.filter((c) => c.status === 'paid').reduce((s, c) => s + c.amount_kes, 0);
  const totalClaimed = scopedClaims.reduce((s, c) => s + c.amount_kes, 0);
  const resolvedCases = scopedCases.filter((c) => c.resolved_at).length;
  const avgResolutionDays = resolvedCases
    ? (scopedCases.filter((c) => c.resolved_at).reduce((s, c) => s + (+new Date(c.resolved_at!) - +new Date(c.reported_at)) / 86400000, 0) / resolvedCases).toFixed(1)
    : '—';

  const exportCases = () => {
    downloadCSV('glhis-cases.csv', [['Case No', 'Animal', 'Diagnosis', 'Priority', 'Status', 'Urgency', 'Reported', 'Resolved'], ...scopedCases.map((c) => {
      const a = db.animals.find((x) => x.id === c.animal_id);
      return [c.case_number, a ? `${a.name} (${a.tag_number})` : '—', c.suspected_dx, c.priority, c.status, c.triage_urgency, fmtDate(c.reported_at), c.resolved_at ? fmtDate(c.resolved_at) : '—'];
    })]);
    toast('success', 'Case register exported', `${scopedCases.length} rows → glhis-cases.csv`);
  };
  const exportClaims = () => {
    downloadCSV('glhis-claims.csv', [['Claim No', 'Case', 'Amount KES', 'Status', 'Submitted', 'Decided', 'Services'], ...scopedClaims.map((cl) => {
      const c = db.cases.find((x) => x.id === cl.case_id);
      return [cl.claim_number, c?.case_number ?? '—', cl.amount_kes, cl.status, fmtDateTime(cl.submitted_at), cl.decided_at ? fmtDateTime(cl.decided_at) : '—', cl.services];
    })]);
    toast('success', 'Claims ledger exported', `${scopedClaims.length} rows → glhis-claims.csv`);
  };
  const exportHerd = () => {
    downloadCSV('glhis-herd-register.csv', [['Tag', 'Name', 'Species', 'Breed', 'Sex', 'DOB', 'Weight kg', 'Status', 'Farm'], ...scopedAnimals.map((a) => {
      const f = db.farms.find((x) => x.id === a.farm_id);
      return [a.tag_number, a.name, a.species, a.breed, a.sex, a.dob, a.weight_kg, a.status, f?.name ?? '—'];
    })]);
    toast('success', 'Herd register exported', `${scopedAnimals.length} rows → glhis-herd-register.csv`);
  };

  return (
    <div className="max-w-5xl">
      <PageHeader
        title="Reports & Exports"
        sub={`Scoped to your role (${roleLabel[me.role]}). CSV opens in Excel/Sheets; print view is formatted for Directorate submission on A4.`}
        actions={<Button variant="outline" size="sm" onClick={() => window.print()}><Printer size={13} /> Print report</Button>}
      />

      {/* Printable document */}
      <Card className="p-6 sm:p-8">
        <div className="flex items-start justify-between border-b-2 border-pine-950 pb-4">
          <div className="flex items-center gap-3">
            <svg viewBox="0 0 64 64" className="h-12 w-12"><rect width="64" height="64" rx="14" fill="#0f231b"/><path d="M14 40c6-14 14-20 24-20 6 0 11 2 14 6-3-1-6 0-7 4 4 1 6 5 6 9-5-2-9 0-11 5l-2-6c-6 3-14 4-24 2z" fill="#f6c945"/></svg>
            <div>
              <div className="font-display font-semibold text-lg text-pine-950">GLHIS — Field Report</div>
              <div className="font-mono text-[8.5px] uppercase tracking-[0.2em] text-pine-600">Gusii Livestock Health & Value Chain Intelligence System</div>
            </div>
          </div>
          <div className="text-right font-mono text-[9px] text-pine-700">
            <div>Generated: {fmtDateTime(new Date().toISOString())}</div>
            <div>Role scope: {roleLabel[me.role]}</div>
            <div>Classification: {isAuthority ? 'OFFICIAL — RESTRICTED' : 'INTERNAL'}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 my-5">
          {[
            ['Cases in scope', String(scopedCases.length)],
            ['Resolved', String(resolvedCases)],
            ['Avg resolution', `${avgResolutionDays} days`],
            ['Claims settled', formatKES(totalPaid)],
          ].map(([k, v]) => (
            <div key={k} className="border border-pine-900/15 rounded-xl px-3 py-2.5"><div className="font-mono text-[8px] uppercase tracking-[0.2em] text-pine-600">{k}</div><div className="font-display font-semibold text-lg text-pine-950 mt-0.5">{v}</div></div>
          ))}
        </div>

        {isFarmer && cov?.covered && cov.agreement && (
          <div className="mb-5">
            <SectionMini title="Sponsor entitlement snapshot" />
            <table className="w-full text-[11.5px] border border-pine-900/15 rounded-xl"><tbody>
              {[['Sponsor', cov.agreement.sponsor_name], ['Tier', cov.agreement.tier], ['Max claim', formatKES(cov.maxClaim)], ['Annual cap', formatKES(cov.agreement.annual_cap_kes)], ['Used to date', formatKES(cov.enrollment?.used_to_date_kes ?? 0)], ['Remaining', formatKES(cov.remainingAnnual)]].map(([k, v]) => <tr key={k} className="border-b border-pine-900/10 last:border-0"><td className="px-3 py-1.5 font-mono text-[9.5px] uppercase text-pine-600 w-40">{k}</td><td className="px-3 py-1.5 font-semibold text-pine-950">{v}</td></tr>)}
            </tbody></table>
          </div>
        )}

        <SectionMini title="Case register" />
        <div className="overflow-x-auto">
          <table className="w-full text-[10px] border border-pine-900/15">
            <thead><tr className="bg-pine-950 text-maize-300 font-mono uppercase text-[8px] tracking-[0.15em]">{['Case', 'Diagnosis', 'Priority', 'Status', 'Urgency', 'Reported'].map((h) => <th key={h} className="px-2.5 py-2 text-left">{h}</th>)}</tr></thead>
            <tbody>{scopedCases.map((c) => <tr key={c.id} className="border-b border-pine-900/10 even:bg-pine-50/60"><td className="px-2.5 py-1.5 font-mono">{c.case_number}</td><td className="px-2.5 py-1.5">{c.suspected_dx}</td><td className="px-2.5 py-1.5">{c.priority}</td><td className="px-2.5 py-1.5">{c.status.replace(/_/g, ' ')}</td><td className="px-2.5 py-1.5 tabular">{c.triage_urgency}</td><td className="px-2.5 py-1.5">{fmtDate(c.reported_at)}</td></tr>)}</tbody>
          </table>
        </div>

        <SectionMini title="Claims ledger" extra="mt-5" />
        <div className="overflow-x-auto">
          <table className="w-full text-[10px] border border-pine-900/15">
            <thead><tr className="bg-pine-950 text-maize-300 font-mono uppercase text-[8px] tracking-[0.15em]">{['Claim', 'Case', 'Amount', 'Status', 'Submitted'].map((h) => <th key={h} className="px-2.5 py-2 text-left">{h}</th>)}</tr></thead>
            <tbody>{scopedClaims.map((cl) => { const c = db.cases.find((x) => x.id === cl.case_id); return <tr key={cl.id} className="border-b border-pine-900/10 even:bg-pine-50/60"><td className="px-2.5 py-1.5 font-mono">{cl.claim_number}</td><td className="px-2.5 py-1.5 font-mono">{c?.case_number}</td><td className="px-2.5 py-1.5 tabular font-semibold">{formatKES(cl.amount_kes)}</td><td className="px-2.5 py-1.5">{cl.status}</td><td className="px-2.5 py-1.5">{fmtDate(cl.submitted_at)}</td></tr>; })}</tbody>
          </table>
        </div>
        <p className="mt-6 pt-3 border-t border-pine-900/15 font-mono text-[7.5px] text-pine-500 uppercase tracking-[0.2em] text-center">GLHIS v1.0 · Kisii & Nyamira · Generated from synthetic demonstration dataset · Not for external re-disclosure</p>
      </Card>

      {/* Export actions */}
      <div className="grid sm:grid-cols-3 gap-3 mt-4 print-hidden">
        {[
          { label: 'Case register CSV', sub: `${scopedCases.length} cases · all statuses`, fn: exportCases },
          { label: 'Claims ledger CSV', sub: `${scopedClaims.length} claims · ${formatKES(totalClaimed)} total`, fn: exportClaims },
          { label: 'Herd register CSV', sub: `${scopedAnimals.length} tagged animals`, fn: exportHerd },
        ].map((x) => (
          <button key={x.label} onClick={x.fn} className="group bg-white border border-pine-900/10 hover:border-pine-500 rounded-2xl p-4 text-left transition-all hover:shadow-md">
            <Download size={18} className="text-pine-700 group-hover:translate-y-0.5 transition-transform" />
            <div className="mt-2 text-[12.5px] font-bold text-pine-950">{x.label}</div>
            <div className="text-[10.5px] text-pine-600">{x.sub}</div>
          </button>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-2 font-mono text-[9px] text-pine-600"><ShieldCheck size={11} /> Exports contain only data your role may access (RLS-equivalent scoping). Authority exports omit all PII.</div>
      <FileBarChart2 className="hidden" />
    </div>
  );
}

function SectionMini({ title, extra }: { title: string; extra?: string }) {
  return <h3 className={`font-mono text-[9px] uppercase tracking-[0.22em] text-pine-700 font-bold mb-1.5 ${extra ?? ''}`}>{title}</h3>;
}
