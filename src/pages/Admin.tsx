/* ==========================================================================
   Administration — full user management, vet verifications, sponsor approvals,
   immutable audit ledger with filters
   ========================================================================== */
import { useMemo, useState } from 'react';
import { Users, BadgeCheck, Building2, ScrollText, ShieldBan, ShieldCheck, Search, RotateCcw } from 'lucide-react';
import { useStore } from '../lib/store';
import { Card, PageHeader, Button, Avatar, StatusPill } from '../components/ui';
import { roleLabel } from '../components/AppLayout';
import { fmtDateTime, timeAgo } from '../lib/geo';
import type { Role } from '../lib/types';

export default function Admin() {
  const { db, adminVerifyVet, adminApproveAgreement, adminSuspendProfile, resetDemoData, toast } = useStore();
  const [tab, setTab] = useState<'users' | 'queue' | 'audit'>('queue');
  const [roleFilter, setRoleFilter] = useState<'all' | Role>('all');
  const [query, setQuery] = useState('');
  const [auditQuery, setAuditQuery] = useState('');

  const users = useMemo(() => {
    let list = db.profiles;
    if (roleFilter !== 'all') list = list.filter((p) => p.role === roleFilter);
    if (query.trim()) list = list.filter((p) => [p.full_name, p.email, p.phone, p.ward].join(' ').toLowerCase().includes(query.toLowerCase()));
    return list;
  }, [db.profiles, roleFilter, query]);

  const pendingVets = db.vetProfiles.filter((v) => v.verification === 'pending');
  const pendingAgreements = db.agreements.filter((a) => a.status === 'pending');
  const audit = useMemo(() => {
    const q = auditQuery.trim().toLowerCase();
    if (!q) return db.auditLogs.slice(0, 60);
    return db.auditLogs.filter((l) => [l.actor_name, l.action, l.entity, l.entity_id, l.diff].join(' ').toLowerCase().includes(q)).slice(0, 60);
  }, [db.auditLogs, auditQuery]);

  return (
    <div className="max-w-6xl">
      <PageHeader
        title="Platform Administration"
        sub="RBAC control plane — every action here is written to the immutable audit ledger with actor, role, entity and diff."
        actions={<Button variant="outline" size="sm" onClick={resetDemoData}><RotateCcw size={13} /> Reset demo data</Button>}
      />

      <div className="flex gap-1.5 bg-white border border-pine-900/10 rounded-xl p-1 w-fit mb-4 flex-wrap">
        {([['queue', `Verification queue (${pendingVets.length + pendingAgreements.length})`], ['users', `Users (${db.profiles.length})`], ['audit', `Audit ledger (${db.auditLogs.length})`]] as const).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={`h-9 px-4 rounded-lg text-[12px] font-semibold ${tab === k ? 'bg-pine-950 text-maize-300' : 'text-pine-800 hover:bg-pine-50'}`}>{l}</button>
        ))}
      </div>

      {tab === 'queue' && (
        <div className="grid md:grid-cols-2 gap-4">
          <Card className="p-5">
            <div className="font-mono text-[9.5px] uppercase tracking-[0.2em] text-pine-600 mb-3 flex items-center gap-1.5"><BadgeCheck size={12} /> Vet license verification ({pendingVets.length})</div>
            {pendingVets.map((v) => { const p = db.profiles.find((x) => x.id === v.profile_id)!; return (
              <div key={v.profile_id} className="border border-maize-500/40 bg-maize-400/10 rounded-xl p-4 mb-3">
                <div className="flex items-center gap-3"><Avatar initials={p.initials} tone="maize" size="md" /><div><b className="text-[13px] text-pine-950">{p.full_name}</b><div className="font-mono text-[9px] text-pine-700 mt-0.5">{v.license_number} · {v.specialty}</div><div className="font-mono text-[8.5px] text-pine-500">{v.years_experience} yrs · radius {v.service_radius_km} km · rating {v.rating}</div></div></div>
                <div className="mt-3 font-mono text-[8.5px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">KVB registry cross-check pending — license format & standing unverified in this synthetic environment.</div>
                <div className="mt-2.5 flex gap-2"><Button size="sm" onClick={() => adminVerifyVet(v.profile_id, true)}><ShieldCheck size={13} /> Verify & activate</Button><Button size="sm" variant="ghost" className="text-red-700 hover:bg-red-50" onClick={() => adminVerifyVet(v.profile_id, false)}><ShieldBan size={13} /> Reject / suspend</Button></div>
              </div>
            ); })}
            {pendingVets.length === 0 && <p className="text-[12px] text-pine-600 py-6 text-center">Queue clear — all licenses verified.</p>}
          </Card>

          <Card className="p-5">
            <div className="font-mono text-[9.5px] uppercase tracking-[0.2em] text-pine-600 mb-3 flex items-center gap-1.5"><Building2 size={12} /> Sponsor onboarding ({pendingAgreements.length})</div>
            {pendingAgreements.map((a) => (
              <div key={a.id} className="border border-sky-400/40 bg-sky-50 rounded-xl p-4 mb-3">
                <b className="text-[13px] text-pine-950">{a.sponsor_name}</b>
                <div className="font-mono text-[9px] text-pine-700 mt-1">{a.tier} tier · max claim {a.max_claim_kes.toLocaleString()} · cap {a.annual_cap_kes.toLocaleString()}</div>
                <div className="font-mono text-[9px] text-pine-700">Code <b>{a.enrollment_code}</b> · valid {a.starts_on} → {a.ends_on}</div>
                <div className="font-mono text-[8.5px] text-pine-600 mt-1.5">Covers: {a.covered_diagnoses.join(', ')}</div>
                <Button size="sm" variant="dark" className="mt-3" onClick={() => adminApproveAgreement(a.id)}><ShieldCheck size={13} /> Approve onboarding</Button>
              </div>
            ))}
            {pendingAgreements.length === 0 && <p className="text-[12px] text-pine-600 py-6 text-center">Queue clear — all sponsors active.</p>}
          </Card>
        </div>
      )}

      {tab === 'users' && (
        <>
          <div className="flex flex-wrap gap-2 mb-3 items-center">
            <div className="relative flex-1 min-w-[200px] max-w-sm"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-pine-400" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search users…" className="w-full h-10 pl-9 pr-3 rounded-xl border border-pine-200 bg-white text-[12.5px] outline-none" /></div>
            <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value as typeof roleFilter)} className="h-10 px-3 rounded-xl border border-pine-200 bg-white text-[12px] outline-none"><option value="all">All roles</option>{(['farmer', 'vet', 'sponsor', 'authority', 'admin'] as Role[]).map((r) => <option key={r} value={r}>{roleLabel[r]}</option>)}</select>
          </div>
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead><tr className="text-left font-mono text-[9px] uppercase tracking-[0.18em] text-pine-600 border-b border-pine-900/10"><th className="px-4 py-3">User</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Ward</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Action</th></tr></thead>
                <tbody className="divide-y divide-pine-900/8">
                  {users.map((p) => (
                    <tr key={p.id} className="hover:bg-pine-50/60">
                      <td className="px-4 py-2.5"><div className="flex items-center gap-2.5"><Avatar initials={p.initials} tone="slate" size="xs" /><div><div className="font-semibold text-pine-950">{p.full_name}</div><div className="font-mono text-[9px] text-pine-500">{p.email}</div></div></div></td>
                      <td className="px-4 py-2.5"><span className="text-[10px] font-mono uppercase text-pine-800">{roleLabel[p.role]}</span></td>
                      <td className="px-4 py-2.5 text-pine-800">{p.ward}</td>
                      <td className="px-4 py-2.5"><StatusPill status={p.active ? 'active' : 'suspended'} /></td>
                      <td className="px-4 py-2.5 text-right"><Button size="sm" variant={p.active ? 'ghost' : 'primary'} className={p.active ? 'text-red-700 hover:bg-red-50' : ''} onClick={() => adminSuspendProfile(p.id, p.active)}>{p.active ? 'Suspend' : 'Reinstate'}</Button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {tab === 'audit' && (
        <>
          <div className="relative mb-3 max-w-md"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-pine-400" /><input value={auditQuery} onChange={(e) => setAuditQuery(e.target.value)} placeholder="Filter ledger — actor, action, entity, diff…" className="w-full h-10 pl-9 pr-3 rounded-xl border border-pine-200 bg-white text-[12.5px] outline-none" /></div>
          <Card className="p-0 overflow-hidden">
            <div className="px-5 py-2.5 bg-pine-950 text-maize-300 font-mono text-[9px] uppercase tracking-[0.25em] flex items-center gap-2"><ScrollText size={11} /> Immutable audit ledger — append-only · SECURITY DEFINER trigger</div>
            <div className="max-h-[62vh] overflow-y-auto divide-y divide-pine-900/8">
              {audit.map((l) => (
                <div key={l.id} className="px-4 py-2 flex flex-wrap items-baseline gap-x-3 gap-y-0.5 font-mono text-[9.5px]">
                  <span className="text-pine-400 w-24 shrink-0">{fmtDateTime(l.created_at)}</span>
                  <span className="text-maize-700 font-bold w-40 shrink-0">{l.action}</span>
                  <span className="text-pine-800 shrink-0 w-36">{l.entity} · {l.entity_id}</span>
                  <span className="text-pine-600 min-w-0">{l.actor_name} ({l.actor_role}) — {l.diff}</span>
                </div>
              ))}
              {audit.length === 0 && <div className="py-10 text-center text-[12px] text-pine-600">No ledger entries match “{auditQuery}”.</div>}
            </div>
          </Card>
          <p className="mt-2 font-mono text-[8px] text-pine-500 text-right">{db.auditLogs.length} events retained · retention: 7 years · ISO 27001 A.12.4</p>
        </>
      )}
    </div>
  );
}
