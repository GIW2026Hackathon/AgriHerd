/* Enrollments — sponsor membership roster with benefit utilization */
import { Users, Download, BadgeCheck, Search } from 'lucide-react';
import { useState } from 'react';
import { useStore } from '../lib/store';
import { Card, PageHeader, Avatar } from '../components/ui';
import { formatKES, fmtDate } from '../lib/geo';

export default function Enrollments() {
  const { db, currentUser, toast } = useStore();
  const me = currentUser!;
  const myAgreements = db.agreements.filter((a) => a.sponsor_profile_id === me.id);
  const agreementIds = new Set(myAgreements.map((a) => a.id));
  const [query, setQuery] = useState('');
  const enrollments = db.enrollments.filter((e) => agreementIds.has(e.agreement_id));
  const cap = myAgreements[0]?.annual_cap_kes ?? 60000;

  const q = query.trim().toLowerCase();
  const rows = enrollments.map((e) => ({ e, farmer: db.profiles.find((p) => p.id === e.farmer_profile_id)!, agreement: db.agreements.find((a) => a.id === e.agreement_id)! })).filter(({ farmer }) => !q || [farmer.full_name, farmer.ward, farmer.phone].join(' ').toLowerCase().includes(q));

  const exportCSV = () => {
    const header = 'Farmer,Ward,Phone,Agreement,Enrolled,Used KES,Remaining KES,% of Cap\n';
    const body = rows.map(({ e, farmer, agreement }) => [farmer.full_name, farmer.ward, farmer.phone, agreement.sponsor_name, fmtDate(e.enrolled_at), e.used_to_date_kes, Math.max(0, cap - e.used_to_date_kes), ((e.used_to_date_kes / cap) * 100).toFixed(1) + '%'].join(',')).join('\n');
    const blob = new Blob(['\ufeff' + header + body], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a');
    a.href = url; a.download = 'glhis-enrolled-farmers.csv'; a.click(); URL.revokeObjectURL(url);
    toast('success', 'Roster exported', `${rows.length} enrolled farmers → CSV`);
  };

  return (
    <div className="max-w-6xl">
      <PageHeader
        title="Enrolled Farmers"
        sub="Benefit utilization per member — caps are debited automatically when claims are approved."
        actions={<button onClick={exportCSV} className="inline-flex items-center gap-1.5 h-9 px-4 rounded-xl border border-pine-200 bg-white text-[12px] font-bold text-pine-900 hover:bg-pine-50"><Download size={13} /> Export CSV</button>}
      />
      <div className="relative mb-4 max-w-md">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-pine-400" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search member, ward or phone…" className="w-full h-10 pl-9 pr-4 rounded-xl border border-pine-200 bg-white text-[12.5px] outline-none focus:ring-2 focus:ring-pine-500/40" />
      </div>
      <Card className="overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-3 border-b border-pine-900/10 font-mono text-[9.5px] uppercase tracking-[0.2em] text-pine-600"><Users size={13} /> {rows.length} members · pooled utilization tracked per claim approval</div>
        <div className="overflow-x-auto">
          <table className="w-full text-[11.5px]">
            <thead><tr className="text-left font-mono text-[9px] uppercase tracking-[0.18em] text-pine-600 border-b border-pine-900/10"><th className="px-5 py-2.5">Member</th><th className="px-5 py-2.5">Ward</th><th className="px-5 py-2.5">Enrolled</th><th className="px-5 py-2.5 w-56">Annual cap used</th><th className="px-5 py-2.5 text-right">Remaining</th></tr></thead>
            <tbody className="divide-y divide-pine-900/8">
              {rows.map(({ e, farmer, agreement }) => {
                const pct = Math.min(100, (e.used_to_date_kes / cap) * 100);
                return (
                  <tr key={e.id} className="hover:bg-pine-50/60">
                    <td className="px-5 py-3"><div className="flex items-center gap-2.5"><Avatar initials={farmer.initials} tone="pine" size="xs" /><div><div className="font-semibold text-pine-950">{farmer.full_name}</div><div className="font-mono text-[9px] text-pine-500 flex items-center gap-1"><BadgeCheck size={8} />{farmer.phone}</div></div></div></td>
                    <td className="px-5 py-3 text-pine-800">{farmer.ward}</td>
                    <td className="px-5 py-3 text-pine-800">{fmtDate(e.enrolled_at)}</td>
                    <td className="px-5 py-3"><div className="flex items-center gap-2"><div className="flex-1 h-2 rounded-full bg-pine-100 overflow-hidden"><div className="h-full bg-maize-500" style={{ width: `${pct}%` }} /></div><span className="font-mono text-[9.5px] tabular text-pine-800 w-16 text-right">{formatKES(e.used_to_date_kes)}</span></div></td>
                    <td className="px-5 py-3 text-right font-semibold tabular text-pine-950">{formatKES(Math.max(0, cap - e.used_to_date_kes))}</td>
                  </tr>
                );
              })}
              {rows.length === 0 && <tr><td colSpan={5} className="px-5 py-10 text-center text-pine-600">No members match.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
