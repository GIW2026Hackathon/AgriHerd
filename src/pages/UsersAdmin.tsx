import { useState } from 'react';
import { Users, ShieldCheck, KeyRound, AlertTriangle, ChevronDown, Check } from 'lucide-react';
import { useApp } from '../lib/session';
import { useToast } from '../lib/toast';
import { Card, CardHeader, Badge, Avatar } from '../components/ui';
import { cn } from '../lib/utils';
import type { Role } from '../lib/types';

const ROLES: { role: Role; label: string; scope: string }[] = [
  { role: 'farmer', label: 'Farmer', scope: 'Own farms & animals · create/read own cases & claims' },
  { role: 'vet', label: 'Veterinary Officer', scope: 'Assigned caseload · treatment log · claim recommendations (no approve power)' },
  { role: 'sponsor', label: 'Sponsor / Co-op', scope: 'Linked farmers · pools · claims approval/rejection/disbursement' },
  { role: 'county', label: 'County Authority', scope: 'Read-all surveillance & reports · alert acknowledgement · read-only claims' },
  { role: 'admin', label: 'Platform Admin', scope: 'Full access · RBAC management · pools · audit trail' },
];

const PERMISSIONS: Record<string, Record<Role, string>> = {
  'Farms & registry': { farmer: 'CRUD own', vet: 'Read linked', sponsor: 'Read linked', county: 'Read all', admin: 'Full' },
  'Animals': { farmer: 'CRUD own', vet: 'Read/Write linked', sponsor: 'Read linked', county: 'Read all', admin: 'Full' },
  'Disease cases': { farmer: 'Create/Read own', vet: 'Read/Update assigned', sponsor: 'Read linked', county: 'Read all', admin: 'Full' },
  'Claims': { farmer: 'Create + read own', vet: 'Recommend only', sponsor: 'Approve / Reject / Disburse', county: 'Read-only', admin: 'Full' },
  'Tick plans': { farmer: 'CRUD own', vet: 'Update linked', sponsor: 'Read linked', county: 'Read all', admin: 'Full' },
  'Surveillance alerts': { farmer: 'Read (own ward)', vet: 'Read + ack', sponsor: 'Read linked', county: 'Create / Ack / Resolve', admin: 'Full' },
  'Reports': { farmer: '—', vet: 'Own caseload', sponsor: 'Own portfolio', county: 'County-wide + export', admin: 'All + export' },
  'Audit log': { farmer: '—', vet: '—', sponsor: '—', county: 'County-scope read', admin: 'Full read' },
  'User management': { farmer: 'Self profile', vet: 'Self profile', sponsor: 'Self + member list', county: 'Self + ward directory', admin: 'Full RBAC' },
};

export default function UsersAdmin() {
  const { db, user, role, client, tick } = useApp();
  const { toast } = useToast();
  const [openUser, setOpenUser] = useState<string | null>(null);

  if (role !== 'admin') {
    return <div className="mx-auto max-w-lg p-10 text-center"><p className="font-display text-xl font-semibold text-pine-950">Administrators only</p><p className="mt-2 text-sm text-stone-500">RBAC management is restricted to platform administrators.</p></div>;
  }

  const changeRole = (profileId: string, newRole: Role) => {
    client.updateProfileRole(user, profileId, newRole);
    tick();
    toast('Role updated', { body: 'Change written to audit log. The user’s navigation and data scope re-derive on next sign-in/refresh.', tone: 'info' });
  };

  return (
    <div className="mx-auto max-w-6xl space-y-5 p-4 sm:p-6">
      <div>
        <p className="label-caps text-pine-600">Security · Role-Based Access Control</p>
        <h1 className="mt-1 flex items-center gap-2 font-display text-2xl font-semibold tracking-tight text-pine-950"><KeyRound className="h-6 w-6 text-pine-800" />Users &amp; RBAC</h1>
        <p className="mt-0.5 max-w-2xl text-[13px] text-stone-500">Live role assignments. Every role change is audit-logged (rbac.role_changed) before the next query runs — data scoping re-derives from this table.</p>
      </div>

      <div className="grid gap-5 xl:grid-cols-5">
        {/* User table */}
        <Card className="xl:col-span-3">
          <CardHeader title={`Directory — ${db.profiles.length} accounts`} sub="Click a row to inspect & re-assign role" />
          <ul className="divide-y divide-cream-100">
            {db.profiles.map(p => (
              <li key={p.id}>
                <button onClick={() => setOpenUser(openUser === p.id ? null : p.id)} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-pine-50/50" aria-expanded={openUser === p.id}>
                  <Avatar name={p.full_name} size={38} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-bold text-pine-950">{p.full_name}</p>
                    <p className="truncate font-mono text-[10px] text-stone-500">{p.national_id} · {p.ward ?? p.county}{p.organization ? ` · ${p.organization}` : ''}</p>
                  </div>
                  <Badge tone={{ farmer: 'green', vet: 'blue', sponsor: 'gold', county: 'red', admin: 'purple' }[p.role] as 'green'} className="shrink-0">{p.role.toUpperCase()}</Badge>
                  <ChevronDown className={cn('h-4 w-4 shrink-0 text-stone-400 transition-transform', openUser === p.id && 'rotate-180')} />
                </button>
                {openUser === p.id && (
                  <div className="border-t border-cream-100 bg-cream-50/70 px-4 py-3">
                    <p className="label-caps !text-[9px]">Re-assign role</p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {ROLES.map(r => (
                        <button key={r.role} onClick={() => changeRole(p.id, r.role)} title={r.scope} className={cn('flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-[11px] font-bold transition', p.role === r.role ? 'border-pine-700 bg-pine-800 text-cream-50' : 'border-cream-300 bg-white text-pine-900 hover:border-pine-600')}>
                          {p.role === r.role && <Check className="h-3.5 w-3.5" />}{r.label}
                        </button>
                      ))}
                    </div>
                    <p className="mt-2 text-[10px] leading-snug text-stone-400">Changing roles remaps this user's nav, visible data scope, and RLS predicates on next load. Downgrading an admin cannot lock out the last admin — a confirmation is enforced at the database layer in production.</p>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </Card>

        {/* Permission matrix */}
        <Card className="xl:col-span-2 self-start">
          <CardHeader title="Permission Matrix" sub="Resource × role — mirrored in schema.sql RLS policies" />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[430px] text-[10px]">
              <thead><tr className="border-b border-cream-200 bg-cream-50"><th className="px-3 py-2 text-left font-bold uppercase tracking-wider text-stone-500">Resource</th>{ROLES.map(r => <th key={r.role} className="px-2 py-2 text-center font-bold uppercase tracking-wider text-stone-500">{r.role.slice(0, 4)}</th>)}</tr></thead>
              <tbody className="divide-y divide-cream-100">
                {Object.entries(PERMISSIONS).map(([resource, perms]) => (
                  <tr key={resource}>
                    <td className="px-3 py-2 font-semibold text-pine-950">{resource}</td>
                    {ROLES.map(r => <td key={r.role} className="px-2 py-2 text-center font-medium text-stone-600">{perms[r.role]}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="flex items-start gap-1.5 border-t border-cream-100 bg-amber-50/60 px-4 py-2.5 text-[10px] leading-snug text-amber-900"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />Demo environment — role changes here exercise the RBAC engine end-to-end but reset to seed on “Reset demo dataset”.</p>
        </Card>
      </div>
    </div>
  );
}
