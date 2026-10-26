import { Link, useNavigate } from 'react-router-dom';
import { Users, BadgeCheck, ShieldAlert, ScrollText, ArrowRight, Building2, Activity, Database } from 'lucide-react';
import { useStore } from '../../lib/store';
import { Card, SectionTitle, StatCard, StatusPill, Avatar, Button } from '../../components/ui';
import { timeAgo } from '../../lib/geo';

export default function AdminDashboard() {
  const { db, adminVerifyVet, adminApproveAgreement, payClaim } = useStore();
  const navigate = useNavigate();

  const pendingVets = db.vetProfiles.filter((v) => v.verification === 'pending');
  const pendingAgreements = db.agreements.filter((a) => a.status === 'pending');
  const activeUsers = db.profiles.filter((p) => p.active).length;
  const suspended = db.profiles.filter((p) => !p.active);
  const recentAudit = db.auditLogs.slice(0, 8);
  const paidTotal = db.claims.filter((c) => c.status === 'paid').reduce((s, c) => s + c.amount_kes, 0);

  return (
    <div className="space-y-5">
      <div className="relative overflow-hidden rounded-2xl border border-red-900/30 bg-gradient-to-br from-[#2a0e0e] via-pine-950 to-pine-950 p-5 sm:p-7">
        <div className="absolute -right-10 -top-10 h-56 w-56 rounded-full bg-red-600/15 blur-3xl" />
        <div className="relative max-w-2xl">
          <div className="font-mono text-[9px] uppercase tracking-[0.25em] text-red-300 flex items-center gap-2"><ShieldAlert size={11} /> Root Administration · All roles visible</div>
          <h1 className="mt-1.5 font-display font-semibold text-2xl sm:text-3xl text-red-50 leading-tight">System control & integrity</h1>
          <p className="mt-1.5 text-[12px] text-red-100/75">Verifications, sponsor onboarding, account suspension and the immutable audit ledger. Every action you take here is itself audited.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="maize" size="sm" onClick={() => navigate('/app/admin')}><Users size={14} /> Open admin console</Button>
            <Button variant="ghost" size="sm" className="text-red-100 border border-white/20 hover:bg-white/10" onClick={() => navigate('/app/docs')}><Database size={14} /> Schema & RLS</Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Active Accounts" value={activeUsers} sub={`${suspended.length} suspended`} icon={<Users size={18} />} accent="pine" />
        <StatCard label="Pending Vet Verifications" value={pendingVets.length} sub={pendingVets[0] ? db.profiles.find(p => p.id === pendingVets[0].profile_id)?.full_name : 'Queue clear'} icon={<BadgeCheck size={18} />} accent="maize" />
        <StatCard label="Sponsor Approvals" value={pendingAgreements.length} sub={pendingAgreements[0]?.sponsor_name ?? 'Queue clear'} icon={<Building2 size={18} />} accent="sky" />
        <StatCard label="Audit Events (30d)" value={db.auditLogs.length} sub={`KES ${paidTotal.toLocaleString()} settled program-wide`} icon={<Activity size={18} />} accent="red" />
      </div>

      <div className="grid xl:grid-cols-2 gap-4">
        {/* Pending verifications */}
        <Card className="p-5">
          <SectionTitle eyebrow="Trust & Safety" title="Vet verification queue" />
          {pendingVets.length === 0 ? <p className="text-[12px] text-pine-700 py-6 text-center">All vet licenses verified. 🎉</p> : pendingVets.map((v) => {
            const p = db.profiles.find((x) => x.id === v.profile_id)!;
            return (
              <div key={v.profile_id} className="flex items-center gap-3 border border-maize-500/40 bg-maize-400/10 rounded-xl p-3.5">
                <Avatar initials={p.initials} tone="maize" size="md" />
                <div className="min-w-0 flex-1">
                  <div className="text-[12.5px] font-bold text-pine-950">{p.full_name}</div>
                  <div className="font-mono text-[9.5px] text-pine-700 mt-0.5">{v.license_number} · {v.specialty} · {v.years_experience} yrs</div>
                  <div className="font-mono text-[9px] text-pine-500 mt-0.5">Rating {v.rating} · {v.cases_completed} prior cases · radius {v.service_radius_km} km</div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Button size="sm" variant="primary" onClick={() => adminVerifyVet(v.profile_id, true)}>Verify</Button>
                  <Button size="sm" variant="ghost" className="text-red-700 hover:bg-red-50" onClick={() => adminVerifyVet(v.profile_id, false)}>Suspend</Button>
                </div>
              </div>
            );
          })}
          {pendingAgreements.map((a) => (
            <div key={a.id} className="mt-2.5 flex items-center gap-3 border border-sky-400/40 bg-sky-50 rounded-xl p-3.5">
              <Avatar initials="NG" tone="blue" size="md" />
              <div className="min-w-0 flex-1">
                <div className="text-[12.5px] font-bold text-pine-950">{a.sponsor_name}</div>
                <div className="font-mono text-[9.5px] text-pine-700 mt-0.5">{a.tier} tier · cap KES {a.annual_cap_kes.toLocaleString()} · code {a.enrollment_code}</div>
              </div>
              <Button size="sm" variant="dark" onClick={() => adminApproveAgreement(a.id)}>Approve</Button>
            </div>
          ))}
        </Card>

        {/* Audit ledger */}
        <Card className="p-5">
          <SectionTitle eyebrow="Immutable Ledger" title="Recent audit events" right={<Link to="/app/admin" className="text-[11px] font-bold text-pine-800 flex items-center gap-1">Full log <ArrowRight size={12} /></Link>} />
          <div className="divide-y divide-pine-900/8 font-mono text-[10px]">
            {recentAudit.map((l) => (
              <div key={l.id} className="py-2 flex items-start gap-2">
                <span className="text-pine-400 whitespace-nowrap">{timeAgo(l.created_at)}</span>
                <span className="min-w-0"><b className="text-pine-950">{l.action}</b> <span className="text-pine-600">· {l.entity} {l.entity_id}</span><br /><span className="text-pine-700/75">{l.actor_name} ({l.actor_role})</span></span>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-2 text-[9px] font-mono text-pine-500 border-t border-pine-900/10 pt-2.5"><ScrollText size={11} /> Written by Postgres SECURITY DEFINER trigger · users cannot edit or delete</div>
        </Card>
      </div>
    </div>
  );
}
