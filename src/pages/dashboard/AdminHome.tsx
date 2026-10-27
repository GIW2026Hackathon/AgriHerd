import { useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Users, Wheat, PawPrint, Coins, ScrollText, Server, ShieldCheck, ChevronRight,
  Building2, CheckCircle2, Activity, Database,
} from 'lucide-react';
import { useApp } from '../../lib/session';
import { Card, CardHeader, Stat, Badge, Avatar } from '../../components/ui';
import { kes, timeAgo } from '../../lib/utils';

export default function AdminHome() {
  const { db, user, role } = useApp();
  const navigate = useNavigate();

  const roleCounts = useMemo(() => (['farmer', 'vet', 'sponsor', 'county', 'admin'] as const).map((r) => ({ role: r, n: db.profiles.filter(p => p.role === r).length })), [db.profiles]);
  const totalPools = db.pools.reduce((s, p) => s + p.total_kes, 0);
  const totalPaid = db.pools.reduce((s, p) => s + p.disbursed_kes, 0);
  const openCases = db.cases.filter(c => !['recovered', 'closed', 'deceased'].includes(c.status)).length;
  const recentAudit = db.audit.slice(0, 8);

  const tableCounts: [string, number][] = [
    ['profiles', db.profiles.length], ['farms', db.farms.length], ['animals', db.animals.length],
    ['disease_cases', db.cases.length], ['case_events', db.events.length], ['treatments', db.treatments.length],
    ['claims', db.claims.length], ['claim_line_items', db.claimItems.length], ['tick_control_plans', db.tickPlans.length],
    ['ai_screenings', db.screenings.length], ['disease_alerts', db.alerts.length], ['notifications', db.notifications.length],
    ['audit_logs', db.audit.length], ['funding_pools', db.pools.length], ['sponsors', db.sponsors.length],
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-pine-800 bg-gradient-to-br from-pine-900 to-pine-950 px-6 py-5 text-cream-100">
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gold-400 text-pine-950"><ShieldCheck className="h-7 w-7" strokeWidth={1.7} /></span>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-gold-300">Platform Control Plane · v1.0 Pilot</p>
            <h1 className="mt-0.5 font-display text-2xl font-semibold text-cream-50">System Administration</h1>
            <p className="mt-0.5 text-[12px] text-cream-100/70">Kisii-Nyamira cluster · all services operational · last backup 26 Oct 04:00 EAT</p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-2xl border border-emerald-400/40 bg-emerald-500/15 px-4 py-2">
          <span className="relative flex h-2.5 w-2.5"><span className="ping-ring absolute inline-flex h-full w-full rounded-full bg-emerald-400" /><span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" /></span>
          <span className="text-[12px] font-bold text-emerald-300">ALL SYSTEMS OPERATIONAL</span>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Users by role" value={db.profiles.length} icon={<Users className="h-4 w-4" />} sub={roleCounts.map(r => `${r.n} ${r.role}`).join(' · ')} />
        <Stat label="Registry" value={`${db.farms.length} farms`} icon={<Wheat className="h-4 w-4" />} sub={`${db.animals.length} tagged animals`} />
        <Stat label="Open cases" value={openCases} tone="gold" icon={<Activity className="h-4 w-4" />} sub={`${db.alerts.filter(a => a.status === 'active').length} surveillance alerts active`} />
        <Stat label="Sponsor-funded care" value={kes(totalPaid)} tone="blue" icon={<Coins className="h-4 w-4" />} sub={`of ${kes(totalPools)} total pools`} />
      </div>

      <div className="grid gap-5 xl:grid-cols-5">
        {/* Audit stream */}
        <Card className="xl:col-span-3">
          <CardHeader title="Live Audit Stream" sub="Immutable record of every state change — latest 8" action={<Link to="/app/admin/audit" className="flex items-center gap-1 text-[12px] font-semibold text-pine-800">Full log <ChevronRight className="h-4 w-4" /></Link>} />
          <ul className="divide-y divide-cream-100">
            {recentAudit.map((a) => {
              const actor = db.profiles.find(p => p.id === a.actor_id);
              return (
                <li key={a.id} className="flex items-start gap-3 px-4 py-2.5">
                  <Avatar name={actor?.full_name ?? '?'} size={28} className="mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[11.5px] leading-snug"><span className="font-mono font-bold text-pine-900">{a.action}</span> <span className="text-stone-400">on</span> <span className="font-mono text-stone-600">{a.entity_table}</span></p>
                    <p className="text-[10px] text-stone-400">{actor?.full_name?.split('—')[0].trim()} · {a.actor_role} · {timeAgo(a.ts)} · ip {a.ip}</p>
                  </div>
                  <Badge tone={a.actor_role === 'admin' ? 'purple' : a.actor_role === 'sponsor' ? 'gold' : a.actor_role === 'county' ? 'red' : a.actor_role === 'vet' ? 'blue' : 'slate'}>{a.actor_role.toUpperCase()}</Badge>
                </li>
              );
            })}
          </ul>
        </Card>

        {/* Right rail */}
        <div className="space-y-5 xl:col-span-2">
          <Card>
            <CardHeader title="Datastore Health" sub="Row counts per table — coherent relational state" action={<Database className="h-4 w-4 text-stone-400" />} />
            <div className="grid grid-cols-3 gap-1.5 p-4">
              {tableCounts.map(([t, n]) => (
                <div key={t} className="rounded-xl border border-cream-200 bg-cream-50 px-2 py-2 text-center">
                  <p className="font-mono text-[15px] font-bold text-pine-900">{n}</p>
                  <p className="truncate text-[8.5px] font-semibold uppercase tracking-wide text-stone-500" title={t}>{t.replace(/_/g, ' ')}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader title="Quick Actions" />
            <div className="grid grid-cols-2 gap-2 p-4">
              {[
                { label: 'Manage users & RBAC', icon: Users, to: '/app/admin/users' },
                { label: 'Sponsors & pools', icon: Building2, to: '/app/admin/reports' },
                { label: 'Audit log (full)', icon: ScrollText, to: '/app/admin/audit' },
                { label: 'Case registry', icon: Activity, to: '/app/admin/cases' },
                { label: 'Animal registry', icon: PawPrint, to: '/app/admin/registry' },
                { label: 'Claims pipeline', icon: Coins, to: '/app/admin/claims' },
              ].map((q) => (
                <button key={q.label} onClick={() => navigate(q.to)} className="flex items-center gap-2 rounded-xl border border-cream-200 bg-white p-3 text-left text-[11.5px] font-semibold leading-tight text-pine-900 hover:border-pine-600 hover:shadow-card"><q.icon className="h-5 w-5 shrink-0 text-pine-700" strokeWidth={1.7} />{q.label}</button>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Sponsors org table */}
      <Card>
        <CardHeader title="Sponsor Organizations" sub="Registered sponsors and funding pool positions" action={<Server className="h-4 w-4 text-stone-400" />} />
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-cream-200 bg-cream-50">
              <tr>{['Sponsor', 'Reg. No', 'Pools', 'Pool value', 'Disbursed', 'Linked farmers', 'Utilization'].map(h => <th key={h} className="px-4 py-2.5 text-left text-[10.5px] font-bold uppercase tracking-wider text-stone-500">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-cream-100">
              {db.sponsors.map((s) => {
                const pools = db.pools.filter(p => p.sponsor_id === s.id);
                const members = db.sponsorMembers.filter(m => m.sponsor_id === s.id);
                const val = pools.reduce((a, p) => a + p.total_kes, 0);
                const paid = pools.reduce((a, p) => a + p.disbursed_kes, 0);
                return (
                  <tr key={s.id} className="hover:bg-pine-50/40">
                    <td className="px-4 py-3"><p className="text-[13px] font-bold text-pine-950">{s.company_name}</p><p className="text-[10.5px] text-stone-500">{s.contact_email}</p></td>
                    <td className="px-4 py-3 font-mono text-[11px] text-stone-600">{s.co_op_reg_no ?? '—'}</td>
                    <td className="px-4 py-3 text-[12px] font-semibold">{pools.length}</td>
                    <td className="px-4 py-3 text-[12px] font-semibold">{kes(val)}</td>
                    <td className="px-4 py-3 text-[12px] font-semibold text-pine-800">{kes(paid)}</td>
                    <td className="px-4 py-3 text-[12px] font-semibold">{members.length}</td>
                    <td className="px-4 py-3"><div className="h-2 w-28 overflow-hidden rounded-full bg-cream-200"><div className="h-full rounded-full bg-pine-700" style={{ width: `${val > 0 ? (paid / val) * 100 : 0}%` }} /></div><span className="mt-0.5 block text-[9.5px] text-stone-500">{val > 0 ? Math.round((paid / val) * 100) : 0}% paid out</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
