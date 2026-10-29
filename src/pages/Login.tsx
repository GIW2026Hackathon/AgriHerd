import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Tractor, Stethoscope, Users, Radar, ShieldCheck, ArrowRight, Lock, Eye, EyeOff, FlaskConical, Loader2, UserPlus, CheckCircle2 } from 'lucide-react';
import { useApp } from '../lib/session';
import { useToast } from '../lib/toast';
import { LogoMark } from './Landing';
import type { Role } from '../lib/types';
import { cn } from '../lib/utils';
import { DEMO_PASSWORD } from '../lib/seed';
import { PERSONA_BY_ROLE } from '../lib/session';

const PERSONA_CARDS: { role: Role; icon: typeof Tractor; title: string; who: string; can: string[]; color: string }[] = [
  { role: 'farmer', icon: Tractor, title: 'Farmer', who: 'Grace Moraa Nyamweya — Nyagiro Green Dairy, Riomaguka', can: ['Register & track her herd (14 head)', 'Run AI disease triage on a sick cow', 'Submit & track M-Pesa-backed claims'], color: 'from-emerald-500/20 to-emerald-500/5 border-emerald-400/30' },
  { role: 'vet', icon: Stethoscope, title: 'Veterinary Officer', who: 'Dr. Brian Ongeri — Kisii CVS, ECF & tick-borne disease', can: ['See auto-assigned caseload ranked by urgency', 'Log treatments & drug withdrawal periods', 'Recommend claim approvals in-case'], color: 'from-sky-500/20 to-sky-500/5 border-sky-400/30' },
  { role: 'sponsor', icon: Users, title: 'Sponsor / Co-op', who: 'Maziwa Co-operative Union — Farmer Health & Claims desk', can: ['Review claims with vet recommendations', 'Approve / reject with line-item detail', 'Track pool utilization & disbursements'], color: 'from-amber-500/20 to-amber-500/5 border-amber-400/30' },
  { role: 'county', icon: Radar, title: 'County Authority', who: 'Dr. Caroline Mongare — County Director, Veterinary Services', can: ['Monitor 65-ward surveillance heatmap', 'Acknowledge ECF & LSD early-warning alerts', 'Export county disease reports (CSV / print)'], color: 'from-rose-500/20 to-rose-500/5 border-rose-400/30' },
  { role: 'admin', icon: ShieldCheck, title: 'Platform Admin', who: 'Daniel Ndubi — GLHVIS System Administrator', can: ['Manage RBAC across all five roles', 'View immutable audit log of every state change', 'Configure sponsors, pools & platform settings'], color: 'from-violet-500/20 to-violet-500/5 border-violet-400/30' },
];

export default function Login() {
  const { signIn, isAuthenticated, role, db, client, tick } = useApp();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [selected, setSelected] = useState<Role>('farmer');
  const [password, setPassword] = useState('demo2026');
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [createMode, setCreateMode] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>(PERSONA_BY_ROLE.farmer);
  const [account, setAccount] = useState({ name: '', phone: '', email: '', role: 'farmer' as 'farmer' | 'vet', consent: false });
  const roleProfiles = useMemo(() => db.profiles.filter((profile) => profile.role === selected), [db.profiles, selected]);
  const selectedProfile = roleProfiles.find((profile) => profile.id === selectedUserId) ?? roleProfiles[0];

  const from = (location.state as { from?: string } | null)?.from;

  useEffect(() => {
    if (!isAuthenticated) return;
    const rolePath = `/app/${role}`;
    const destination = from === rolePath || from?.startsWith(`${rolePath}/`) ? from : rolePath;
    navigate(destination, { replace: true });
  }, [isAuthenticated, role, from, navigate]);

  const submit = () => {
    if (password !== DEMO_PASSWORD) {
      toast('Demo sign-in failed', { body: `Use the shared demo password ${DEMO_PASSWORD}.`, tone: 'error' });
      return;
    }
    if (!selectedProfile) {
      toast('Demo profile unavailable', { body: 'Choose another profile or reset the demo dataset.', tone: 'error' });
      return;
    }
    setBusy(true);
    window.setTimeout(() => {
      signIn(selected, selectedProfile.id);
      toast('Demo session started', { body: `Welcome, ${selectedProfile.full_name}.`, tone: 'success' });
      const selectedRolePath = `/app/${selected}`;
      const destination = from === selectedRolePath || from?.startsWith(`${selectedRolePath}/`)
        ? from
        : selectedRolePath;
      navigate(destination, { replace: true });
    }, 650);
  };

  const createAccount = () => {
    if (!account.name.trim() || !account.phone.trim()) {
      toast('Complete the required fields', { body: 'Name and phone number are required.', tone: 'warning' });
      return;
    }
    const email = account.email.trim().toLowerCase();
    if (email && db.profiles.some((profile) => profile.email?.toLowerCase() === email)) {
      toast('Email already in use', { body: 'Use a different email address for this demo profile.', tone: 'warning' });
      return;
    }
    if (!account.consent) {
      toast('Consent is required', { body: 'Please accept the data-use notice to continue.', tone: 'warning' });
      return;
    }
    const profile = client.createDemoAccount({
      full_name: account.name,
      phone: account.phone,
      email: email || undefined,
      role: account.role,
    });
    tick();
    signIn(profile.role, profile.id);
    toast('Demo profile created', { body: 'Your profile is saved in this browser. No password was stored.', tone: 'success' });
    navigate(`/app/${profile.role}`, { replace: true });
  };

  return (
    <div className="terrain-bg flex min-h-screen flex-col font-sans text-cream-100">
      <header className="flex h-16 items-center justify-between px-4 sm:px-8">
        <a href="/" className="flex items-center gap-2.5"><LogoMark small /><span className="font-display text-[15px] font-semibold">Dairy<span className="text-gold-400">Hub</span></span></a>
        <span className="rounded-full border border-gold-400/40 bg-gold-400/10 px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-widest text-gold-300">Demo Sign-In</span>
      </header>

      <main className="mx-auto grid w-full max-w-7xl flex-1 items-center gap-8 px-4 pb-10 pt-2 sm:px-8 lg:grid-cols-[1.1fr_1fr]">
        {/* Persona picker */}
        <section>
          <p className="label-caps text-gold-400">Demo Environment</p>
          <h1 className="mt-1.5 font-display text-3xl font-semibold tracking-tight text-cream-50 sm:text-4xl">Choose your seat at the table.</h1>
          <p className="mt-2 max-w-lg text-[13.5px] leading-relaxed text-cream-100/70">Five role-based demo workflows share one synthetic dataset. Choose a persona to explore how farmers, veterinary officers, sponsors, county teams, and administrators use DairyHub.</p>

          <div className="mt-6 grid gap-2.5 sm:grid-cols-2">
            {PERSONA_CARDS.map((p) => (
              <button
                key={p.role}
                onClick={() => { setSelected(p.role); setSelectedUserId(PERSONA_BY_ROLE[p.role]); }}
                className={cn(
                  'group rounded-2xl border bg-gradient-to-br p-4 text-left transition-all',
                  p.color,
                  selected === p.role ? 'ring-2 ring-gold-400 shadow-lift -translate-y-0.5' : 'opacity-80 hover:opacity-100'
                )}
                aria-pressed={selected === p.role}
              >
                <div className="flex items-center justify-between">
                  <p.icon className="h-6 w-6 text-gold-300" strokeWidth={1.7} />
                  {selected === p.role && <span className="rounded-full bg-gold-400 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-pine-950">Selected</span>}
                </div>
                <p className="mt-2 font-display text-[15px] font-semibold text-cream-50">{p.title}</p>
                <p className="mt-0.5 text-[10.5px] leading-snug text-cream-100/60">{p.who}</p>
                <ul className="mt-2 hidden space-y-1 text-[10.5px] leading-snug text-cream-100/75 xl:block">
                  {p.can.map((c) => <li key={c} className="flex items-start gap-1.5"><span className="mt-1 h-0.5 w-0.5 shrink-0 rounded-full bg-gold-400" />{c}</li>)}
                </ul>
              </button>
            ))}
            <div className="hidden flex-col justify-center rounded-2xl border border-white/10 bg-white/5 p-4 sm:flex">
              <FlaskConical className="h-6 w-6 text-cream-100/50" strokeWidth={1.6} />
              <p className="mt-2 text-[11px] font-semibold uppercase tracking-wider text-cream-100/60">Shared, coherent data</p>
              <p className="mt-1 text-[11px] leading-snug text-cream-100/55">8 farms · 23 tagged animals · 6 open cases · 4 claims · 65 wards · full audit trail. What you do in one role is visible in the others.</p>
            </div>
          </div>
        </section>

        {/* Sign-in panel */}
        <motion.section layout className="rounded-3xl border border-white/15 bg-pine-900/80 p-6 shadow-lift backdrop-blur-xl sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-display text-2xl font-semibold text-cream-50">{createMode ? 'Create your account' : 'Sign in'}</h2>
              <p className="mt-1 text-[12.5px] text-cream-100/60">{createMode ? 'Create a local demo profile to explore the farmer or veterinary workflows.' : 'Choose a demo profile to explore its role-specific workflows.'}</p>
            </div>
            {createMode && <button type="button" onClick={() => setCreateMode(false)} className="rounded-lg px-2 py-1 text-[11px] font-semibold text-cream-100/60 hover:bg-white/10 hover:text-white">Back to sign in</button>}
          </div>

          {createMode ? (
            <form className="mt-6 space-y-3.5" onSubmit={(e) => { e.preventDefault(); createAccount(); }}>
              <div>
                <label htmlFor="account-name" className="label-caps !text-gold-300/90">Full name <span className="text-red-300">*</span></label>
                <input id="account-name" required value={account.name} onChange={(e) => setAccount((current) => ({ ...current, name: e.target.value }))} className="input-field mt-1.5 border-white/15 !bg-white/10 !text-cream-100" placeholder="e.g. Grace Moraa Nyamweya" autoComplete="name" />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="account-phone" className="label-caps !text-gold-300/90">Phone number <span className="text-red-300">*</span></label>
                  <input id="account-phone" required value={account.phone} onChange={(e) => setAccount((current) => ({ ...current, phone: e.target.value }))} className="input-field mt-1.5 border-white/15 !bg-white/10 !text-cream-100" placeholder="+254 7XX XXX XXX" autoComplete="tel" />
                </div>
                <div>
                  <label htmlFor="account-email" className="label-caps !text-gold-300/90">Email <span className="text-cream-100/35">(optional)</span></label>
                  <input id="account-email" type="email" value={account.email} onChange={(e) => setAccount((current) => ({ ...current, email: e.target.value }))} className="input-field mt-1.5 border-white/15 !bg-white/10 !text-cream-100" placeholder="you@example.com" autoComplete="email" />
                </div>
              </div>
              <div>
                <label htmlFor="account-role" className="label-caps !text-gold-300/90">I am registering as</label>
                <select id="account-role" value={account.role} onChange={(e) => setAccount((current) => ({ ...current, role: e.target.value as 'farmer' | 'vet' }))} className="input-field mt-1.5 border-white/15 !bg-white/10 !text-cream-100">
                  <option value="farmer">Farmer / livestock keeper</option>
                  <option value="vet">Veterinary professional</option>
                </select>
              </div>
              <div className="rounded-xl border border-gold-400/20 bg-gold-400/5 p-3 text-[11px] leading-relaxed text-cream-100/65">Demo profiles use the shared demo password shown on the sign-in screen. Passwords are not saved or checked for created profiles.</div>
              <label className="flex items-start gap-2 rounded-xl border border-white/10 bg-white/5 p-3 text-[11px] leading-relaxed text-cream-100/65">
                <input type="checkbox" checked={account.consent} onChange={(e) => setAccount((current) => ({ ...current, consent: e.target.checked }))} className="mt-0.5 accent-gold-400" />
                <span>I understand this is a prototype. My profile details are stored in this browser only and are not identity-verified.</span>
              </label>
              <button type="submit" className="group flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gold-400 text-[15px] font-bold text-pine-950 transition hover:bg-gold-300">
                <UserPlus className="h-5 w-5" />Create account <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" strokeWidth={2.5} />
              </button>
              <p className="flex items-start gap-1.5 text-[10.5px] leading-relaxed text-cream-100/45"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold-300/70" />Demo mode: this creates a local profile and starts a demo session. It does not create a production account.</p>
            </form>
          ) : <form className="mt-6 space-y-4" onSubmit={(e) => { e.preventDefault(); submit(); }}>
            <div>
              <label htmlFor="demo-profile" className="label-caps !text-gold-300/90">Demo profile</label>
              <select id="demo-profile" value={selectedProfile?.id ?? ''} onChange={(event) => setSelectedUserId(event.target.value)} className="input-field mt-1.5 border-white/15 !bg-white/10 !text-cream-100">
                {roleProfiles.map((profile) => <option key={profile.id} value={profile.id} className="text-pine-950">{profile.full_name}{profile.email ? ` · ${profile.email}` : ''}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="pw" className="label-caps !text-gold-300/90">Password</label>
              <div className="relative mt-1.5">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cream-100/40" />
                <input id="pw" type={showPw ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} className="input-field border-white/15 !bg-white/10 pl-10 pr-11 font-mono !text-cream-100" autoComplete="current-password" />
                <button type="button" onClick={() => setShowPw((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-cream-100/50 hover:text-cream-100" aria-label={showPw ? 'Hide password' : 'Show password'}>
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="mt-1.5 text-[10.5px] text-cream-100/45">Shared demo password: <code className="font-mono text-gold-300">{DEMO_PASSWORD}</code>. This is not a real password.</p>
            </div>
            <button type="submit" disabled={busy} className="group flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gold-400 text-[15px] font-bold text-pine-950 transition hover:bg-gold-300 disabled:opacity-70">
              {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <>Sign in as {PERSONA_CARDS.find(p => p.role === selected)?.title}<ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" strokeWidth={2.5} /></>}
            </button>
          </form>}

          {!createMode && <button type="button" onClick={() => setCreateMode(true)} className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-gold-400/40 bg-gold-400/5 text-[13px] font-bold text-gold-300 transition hover:border-gold-300 hover:bg-gold-400/10 hover:text-gold-200">
            <UserPlus className="h-4 w-4" />Create a new account
          </button>}

          <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
            <p className="font-mono text-[9.5px] uppercase tracking-widest text-cream-100/45">Access control summary</p>
            <ul className="mt-2 space-y-1 font-mono text-[10px] leading-relaxed text-cream-100/60">
              <li><span className="text-gold-300">MODE</span> — Local prototype using synthetic demo profiles</li>
              <li><span className="text-gold-300">SESSION</span> — Stored in this browser session only</li>
              <li><span className="text-gold-300">PASSWORDS</span> — Shared demo password; never stored</li>
              <li><span className="text-gold-300">DATA</span> — Profile edits stay in browser localStorage</li>
            </ul>
          </div>
        </motion.section>
      </main>
    </div>
  );
}
