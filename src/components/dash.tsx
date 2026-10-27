import { useNavigate } from 'react-router-dom';
import { AlertOctagon, ArrowRight, CalendarDays, PawPrint } from 'lucide-react';
import type { DiseaseCase } from '../lib/types';
import { useApp } from '../lib/session';
import { ageYears, cn, timeAgo } from '../lib/utils';
import { Badge, caseStatusTone, priorityTone, STATUS_LABEL } from './ui';

/** Compact case row used across dashboards */
export function CaseRow({ kase, showFarm = true }: { kase: DiseaseCase; showFarm?: boolean }) {
  const { db, role } = useApp();
  const navigate = useNavigate();
  const animal = db.animals.find((a) => a.id === kase.animal_id);
  const farm = db.farms.find((f) => f.id === kase.farm_id);
  const border = { routine: 'border-l-stone-300', priority: 'border-l-amber-400', emergency: 'border-l-red-500' }[kase.priority];
  return (
    <button onClick={() => navigate(`/app/${role}/cases/${kase.id}`)} className={cn('group flex w-full items-center gap-3 rounded-xl border border-cream-200 border-l-4 bg-white p-3 text-left transition hover:border-pine-500 hover:shadow-card', border)}>
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cream-100 text-pine-800"><PawPrint className="h-5 w-5" strokeWidth={1.6} /></div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-[11px] font-bold text-pine-900">{kase.case_number}</span>
          <Badge tone={priorityTone(kase.priority)}>{kase.priority === 'emergency' && <AlertOctagon className="h-3 w-3" />}{kase.priority.toUpperCase()}</Badge>
          <Badge tone={caseStatusTone(kase.status)}>{STATUS_LABEL[kase.status]}</Badge>
        </div>
        <p className="mt-0.5 truncate text-[12px] font-medium text-stone-600">
          {animal ? `${animal.breed} · ${animal.tag_number} (${ageYears(animal.dob)}y)` : 'Animal'}{showFarm && farm ? ` — ${farm.name}` : ''}
        </p>
        <p className="truncate text-[11px] text-stone-400">{kase.chief_complaint}</p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <span className="flex items-center gap-1 font-mono text-[9.5px] uppercase text-stone-400"><CalendarDays className="h-3 w-3" />{timeAgo(kase.created_at)}</span>
        <ArrowRight className="h-4 w-4 text-stone-300 transition-transform group-hover:translate-x-1 group-hover:text-pine-600" />
      </div>
    </button>
  );
}
