import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList, Search, SlidersHorizontal } from 'lucide-react';
import { useApp } from '../lib/session';
import { CaseRow } from '../components/dash';
import { Card, CardHeader, Badge, EmptyState } from '../components/ui';
import { cn } from '../lib/utils';
import type { CaseStatus, CasePriority } from '../lib/types';

const COLUMNS: { key: string; label: string; statuses: CaseStatus[]; tone: string }[] = [
  { key: 'new', label: 'Submitted / Triaged', statuses: ['submitted', 'triaged'], tone: 'border-sky-300' },
  { key: 'active', label: 'Assigned / In Treatment', statuses: ['assigned', 'in_treatment'], tone: 'border-amber-400' },
  { key: 'watch', label: 'Monitoring', statuses: ['monitoring', 'referred'], tone: 'border-violet-300' },
  { key: 'done', label: 'Recovered / Closed', statuses: ['recovered', 'closed', 'deceased'], tone: 'border-pine-500' },
];

export default function Cases() {
  const { db, user, role, client } = useApp();
  const [q, setQ] = useState('');
  const [prio, setPrio] = useState<CasePriority | 'all'>('all');

  const scoped = useMemo(() => client.casesForUser(user), [client, user, db.cases]);
  const filtered = scoped.filter(c => {
    if (prio !== 'all' && c.priority !== prio) return false;
    if (!q.trim()) return true;
    const farm = db.farms.find(f => f.id === c.farm_id);
    const animal = db.animals.find(a => a.id === c.animal_id);
    return [c.case_number, c.chief_complaint, c.diagnosis ?? '', farm?.name ?? '', animal?.tag_number ?? '', c.ward, ...c.symptoms]
      .join(' ').toLowerCase().includes(q.toLowerCase());
  });

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-4 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="label-caps text-pine-600">Module · Case Management</p>
          <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight text-pine-950">Case Board</h1>
          <p className="mt-0.5 text-[13px] text-stone-500">{scoped.length} case{scoped.length === 1 ? '' : 's'} in your scope ({role}). Click any card for the full clinical timeline.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative"><Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Search case, farm, tag…" className="input-field h-9 w-44 pl-8 !text-[12px] sm:w-56" aria-label="Search cases" /></div>
          <div className="flex items-center gap-1 rounded-xl border border-cream-300 bg-white p-1">
            <SlidersHorizontal className="ml-1 h-4 w-4 text-stone-400" />
            {(['all', 'routine', 'priority', 'emergency'] as const).map(p => (
              <button key={p} onClick={() => setPrio(p)} className={cn('h-7 rounded-lg px-2.5 text-[11px] font-bold capitalize transition', prio === p ? 'bg-pine-800 text-cream-50' : 'text-stone-500 hover:text-pine-800')}>{p}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Kanban */}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {COLUMNS.map(col => {
          const colCases = filtered.filter(c => col.statuses.includes(c.status));
          return (
            <section key={col.key} aria-label={col.label} className={cn('flex flex-col rounded-2xl border-t-4 border border-cream-200 bg-cream-100/60', col.tone)}>
              <header className="flex items-center justify-between px-4 py-2.5">
                <h2 className="text-[11px] font-bold uppercase tracking-[0.09em] text-stone-600">{col.label}</h2>
                <span className="rounded-full bg-white px-2 py-0.5 font-mono text-[11px] font-bold text-pine-900 shadow-sm">{colCases.length}</span>
              </header>
              <div className="flex-1 space-y-2 p-2 pt-0">
                {colCases.map(c => <CaseRow key={c.id} kase={c} />)}
                {colCases.length === 0 && <p className="rounded-xl border border-dashed border-cream-300 px-3 py-6 text-center text-[11px] text-stone-400">Empty</p>}
              </div>
            </section>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <Card><EmptyState icon={<ClipboardList className="h-8 w-8" />} title="No cases match your filters" body="Clear the search or priority filter." action={<Link to="." onClick={() => { setQ(''); setPrio('all'); }} className="text-[13px] font-bold text-pine-800 underline">Reset filters</Link>} /></Card>
      )}
    </div>
  );
}
