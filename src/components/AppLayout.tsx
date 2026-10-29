import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate, Navigate } from 'react-router-dom';
import {
  LayoutDashboard, Wheat, PawPrint, Stethoscope, Radar, Coins, ClipboardList,
  Syringe, FileText, ScrollText, Users, LogOut, Bell, ChevronDown, Check,
  Tractor, Building2, RefreshCw, Menu, X, Landmark, ShieldCheck, UserRound,
} from 'lucide-react';
import { useApp } from '../lib/session';
import { resetDemoData } from '../lib/store';
import { Avatar, Badge } from './ui';
import { cn, timeAgo } from '../lib/utils';
import { LogoMark } from '../pages/Landing';
import { useToast } from '../lib/toast';
import type { Role } from '../lib/types';

interface NavItem { to: string; label: string; icon: typeof LayoutDashboard; roles: Role[] }
const NAV: NavItem[] = [
  { to: '', label: 'Dashboard', icon: LayoutDashboard, roles: ['farmer', 'vet', 'sponsor', 'county', 'admin'] },
  { to: 'registry', label: 'Farm & Animals', icon: Wheat, roles: ['farmer', 'vet', 'sponsor', 'county', 'admin'] },
  { to: 'cases', label: 'Cases', icon: ClipboardList, roles: ['farmer', 'vet', 'sponsor', 'county', 'admin'] },
  { to: 'triage', label: 'AI Triage', icon: Stethoscope, roles: ['farmer', 'vet'] },
  { to: 'vets', label: 'Find a Vet', icon: Radar, roles: ['farmer'] },
  { to: 'claims', label: 'Claims', icon: Coins, roles: ['farmer', 'vet', 'sponsor', 'county', 'admin'] },
  { to: 'surveillance', label: 'Surveillance', icon: Radar, roles: ['county', 'admin', 'vet'] },
  { to: 'herd-health', label: 'Tick Control', icon: Syringe, roles: ['farmer', 'vet', 'admin'] },
  { to: 'reports', label: 'Reports', icon: FileText, roles: ['sponsor', 'county', 'admin'] },
  { to: 'audit', label: 'Audit Log', icon: ScrollText, roles: ['admin', 'county'] },
  { to: 'users', label: 'Users & RBAC', icon: Users, roles: ['admin'] },
];

export default function AppLayout() {
  const { user, role, isAuthenticated, db, signOut, switchRole, tick, client } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [sideOpen, setSideOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [roleOpen, setRoleOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const roleRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setSideOpen(false); setNotifOpen(false); setRoleOpen(false); }, [location.pathname]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
      if (roleRef.current && !roleRef.current.contains(e.target as Node)) setRoleOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const myNotifs = useMemo(() => db.notifications.filter((n) => n.user_id === user.id).sort((a, b) => b.created_at.localeCompare(a.created_at)), [db.notifications, user.id]);
  const unread = myNotifs.filter((n) => !n.read).length;
  const nav = NAV.filter((i) => i.roles.includes(role));
  const base = `/app/${role}`;

  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location.pathname }} replace />;

  const roleMeta: Record<Role, { label: string; icon: typeof Tractor; chip: string }> = {
    farmer: { label: 'Farmer', icon: Tractor, chip: 'bg-emerald-50 text-emerald-800 border-emerald-400/40' },
    vet: { label: 'Veterinary Officer', icon: Stethoscope, chip: 'bg-sky-50 text-sky-800 border-sky-400/40' },
    sponsor: { label: 'Sponsor / Co-op', icon: Building2, chip: 'bg-amber-50 text-amber-800 border-amber-400/40' },
    county: { label: 'County Authority', icon: Landmark, chip: 'bg-rose-50 text-rose-800 border-rose-400/40' },
    admin: { label: 'Platform Admin', icon: ShieldCheck, chip: 'bg-violet-50 text-violet-800 border-violet-400/40' },
  };
  const RM = roleMeta[role];

  return (
    <div className="flex h-screen overflow-hidden bg-cream-100 font-sans">
      {/* ============ SIDEBAR ============ */}
      <aside className={cn(
        'fixed inset-y-0 left-0 z-40 flex w-[248px] shrink-0 flex-col bg-pine-950 text-cream-100 transition-transform duration-200 lg:static lg:translate-x-0',
        sideOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
      )}>
        <div className="flex h-16 items-center justify-between border-b border-white/10 px-4">
          <Link to="/" className="flex items-center gap-2">
            <LogoMark small />
            <span className="font-display text-[13px] font-semibold leading-tight text-cream-50">Dairy<span className="text-gold-400">Hub</span><br /><span className="text-gold-400">Health Platform</span></span>
          </Link>
          <button className="rounded-lg p-1.5 hover:bg-white/10 lg:hidden" onClick={() => setSideOpen(false)} aria-label="Close sidebar"><X className="h-5 w-5" /></button>
        </div>

        {/* role chip */}
        <div className="mx-3 mt-4 rounded-2xl border border-white/10 bg-white/5 p-3">
          <div className="flex items-center gap-2.5">
            <Avatar name={user.full_name} size={40} />
            <div className="min-w-0">
              <p className="truncate text-[12.5px] font-bold text-cream-50">{user.full_name.split('—')[0].trim()}</p>
              <span className={cn('mt-0.5 inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider', RM.chip)}><RM.icon className="h-3 w-3" />{RM.label}</span>
            </div>
          </div>
          <p className="mt-2 truncate text-[10px] text-cream-100/50">{user.organization ?? (user.ward ? `${user.ward} Ward · ${user.county}` : user.county)}</p>
        </div>

        <nav className="scrollbar-thin mt-3 flex-1 overflow-y-auto px-3 pb-4" aria-label="Primary">
          {nav.map((item) => {
            const to = `${base}${item.to ? `/${item.to}` : ''}`;
            const active = item.to === '' ? location.pathname === base || location.pathname === `${base}/` : location.pathname.startsWith(to);
            return (
              <Link key={to} to={to} className={cn(
                'mt-0.5 flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] font-medium transition-colors',
                active ? 'bg-gold-400 font-bold text-pine-950' : 'text-cream-100/80 hover:bg-white/5 hover:text-cream-50'
              )}>
                <item.icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.8} />
                {item.label}
                {item.label === 'Cases' && role === 'vet' && <span className="ml-auto rounded-md bg-orange-500/90 px-1.5 py-0.5 text-[9px] font-bold text-white">6</span>}
                {item.label === 'Claims' && role === 'sponsor' && <span className="ml-auto rounded-md bg-orange-500/90 px-1.5 py-0.5 text-[9px] font-bold text-white">2</span>}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white/10 p-3">
          <Link to={`${base}/account`} className={cn('mb-1 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-[11px] font-medium hover:bg-white/5', location.pathname === `${base}/account` ? 'bg-white/10 text-cream-50' : 'text-cream-100/55 hover:text-cream-100')}>
            <UserRound className="h-4 w-4" /> My demo account
          </Link>
          <button onClick={() => { resetDemoData(); toast('Demo data reset', { body: 'Seeded dataset rebuilt.', tone: 'info' }); }} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-[11px] font-medium text-cream-100/55 hover:bg-white/5 hover:text-cream-100">
            <RefreshCw className="h-4 w-4" /> Reset demo dataset
          </button>
          <button onClick={() => { navigate('/login', { replace: true }); signOut(); }} className="mt-0.5 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-[11px] font-medium text-cream-100/55 hover:bg-white/5 hover:text-cream-100">
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </aside>
      {sideOpen && <button className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => setSideOpen(false)} aria-label="Close menu" />}

      {/* ============ MAIN COLUMN ============ */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* topbar */}
        <header className="no-print z-20 flex h-16 shrink-0 items-center gap-3 border-b border-cream-200 bg-cream-50/90 px-3 backdrop-blur sm:px-5">
          <button className="rounded-xl border border-cream-300 p-2 lg:hidden" onClick={() => setSideOpen(true)} aria-label="Open menu"><Menu className="h-5 w-5 text-pine-900" /></button>

          {/* command-bar style context */}
          <div className="hidden min-w-0 flex-col md:flex">
            <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-stone-500">Kisii · Nyamira Cluster — 26 Oct 2026</span>
            <span className="truncate font-display text-[13px] font-semibold text-pine-950">DairyHub Health &amp; Value Chain Intelligence</span>
          </div>

          <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
            {/* role switcher (demo RBAC evaluator) */}
            <div className="relative" ref={roleRef}>
              <button onClick={() => setRoleOpen((v) => !v)} className="flex h-10 items-center gap-1.5 rounded-xl border border-cream-300 bg-white px-2.5 text-[12px] font-semibold text-pine-900 hover:border-pine-600" aria-haspopup="true" aria-expanded={roleOpen}>
                <RM.icon className="h-4 w-4" /><span className="hidden sm:inline">{RM.label}</span><ChevronDown className="h-4 w-4 opacity-60" />
              </button>
              {roleOpen && (
                <div className="absolute right-0 mt-2 w-72 overflow-hidden rounded-2xl border border-cream-200 bg-white shadow-lift">
                  <p className="border-b border-cream-100 bg-cream-50 px-4 py-2 font-mono text-[9.5px] uppercase tracking-widest text-stone-500">Switch role (RBAC demo)</p>
                  {(['farmer', 'vet', 'sponsor', 'county', 'admin'] as Role[]).map((r) => {
                    const meta = { farmer: Tractor, vet: Stethoscope, sponsor: Building2, county: Landmark, admin: ShieldCheck }[r];
                    const Icon = meta;
                    return (
                      <button key={r} onClick={() => { switchRole(r); navigate(`/app/${r}`); toast('Role switched', { body: `Now viewing as ${r}. Navigation & data re-filtered.`, tone: 'info' }); }} className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-[12.5px] font-medium text-pine-900 hover:bg-pine-50">
                        <Icon className="h-4 w-4 text-pine-700" />{roleMeta[r].label}
                        {r === role && <Check className="ml-auto h-4 w-4 text-pine-600" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* notifications */}
            <div className="relative" ref={notifRef}>
              <button onClick={() => setNotifOpen((v) => !v)} className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-cream-300 bg-white text-pine-900 hover:border-pine-600" aria-label={`Notifications, ${unread} unread`}>
                <Bell className="h-5 w-5" strokeWidth={1.8} />
                {unread > 0 && <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-orange-600 px-1 text-[9px] font-bold text-white">{unread}</span>}
              </button>
              {notifOpen && (
                <div className="absolute right-0 mt-2 w-[min(92vw,380px)] overflow-hidden rounded-2xl border border-cream-200 bg-white shadow-lift">
                  <div className="flex items-center justify-between border-b border-cream-100 bg-cream-50 px-4 py-2.5">
                    <p className="font-mono text-[9.5px] uppercase tracking-widest text-stone-500">Notifications — {unread} unread</p>
                    <button className="text-[11px] font-semibold text-pine-700 hover:underline" onClick={() => { client.markNotificationsRead(user.id); tick(); }}>Mark all read</button>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {myNotifs.slice(0, 12).map((n) => (
                      <button key={n.id} onClick={() => { client.markNotificationsRead(user.id, [n.id]); tick(); }} className={cn('flex w-full items-start gap-2.5 border-b border-cream-100 px-4 py-3 text-left last:border-0 hover:bg-pine-50/60', !n.read && 'bg-gold-300/10')}>
                        <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', { case: 'bg-sky-500', claim: 'bg-gold-500', alert: 'bg-red-500', system: 'bg-violet-500', info: 'bg-stone-400' }[n.kind])} />
                        <span className="min-w-0">
                          <span className="block text-[12px] font-semibold leading-snug text-pine-950">{n.title}</span>
                          <span className="mt-0.5 block text-[11px] leading-snug text-stone-600">{n.body}</span>
                          <span className="mt-1 block font-mono text-[9px] uppercase tracking-wider text-stone-400">{timeAgo(n.created_at)}{n.sms_sent ? ' · SMS SENT' : ''}</span>
                        </span>
                        {!n.read && <span className="ml-auto mt-1.5 h-2 w-2 shrink-0 rounded-full bg-gold-500" />}
                      </button>
                    ))}
                    {myNotifs.length === 0 && <p className="px-4 py-8 text-center text-[12px] text-stone-500">No notifications.</p>}
                  </div>
                </div>
              )}
            </div>

            <Badge tone="gold" className="hidden md:inline-flex">v1.0 Pilot</Badge>
          </div>
        </header>

        {/* routed content */}
        <main className="min-h-0 flex-1 overflow-y-auto" id="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
