import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';
import { Loader2, Inbox } from 'lucide-react';

/* ---------- Badge ---------- */
export type BadgeTone = 'green' | 'amber' | 'red' | 'blue' | 'slate' | 'gold' | 'purple';
const BADGE: Record<BadgeTone, string> = {
  green: 'bg-pine-50 text-pine-700 border-pine-600/25',
  amber: 'bg-amber-50 text-amber-800 border-amber-400/40',
  red: 'bg-orange-50 text-red-800 border-red-400/40',
  blue: 'bg-sky-50 text-sky-800 border-sky-400/40',
  slate: 'bg-stone-100 text-stone-600 border-stone-300',
  gold: 'bg-amber-50 text-gold-600 border-gold-400/50',
  purple: 'bg-violet-50 text-violet-800 border-violet-400/40',
};
export function Badge({ tone = 'slate', children, className }: { tone?: BadgeTone; children: ReactNode; className?: string }) {
  return <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold tracking-wide whitespace-nowrap', BADGE[tone], className)}>{children}</span>;
}

/* ---------- Case status / priority / claim status badges ---------- */
export const caseStatusTone = (s: string): BadgeTone => ({
  submitted: 'blue', triaged: 'blue', assigned: 'purple', in_treatment: 'amber', monitoring: 'amber',
  recovered: 'green', referred: 'gold', deceased: 'red', closed: 'slate',
}[s] as BadgeTone ?? 'slate');
export const priorityTone = (p: string): BadgeTone => ({ routine: 'slate', priority: 'amber', emergency: 'red' }[p] as BadgeTone ?? 'slate');
export const claimStatusTone = (s: string): BadgeTone => ({
  draft: 'slate', submitted: 'blue', under_review: 'amber', approved: 'purple',
  rejected: 'red', disbursed: 'green', reconciled: 'green',
}[s] as BadgeTone ?? 'slate');
export const severityTone = (s: string): BadgeTone => ({ info: 'blue', watch: 'amber', alert: 'gold', critical: 'red' }[s] as BadgeTone ?? 'slate');

export const STATUS_LABEL: Record<string, string> = {
  submitted: 'Submitted', triaged: 'Triaged', assigned: 'Assigned', in_treatment: 'In Treatment', monitoring: 'Monitoring',
  recovered: 'Recovered', referred: 'Referred', deceased: 'Deceased', closed: 'Closed',
};
export const CLAIM_STATUS_LABEL: Record<string, string> = {
  draft: 'Draft', submitted: 'Submitted', under_review: 'Under Review', approved: 'Approved',
  rejected: 'Rejected', disbursed: 'Disbursed', reconciled: 'Reconciled',
};

/* ---------- Card ---------- */
export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('card-surface rounded-2xl', className)}>{children}</div>;
}
export function CardHeader({ title, sub, action }: { title: string; sub?: string; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-cream-200 px-5 py-4">
      <div>
        <h3 className="font-display text-[15px] font-semibold text-pine-950">{title}</h3>
        {sub && <p className="mt-0.5 text-xs text-stone-500">{sub}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/* ---------- KPI stat ---------- */
export function Stat({ label, value, sub, tone = 'pine', icon }: { label: string; value: ReactNode; sub?: ReactNode; tone?: 'pine' | 'gold' | 'red' | 'blue' | 'slate'; icon?: ReactNode }) {
  const toneCls = { pine: 'text-pine-800', gold: 'text-gold-600', red: 'text-red-700', blue: 'text-sky-800', slate: 'text-stone-700' }[tone];
  return (
    <div className="card-surface rounded-2xl px-5 py-4">
      <div className="flex items-center justify-between gap-2">
        <p className="label-caps">{label}</p>
        {icon && <span className="text-stone-400">{icon}</span>}
      </div>
      <p className={cn('mt-1.5 font-display text-[26px] font-semibold leading-none tracking-tight', toneCls)}>{value}</p>
      {sub && <div className="mt-1.5 text-[11px] leading-snug text-stone-500">{sub}</div>}
    </div>
  );
}

/* ---------- Buttons ---------- */
export function Btn({ children, onClick, variant = 'primary', size = 'md', className, disabled, type }: {
  children: ReactNode; onClick?: () => void; variant?: 'primary' | 'gold' | 'outline' | 'ghost' | 'danger' | 'pine-soft';
  size?: 'sm' | 'md' | 'lg'; className?: string; disabled?: boolean; type?: 'button' | 'submit';
}) {
  const base = 'inline-flex items-center justify-center gap-1.5 rounded-xl font-semibold transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pine-600 disabled:opacity-50 disabled:pointer-events-none';
  const sizes = { sm: 'h-8 px-3 text-xs', md: 'h-10 px-4 text-sm', lg: 'h-12 px-6 text-[15px]' };
  const variants = {
    primary: 'bg-pine-800 text-cream-50 hover:bg-pine-700 shadow-sm',
    gold: 'bg-gold-400 text-pine-950 hover:bg-gold-300 shadow-sm',
    outline: 'border border-cream-300 bg-white text-pine-900 hover:border-pine-600 hover:text-pine-700',
    ghost: 'text-pine-800 hover:bg-pine-50',
    danger: 'bg-red-700 text-white hover:bg-red-800',
    'pine-soft': 'bg-pine-50 text-pine-800 hover:bg-pine-100 border border-pine-600/20',
  };
  return <button type={type ?? 'button'} onClick={onClick} disabled={disabled} className={cn(base, sizes[size], variants[variant], className)}>{children}</button>;
}

/* ---------- Section heading ---------- */
export function SectionTitle({ eyebrow, title, className }: { eyebrow?: string; title: string; className?: string }) {
  return (
    <div className={className}>
      {eyebrow && <p className="label-caps mb-1 text-pine-600">{eyebrow}</p>}
      <h2 className="font-display text-xl font-semibold text-pine-950">{title}</h2>
    </div>
  );
}

/* ---------- Empty state ---------- */
export function EmptyState({ icon, title, body, action }: { icon?: ReactNode; title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
      <div className="rounded-2xl bg-cream-100 p-4 text-stone-400">{icon ?? <Inbox className="h-7 w-7" strokeWidth={1.5} />}</div>
      <p className="font-display text-base font-semibold text-pine-950">{title}</p>
      {body && <p className="max-w-sm text-sm text-stone-500">{body}</p>}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn('h-5 w-5 animate-spin text-pine-700', className)} />;
}

/* ---------- Avatar ---------- */
export function Avatar({ name, className, size = 36 }: { name: string; className?: string; size?: number }) {
  const initials = name.replace(/^Dr\.\s*/, '').split(/[\s—-]+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('');
  const hue = [...name].reduce((s, c) => s + c.charCodeAt(0), 0) % 360;
  return (
    <span
      className={cn('inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white', className)}
      style={{ width: size, height: size, fontSize: size * 0.38, background: `linear-gradient(135deg, hsl(${hue} 45% 38%), hsl(${hue} 45% 28%))` }}
    >{initials}</span>
  );
}

/* ---------- Table primitives ---------- */
export function Th({ children, className }: { children?: ReactNode; className?: string }) {
  return <th className={cn('px-4 py-2.5 text-left text-[10.5px] font-bold uppercase tracking-[0.08em] text-stone-500', className)}>{children}</th>;
}
export function Td({ children, className }: { children?: ReactNode; className?: string }) {
  return <td className={cn('px-4 py-2.5 align-middle text-[13px] text-pine-950', className)}>{children}</td>;
}

export function LinkBtn({ to, children, variant = 'ghost' }: { to: string; children: ReactNode; variant?: 'ghost' | 'soft' }) {
  return (
    <Link to={to} className={cn('inline-flex items-center gap-1 text-xs font-semibold transition-colors', variant === 'soft' ? 'rounded-lg bg-pine-50 px-2.5 py-1.5 text-pine-800 hover:bg-pine-100' : 'text-pine-700 hover:text-pine-900')}>
      {children}
    </Link>
  );
}
