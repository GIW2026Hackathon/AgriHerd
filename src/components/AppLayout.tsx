/* ==========================================================================
   GLHIS App Shell — role-aware sidebar, offline-resilient topbar, RBAC guard
   ========================================================================== */
import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, Link, Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, PawPrint, Stethoscope, ShieldCheck, Syringe, HeartPulse, Bell, CheckCheck, Wifi, WifiOff,
  Building2, BadgeCheck, Users, FileText, ShieldAlert, LogOut, Menu, X, Search, CircleDot, RefreshCw,
  ChevronDown, FlaskConical, ClipboardList, Banknote, Map, BookOpen, Settings2, FileBarChart2, Home, ArrowRightLeft,
} from 'lucide-react';
import { useStore } from '../lib/store';
import { cn } from '../lib/cn';
import { Avatar, KindIcon } from './ui';
import type { Role } from '../lib/types';
import { timeAgo } from '../lib/geo';

interface NavItem { label: string; path: string; icon: React.ReactNode; roles: Role[] }

const NAV: NavItem[] = [
  { label: 'Dashboard', path: '/app/dashboard', icon: <LayoutDashboard size={17} />, roles: ['farmer', 'vet', 'sponsor', 'authority', 'admin'] },
  { label: 'Registry', path: '/app/registry', icon: <PawPrint size={17} />, roles: ['farmer', 'admin'] },
  { label: 'Symptom Check', path: '/app/triage', icon: <HeartPulse size={17} />, roles: ['farmer'] },
  { label: 'Find a Vet', path: '/app/find-vet', icon: <Stethoscope size={17} />, roles: ['farmer'] },
  { label: 'Cases & Treatment', path: '/app/cases', icon: <ClipboardList size={17} />, roles: ['farmer', 'vet'] },
  { label: 'Coverage & Claims', path: '/app/coverage', icon: <ShieldCheck size={17} />, roles: ['farmer'] },
  { label: 'Claims Desk', path: '/app/claims', icon: <Banknote size={17} />, roles: ['farmer', 'vet', 'sponsor', 'admin'] },
  { label: 'Agreements', path: '/app/agreements', icon: <Building2 size={17} />, roles: ['sponsor'] },
  { label: 'Enrollments', path: '/app/enrollments', icon: <Users size={17} />, roles: ['sponsor'] },
  { label: 'Surveillance', path: '/app/surveillance', icon: <Map size={17} />, roles: ['authority', 'admin'] },
  { label: 'Prevention', path: '/app/prevention', icon: <Syringe size={17} />, roles: ['farmer', 'vet', 'admin'] },
  { label: 'Architecture Docs', path: '/app/docs', icon: <FileText size={17} />, roles: ['farmer', 'vet', 'sponsor', 'authority', 'admin'] },
  { label: 'Reports', path: '/app/reports', icon: <FileBarChart2 size={17} />, roles: ['farmer', 'vet', 'sponsor', 'authority', 'admin'] },
  { label: 'Knowledge Base', path: '/app/knowledge', icon: <BookOpen size={17} />, roles: ['farmer', 'vet', 'sponsor', 'authority', 'admin'] },
  { label: 'Administration', path: '/app/admin', icon: <Settings2 size={17} />, roles: ['admin'] },
];

const ROUTE_ROLES: Record<string, Role[]> = Object.fromEntries(NAV.map((n) => [n.path, n.roles]));
export const HOME_FOR_ROLE: Record<Role, string> = {
  farmer: '/app/dashboard', vet: '/app/dashboard', sponsor: '/app/dashboard', authority: '/app/dashboard', admin: '/app/dashboard',
};

export const roleLabel: Record<Role, string> = {
  farmer: 'Farmer', vet: 'Veterinary Officer', sponsor: 'Sponsor · Milk Buyer', authority: 'County Authority', admin: 'Platform Admin',
};
export const roleColor: Record<Role, string> = {
  farmer: 'bg-emerald-100 text-emerald-900', vet: 'bg-sky-100 text-sky-900', sponsor: 'bg-maize-400/40 text-pine-950', authority: 'bg-violet-100 text-violet-900', admin: 'bg-red-100 text-red-900',
};

export function Guard({ roles, children }: { roles: Role[]; children: React.ReactNode }) {
  const { currentUser } = useStore();
  if (!currentUser) return <Navigate to="/login" replace />;
  if (!roles.includes(currentUser.role)) return <Navigate to={HOME_FOR_ROLE[currentUser.role]} replace />;
  if (!currentUser.active) return <Deactivated />;
  return <>{children}</>;
}

function Deactivated() {
  const { logout } = useStore();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-paper text-center px-6">
      <ShieldAlert className="h-12 w-12 text-red-500 mb-4" />
      <h1 className="font-display text-2xl font-semibold text-pine-950">Account suspended</h1>
      <p className="text-sm text-pine-800 mt-2 max-w-md">Your GLHIS account has been suspended by the platform administrator. Contact support@glhis.go.ke to appeal.</p>
      <button onClick={logout} className="mt-6 inline-flex items-center gap-2 bg-pine-950 text-maize-300 px-5 h-11 rounded-xl font-semibold text-sm"><LogOut size={16} /> Sign out</button>
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { currentUser, logout, db, offline, toggleOffline, outbox, syncNow, markNotificationRead, markAllNotificationsRead } = useStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [query, setQuery] = useState('');
  const location = useLocation();
  const navigate = useNavigate();
  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  const myNotifs = currentUser ? db.notifications.filter((n) => n.profile_id === currentUser.id || (currentUser.role === 'admin' && n.kind === 'system')) : [];
  const unread = myNotifs.filter((n) => !n.read).length;
  const [tick, setTick] = useState(0);
  useEffect(() => { const t = setInterval(() => setTick((x) => x + 1), 60000); return () => clearInterval(t); }, []);
  void tick;

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
      if (userRef.current && !userRef.current.contains(e.target as Node)) setUserOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  useEffect(() => { setSidebarOpen(false); setNotifOpen(false); setUserOpen(false); }, [location.pathname]);

  if (!currentUser) return <Navigate to="/login" replace state={{ from: location.pathname }} />;

  const navItems = NAV.filter((n) => n.roles.includes(currentUser.role));
  const filtered = query.trim()
    ? navItems.filter((n) => n.label.toLowerCase().includes(query.toLowerCase()))
    : navItems;

  /* global search over registry + cases (role scoped) */
  const q = query.trim().toLowerCase();
  const searchResults = q.length >= 2 ? [
    ...db.animals.filter((a) => [a.name, a.tag_number, a.breed].join(' ').toLowerCase().includes(q) && (currentUser.role !== 'farmer' || db.farms.find((f) => f.id === a.farm_id)?.farmer_id === currentUser.id)).slice(0, 4).map((a) => ({ label: `${a.name} · ${a.tag_number}`, sub: a.breed, to: '/app/registry' })),
    ...db.cases.filter((c) => [c.case_number, c.suspected_dx].join(' ').toLowerCase().includes(q) && (currentUser.role !== 'farmer' ? currentUser.role !== 'vet' || c.vet_id === currentUser.id : c.farmer_id === currentUser.id)).slice(0, 4).map((c) => ({ label: c.case_number, sub: c.suspected_dx, to: '/app/cases' })),
  ] : [];

  const sidebar = (
    <div className="flex flex-col h-full bg-pine-950 text-pine-100">
      <Link to="/" className="flex items-center gap-2.5 px-5 h-16 border-b border-white/5 shrink-0">
        <svg viewBox="0 0 64 64" className="h-8 w-8"><rect width="64" height="64" rx="14" fill="#f6c945"/><path d="M14 40c6-14 14-20 24-20 6 0 11 2 14 6-3-1-6 0-7 4 4 1 6 5 6 9-5-2-9 0-11 5l-2-6c-6 3-14 4-24 2z" fill="#0f231b"/><circle cx="40" cy="26" r="2.4" fill="#f6c945"/></svg>
        <div className="leading-tight">
          <div className="font-display font-semibold text-[15px] text-maize-300 tracking-tight">GLHIS</div>
          <div className="font-mono text-[8px] uppercase tracking-[0.2em] text-pine-300/80">Gusii Livestock Health</div>
        </div>
      </Link>

      <div className="px-4 pt-4 pb-2 relative">
        <Search size={14} className="absolute left-7 top-[26px] text-pine-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search herd, cases…"
          className="w-full h-9 pl-9 pr-3 rounded-lg bg-white/5 border border-white/10 text-[12px] placeholder-pine-400 text-pine-50 outline-none focus:ring-2 focus:ring-maize-400/50"
        />
        {searchResults.length > 0 && (
          <div className="absolute z-30 mt-1 left-4 right-4 bg-pine-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden">
            {searchResults.map((r, i) => (
              <button key={i} onClick={() => { setQuery(''); navigate(r.to); }} className="w-full text-left px-3 py-2 hover:bg-white/5 flex items-center gap-2">
                <CircleDot size={10} className="text-maize-400 shrink-0" />
                <span className="text-[11px] truncate"><span className="text-pine-50 font-medium">{r.label}</span><span className="text-pine-300/80"> · {r.sub}</span></span>
              </button>
            ))}
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5">
        <div className="px-2 pb-1.5 pt-1 font-mono text-[9px] uppercase tracking-[0.22em] text-pine-400/80">{roleLabel[currentUser.role]} Workspace</div>
        {filtered.map((item) => {
          const active = location.pathname === item.path;
          return (
            <Link key={item.path} to={item.path} className={cn('flex items-center gap-2.5 px-3 h-9.5 rounded-lg text-[12.5px] font-medium transition-colors', active ? 'bg-maize-400 text-pine-950' : 'text-pine-100/85 hover:bg-white/5 hover:text-white')}>
              <span className={active ? 'text-pine-950' : 'text-pine-300'}>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
        {filtered.length === 0 && <div className="px-3 py-4 text-[11px] text-pine-400">No matches for “{query}”.</div>}
      </nav>

      <div className="p-3 border-t border-white/5 shrink-0">
        <div className="rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 flex items-center gap-2.5">
          <Avatar initials={currentUser.initials} tone="maize" size="sm" />
          <div className="min-w-0">
            <div className="text-[11px] font-semibold text-pine-50 truncate">{currentUser.full_name}</div>
            <div className={cn('inline-block mt-0.5 text-[8.5px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded', roleColor[currentUser.role])}>{roleLabel[currentUser.role]}</div>
          </div>
        </div>
        <div className="flex items-center justify-between mt-2 px-1">
          <Link to="/" className="text-[10px] font-mono text-pine-400 hover:text-maize-300 flex items-center gap-1"><Home size={11} /> Site home</Link>
          <Link to="/login" className="text-[10px] font-mono text-pine-400 hover:text-maize-300 flex items-center gap-1"><ArrowRightLeft size={11} /> Switch role</Link>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-paper text-ink">
      {/* Sidebar — desktop */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-[232px] flex-col z-30 print-hidden">{sidebar}</aside>
      {/* Sidebar — mobile */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div className="fixed inset-0 bg-pine-950/60 z-40 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSidebarOpen(false)} />
            <motion.aside className="fixed inset-y-0 left-0 w-[272px] z-50 lg:hidden" initial={{ x: -300 }} animate={{ x: 0 }} exit={{ x: -300 }} transition={{ type: 'tween', duration: 0.25 }}>
              <button onClick={() => setSidebarOpen(false)} className="absolute right-3 top-4 p-2 text-pine-300"><X size={18} /></button>
              {sidebar}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="lg:pl-[232px]">
        {/* Topbar */}
        <header className="sticky top-0 z-20 h-16 bg-paper/85 backdrop-blur-md border-b border-pine-900/10 flex items-center gap-2 px-3 sm:px-5 print-hidden">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 rounded-lg hover:bg-pine-100 text-pine-900" aria-label="Menu"><Menu size={19} /></button>

          <div className="hidden md:flex items-center gap-2 font-mono text-[10px] text-pine-700/80 border border-pine-200 bg-white rounded-lg px-2.5 h-8">
            <Map size={11} /> Kisii County · Nyamira · <span className="text-pine-950 font-semibold">142 verified vets</span>
          </div>

          <div className="flex-1" />

          {/* Offline sync control */}
          <button onClick={toggleOffline} title={offline ? 'You are offline — writes queue to the outbox' : 'Online — live sync active. Click to simulate offline.'} className={cn('flex items-center gap-1.5 h-8 px-2.5 rounded-lg border text-[10px] font-mono font-semibold transition-colors', offline ? 'bg-amber-100 border-amber-300 text-amber-900' : 'bg-white border-pine-200 text-pine-800 hover:bg-pine-50')}>
            {offline ? <WifiOff size={12} /> : <Wifi size={12} />}
            <span className="hidden sm:inline">{offline ? `OFFLINE · ${outbox.length} queued` : 'ONLINE'}</span>
            {offline && <span className="h-1.5 w-1.5 rounded-full bg-amber-500 pulse-dot" />}
          </button>
          {offline && outbox.length > 0 && (
            <button onClick={syncNow} className="flex items-center gap-1 h-8 px-2.5 rounded-lg bg-pine-950 text-maize-300 text-[10px] font-mono font-semibold hover:bg-pine-900">
              <RefreshCw size={11} /> Sync
            </button>
          )}

          {/* Notifications */}
          <div className="relative" ref={notifRef}>
            <button onClick={() => setNotifOpen((v) => !v)} className="relative p-2 rounded-lg hover:bg-pine-100 text-pine-900" aria-label="Notifications">
              <Bell size={18} />
              {unread > 0 && <span className="absolute top-1 right-1 h-4 min-w-4 px-0.5 rounded-full bg-red-500 text-white text-[8.5px] font-bold flex items-center justify-center">{unread}</span>}
            </button>
            {notifOpen && (
              <div className="absolute right-0 mt-2 w-[92vw] max-w-sm bg-white rounded-2xl border border-pine-900/10 shadow-2xl overflow-hidden z-30">
                <div className="flex items-center justify-between px-4 h-11 border-b border-pine-900/10">
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-pine-700 font-bold">Notification Inbox</span>
                  <button onClick={markAllNotificationsRead} className="flex items-center gap-1 text-[10px] font-semibold text-pine-700 hover:text-pine-950"><CheckCheck size={11} /> Mark all read</button>
                </div>
                <div className="max-h-96 overflow-y-auto divide-y divide-pine-900/5">
                  {myNotifs.slice(0, 9).map((n) => (
                    <button key={n.id} onClick={() => { markNotificationRead(n.id); setNotifOpen(false); if (n.link) navigate(n.link); }} className={cn('w-full text-left px-4 py-2.5 flex gap-2.5 hover:bg-pine-50 transition-colors', !n.read && 'bg-maize-400/10')}>
                      <KindIcon kind={n.kind} />
                      <span className="min-w-0">
                        <span className="block text-[11px] font-semibold text-pine-950 leading-snug">{n.title}</span>
                        <span className="block text-[10.5px] text-pine-800/80 leading-snug mt-0.5 line-clamp-2">{n.body}</span>
                        <span className="block font-mono text-[9px] text-pine-500 mt-1">{timeAgo(n.created_at)}</span>
                      </span>
                    </button>
                  ))}
                  {myNotifs.length === 0 && <div className="px-4 py-6 text-[11px] text-pine-600 text-center">Inbox clear. Nothing needs your attention.</div>}
                </div>
              </div>
            )}
          </div>

          {/* User menu */}
          <div className="relative" ref={userRef}>
            <button onClick={() => setUserOpen((v) => !v)} className="flex items-center gap-1.5 h-10 pl-1 pr-1.5 rounded-xl hover:bg-pine-100">
              <Avatar initials={currentUser.initials} tone="pine" size="sm" />
              <ChevronDown size={14} className="text-pine-800 hidden sm:block" />
            </button>
            {userOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl border border-pine-900/10 shadow-2xl overflow-hidden z-30">
                <div className="px-4 py-3 border-b border-pine-900/10">
                  <div className="text-[12px] font-bold text-pine-950">{currentUser.full_name}</div>
                  <div className="text-[10px] font-mono text-pine-600 mt-0.5">{currentUser.email}</div>
                  <div className="text-[10px] font-mono text-pine-600">{currentUser.phone}</div>
                </div>
                <button onClick={() => navigate('/login')} className="w-full flex items-center gap-2 px-4 py-2.5 text-[11.5px] font-medium text-pine-900 hover:bg-pine-50"><ArrowRightLeft size={13} /> Switch role (demo)</button>
                <button onClick={logout} className="w-full flex items-center gap-2 px-4 py-2.5 text-[11.5px] font-medium text-red-700 hover:bg-red-50"><LogOut size={13} /> Sign out</button>
              </div>
            )}
          </div>
        </header>

        <main className="px-3 sm:px-5 lg:px-7 py-6 max-w-[1500px]">{children}</main>
      </div>
    </div>
  );
}

/* Re-export for page-level route roles */
export { ROUTE_ROLES, NAV };
