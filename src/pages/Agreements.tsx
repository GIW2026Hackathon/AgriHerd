/* Agreements — sponsor-facing configuration of Gold/Silver programs */
import { useState } from 'react';
import { Building2, Plus, Copy, BadgeCheck, PauseCircle, Sparkles } from 'lucide-react';
import { useStore } from '../lib/store';
import { Card, PageHeader, Button, StatusPill, Field, inputCls, selectCls, Modal } from '../components/ui';
import { formatKES } from '../lib/geo';
import { DISEASES } from '../lib/types';

export default function Agreements() {
  const { db, currentUser, sponsorCreateAgreement, toast } = useStore();
  const me = currentUser!;
  const mine = db.agreements.filter((a) => a.sponsor_profile_id === me.id);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ sponsor_name: 'Kisii Cream Dairy Co-op', tier: 'Gold' as 'Bronze' | 'Silver' | 'Gold', max_claim_kes: '5000', annual_cap_kes: '60000', starts_on: '2026-11-01', ends_on: '2027-10-31', covered: ['Acute Mastitis', 'Foot & Mouth Disease', 'Anaplasmosis'] as string[] });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    sponsorCreateAgreement({ sponsor_name: form.sponsor_name, tier: form.tier, max_claim_kes: Number(form.max_claim_kes), annual_cap_kes: Number(form.annual_cap_kes), covered_diagnoses: form.covered, starts_on: form.starts_on, ends_on: form.ends_on });
    setOpen(false);
  };
  const toggleDx = (d: string) => setForm((f) => ({ ...f, covered: f.covered.includes(d) ? f.covered.filter((x) => x !== d) : [...f.covered, d] }));

  return (
    <div className="max-w-6xl">
      <PageHeader
        title="Sponsorship Agreements"
        sub="Configure entitlement programs your farmers can redeem. Codes become active once the platform administrator approves onboarding."
        actions={<Button variant="maize" onClick={() => setOpen(true)}><Plus size={15} /> New agreement</Button>}
      />

      <div className="grid lg:grid-cols-2 gap-4">
        {mine.map((a) => {
          const enrolled = db.enrollments.filter((e) => e.agreement_id === a.id).length;
          const used = db.enrollments.filter((e) => e.agreement_id === a.id).reduce((s, e) => s + e.used_to_date_kes, 0);
          return (
            <Card key={a.id} className="p-5 relative overflow-hidden">
              <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-maize-400/15 blur-2xl" />
              <div className="relative">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-pine-950 text-maize-400"><Building2 size={19} /></div>
                    <div><h3 className="font-display font-semibold text-[15px] text-pine-950 leading-tight">{a.sponsor_name}</h3><span className="font-mono text-[8.5px] uppercase tracking-[0.2em] text-pine-500">Agreement · {a.id.slice(0, 8).toUpperCase()}</span></div>
                  </div>
                  <StatusPill status={a.status} />
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 bg-pine-950 text-maize-300 font-mono text-[10px] font-bold rounded-md px-2 py-1"><Sparkles size={10} />{a.tier.toUpperCase()}</span>
                  <button onClick={() => { navigator.clipboard?.writeText(a.enrollment_code); toast('info', 'Copied to clipboard', a.enrollment_code); }} className="inline-flex items-center gap-1.5 font-mono text-[10px] bg-pine-100 hover:bg-pine-200 text-pine-900 rounded-md px-2 py-1 transition-colors"><Copy size={10} />{a.enrollment_code}</button>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <div className="bg-pine-50 border border-pine-100 rounded-xl py-2.5"><b className="text-pine-950 tabular text-[15px]">{formatKES(a.max_claim_kes)}</b><div className="font-mono text-[7.5px] uppercase text-pine-500">Max / claim</div></div>
                  <div className="bg-pine-50 border border-pine-100 rounded-xl py-2.5"><b className="text-pine-950 tabular text-[15px]">{formatKES(a.annual_cap_kes)}</b><div className="font-mono text-[7.5px] uppercase text-pine-500">Annual cap</div></div>
                  <div className="bg-pine-50 border border-pine-100 rounded-xl py-2.5"><b className="text-pine-950 tabular text-[15px]">{enrolled}</b><div className="font-mono text-[7.5px] uppercase text-pine-500">Enrolled</div></div>
                </div>
                <div className="mt-3"><div className="flex justify-between font-mono text-[8.5px] text-pine-600"><span>Program utilization</span><span>{formatKES(used)} of {formatKES(a.annual_cap_kes * Math.max(1, enrolled))}</span></div><div className="mt-1 h-2 rounded-full bg-pine-100 overflow-hidden"><div className="h-full bg-pine-600" style={{ width: `${Math.min(100, (used / Math.max(1, a.annual_cap_kes * enrolled)) * 100)}%` }} /></div></div>
                <div className="mt-3 flex flex-wrap gap-1">{a.covered_diagnoses.slice(0, 6).map((d) => <span key={d} className="text-[9px] bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-full px-2 py-0.5">{d}</span>)}</div>
                <div className="mt-3 font-mono text-[8.5px] text-pine-500 border-t border-pine-900/10 pt-2">Valid {a.starts_on} → {a.ends_on} · <BadgeCheck size={9} className="inline" /> {a.status === 'active' ? 'Active — farmers can enroll' : 'Pending admin approval'}</div>
              </div>
            </Card>
          );
        })}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Create sponsorship agreement" subtitle="Goes live immediately for your existing co-op members; admin audit trail retained" wide>
        <form onSubmit={submit} className="space-y-3">
          <Field label="Program sponsor name *"><input required className={inputCls} value={form.sponsor_name} onChange={(e) => setForm({ ...form, sponsor_name: e.target.value })} /></Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Tier"><select className={selectCls} value={form.tier} onChange={(e) => setForm({ ...form, tier: e.target.value as typeof form.tier })}><option>Bronze</option><option>Silver</option><option>Gold</option></select></Field>
            <Field label="Max claim (KES)"><input required type="number" className={inputCls} value={form.max_claim_kes} onChange={(e) => setForm({ ...form, max_claim_kes: e.target.value })} /></Field>
            <Field label="Annual cap (KES)"><input required type="number" className={inputCls} value={form.annual_cap_kes} onChange={(e) => setForm({ ...form, annual_cap_kes: e.target.value })} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Starts"><input required type="date" className={inputCls} value={form.starts_on} onChange={(e) => setForm({ ...form, starts_on: e.target.value })} /></Field>
            <Field label="Ends"><input required type="date" className={inputCls} value={form.ends_on} onChange={(e) => setForm({ ...form, ends_on: e.target.value })} /></Field>
          </div>
          <Field label={`Covered diagnoses (${form.covered.length} selected)`}>
            <div className="mt-1.5 flex flex-wrap gap-1.5 max-h-32 overflow-y-auto border border-pine-100 rounded-xl p-2">{DISEASES.map((d) => { const on = form.covered.includes(d); return <button type="button" key={d} onClick={() => toggleDx(d)} className={`text-[10px] rounded-full border px-2 py-1 ${on ? 'bg-pine-800 border-pine-800 text-maize-300' : 'bg-white border-pine-200 text-pine-800'}`}>{d}</button>; })}</div>
          </Field>
          <Button type="submit" className="w-full"><PauseCircle size={0} className="hidden" />Create agreement</Button>
        </form>
      </Modal>
    </div>
  );
}
