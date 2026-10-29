import { useState, type FormEvent } from 'react';
import { KeyRound, Save, ShieldCheck, UserRound } from 'lucide-react';
import { Card, CardHeader } from '../components/ui';
import { useApp } from '../lib/session';
import { useToast } from '../lib/toast';
import { DEMO_PASSWORD } from '../lib/seed';

export default function Account() {
  const { db, user, client, tick } = useApp();
  const { toast } = useToast();
  const [name, setName] = useState(user.full_name);
  const [phone, setPhone] = useState(user.phone);
  const [email, setEmail] = useState(user.email ?? '');

  const saveProfile = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    if (normalizedEmail && db.profiles.some((profile) => profile.id !== user.id && profile.email?.toLowerCase() === normalizedEmail)) {
      toast('Email already in use', { body: 'Choose an email not used by another demo profile.', tone: 'warning' });
      return;
    }
    const saved = client.updateOwnDemoProfile(user, {
      full_name: name,
      phone,
      email: normalizedEmail || undefined,
    });
    if (!saved) {
      toast('Profile could not be saved', { body: 'The demo profile is no longer available. Sign out and choose another profile.', tone: 'error' });
      return;
    }
    tick();
    toast('Demo profile updated', { body: 'Changes are saved in this browser only.', tone: 'success' });
  };

  return (
    <div className="mx-auto max-w-4xl space-y-5 p-4 sm:p-6">
      <div>
        <p className="label-caps text-pine-600">Account · Prototype</p>
        <h1 className="mt-1 flex items-center gap-2 font-display text-2xl font-semibold tracking-tight text-pine-950"><UserRound className="h-6 w-6 text-pine-800" />My Demo Account</h1>
        <p className="mt-1 max-w-2xl text-[13px] text-stone-500">Edit the profile details used in this browser prototype. These changes do not update a production account.</p>
      </div>

      <Card>
        <CardHeader title="Profile details" sub="Only your name, phone number, and email can be edited here" />
        <form onSubmit={saveProfile} className="space-y-4 p-4 sm:p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label-caps" htmlFor="account-name">Full name</label>
              <input id="account-name" required maxLength={100} value={name} onChange={(event) => setName(event.target.value)} className="input-field mt-1.5" />
            </div>
            <div>
              <label className="label-caps" htmlFor="account-phone">Phone number</label>
              <input id="account-phone" required maxLength={40} value={phone} onChange={(event) => setPhone(event.target.value)} className="input-field mt-1.5" />
            </div>
            <div>
              <label className="label-caps" htmlFor="account-email">Email <span className="normal-case text-stone-400">(optional)</span></label>
              <input id="account-email" type="email" maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} className="input-field mt-1.5" />
            </div>
            <div>
              <label className="label-caps" htmlFor="account-role">Demo role</label>
              <input id="account-role" readOnly value={user.role} className="input-field mt-1.5 cursor-default capitalize" />
            </div>
          </div>
          <button type="submit" className="inline-flex h-10 items-center gap-2 rounded-xl bg-pine-800 px-4 text-[12px] font-bold text-cream-50 hover:bg-pine-700"><Save className="h-4 w-4" />Save profile</button>
        </form>
      </Card>

      <Card>
        <CardHeader title="Password and sign-in" sub="Authentication is simulated in this prototype" />
        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 rounded-xl bg-amber-50 p-2 text-amber-800"><KeyRound className="h-4 w-4" /></span>
            <div>
              <p className="text-[13px] font-semibold text-pine-950">Shared demo password</p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-stone-500">Use <code className="rounded bg-cream-100 px-1.5 py-0.5 font-mono text-pine-900">{DEMO_PASSWORD}</code> for every demo profile. Passwords are not saved.</p>
            </div>
          </div>
          <button type="button" onClick={() => toast('Password reset is a demo only', { body: 'No email or reset link was sent. Real account recovery will be added with production authentication.', tone: 'info' })} className="h-10 shrink-0 rounded-xl border border-cream-300 bg-white px-4 text-[12px] font-bold text-pine-900 hover:border-pine-600">Simulate password reset</button>
        </div>
      </Card>

      <div className="flex items-start gap-2 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-[11px] leading-relaxed text-sky-950">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
        <p>Demo account details are stored in this browser’s local demo dataset. This screen does not verify identity, change passwords, send email, or provide production security.</p>
      </div>
    </div>
  );
}
