import { useEffect, useMemo, useState } from 'react';
import { ScrollText, Search, Download, ShieldCheck, Fingerprint, Filter } from 'lucide-react';
import { useApp } from '../lib/session';
import { useToast } from '../lib/toast';
import { Card, CardHeader, Badge, Avatar, EmptyState } from '../components/ui';
import { cn, csvEscape, downloadFile, timeAgo } from '../lib/utils';
import type { Role } from '../lib/types';

export default function Audit() {
  const { db, user, role } = useApp();
  const { toast } = useToast();
  const [q, setQ] = useState('');
  const [roleFilter, setRoleFilter] = useState<Role | 'all'>('all');
  const [actionFilter, setActionFilter] = useState<string>('all');

  const rows = useMemo(() => {
    let list = db.audit;
    // county role: county-scoped visibility (their own actions + county-entity actions)
    if (role === 'county') list = list.filter(a => a.actor_role === 'county' || a.actor_role === 'admin' || a.entity_table === 'disease_alerts' || a.entity_table === 'disease_cases');
    if (roleFilter !== 'all') list = list.filter(a => a.actor_role === roleFilter);
    if (actionFilter !== 'all') list = list.filter(a => a.action.startsWith(actionFilter));
    if (q.trim()) {
      const needle = q.toLowerCase();
      list = list.filter(a => [a.action, a.entity_table, a.entity_id, JSON.stringify(a.after ?? {}), db.profiles.find(p => p.id === a.actor_id)?.full_name ?? ''].join(' ').toLowerCase().includes(needle));
    }
    return list;
  }, [db.audit, db.profiles, q, roleFilter, actionFilter, role]);

  const actionGroups = useMemo(() => [...new Set(db.audit.map(a => a.action.split('.')[0]))].sort(), [db.audit]);

  const exportCSV = () => {
    const headers = ['id', 'ts', 'actor', 'actor_role', 'action', 'entity_table', 'entity_id', 'before', 'after', 'ip'];
    const body = rows.map(a => [a.id, a.ts, db.profiles.find(p => p.id === a.actor_id)?.full_name ?? a.actor_id, a.actor_role, a.action, a.entity_table, a.entity_id, JSON.stringify(a.before ?? {}), JSON.stringify(a.after ?? {}), a.ip].map(csvEscape).join(',')).join('\n');
    downloadFile(`audit-log-${new Date().toISOString().slice(0, 10)}.csv`, [headers.join(','), body].join('\n'));
    toast('Audit log exported', { body: `${rows.length} entr${rows.length === 1 ? 'y' : 'ies'} — attribution included.`, tone: 'success' });
  };

  if (role !== 'admin' && role !== 'county') {
    return <div className="mx-auto max-w-lg p-10 text-center"><p className="font-display text-xl font-semibold text-pine-950">Restricted</p><p className="mt-2 text-sm text-stone-500">The audit log is visible to platform administrators and county authorities only.</p></div>;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5 p-4 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="label-caps text-pine-600">Security · Immutable Audit Trail</p>
          <h1 className="mt-1 flex items-center gap-2 font-display text-2xl font-semibold tracking-tight text-pine-950"><Fingerprint className="h-6 w-6 text-pine-800" />Audit Log</h1>
          <p className="mt-0.5 max-w-xl text-[13px] text-stone-500">Append-only. Every create / state-change / disbursement / role edit is recorded with actor, role, before→after diff and IP. Backed by a Postgres trigger that rejects UPDATE and DELETE.</p>
        </div>
        <button onClick={exportCSV} className="flex h-10 items-center gap-1.5 rounded-xl bg-pine-800 px-4 text-[12.5px] font-bold text-cream-50 hover:bg-pine-700"><Download className="h-4 w-4" />Export CSV ({rows.length})</button>
      </div>

      <Card>
        <CardHeader title="Query the Trail" action={
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative"><Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Search action, entity, actor…" className="input-field h-9 w-44 pl-8 !text-[12px] sm:w-60" aria-label="Search audit log" /></div>
            <select value={roleFilter} onChange={e => setRoleFilter(e.target.value as Role | 'all')} className="input-field h-9 w-auto !text-[12px]" aria-label="Filter by actor role">
              <option value="all">All roles</option>
              {(['farmer', 'vet', 'sponsor', 'county', 'admin'] as Role[]).map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <select value={actionFilter} onChange={e => setActionFilter(e.target.value)} className="input-field h-9 w-auto !text-[12px]" aria-label="Filter by action type">
              <option value="all">All action types</option>
              {actionGroups.map(g => <option key={g} value={g}>{g}.*</option>)}
            </select>
          </div>
        } />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px]">
            <thead className="border-b border-cream-200 bg-cream-50">
              <tr>{['Timestamp', 'Actor', 'Action', 'Entity', 'Before → After', 'IP'].map(h => <th key={h} className="px-4 py-2.5 text-left text-[10.5px] font-bold uppercase tracking-wider text-stone-500">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-cream-100">
              {rows.map(a => {
                const actor = db.profiles.find(p => p.id === a.actor_id);
                const after = a.after ? Object.entries(a.after).slice(0, 3) : [];
                return (
                  <tr key={a.id} className="align-top hover:bg-pine-50/40">
                    <td className="whitespace-nowrap px-4 py-2.5 font-mono text-[10.5px] text-stone-500">{new Date(a.ts).toLocaleString('en-KE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit' })}</td>
                    <td className="px-4 py-2.5"><div className="flex items-center gap-1.5"><Avatar name={actor?.full_name ?? '?'} size={22} /><div><p className="max-w-[150px] truncate text-[11px] font-semibold text-pine-950">{actor?.full_name?.split('—')[0].trim()}</p><p className="font-mono text-[8.5px] uppercase text-stone-400">{a.actor_role}</p></div></div></td>
                    <td className="px-4 py-2.5"><span className="rounded-md bg-pine-50 px-1.5 py-0.5 font-mono text-[10px] font-bold text-pine-900">{a.action}</span></td>
                    <td className="px-4 py-2.5 font-mono text-[10px] text-stone-500">{a.entity_table}<br /><span className="text-stone-400">#{String(a.entity_id).slice(0, 12)}</span></td>
                    <td className="max-w-[280px] px-4 py-2.5"><span className="font-mono text-[10px] leading-snug text-stone-600">{after.map(([k, v]) => `${k}=${typeof v === 'object' ? JSON.stringify(v) : String(v)?.slice(0, 32)}`).join(' · ') || (a.before ? 'state change' : '—')}</span></td>
                    <td className="px-4 py-2.5 font-mono text-[10px] text-stone-400">{a.ip}</td>
                  </tr>
                );
              })}
              {rows.length === 0 && <tr><td colSpan={6}><EmptyState icon={<ScrollText className="h-7 w-7" />} title="No audit entries match" body="Adjust your search or filters." /></td></tr>}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-cream-100 bg-cream-50/60 px-4 py-2.5">
          <p className="flex items-center gap-1.5 text-[10px] font-semibold text-stone-500"><ShieldCheck className="h-4 w-4 text-pine-700" />Append-only · UPDATE/DELETE revoked · trigger: audit_logs_append_only</p>
          <p className="font-mono text-[9.5px] uppercase text-stone-400">{rows.length} of {db.audit.length} entries</p>
        </div>
      </Card>
    </div>
  );
}
