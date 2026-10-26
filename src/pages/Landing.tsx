/* ==========================================================================
   Landing — Gusii Livestock Health & Value Chain Intelligence System
   ========================================================================== */
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  HeartPulse, MapPin, ShieldCheck, Stethoscope, ArrowRight, PhoneCall, BadgeCheck, Building2,
  LineChart, Syringe, FileText, Lock, CloudOff, Database, ChevronDown, ChevronRight, PlayCircle, X, CheckCircle2, PawPrint,
} from 'lucide-react';
import { knowledgeArticles } from '../lib/types';

const CAPABILITIES = [
  { icon: <HeartPulse size={20} />, title: 'AI-Assisted Disease Triage', body: 'Farmers describe 24 signs; the engine ranks differential diagnoses — FMD, ECF, mastitis — with an explainable urgency score and first-response protocol.', tag: 'Clinical AI' },
  { icon: <MapPin size={20} />, title: 'Geo-Verified Vet Finder', body: 'Every licensed vet (KVB-verified) is mapped by GPS. Farmers assign nearest-available verified officers by ward — distance, rating, specialty, availability.', tag: 'Geolocation' },
  { icon: <ShieldCheck size={20} />, title: 'Sponsor-Funded Care & Claims', body: 'Gold/Silver agreements with max-claim limits, annual caps and covered-diagnosis lists. One-tap claims from the vet, approval desk for sponsors, audit trail end-to-end.', tag: 'Financial rail' },
  { icon: <LineChart size={20} />, title: 'County Disease Surveillance', body: 'Anonymised ward-level incidence, 6-week trends, FMD outbreak thresholds (≥3 cases/14d) and CSV/print export for the Kisii County Livestock Directorate.', tag: 'Public health' },
  { icon: <Syringe size={20} />, title: 'Tick Control & Herd Health', body: 'Dipping calendars with acaricide rotation, per-farm compliance scores, and vaccination schedules — FMD, LSD, anthrax, blackleg — with overdue escalation.', tag: 'Prevention' },
  { icon: <FileText size={20} />, title: 'Exports & Full Audit Trail', body: 'Every mutation — clinical, financial, administrative — writes an immutable audit log. Reports export to CSV or a print-optimized government format.', tag: 'Governance' },
];

const PIPELINE = [
  { step: '01', who: 'Farmer', what: 'Nyachaki the cow drools — Beatrice reports 4 symptoms on GLHIS', detail: 'AI triage: FMD suspected · urgency 82/100', color: 'bg-emerald-500' },
  { step: '02', who: 'System', what: 'Nearest verified vet found 1.2 km away', detail: 'Dr. Grace Kemunto Chacha · KVB-2021-0341 · 4.9★', color: 'bg-sky-500' },
  { step: '03', who: 'Veterinary Officer', what: 'Accepts, examines, logs Dx + treatment', detail: 'FMD confirmed · supportive care · case resolved', color: 'bg-indigo-500' },
  { step: '04', who: 'Sponsor', what: 'Kisii Cream Co-op reviews CLM-2026-0042', detail: 'KES 2,500 approved against Gold agreement', color: 'bg-maize-500' },
  { step: '05', who: 'County Authority', what: 'FMD surveillance counter increments', detail: 'Nyaribari Masaba ward · 3 cases/14d · alert active', color: 'bg-violet-500' },
];

const FAQ = [
  { q: 'Is this a real production system?', a: 'This is a fully interactive production-grade reference implementation running on synthetic Gusii-region data. The live Next.js + Supabase + Vercel AI SDK blueprint (RLS policies, schema, triggers) is documented in the Architecture section and ships as architecture.md + schema.sql in the app.' },
  { q: 'How is farmer data protected?', a: 'Supabase Row Level Security is deny-by-default: farmers see only their herds, vets only their assigned cases, sponsors only their agreements and claims. County surveillance sees anonymised aggregates — never farmer PII. Every mutation is written to an immutable audit log.' },
  { q: 'What does the AI actually do?', a: 'Symptom-to-differential triage with explainable urgency scoring. The clinical knowledge is a curated rule engine over 12 bovine disease profiles. The Vercel AI SDK integration seam is documented; the shipped build makes zero external LLM calls and claims none.' },
  { q: 'Does it work without connectivity?', a: 'Yes. All writes pass through an offline outbox (IndexedDB-pattern). Toggle OFFLINE in the topbar — actions queue locally and merge, with an audit record, the moment you sync.' },
  { q: 'Who can see claims?', a: 'Vets see claims they submitted; sponsors see claims against their agreements; farmers see claims for their own cases; admins see everything. No cross-visibility by design — enforced by RLS, not by convention.' },
];

export default function Landing() {
  const [faqOpen, setFaqOpen] = useState<number>(0);
  const [showVideoHint, setShowVideoHint] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="bg-paper text-ink overflow-x-clip">
      {/* ============ NAV ============ */}
      <header className="fixed top-0 inset-x-0 z-40 bg-pine-950/85 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto h-16 px-4 sm:px-6 flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-2.5">
            <svg viewBox="0 0 64 64" className="h-8 w-8"><rect width="64" height="64" rx="14" fill="#f6c945"/><path d="M14 40c6-14 14-20 24-20 6 0 11 2 14 6-3-1-6 0-7 4 4 1 6 5 6 9-5-2-9 0-11 5l-2-6c-6 3-14 4-24 2z" fill="#0f231b"/><circle cx="40" cy="26" r="2.4" fill="#f6c945"/></svg>
            <div className="leading-tight">
              <div className="font-display font-semibold text-sm text-maize-300">GLHIS</div>
              <div className="font-mono text-[7px] uppercase tracking-[0.22em] text-pine-300/80 hidden sm:block">Gusii Livestock Health Intelligence</div>
            </div>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-[12px] font-medium text-pine-100/85">
            <a href="#how" className="hover:text-white">How it works</a>
            <a href="#roles" className="hover:text-white">For every role</a>
            <a href="#capabilities" className="hover:text-white">Platform</a>
            <Link to="/app/docs" className="hover:text-white">Architecture</Link>
          </nav>
          <div className="flex items-center gap-2">
            <a href="tel:0800723000" className="hidden sm:flex items-center gap-1.5 text-[11px] font-mono font-semibold text-maize-300 border border-maize-400/30 rounded-lg px-2.5 h-8 hover:bg-maize-400/10"><PhoneCall size={12} /> 0800 723 000</a>
            <Link to="/login" className="inline-flex items-center gap-1.5 bg-maize-400 hover:bg-maize-300 text-pine-950 font-bold text-[12px] rounded-lg px-3.5 h-9 transition-colors">Enter demo <ArrowRight size={13} /></Link>
          </div>
        </div>
      </header>

      {/* ============ HERO ============ */}
      <section className="relative min-h-[100svh] flex items-end overflow-hidden">
        <video className="absolute inset-0 h-full w-full object-cover" src="/media/hero.mp4" autoPlay muted loop playsInline poster="/media/farmer.jpg" />
        <div className="absolute inset-0 bg-gradient-to-t from-pine-950 via-pine-950/70 to-pine-950/20" />
        <div className="absolute inset-0 bg-gradient-to-r from-pine-950/80 via-pine-950/20 to-transparent" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 w-full pt-28 pb-10 lg:pb-16 grid lg:grid-cols-12 gap-8 items-end">
          <div className="lg:col-span-8">
            <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} className="flex items-center gap-2 mb-5">
              <span className="h-2 w-2 rounded-full bg-maize-400 pulse-dot" />
              <span className="font-mono text-[10px] sm:text-[11px] uppercase tracking-[0.22em] text-maize-300">Live in Kisii & Nyamira counties · Synthetic demo data</span>
            </motion.div>
            <motion.h1 initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.75, delay: 0.08 }} className="font-display font-semibold text-maize-50 text-[40px] sm:text-6xl xl:text-[72px] leading-[1.02] tracking-tight">
              Healthy herds.<br />
              <span className="text-maize-400 italic">Fair claims.</span><br />
              Stronger milk value chain.
            </motion.h1>
            <motion.p initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.75, delay: 0.18 }} className="mt-5 text-pine-100/90 text-[14px] sm:text-[16px] max-w-xl leading-relaxed">
              GLHIS connects 40,000+ smallholder dairy farmers to KVB-verified veterinarians, sponsor-funded care with one-tap claims, and county-level disease surveillance — all enforced by database-grade RLS security.
            </motion.p>
            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.75, delay: 0.28 }} className="mt-7 flex flex-wrap items-center gap-3">
              <Link to="/login" className="inline-flex items-center gap-2 bg-maize-400 hover:bg-maize-300 text-pine-950 font-bold rounded-xl h-12 px-6 text-sm shadow-[0_8px_30px_-6px_rgba(246,201,69,0.5)] transition-all active:scale-[0.98]">Open the console <ArrowRight size={16} /></Link>
              <button onClick={() => setShowVideoHint(true)} className="inline-flex items-center gap-2 text-pine-50 font-semibold rounded-xl h-12 px-5 text-sm border border-white/20 hover:bg-white/10 transition-colors"><PlayCircle size={18} /> Watch the 5-step flow</button>
            </motion.div>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4, duration: 0.8 }} className="mt-8 flex flex-wrap gap-x-6 gap-y-2 font-mono text-[10px] sm:text-[10.5px] text-pine-200/80">
              <span><b className="text-maize-300">4,210</b> animals treated</span>
              <span><b className="text-maize-300">142</b> verified vets</span>
              <span><b className="text-maize-300">KES 18.4M</b> claims settled</span>
              <span><b className="text-maize-300">6</b> counties onboarding</span>
            </motion.div>
          </div>

          {/* floating case card */}
          <motion.div initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.35, duration: 0.8 }} className="lg:col-span-4">
            <div className="bg-pine-950/80 backdrop-blur-md border border-maize-400/25 rounded-2xl p-4 shadow-2xl max-w-sm ml-auto">
              <div className="flex items-center justify-between mb-3">
                <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-maize-300">Live case · GLH-2026-0147</span>
                <span className="flex items-center gap-1.5 font-mono text-[9px] text-red-300"><span className="h-1.5 w-1.5 rounded-full bg-red-400 pulse-dot" />URGENT</span>
              </div>
              {[
                { icon: <PawPrint size={13} />, t: 'Nyachaki · Friesian · 5 yrs', s: 'FMD suspected — blisters, drooling, fever 40.3°C' },
                { icon: <Stethoscope size={13} />, t: 'Dr. Grace Chacha · 1.2 km', s: 'Accepted 09:05 · both farms visited, treatment logged' },
                { icon: <ShieldCheck size={13} />, t: 'Claim CLM-2026-0042', s: 'KES 2,500 → Kisii Cream Co-op · pending review' },
              ].map((r, i) => (
                <div key={i} className="flex items-start gap-2.5 py-2 border-t border-white/5 first:border-0">
                  <span className="p-1.5 rounded-lg bg-maize-400/15 text-maize-300 mt-0.5">{r.icon}</span>
                  <span><span className="block text-[11px] font-semibold text-pine-50">{r.t}</span><span className="block text-[10.5px] text-pine-200/80 leading-snug">{r.s}</span></span>
                </div>
              ))}
              <button onClick={() => navigate('/login')} className="mt-3 w-full h-9 rounded-lg bg-maize-400 text-pine-950 text-[11px] font-bold flex items-center justify-center gap-1.5 hover:bg-maize-300">Follow this case live <ArrowRight size={12} /></button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ============ FLOW MODAL ============ */}
      {showVideoHint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-pine-950/70 backdrop-blur-sm" onClick={() => setShowVideoHint(false)} />
          <div className="relative bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl">
            <button onClick={() => setShowVideoHint(false)} className="absolute right-4 top-4 text-pine-700 hover:text-pine-950"><X size={18} /></button>
            <h3 className="font-display font-semibold text-xl text-pine-950">The 5-step live workflow</h3>
            <p className="text-[12px] text-pine-700 mt-1">Exactly what happens end-to-end — and what you can replay in the demo console:</p>
            <ol className="mt-4 space-y-2.5">
              {PIPELINE.map((p) => (
                <li key={p.step} className="flex items-start gap-3">
                  <span className={`${p.color} text-white font-mono text-[9px] font-bold rounded-md px-1.5 py-1`}>{p.step}</span>
                  <span><b className="text-[12px] text-pine-950">{p.who}:</b> <span className="text-[12px] text-pine-800">{p.what}</span><br /><span className="text-[10.5px] font-mono text-pine-500">{p.detail}</span></span>
                </li>
              ))}
            </ol>
            <Link to="/login" className="mt-5 flex items-center justify-center gap-2 h-11 rounded-xl bg-pine-950 text-maize-300 font-bold text-[13px] hover:bg-pine-900">Run it yourself <ArrowRight size={14} /></Link>
          </div>
        </div>
      )}

      {/* ============ PIPELINE STRIP ============ */}
      <section id="how" className="bg-pine-950 text-pine-100 border-y border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14">
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-maize-400 mb-2">One loop, five personas</div>
          <h2 className="font-display font-semibold text-3xl sm:text-4xl text-maize-50 max-w-2xl">From sick cow to settled claim — in one traceable loop.</h2>
          <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {PIPELINE.map((p, i) => (
              <div key={p.step} className="relative rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <div className="flex items-center justify-between">
                  <span className={`${p.color} h-6 w-6 rounded-md flex items-center justify-center font-mono text-[9px] font-bold text-white`}>{p.step}</span>
                  {i < PIPELINE.length - 1 && <ChevronRight size={15} className="text-pine-500 hidden lg:block" />}
                </div>
                <div className="mt-2.5 font-mono text-[9px] uppercase tracking-[0.18em] text-maize-300/90">{p.who}</div>
                <div className="mt-1 text-[11px] font-semibold text-pine-50 leading-snug">{p.what}</div>
                <div className="mt-1.5 font-mono text-[9px] text-pine-300/80 leading-relaxed">{p.detail}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ ROLE CARDS ============ */}
      <section id="roles" className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-pine-600 mb-2">Five workspaces · one database</div>
        <h2 className="font-display font-semibold text-3xl sm:text-4xl text-pine-950 max-w-2xl">Every persona gets a real console — not a read-only demo dashboard.</h2>
        <div className="mt-10 grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { img: '/media/farmer.jpg', role: 'Farmer', color: 'bg-emerald-600', to: '/login', lines: ['Register farms & tagged animals', 'AI triage report in 90 seconds', 'Find nearest verified vet', 'Track cases, claims & coverage'] },
            { img: '/media/vet.jpg', role: 'Veterinary Officer', color: 'bg-sky-600', to: '/login', lines: ['Accept/decline assigned cases', 'Log exams, diagnoses, treatments', 'Submit itemized claims to sponsors', 'Earn rating & verification status'] },
            { img: '/media/coop.jpg', role: 'Sponsor / Milk Buyer', color: 'bg-maize-500', to: '/login', lines: ['Gold/Silver agreements & caps', 'Enrollment codes for farmers', 'Claims approval desk with reasons', 'Live utilization analytics'] },
          ].map((c) => (
            <div key={c.role} className="group rounded-2xl overflow-hidden border border-pine-900/10 bg-white shadow-sm hover:shadow-xl transition-shadow">
              <div className="relative h-44 overflow-hidden">
                <img src={c.img} alt={c.role} className="absolute inset-0 h-full w-full object-cover group-hover:scale-105 transition-transform duration-700" />
                <div className="absolute inset-0 bg-gradient-to-t from-pine-950/85 via-pine-950/20 to-transparent" />
                <span className={`absolute bottom-3 left-4 ${c.color} text-white font-mono text-[10px] font-bold uppercase tracking-[0.18em] rounded-md px-2 py-1`}>{c.role}</span>
              </div>
              <div className="p-4">
                <ul className="space-y-1.5">
                  {c.lines.map((l) => <li key={l} className="flex items-start gap-2 text-[12px] text-pine-900"><CheckCircle2 size={13} className="text-pine-500 mt-0.5 shrink-0" />{l}</li>)}
                </ul>
                <Link to={c.to} className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-bold text-pine-800 hover:text-pine-950">Enter as {c.role} <ArrowRight size={12} /></Link>
              </div>
            </div>
          ))}
          {[
            { role: 'County Livestock Authority', color: 'bg-violet-600', lines: ['Anonymised ward-level surveillance', 'FMD/LSD outbreak threshold alerts', '6-week incidence trends', 'CSV + print reports for Directorate'], icon: <LineChart size={26} /> },
            { role: 'Platform Administrator', color: 'bg-red-600', lines: ['Verify vet licenses (KVB)', 'Approve sponsor agreements', 'Suspend/reinstate any account', 'Full immutable audit log access'], icon: <Lock size={26} /> },
            { role: 'Tick & Prevention Engine', color: 'bg-emerald-700', lines: ['Dipping calendars & rotation', 'Per-farm compliance scoring', 'Vaccination schedules & overdue flags', 'Herd-health planning for wards'], icon: <Syringe size={26} /> },
          ].map((c) => (
            <div key={c.role} className="group rounded-2xl overflow-hidden border border-pine-900/10 bg-pine-950 shadow-sm hover:shadow-xl transition-shadow p-5 flex flex-col">
              <span className={`${c.color} self-start text-white rounded-xl p-3`}>{c.icon}</span>
              <div className="mt-3 font-display font-semibold text-lg text-maize-100">{c.role}</div>
              <ul className="mt-2 space-y-1.5 flex-1">
                {c.lines.map((l) => <li key={l} className="flex items-start gap-2 text-[12px] text-pine-100/85"><CheckCircle2 size={13} className="text-maize-400 mt-0.5 shrink-0" />{l}</li>)}
              </ul>
              <Link to="/login" className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-bold text-maize-300 hover:text-maize-200">Enter console <ArrowRight size={12} /></Link>
            </div>
          ))}
        </div>
      </section>

      {/* ============ CAPABILITIES ============ */}
      <section id="capabilities" className="bg-white border-y border-pine-900/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-pine-600 mb-2">Platform capabilities</div>
          <h2 className="font-display font-semibold text-3xl sm:text-4xl text-pine-950 max-w-2xl">Built like a startup product. Secured like a bank. Documented like government.</h2>
          <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {CAPABILITIES.map((c) => (
              <div key={c.title} className="rounded-2xl border border-pine-900/10 bg-paper p-5 hover:-translate-y-0.5 hover:shadow-lg transition-all">
                <span className="inline-flex p-2.5 rounded-xl bg-pine-800 text-maize-300">{c.icon}</span>
                <div className="mt-3 flex items-center gap-2">
                  <h3 className="font-display font-semibold text-[15px] text-pine-950">{c.title}</h3>
                  <span className="font-mono text-[8px] uppercase tracking-widest text-pine-600 border border-pine-200 rounded px-1.5 py-0.5">{c.tag}</span>
                </div>
                <p className="mt-1.5 text-[12px] text-pine-800 leading-relaxed">{c.body}</p>
              </div>
            ))}
          </div>
          {/* security strip */}
          <div className="mt-8 grid sm:grid-cols-3 gap-3 font-mono text-[10px] text-pine-200">
            {[
              { icon: <Lock size={14} />, t: 'RLS deny-by-default', s: 'Helper functions auth_role(), is_admin(), is_sponsor_member() enforce every policy at the database layer' },
              { icon: <CloudOff size={14} />, t: 'Offline-first outbox', s: 'Writes captured to IndexedDB queue, replayed FIFO on reconnect with idempotency' },
              { icon: <Database size={14} />, t: 'Immutable audit trail', s: 'Postgres triggers write actor, role, action, entity and diff — users cannot forge history' },
            ].map((s) => (
              <div key={s.t} className="bg-pine-950 rounded-xl px-4 py-3.5 flex items-start gap-2.5"><span className="text-maize-400 mt-0.5">{s.icon}</span><span><b className="block text-maize-300 text-[10.5px]">{s.t}</b><span className="block text-pine-200/85 leading-snug mt-0.5 normal-case">{s.s}</span></span></div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ KNOWLEDGE TEASER ============ */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16 grid lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4">
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-pine-600 mb-2">Farmer education</div>
          <h2 className="font-display font-semibold text-3xl text-pine-950">Knowledge that prevents the case.</h2>
          <p className="mt-3 text-[13px] text-pine-800 leading-relaxed">Field guides written for Gusii smallholders — recognition, isolation, rotation calendars and feeding. Available offline after first sync.</p>
          <Link to="/app/knowledge" className="mt-4 inline-flex items-center gap-1.5 text-[12px] font-bold text-pine-800 hover:text-pine-950">Open knowledge base <ArrowRight size={13} /></Link>
        </div>
        <div className="lg:col-span-8 grid sm:grid-cols-2 gap-3">
          {knowledgeArticles.slice(0, 4).map((a) => (
            <Link to="/app/knowledge" key={a.id} className="rounded-2xl border border-pine-900/10 bg-paper p-4 hover:border-pine-400 transition-colors">
              <span className="font-mono text-[8.5px] uppercase tracking-[0.2em] text-maize-600">{a.category} · {a.read_minutes} min read</span>
              <h3 className="mt-1.5 font-display font-semibold text-[14px] text-pine-950 leading-snug">{a.title}</h3>
              <p className="mt-1 text-[11px] text-pine-700 line-clamp-2">{a.excerpt}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* ============ FAQ ============ */}
      <section className="bg-pine-950 text-pine-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16">
          <h2 className="font-display font-semibold text-3xl text-maize-50">Straight answers, no marketing fog.</h2>
          <div className="mt-6 divide-y divide-white/10 border-y border-white/10">
            {FAQ.map((f, i) => (
              <div key={i}>
                <button onClick={() => setFaqOpen(faqOpen === i ? -1 : i)} className="w-full flex items-center justify-between gap-4 text-left py-4">
                  <span className="font-semibold text-[13px] sm:text-[14px] text-pine-50">{f.q}</span>
                  <ChevronDown size={16} className={`shrink-0 text-maize-400 transition-transform ${faqOpen === i ? 'rotate-180' : ''}`} />
                </button>
                {faqOpen === i && <p className="pb-4 text-[12px] text-pine-100/85 leading-relaxed max-w-3xl">{f.a}</p>}
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link to="/login" className="inline-flex items-center gap-2 bg-maize-400 hover:bg-maize-300 text-pine-950 font-bold rounded-xl h-13 px-8 py-4 text-[15px]">Enter the demo console <ArrowRight size={17} /></Link>
            <p className="mt-3 font-mono text-[9.5px] text-pine-400 uppercase tracking-[0.2em]">No signup · 5 one-click personas · synthetic data</p>
          </div>
        </div>
      </section>

      {/* ============ FOOTER ============ */}
      <footer className="bg-[#0a1a13] text-pine-200 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 grid md:grid-cols-4 gap-8 text-[11px]">
          <div>
            <div className="font-display font-semibold text-maize-300 text-base">GLHIS</div>
            <p className="mt-2 text-pine-300/85 leading-relaxed">Gusii Livestock Health & Value Chain Intelligence System. A joint program of Kisii & Nyamira County Livestock Directorates with dairy co-operatives.</p>
          </div>
          <div>
            <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-pine-400 mb-2">Product</div>
            <ul className="space-y-1.5"><li><Link to="/login" className="hover:text-white">Demo console</Link></li><li><Link to="/app/docs" className="hover:text-white">Architecture & schema</Link></li><li><a href="/architecture.md" className="hover:text-white">architecture.md ↓</a></li><li><a href="/schema.sql" className="hover:text-white">schema.sql ↓</a></li></ul>
          </div>
          <div>
            <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-pine-400 mb-2">Governance</div>
            <ul className="space-y-1.5"><li><BadgeCheck size={11} className="inline mr-1" />KVB-licensed vets only</li><li><Lock size={11} className="inline mr-1" />RLS + immutable audit log</li><li><Building2 size={11} className="inline mr-1" />County surveillance (anonymised)</li></ul>
          </div>
          <div>
            <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-pine-400 mb-2">Emergency</div>
            <a href="tel:0800723000" className="font-mono text-maize-300 text-sm font-bold">0800 723 000</a>
            <p className="mt-1 text-pine-300/80">24/7 livestock disease hotline. Report suspected FMD — it is free and confidential.</p>
          </div>
        </div>
        <div className="border-t border-white/5 py-4 text-center font-mono text-[9px] uppercase tracking-[0.25em] text-pine-500">© 2026 GLHIS · Kisii & Nyamira Counties · Synthetic demonstration dataset</div>
      </footer>
    </div>
  );
}
