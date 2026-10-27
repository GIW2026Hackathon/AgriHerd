import { useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Coins, Users, Building2, ChevronRight, Wallet, PiggyBank, CheckCircle2,
  Clock, TrendingUp, ArrowRight,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useApp } from '../../lib/session';
import { Card, CardHeader, Stat, Badge, claimStatusTone, CLAIM_STATUS_LABEL, Avatar } from '../../components/ui';
import { kes, kesExact, timeAgo } from '../../lib/utils';

export default function SponsorHome() {
  const { db, user, client } = useApp();
  const navigate = useNavigate();

  const sponsor = useMemo(() => client.sponsorForProfile(user.id), [client, user]);
  const myPools = useMemo(() => client.poolsForSponsorProfile(user.id), [client, user]);
  const myClaims = useMemo(() => client.claimsForUser(user), [client, user, db.claims]);
  const members = useMemo(() => client.membersForSponsor(user.id), [client, user]);

  const reviewable = myClaims.filter((c) => c.status === 'submitted' || c.status === 'under_review');
  const approvedUnpaid = myClaims.filter((c) => c.status === 'approved');
  const paid = myClaims.filter((c) => c.status === 'disbursed' || c.status === 'reconciled');
  const totalPaid = paid.reduce((s, c) => s + c.amount_kes, 0);
  const pendingValue = reviewable.reduce((s, c) => s + c.amount_kes, 0) + approvedUnpaid.reduce((s, c) => s + c.amount_kes, 0);

  const poolTotal = myPools.reduce((s, p) => s + p.total_kes, 0);
  const poolPaid = myPools.reduce((s, p) => s + p.disbursed_kes, 0);
  const poolCommitted = myPools.reduce((s, p) => s + p.committed_kes, 0);
  const util = poolTotal > 0 ? poolPaid / poolTotal : 0;

  const tierCounts = ['premium', 'standard', 'basic'].map((t) => ({ tier: t, n: members.filter((m) => m.coverage_tier === t).length }));

  // monthly payouts (synthetic history derived from disbursed claims + baseline)
  const payoutSeries = [
    { m: 'May', paid: 96_400 }, { m: 'Jun', paid: 148_200 }, { m: 'Jul', paid: 201_800 },
    { m: 'Aug', paid: 176_500 }, { m: 'Sep', paid: 252_100 }, { m: 'Oct', paid: totalPaid || 165_700 },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-pine-800 bg-gradient-to-br from-pine-900 to-pine-950 px-6 py-5 text-cream-100">
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gold-400 text-pine-950"><Building2 className="h-7 w-7" strokeWidth={1.7} /></span>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-gold-300">Sponsor Workspace{sponsor?.co_op_reg_no ? ` · ${sponsor.co_op_reg_no}` : ''}</p>
            <h1 className="mt-0.5 font-display text-2xl font-semibold text-cream-50">{sponsor?.company_name ?? user.organization}</h1>
            <p className="mt-0.5 text-[12px] text-cream-100/70">{members.length} linked farmer{members.length === 1 ? '' : 's'} · {db.farms.filter(f => members.some(m => db.profiles.find(p => p.id === m.farmer_id)?.id === f.owner_id)).length} farms under coverage</p>
          </div>
        </div>
        <button onClick={() => navigate('/app/sponsor/claims')} className="group flex h-11 items-center gap-2 rounded-2xl bg-gold-400 px-5 text-[13px] font-bold text-pine-950 hover:bg-gold-300">
          <Coins className="h-5 w-5" /> Review {reviewable.length} pending claim{reviewable.length === 1 ? '' : 's'}<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" strokeWidth={2.5} />
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Funding pools (FY2026)" value={kes(poolTotal)} tone="pine" icon={<PiggyBank className="h-4 w-4" />} sub={`${myPools.length} active pools`} />
        <Stat label="Disbursed to farms" value={kes(poolPaid)} tone="blue" icon={<Wallet className="h-4 w-4" />} sub={`${Math.round(util * 100)}% of funded pools committed/paid`} />
        <Stat label="In pipeline" value={kes(pendingValue)} tone="gold" icon={<Clock className="h-4 w-4" />} sub={`${reviewable.length} awaiting review · ${approvedUnpaid.length} approved unpaid`} />
        <Stat label="Claims paid (all-time)" value={paid.length} tone="pine" icon={<CheckCircle2 className="h-4 w-4" />} sub={kes(totalPaid)} />
      </div>

      {/* Pool utilization */}
      <Card>
        <CardHeader title="Funding Pool Utilization" sub="Disbursed vs committed vs available — per pool" action={<Link to="/app/sponsor/claims" className="flex items-center gap-1 text-[12px] font-semibold text-pine-800">Claims workflow <ChevronRight className="h-4 w-4" /></Link>} />
        <div className="grid gap-4 p-5 md:grid-cols-2">
          {myPools.map((p) => {
            const paidPct = (p.disbursed_kes / p.total_kes) * 100;
            const committedPct = (p.committed_kes / p.total_kes) * 100;
            return (
              <div key={p.id} className="rounded-2xl border border-cream-200 bg-cream-50 p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[13px] font-bold text-pine-950">{p.name}</p>
                  <span className="font-mono text-[11px] font-semibold text-stone-500">{p.period_start.slice(0, 7)} → {p.period_end.slice(0, 7)}</span>
                </div>
                <div className="mt-3 h-3.5 w-full overflow-hidden rounded-full bg-cream-200">
                  <div className="flex h-full">
                    <div className="h-full bg-pine-700" style={{ width: `${paidPct}%` }} />
                    <div className="h-full bg-gold-400/80" style={{ width: `${committedPct}%` }} />
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                  <span className="flex items-center gap-1 font-semibold text-pine-800"><span className="h-2 w-2 rounded-sm bg-pine-700" />Paid {kes(p.disbursed_kes)}</span>
                  <span className="flex items-center gap-1 font-semibold text-gold-600"><span className="h-2 w-2 rounded-sm bg-gold-400" />Committed {kes(p.committed_kes)}</span>
                  <span className="flex items-center gap-1 font-semibold text-stone-500">Available {kes(p.total_kes - p.disbursed_kes - p.committed_kes)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <div className="grid gap-5 xl:grid-cols-5">
        {/* Claims awaiting action */}
        <Card className="xl:col-span-3">
          <CardHeader title="Claims Awaiting Your Action" sub="Sorted by submission — open the queue to approve, reject or request a vet recommendation" action={<Link to="/app/sponsor/claims" className="flex items-center gap-1 text-[12px] font-semibold text-pine-800">Open queue <ChevronRight className="h-4 w-4" /></Link>} />
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-cream-200 bg-cream-50">
                <tr>{['Claim', 'Farm / Case', 'Amount', 'Vet rec.', 'Status', 'SLA'].map(h => <th key={h} className="px-4 py-2.5 text-left text-[10.5px] font-bold uppercase tracking-wider text-stone-500">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-cream-100">
                {reviewable.map((c) => {
                  const farm = db.farms.find(f => f.id === c.farm_id);
                  const kase = db.cases.find(k => k.id === c.case_id);
                  const ageDays = (Date.now() - new Date(c.submitted_at ?? c.created_at).getTime()) / 86400_000;
                  return (
                    <tr key={c.id} className="cursor-pointer transition hover:bg-pine-50/50" onClick={() => navigate('/app/sponsor/claims')}>
                      <td className="px-4 py-3 font-mono text-[11.5px] font-bold text-pine-900">{c.claim_number}</td>
                      <td className="px-4 py-3"><p className="text-[12px] font-semibold text-pine-950">{farm?.name}</p><p className="text-[10.5px] text-stone-500">{kase?.case_number} · {kase?.diagnosis?.slice(0, 38) ?? kase?.chief_complaint.slice(0, 38)}</p></td>
                      <td className="px-4 py-3 text-[13px] font-bold text-pine-950">{kesExact(c.amount_kes)}</td>
                      <td className="px-4 py-3 text-[11px] text-stone-600">{c.vet_recommendation ? '✓ on file' : <span className="text-amber-700">pending</span>}</td>
                      <td className="px-4 py-3"><Badge tone={claimStatusTone(c.status)}>{CLAIM_STATUS_LABEL[c.status]}</Badge></td>
                      <td className="px-4 py-3"><span className={`font-mono text-[11px] font-bold ${ageDays > 3 ? 'text-red-700' : 'text-stone-500'}`}>{ageDays.toFixed(1)}d</span></td>
                    </tr>
                  );
                })}
                {reviewable.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-[12.5px] text-stone-500">Nothing waiting. All submitted claims have been actioned. 🎉</td></tr>}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Right rail */}
        <div className="space-y-5 xl:col-span-2">
          {/* Payouts chart */}
          <Card>
            <CardHeader title="Monthly Disbursements" sub="KES paid out, trailing 6 months" action={<TrendingUp className="h-4 w-4 text-pine-700" />} />
            <div className="h-40 px-2 pb-4 pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={payoutSeries} margin={{ top: 6, right: 8, left: -4, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e9e5d3" vertical={false} />
                  <XAxis dataKey="m" tick={{ fontSize: 10.5, fill: '#78716c' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10.5, fill: '#78716c' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`} />
                  <Tooltip cursor={{ fill: '#f4f1e4' }} contentStyle={{ borderRadius: 12, border: '1px solid #e9e5d3', fontSize: 12 }} formatter={(v) => [kes(Number(v)), 'Disbursed']} />
                  <Bar dataKey="paid" fill="#1c5740" radius={[6, 6, 0, 0]} maxBarSize={38} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Linked farmers */}
          <Card>
            <CardHeader title="Linked Farmers" sub={`${members.length} enrolled · coverage tiers`} />
            <ul className="max-h-56 divide-y divide-cream-100 overflow-y-auto">
              {members.map((m) => {
                const farmer = db.profiles.find(p => p.id === m.farmer_id);
                const farm = db.farms.find(f => f.owner_id === m.farmer_id);
                return (
                  <li key={m.farmer_id} className="flex items-center gap-2.5 px-4 py-2.5">
                    <Avatar name={farmer?.full_name ?? '?'} size={32} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12px] font-semibold text-pine-950">{farmer?.full_name}</p>
                      <p className="truncate text-[10px] text-stone-500">{farm?.name} · {farm?.herd_size} head · joined {new Date(m.joined_at).getFullYear()}</p>
                    </div>
                    <Badge tone={m.coverage_tier === 'premium' ? 'gold' : m.coverage_tier === 'standard' ? 'blue' : 'slate'}>{m.coverage_tier.toUpperCase()}</Badge>
                  </li>
                );
              })}
            </ul>
            <div className="flex gap-3 border-t border-cream-100 px-4 py-3 text-[10.5px] font-semibold text-stone-500">
              {tierCounts.map(t => <span key={t.tier}>{t.tier.toUpperCase()}: <b className="text-pine-900">{t.n}</b></span>)}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
