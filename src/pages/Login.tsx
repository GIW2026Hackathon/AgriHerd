/* ==========================================================================
   Login — one-click demo personas (5 roles) or email sign-in against RBAC
   ========================================================================== */
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Lock, Mail, ShieldCheck, Stethoscope, Building2, LineChart, Wrench, ArrowLeft } from 'lucide-react';
import { useStore } from '../lib/store';
import { DEMO_IDS } from '../lib/types';

const PERSONAS = [
  { id: DEMO_IDS.farmerMain, icon: <ShieldCheck size={19} />, name: 'Beatrice Momanyi', role: 'Farmer — Riabai Dairy, Kitutu Chache North', tone: 'from-emerald-500/25 to-emerald-900/5 border-emerald-400/30', chip: 'bg-emerald-400 text-emerald-950' },
  { id: DEMO_IDS.vetMain, icon: <Stethoscope size={19} />, name: 'Dr. Grace Kemunto Chacha', role: 'Veterinary Officer — KVB-2021-0341 · dairy herd health', tone: 'from-sky-500/25 to-sky-900/5 border-sky-400/30', chip: 'bg-sky-400 text-sky-950' },
  { id: DEMO_IDS.sponsorMain, icon: <Building2 size={19} />, name: 'Kisii Cream Dairy Co-op', role: 'Sponsor — Gold agreement · claims desk & enrollment codes', tone: 'from-maize-400/30 to-maize-700/5 border-maize-400/40', chip: 'bg-maize-400 text-pine-950' },
  { id: DEMO_IDS.authority, icon: <LineChart size={19} />, name: 'County Livestock Directorate', role: 'Authority — anonymised surveillance & FMD outbreak alerts', tone: 'from-violet-500/25 to-violet-900/5 border-violet-400/30', chip: 'bg-violet-400 text-violet-950' },
  { id: DEMO_IDS.admin, icon: <Wrench size={19} />, name: 'Root Administrator', role: 'Platform Admin — verifications, approvals, immutable audit log', tone: 'from-red-500/25 to-red-900/5 border-red-400/30', chip: 'bg-red-400 text-red-950' },
];

export default function Login() {
  const { login, db, toast } = useStore();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const doLogin = (id: string) => {
    login(id);
    const u = db.profiles.find((p) => p.id === id)!;
    toast('success', `Karibu, ${u.full_name.split(' ')[0]}!`, `Signed in as ${u.role === 'vet' ? 'Veterinary Officer' : u.role[0].toUpperCase() + u.role.slice(1)}.`);
    navigate('/app/dashboard');
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const u = db.profiles.find((p) => p.email.toLowerCase() === email.trim().toLowerCase());
    if (!u) { setError('No GLHIS account with that email. Try a one-click persona below.'); return; }
    if (password.length < 4) { setError('Password must be at least 4 characters (demo accepts any password ≥4 chars).'); return; }
    doLogin(u.id);
  };

  return (
    <div className="min-h-screen bg-pine-950 text-pine-100 grid lg:grid-cols-2">
      {/* Left rail */}
      <div className="relative hidden lg:flex flex-col justify-between p-10 overflow-hidden">
        <img src="/media/farmer.jpg" alt="Farmer milking her cow" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-br from-pine-950/90 via-pine-950/60 to-pine-950/30" />
        <Link to="/" className="relative flex items-center gap-2 text-maize-300 font-mono text-[10px] uppercase tracking-[0.25em] hover:text-maize-200 w-fit"><ArrowLeft size={12} /> Back to glhis.go.ke</Link>
        <div className="relative">
          <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-maize-400">Gusii Livestock Health & Value Chain Intelligence</div>
          <h1 className="mt-3 font-display font-semibold text-4xl xl:text-5xl text-maize-50 leading-[1.05]">One system.<br />Every animal.<br /><span className="italic text-maize-400">Every shilling.</span></h1>
          <p className="mt-4 text-[13px] text-pine-100/85 max-w-md leading-relaxed">Sign in with any of the five demo personas — the fastest way to understand GLHIS is to be Beatrice for five minutes, then approve her claim as Kisii Cream Co-op.</p>
          <div className="mt-6 flex items-center gap-4 font-mono text-[9px] text-pine-200/80">
            <span>RLS-secured</span><span>·</span><span>Audit-logged</span><span>·</span><span>Offline-first</span><span>·</span><span>Synthetic data</span>
          </div>
        </div>
      </div>

      {/* Auth panel */}
      <div className="relative flex flex-col items-center justify-center px-4 sm:px-8 py-10">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-2 mb-6 lg:hidden">
            <Link to="/" className="flex items-center gap-2 text-maize-300 font-mono text-[10px] uppercase tracking-[0.25em]"><ArrowLeft size={12} /> GLHIS</Link>
          </div>
          <h2 className="font-display font-semibold text-2xl text-maize-50">Sign in to GLHIS</h2>
          <p className="text-[11px] text-pine-300/80 mt-1 font-mono">Production uses Supabase Auth + email OTP. This demo uses one-click personas.</p>

          <form onSubmit={submit} className="mt-6 bg-white/[0.04] border border-white/10 rounded-2xl p-5">
            <label className="block">
              <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-pine-300">Email</span>
              <div className="mt-1.5 flex items-center gap-2 bg-pine-900/60 border border-white/10 rounded-xl h-11 px-3 focus-within:ring-2 ring-maize-400/50">
                <Mail size={14} className="text-pine-400 shrink-0" />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.co.ke" className="bg-transparent outline-none w-full text-[13px] text-pine-50 placeholder-pine-500" />
              </div>
            </label>
            <label className="block mt-3">
              <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-pine-300">Password</span>
              <div className="mt-1.5 flex items-center gap-2 bg-pine-900/60 border border-white/10 rounded-xl h-11 px-3 focus-within:ring-2 ring-maize-400/50">
                <Lock size={14} className="text-pine-400 shrink-0" />
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="bg-transparent outline-none w-full text-[13px] text-pine-50 placeholder-pine-500" />
              </div>
            </label>
            {error && <p className="mt-2 text-[11px] text-red-300 font-medium">{error}</p>}
            <button type="submit" className="mt-4 w-full h-11 rounded-xl bg-maize-400 hover:bg-maize-300 text-pine-950 font-bold text-[13px] flex items-center justify-center gap-2">Sign in <ArrowRight size={15} /></button>
          </form>

          <div className="flex items-center gap-3 my-5"><div className="h-px flex-1 bg-white/10" /><span className="font-mono text-[9px] uppercase tracking-[0.22em] text-pine-400">or one-click persona</span><div className="h-px flex-1 bg-white/10" /></div>

          <div className="space-y-2">
            {PERSONAS.map((p, i) => (
              <motion.button
                key={p.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * i, duration: 0.35 }}
                onClick={() => doLogin(p.id)}
                className={`w-full flex items-center gap-3 text-left rounded-2xl border bg-gradient-to-r ${p.tone} p-3 hover:scale-[1.015] active:scale-[0.99] transition-transform`}
              >
                <span className="p-2.5 rounded-xl bg-pine-950/70 text-maize-300 shrink-0">{p.icon}</span>
                <span className="min-w-0">
                  <span className="block text-[12.5px] font-bold text-pine-50 leading-tight">{p.name}</span>
                  <span className="block text-[10px] text-pine-200/85 leading-snug mt-0.5">{p.role}</span>
                </span>
                <ArrowRight size={15} className="ml-auto text-maize-300 shrink-0" />
              </motion.button>
            ))}
          </div>
          <p className="mt-5 text-center font-mono text-[8.5px] text-pine-500 uppercase tracking-[0.2em]">Demo accepts any password · data persists locally per browser</p>
        </div>
      </div>
    </div>
  );
}
