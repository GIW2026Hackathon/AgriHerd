/* ==========================================================================
   GLHIS UI Kit — shared primitives, avatar, status pills, expiry headers
   ========================================================================== */
import React from 'react';
import { cn } from '../lib/cn';
import { Loader2 } from 'lucide-react';
import type { AppNotification } from '../lib/types';

export function Avatar({ initials, tone = 'pine', size = 'md', className }: { initials: string; tone?: 'pine' | 'maize' | 'red' | 'slate' | 'blue'; size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'; className?: string }) {
  const tones: Record<string, string> = {
    pine: 'bg-pine-700 text-maize-300',
    maize: 'bg-maize-400 text-pine-950',
    red: 'bg-red-600 text-white',
    slate: 'bg-slate-600 text-white',
    blue: 'bg-sky-700 text-white',
  };
  const sizes = { xs: 'h-7 w-7 text-[9px]', sm: 'h-8 w-8 text-[10px]', md: 'h-10 w-10 text-xs', lg: 'h-14 w-14 text-base', xl: 'h-20 w-20 text-xl' };
  return (
    <div className={cn('rounded-2xl flex items-center justify-center font-semibold tracking-wide shrink-0 ring-1 ring-black/10', tones[tone], sizes[size], className)}>
      {initials}
    </div>
  );
}

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn('bg-white rounded-2xl border border-pine-900/10 shadow-[0_1px_2px_rgba(15,35,27,0.06),0_8px_24px_-12px_rgba(15,35,27,0.18)]', className)}>{children}</div>;
}

export function SectionTitle({ eyebrow, title, right }: { eyebrow?: string; title: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-4 mb-3">
      <div>
        {eyebrow && <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-pine-600 font-semibold mb-0.5">{eyebrow}</div>}
        <h2 className="font-display font-semibold text-[17px] text-pine-950 leading-tight">{title}</h2>
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </div>
  );
}

export function Button({ children, onClick, variant = 'primary', size = 'md', className, disabled, type }: {
  children: React.ReactNode; onClick?: () => void; variant?: 'primary' | 'dark' | 'ghost' | 'danger' | 'outline' | 'maize';
  size?: 'sm' | 'md' | 'lg'; className?: string; disabled?: boolean; type?: 'button' | 'submit';
}) {
  const variants: Record<string, string> = {
    primary: 'bg-pine-700 text-white hover:bg-pine-800 shadow-sm',
    dark: 'bg-pine-950 text-maize-300 hover:bg-pine-900',
    maize: 'bg-maize-400 text-pine-950 hover:bg-maize-300 shadow-sm',
    ghost: 'text-pine-800 hover:bg-pine-100',
    outline: 'border border-pine-300 text-pine-800 hover:bg-pine-50 bg-white',
    danger: 'bg-red-600 text-white hover:bg-red-700',
  };
  const sizes = { sm: 'h-8 px-3 text-xs gap-1.5', md: 'h-10 px-4 text-[13px] gap-2', lg: 'h-12 px-6 text-sm gap-2' };
  return (
    <button
      type={type ?? 'button'}
      disabled={disabled}
      onClick={onClick}
      className={cn('inline-flex items-center justify-center font-semibold rounded-xl transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap', variants[variant], sizes[size], className)}
    >
      {children}
    </button>
  );
}

export function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending_vet: 'bg-amber-100 text-amber-900 border-amber-300',
    vet_assigned: 'bg-sky-100 text-sky-900 border-sky-300',
    in_treatment: 'bg-indigo-100 text-indigo-900 border-indigo-300',
    resolved: 'bg-emerald-100 text-emerald-900 border-emerald-300',
    escalated: 'bg-red-100 text-red-900 border-red-300',
    cancelled: 'bg-slate-100 text-slate-600 border-slate-300',
    claim_submitted: 'bg-amber-100 text-amber-900 border-amber-300',
    claim_under_review: 'bg-violet-100 text-violet-900 border-violet-300',
    claim_approved: 'bg-teal-100 text-teal-900 border-teal-300',
    claim_paid: 'bg-emerald-100 text-emerald-900 border-emerald-300',
    claim_rejected: 'bg-red-100 text-red-900 border-red-300',
    submitted: 'bg-amber-100 text-amber-900 border-amber-300',
    under_review: 'bg-violet-100 text-violet-900 border-violet-300',
    approved: 'bg-teal-100 text-teal-900 border-teal-300',
    paid: 'bg-emerald-100 text-emerald-900 border-emerald-300',
    rejected: 'bg-red-100 text-red-900 border-red-300',
    verified: 'bg-emerald-100 text-emerald-900 border-emerald-300',
    pending: 'bg-amber-100 text-amber-900 border-amber-300',
    suspended: 'bg-red-100 text-red-900 border-red-300',
    active: 'bg-emerald-100 text-emerald-900 border-emerald-300',
    complete: 'bg-emerald-100 text-emerald-900 border-emerald-300',
    overdue: 'bg-red-100 text-red-900 border-red-300',
    scheduled: 'bg-sky-100 text-sky-900 border-sky-300',
    critical: 'bg-red-100 text-red-900 border-red-300',
    warning: 'bg-amber-100 text-amber-900 border-amber-300',
    info: 'bg-sky-100 text-sky-900 border-sky-300',
  };
  const cls = map[status] ?? 'bg-slate-100 text-slate-700 border-slate-200';
  return <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10.5px] font-semibold uppercase tracking-wide', cls)}><span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />{status.replace(/_/g, ' ')}</span>;
}

export function PriorityDot({ priority }: { priority: 'routine' | 'urgent' | 'emergency' }) {
  const c = priority === 'emergency' ? 'bg-red-500' : priority === 'urgent' ? 'bg-amber-500' : 'bg-emerald-500';
  return <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-pine-900"><span className={cn('h-2 w-2 rounded-full', c)} />{priority}</span>;
}

export function StatCard({ label, value, sub, icon, accent }: { label: string; value: React.ReactNode; sub?: string; icon: React.ReactNode; accent?: 'maize' | 'red' | 'pine' | 'sky' }) {
  const accents: Record<string, string> = {
    maize: 'from-maize-400/25 to-transparent text-maize-600',
    red: 'from-red-500/15 to-transparent text-red-600',
    pine: 'from-pine-500/15 to-transparent text-pine-700',
    sky: 'from-sky-500/15 to-transparent text-sky-700',
  };
  return (
    <Card className="p-4 relative overflow-hidden">
      <div className={cn('absolute -top-6 -right-6 h-28 w-28 rounded-full bg-gradient-to-br blur-2xl pointer-events-none', accents[accent ?? 'pine'])} />
      <div className="flex items-start justify-between gap-2 relative">
        <div>
          <div className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-pine-600/90 font-semibold">{label}</div>
          <div className="mt-1.5 font-display font-semibold text-[22px] leading-none text-pine-950 tabular">{value}</div>
          {sub && <div className="mt-1.5 text-[10.5px] text-pine-700/80 leading-snug">{sub}</div>}
        </div>
        <div className="p-2 rounded-xl bg-pine-50 text-pine-800 border border-pine-900/5">{icon}</div>
      </div>
    </Card>
  );
}

export function EmptyState({ icon, title, body, action }: { icon: React.ReactNode; title: string; body?: string; action?: React.ReactNode }) {
  return (
    <div className="py-14 px-6 text-center flex flex-col items-center">
      <div className="p-4 rounded-2xl bg-pine-50 text-pine-400 border border-pine-100 mb-4">{icon}</div>
      <div className="font-display font-semibold text-pine-900">{title}</div>
      {body && <p className="text-xs text-pine-700/80 mt-1 max-w-sm leading-relaxed">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Modal({ open, onClose, title, subtitle, children, wide }: { open: boolean; onClose: () => void; title: string; subtitle?: string; children: React.ReactNode; wide?: boolean }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-pine-950/60 backdrop-blur-[2px]" onClick={onClose} />
      <div className={cn('relative bg-paper w-full rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden max-h-[94vh] flex flex-col', wide ? 'sm:max-w-2xl' : 'sm:max-w-lg')}>
        <div className="px-6 pt-5 pb-4 border-b border-pine-900/10 flex items-start justify-between gap-4 bg-white">
          <div>
            <h3 className="font-display font-semibold text-lg text-pine-950 leading-tight">{title}</h3>
            {subtitle && <p className="text-[11px] text-pine-700/85 mt-0.5">{subtitle}</p>}
          </div>
          <button onClick={onClose} aria-label="Close" className="p-2 rounded-lg hover:bg-pine-100 text-pine-800 transition-colors">✕</button>
        </div>
        <div className="overflow-y-auto px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

export function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-pine-700 font-semibold">{label}</span>
      <div className="mt-1.5">{children}</div>
      {hint && <span className="text-[10px] text-pine-600/80 mt-1 block">{hint}</span>}
    </label>
  );
}

export const inputCls = 'w-full h-10 px-3 rounded-xl border border-pine-200 bg-white text-[13px] text-pine-950 placeholder-pine-400 outline-none focus:ring-2 focus:ring-pine-500/40 focus:border-pine-500 transition-shadow';
export const selectCls = inputCls;
export const textareaCls = 'w-full px-3 py-2.5 rounded-xl border border-pine-200 bg-white text-[13px] text-pine-950 placeholder-pine-400 outline-none focus:ring-2 focus:ring-pine-500/40 focus:border-pine-500 transition-shadow min-h-[72px]';

export function PageHeader({ title, sub, actions }: { title: string; sub?: string; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 mb-5 print-hidden">
      <div>
        <h1 className="font-display font-semibold text-2xl text-pine-950 leading-tight">{title}</h1>
        {sub && <p className="text-[12px] text-pine-700/85 mt-1 max-w-2xl leading-snug">{sub}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Spinner() {
  return <Loader2 className="h-5 w-5 animate-spin text-pine-600" />;
}

export function KindIcon({ kind }: { kind: AppNotification['kind'] }) {
  const map = { case: 'bg-indigo-100 text-indigo-700', claim: 'bg-maize-400/30 text-maize-600', alert: 'bg-red-100 text-red-600', system: 'bg-slate-200 text-slate-700', enrollment: 'bg-emerald-100 text-emerald-700' } as const;
  const label = { case: 'CS', claim: 'CL', alert: 'AL', system: 'SY', enrollment: 'EN' } as const;
  return <span className={cn('h-8 w-8 shrink-0 rounded-lg flex items-center justify-center font-mono text-[9px] font-bold', map[kind])}>{label[kind]}</span>;
}
