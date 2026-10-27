import { Link } from 'react-router-dom';
import {
  ArrowRight, Stethoscope, Syringe, ShieldCheck, Radar, BadgeCheck, MapPin,
  Wheat, Coins, Activity, ClipboardList, Phone, Mail, ChevronRight, Tractor, Users,
} from 'lucide-react';
import { useApp } from '../lib/session';

export default function Landing() {
  const { user, role } = useApp();
  const dashPath = `/app/${role}`;

  return (
    <div className="min-h-screen bg-cream-50 font-sans text-pine-950 antialiased">
      {/* ============ NAV ============ */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-pine-950/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <LogoMark />
            <span className="font-display text-[17px] font-semibold tracking-tight text-cream-50">Dairy<span className="text-gold-400">Hub</span></span>
          </Link>
          <nav className="hidden items-center gap-7 text-[13px] font-medium text-cream-100/80 md:flex">
            <a href="#platform" className="hover:text-gold-300">Platform</a>
            <a href="#roles" className="hover:text-gold-300">Who it's for</a>
            <a href="#numbers" className="hover:text-gold-300">Impact</a>
            <a href="#faq" className="hover:text-gold-300">FAQ</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/login" className="hidden rounded-xl px-3 py-2 text-[13px] font-semibold text-cream-100/90 hover:text-white sm:block">Sign in</Link>
            <Link to={dashPath} className="rounded-xl bg-gold-400 px-4 py-2 text-[13px] font-bold text-pine-950 transition hover:bg-gold-300">
              Open Dashboard <ArrowRight className="ml-1 inline h-3.5 w-3.5" strokeWidth={2.5} />
            </Link>
          </div>
        </div>
      </header>

      {/* ============ HERO ============ */}
      <section className="terrain-bg relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[.16]" style={{ backgroundImage: 'url(/images/hero-dairy.jpg)', backgroundSize: 'cover', backgroundPosition: 'center 62%' }} />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-pine-950/95 via-pine-950/80 to-pine-950/25" />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 pb-20 pt-16 sm:px-6 lg:grid-cols-[1.15fr_.85fr] lg:items-center lg:pb-28 lg:pt-24">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-gold-400/40 bg-gold-400/10 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-gold-300">
              <span className="relative flex h-2 w-2"><span className="ping-ring absolute inline-flex h-full w-full rounded-full bg-gold-400" /><span className="relative inline-flex h-2 w-2 rounded-full bg-gold-400" /></span>
              Kisii &amp; Nyamira Counties · Live
            </div>
            <h1 className="font-display text-[42px] font-semibold leading-[1.04] tracking-tight text-cream-50 sm:text-6xl lg:text-[64px]">
              Every healthy cow,<br />
              <span className="text-gold-400">counted, treated</span><br /> and claimed.
            </h1>
            <p className="mt-6 max-w-xl text-[17px] leading-relaxed text-cream-100/85">
              The intelligence network that connects Gusii's dairy farmers to veterinary officers,
              sponsor-funded treatment and county disease surveillance — one registry, one AI triage,
              one claims rail from diagnosis to M-Pesa payout.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link to="/login" className="group inline-flex h-12 items-center gap-2 rounded-2xl bg-gold-400 px-6 text-[15px] font-bold text-pine-950 shadow-lift transition hover:bg-gold-300">
                Sign in as {user.role === 'farmer' ? 'a farmer' : user.full_name.split(' ')[0]}
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" strokeWidth={2.5} />
              </Link>
              <a href="#platform" className="inline-flex h-12 items-center gap-2 rounded-2xl border border-cream-100/25 px-6 text-[15px] font-semibold text-cream-100 hover:border-gold-400 hover:text-gold-300">
                Explore the platform
              </a>
            </div>
            <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-3 text-[12px] font-medium text-cream-100/60">
              <span className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-pine-500" /> Row-level security on every table</span>
              <span className="flex items-center gap-1.5"><BadgeCheck className="h-4 w-4 text-pine-500" /> Immutable audit trail</span>
              <span className="flex items-center gap-1.5"><Radar className="h-4 w-4 text-pine-500" /> Outbreak early warning</span>
            </div>
          </div>

          {/* Hero glass stat panel */}
          <div className="relative hidden lg:block">
            <div className="rounded-3xl border border-white/15 bg-pine-900/70 p-5 shadow-lift backdrop-blur-xl">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-gold-300">Live Platform Pulse</span>
                <span className="flex items-center gap-1.5 text-[10px] font-semibold text-emerald-300"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />OPERATIONAL</span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                {[
                  { n: '2,412', l: 'registered cattle', d: 'across 8 pilot farms' },
                  { n: '148', l: 'vet cases this quarter', d: '74% recovered &lt; 14 days' },
                  { n: 'KES 4.5M', l: 'sponsor-funded care pool', d: 'Maziwa Co-op FY2026' },
                  { n: '6 / 45', l: 'wards with active early-warning', d: 'ECF & LSD hotspots' },
                ].map((s, i) => (
                  <div key={i} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="font-mono text-xl font-semibold text-gold-300">{s.n}</p>
                    <p className="mt-1 text-[11px] font-semibold leading-tight text-cream-100/90">{s.l}</p>
                    <p className="mt-0.5 text-[10px] leading-tight text-cream-100/50">{s.d}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-2xl border border-red-400/30 bg-red-500/10 p-4">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-red-500/20"><Activity className="h-4 w-4 text-red-300" /></span>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-red-300">Critical — ECF surge, Kitutu Chache</p>
                </div>
                <p className="mt-1.5 text-[11px] leading-snug text-red-100/80">6 cases in 14 days (threshold 4). Vector dip compliance 61%. Advisory push-sent to 38 linked farmers.</p>
              </div>
              <p className="mt-3 text-center font-mono text-[9.5px] text-cream-100/40">SYNCED · KISII-NYAMIRA CLUSTER · UTC+3</p>
            </div>
          </div>
        </div>
        {/* ticker */}
        <div className="relative border-t border-white/10 bg-pine-950/70 py-2 backdrop-blur">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-8 gap-y-1 px-4 text-[10.5px] font-mono text-cream-100/55">
            <span>▲ MILK YIELD 12.4 L/COW/DAY (+8% YoY)</span>
            <span>● ECF ALERT ACK PENDING — KIOGORO/RIOMAGUKA</span>
            <span>▲ CLAIMS PAID THIS MONTH: KES 341,200</span>
            <span>● TICK DIP COMPLIANCE: 61% → TARGET 85%</span>
          </div>
        </div>
      </section>

      {/* ============ PLATFORM MODULES ============ */}
      <section id="platform" className="bg-cream-50 py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="label-caps text-pine-600">The Platform</p>
              <h2 className="mt-2 max-w-2xl font-display text-3xl font-semibold tracking-tight text-pine-950 sm:text-4xl">One spine from sick cow to paid claim.</h2>
            </div>
            <Link to="/login" className="group flex items-center gap-1 text-sm font-semibold text-pine-800 hover:text-pine-600">Start with demo personas <ChevronRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" /></Link>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: Wheat, title: 'Farm & Animal Registry', body: 'RFID-tagged herds, lactation stage, parity, yield history — geo-mapped to all 65 Kisii & Nyamira wards.' },
              { icon: Stethoscope, title: 'AI Disease Pre-Screening', body: 'Symptom-to-differential engine trained on East African dairy protocols. Red-flag override → emergency in one tap.' },
              { icon: MapPin, title: 'Geo Vet Finder', body: 'Nearest available veterinary officer ranked by Haversine distance, specialty and on-duty status.' },
              { icon: Coins, title: 'Sponsor-Funded Claims', body: 'Draft → submitted → reviewed → approved → M-Pesa disbursed, with full line-item audit.' },
              { icon: ClipboardList, title: 'Case & Treatment Tracking', body: 'Immutable clinical timeline per case: visit notes, drugs, withdrawal periods, outcomes.' },
              { icon: Radar, title: 'Surveillance & Early Warning', body: 'Ward-level 14-day case clustering against disease-specific thresholds. Acknowledge in one tap.' },
              { icon: Syringe, title: 'Tick-Control & Herd Health', body: 'Dip calendars, acaricide rotation, deworming & vaccination plans with overdue flags.' },
              { icon: Activity, title: 'Exportable Reports', body: 'County and sponsor reports — CSV, JSON or print-to-PDF. Fully audit-logged exports.' },
            ].map((m, i) => (
              <div key={i} className="group rounded-2xl border border-cream-200 bg-white p-5 shadow-card transition hover:-translate-y-1 hover:border-pine-600/30 hover:shadow-lift">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-pine-50 text-pine-700 transition group-hover:bg-pine-800 group-hover:text-gold-300">
                  <m.icon className="h-6 w-6" strokeWidth={1.7} />
                </div>
                <h3 className="mt-3 font-display text-[16px] font-semibold text-pine-950">{m.title}</h3>
                <p className="mt-1 text-[12.5px] leading-relaxed text-stone-600">{m.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ ROLES ============ */}
      <section id="roles" className="border-y border-pine-900 bg-pine-950 py-16 text-cream-100">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <p className="label-caps text-gold-400">Who It's For</p>
          <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight sm:text-4xl">Five roles. One source of truth.</h2>
          <div className="mt-10 grid gap-3 md:grid-cols-5">
            {[
              { role: 'farmer', icon: Tractor, name: 'Farmers', points: ['Register herd in minutes', 'AI triage before vet call', 'Claims auto-drafted from case'] },
              { role: 'vet', icon: Stethoscope, name: 'Vets', points: ['Distance-ranked caseload', 'Treatment & withdrawal log', 'Claim recommendation in-case'] },
              { role: 'sponsor', icon: Users, name: 'Sponsors & Co-ops', points: ['Fund agronomy-proof care', 'Approve claims with line items', 'Pool utilization dashboards'] },
              { role: 'county', icon: Radar, name: 'County Authority', points: ['Live outbreak map', 'Threshold breach alerts', 'Notifiable disease reporting'] },
              { role: 'admin', icon: ShieldCheck, name: 'Platform Admins', points: ['Role-based access control', 'Sponsor & pool config', 'Full audit-log access'] },
            ].map((r) => (
              <Link key={r.role} to="/login" className="group flex min-h-[220px] flex-col rounded-2xl border border-white/10 bg-white/5 p-5 transition hover:border-gold-400/50 hover:bg-white/10">
                <r.icon className="h-7 w-7 text-gold-400" strokeWidth={1.6} />
                <h3 className="mt-3 font-display text-lg font-semibold text-cream-50">{r.name}</h3>
                <ul className="mt-2 space-y-1.5 text-[12px] text-cream-100/70">
                  {r.points.map((p) => <li key={p} className="flex items-start gap-1.5"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-gold-400" />{p}</li>)}
                </ul>
                <span className="mt-auto pt-4 text-[11px] font-bold uppercase tracking-wider text-gold-300 opacity-80 group-hover:opacity-100">Sign in as {r.name.replace(/s & Co-ops/, '').replace(/s$/, '')} →</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ============ IMPACT NUMBERS ============ */}
      <section id="numbers" className="relative bg-cream-100 py-14">
        <img src="/images/vet-care.jpg" alt="Veterinary officer examining a cow in a lush Kenyan pasture" className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-[.1]" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid grid-cols-2 gap-6 text-center md:grid-cols-4">
            {[
              ['2,412', 'cattle registered'],
              ['KES 1.41M', 'sponsor-funded care paid'],
              ['6', 'outbreak early-warnings raised'],
              ['14 days', 'avg. case → recovery'],
            ].map(([n, l]) => (
              <div key={l as string}>
                <p className="font-display text-3xl font-semibold text-pine-900 sm:text-4xl">{n}</p>
                <p className="mt-1 text-[12px] font-semibold uppercase tracking-wide text-stone-500">{l}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ FAQ ============ */}
      <section id="faq" className="bg-cream-50 py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <p className="label-caps text-pine-600">FAQ</p>
          <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight text-pine-950">Straight answers.</h2>
          <div className="mt-8 divide-y divide-cream-200 rounded-2xl border border-cream-200 bg-white">
            {[
              ['Is this a real deployment or a pilot?', 'GLHVIS is a production-grade platform in pilot with 8 farms across Kisii and Nyamira counties (2026). The system architecture, RBAC, audit trail and data model are built for county-scale rollout.'],
              ['How does the AI triage work?', 'A deterministic veterinary rule engine (weighted symptom→disease matrices for East African dairy protocols) always answers. When an AI gateway key is configured, a language-model layer adds a plain-language explanation. Red-flag symptom sets always override to EMERGENCY.'],
              ['Who pays for treatment?', 'Registered sponsors (Maziwa Co-operative, Gusii Fresh Dairy) run funding pools. A farmer’s case auto-links to a claim; line items are costed from real drug/vet-fee costs and paid via M-Pesa after sponsor approval.'],
              ['Is my data safe?', 'Yes. Every table enforces row-level security in Postgres. Farmers see only their own records; sponsors see only linked farmers; vets see only their caseload unless triaged. All mutations are written to an immutable audit log.'],
              ['What does a sponsor need to onboard?', 'A signed MoU, an admin account per co-op, and a funded pool. Onboarding takes one working session. Contact the platform team.'],
            ].map(([q, a], i) => (
              <details key={i} className="group px-6 py-4">
                <summary className="cursor-pointer list-none font-semibold text-pine-950 marker:hidden">{q as string}<span className="float-right text-pine-600 transition-transform group-open:rotate-45">+</span></summary>
                <p className="mt-2 max-w-3xl text-[13.5px] leading-relaxed text-stone-600">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ============ FOOTER ============ */}
      <footer className="terrain-bg border-t border-white/10 py-10 text-cream-100/70">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-4 sm:px-6 md:flex-row md:items-center">
          <div className="flex items-center gap-2.5">
            <LogoMark small />
            <div className="text-[12px] leading-tight">
              <p className="font-bold text-cream-100">DairyHub Health &amp; Value Chain Intelligence System</p>
              <p className="text-cream-100/50">Kisii County Government · Department of Agriculture, Livestock &amp; Fisheries</p>
            </div>
          </div>
          <div className="space-y-1 text-[12px]">
            <p className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-gold-400" /> +254 709 312 400 (County DVS Hotline)</p>
            <p className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-gold-400" /> health@maziwacoop.co.ke</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export function LogoMark({ small = false }: { small?: boolean }) {
  const s = small ? 30 : 36;
  return (
    <svg width={s} height={s} viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <rect x="2" y="2" width="44" height="44" rx="12" fill="#0d2b20" stroke="#e0a83e" strokeWidth="2.5" />
      {/* stylised cow head */}
      <path d="M14 17c-2.4 0-4 1.8-4 4 0 1.9 1.2 3.4 2.7 4.1C14.4 29 15 32.6 18.2 34c1.9.8 4.3.8 6.8.8s4.9 0 6.8-.8c3.2-1.4 3.8-5 5.5-8.9C39 24.4 40 22.9 40 21c0-2.2-1.6-4-4-4-2 0-3.4.8-4.8 2.4-3.4-1.4-8-1.4-11.2 0C18.6 17.8 16 17 14 17Z" stroke="#e0a83e" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" fill="#154231" />
      <circle cx="18.5" cy="23.5" r="1.5" fill="#ecc36b" /><circle cx="31.5" cy="23.5" r="1.5" fill="#ecc36b" />
      <path d="M22.5 31h5" stroke="#ecc36b" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
