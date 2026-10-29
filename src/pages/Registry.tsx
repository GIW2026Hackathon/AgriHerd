import { useMemo, useState } from 'react';
import {
  Wheat, PawPrint, Plus, Search, MapPin, X, ChevronRight, Tag,
} from 'lucide-react';
import { useApp } from '../lib/session';
import { useToast } from '../lib/toast';
import { Card, CardHeader, Badge, EmptyState, Th, Td } from '../components/ui';
import { ageYears, cn } from '../lib/utils';
import type { AnimalStatus, Animal } from '../lib/types';
import { WARDS } from '../lib/wards';

const STATUS_TONE: Record<AnimalStatus, 'green' | 'amber' | 'red' | 'slate' | 'blue' | 'purple'> = {
  healthy: 'green', under_treatment: 'amber', quarantine: 'red', recovered: 'blue', deceased: 'slate', sold: 'purple',
};

export default function Registry() {
  const { db, user, role, client, tick } = useApp();
  const { toast } = useToast();
  const [q, setQ] = useState('');
  const [farmFilter, setFarmFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<AnimalStatus | 'all'>('all');
  const [addingFarm, setAddingFarm] = useState(false);
  const [addingAnimal, setAddingAnimal] = useState(false);

  const canWrite = role === 'farmer' || role === 'admin';
  const farms = useMemo(() => client.farmsForUser(user), [client, user, db.farms]);
  const farmIds = useMemo(() => new Set(farms.map(f => f.id)), [farms]);
  const allAnimals = useMemo(
    () => (role === 'county' || role === 'admin' ? db.animals : db.animals.filter(a => farmIds.has(a.farm_id))),
    [db.animals, farmIds, role]
  );
  const animals = useMemo(() => allAnimals.filter(a => {
    if (farmFilter !== 'all' && a.farm_id !== farmFilter) return false;
    if (statusFilter !== 'all' && a.status !== statusFilter) return false;
    if (!q.trim()) return true;
    const hay = `${a.tag_number} ${a.breed} ${a.dam_tag ?? ''}`.toLowerCase();
    return hay.includes(q.toLowerCase());
  }), [allAnimals, q, farmFilter, statusFilter]);

  const [form, setForm] = useState({ tag_number: '', farm_id: '', breed: 'Friesian × Sahiwal', sex: 'female' as 'female' | 'male', dob: '2023-01-15', stage: 'heifer' as Animal['stage'], parity: '0', last_milk_yield_kg: '' });
  const [farmForm, setFarmForm] = useState({ name: '', ward: '', primary_breed: 'Friesian × Sahiwal' });

  const submitFarm = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedWard = WARDS.find((ward) => ward.name === farmForm.ward);
    if (!farmForm.name.trim() || !selectedWard) {
      toast('Complete the farm details', { tone: 'warning', body: 'Enter a farm name and choose your ward.' });
      return;
    }
    const farm = client.createFarm(user, {
      name: farmForm.name.trim(),
      owner_id: user.id,
      county: selectedWard.county,
      sub_county: selectedWard.sub_county,
      ward: selectedWard.name,
      lat: selectedWard.lat,
      lng: selectedWard.lng,
      herd_size: 0,
      primary_breed: farmForm.primary_breed,
      sponsor_id: null,
    });
    tick();
    setFarmFilter(farm.id);
    setForm((current) => ({ ...current, farm_id: farm.id }));
    setAddingFarm(false);
    setAddingAnimal(true);
    toast('Farm added', { body: 'Now register an animal to start using health records and triage.', tone: 'success' });
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.tag_number.trim()) return;
    const farmId = farmFilter !== 'all' ? farmFilter : farms[0]?.id;
    if (!farmId) { toast('No farm available', { tone: 'error', body: 'Create a farm before registering animals.' }); return; }
    client.createAnimal(user, {
      tag_number: form.tag_number.trim().toUpperCase(),
      farm_id: form.farm_id || farmId,
      species: 'cattle', breed: form.breed, sex: form.sex,
      dob: form.dob, stage: form.stage, parity: Number(form.parity) || 0,
      status: 'healthy', dam_tag: null,
      last_milk_yield_kg: form.last_milk_yield_kg ? Number(form.last_milk_yield_kg) : null,
    });
    tick();
    setAddingAnimal(false);
    setForm({ ...form, tag_number: '', last_milk_yield_kg: '' });
    toast('Animal registered', { body: `${form.tag_number.trim().toUpperCase()} added to the herd registry.`, tone: 'success' });
  };

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-4 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="label-caps text-pine-600">Module · Registry</p>
          <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight text-pine-950">Farm &amp; Animal Registry</h1>
          <p className="mt-0.5 text-[13px] text-stone-500">{farms.length} farm{farms.length === 1 ? '' : 's'} · {allAnimals.length} animals in scope ({role} view)</p>
        </div>
        {canWrite && <div className="flex flex-wrap gap-2">
          <button onClick={() => setAddingFarm((value) => !value)} className="flex h-10 items-center gap-1.5 rounded-xl border border-pine-700 bg-white px-4 text-[13px] font-bold text-pine-900 hover:bg-pine-50">{addingFarm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}{addingFarm ? 'Close farm form' : 'Add farm'}</button>
          <button onClick={() => setAddingAnimal((value) => !value)} disabled={farms.length === 0} title={farms.length === 0 ? 'Add a farm before registering animals' : undefined} className="flex h-10 items-center gap-1.5 rounded-xl bg-pine-800 px-4 text-[13px] font-bold text-cream-50 hover:bg-pine-700 disabled:cursor-not-allowed disabled:opacity-50">{addingAnimal ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}{addingAnimal ? 'Close animal form' : 'Register animal'}</button>
        </div>}
      </div>

      {addingFarm && (
        <Card className="border-pine-600/40">
          <CardHeader title="Add your farm" sub="Choose your ward; we use its approximate center for the demo map" />
          <form onSubmit={submitFarm} className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5">
            <div>
              <label className="label-caps" htmlFor="farm-name">Farm name</label>
              <input id="farm-name" required maxLength={100} autoFocus value={farmForm.name} onChange={(event) => setFarmForm((current) => ({ ...current, name: event.target.value }))} placeholder="e.g. Sunrise Dairy Farm" className="input-field mt-1.5" />
            </div>
            <div>
              <label className="label-caps" htmlFor="farm-ward">Ward</label>
              <select id="farm-ward" required value={farmForm.ward} onChange={(event) => setFarmForm((current) => ({ ...current, ward: event.target.value }))} className="input-field mt-1.5">
                <option value="" disabled>Choose your ward</option>
                {WARDS.map((ward) => <option key={`${ward.county}-${ward.name}`} value={ward.name}>{ward.name} · {ward.sub_county} · {ward.county}</option>)}
              </select>
            </div>
            <div>
              <label className="label-caps" htmlFor="farm-breed">Main cattle breed</label>
              <select id="farm-breed" value={farmForm.primary_breed} onChange={(event) => setFarmForm((current) => ({ ...current, primary_breed: event.target.value }))} className="input-field mt-1.5">
                {['Friesian × Sahiwal', 'Friesian', 'Ayrshire', 'Guernsey', 'Jersey', 'Brown Swiss', 'Sahiwal', 'Other / mixed'].map((breed) => <option key={breed}>{breed}</option>)}
              </select>
            </div>
            <div className="flex items-end">
              <button type="submit" className="h-11 w-full rounded-xl bg-pine-800 px-5 text-[13px] font-bold text-cream-50 hover:bg-pine-700 sm:w-auto">Save farm and continue</button>
            </div>
          </form>
        </Card>
      )}

      {/* Add animal form */}
      {addingAnimal && farms.length > 0 && (
        <Card className="border-pine-600/40">
          <CardHeader title="Register New Animal" sub="RFID ear-tag number is the unique key per farm" />
          <form onSubmit={submit} className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4">
            <div className="sm:col-span-2">
              <label className="label-caps" htmlFor="tag">Tag number *</label>
              <input id="tag" required autoFocus value={form.tag_number} onChange={e => setForm({ ...form, tag_number: e.target.value })} placeholder="e.g. KIS-0147-A1045" className="input-field mt-1.5 font-mono uppercase" />
            </div>
            <div>
              <label className="label-caps" htmlFor="farm">Farm</label>
              <select id="farm" value={form.farm_id} onChange={e => setForm({ ...form, farm_id: e.target.value })} className="input-field mt-1.5">
                {farms.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label-caps" htmlFor="breed">Breed</label>
              <select id="breed" value={form.breed} onChange={e => setForm({ ...form, breed: e.target.value })} className="input-field mt-1.5">
                {['Friesian', 'Friesian × Sahiwal', 'Ayrshire', 'Guernsey', 'Jersey', 'Brown Swiss', 'Sahiwal', 'Holstein', 'Friesian cross', 'Guernsey cross'].map(b => <option key={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label className="label-caps">Sex</label>
              <div className="mt-1.5 flex gap-2">
                {(['female', 'male'] as const).map(s => (
                  <button key={s} type="button" onClick={() => setForm({ ...form, sex: s })} className={cn('h-10 flex-1 rounded-xl border text-[13px] font-semibold capitalize', form.sex === s ? 'border-pine-700 bg-pine-800 text-cream-50' : 'border-cream-300 bg-white text-pine-900')}>{s}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="label-caps" htmlFor="dob">Date of birth</label>
              <input id="dob" type="date" value={form.dob} onChange={e => setForm({ ...form, dob: e.target.value })} className="input-field mt-1.5" />
            </div>
            <div>
              <label className="label-caps" htmlFor="stage">Stage</label>
              <select id="stage" value={form.stage} onChange={e => setForm({ ...form, stage: e.target.value as Animal['stage'] })} className="input-field mt-1.5">
                {['calf', 'heifer', 'lactating', 'dry', 'bull', 'bullock'].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="label-caps" htmlFor="parity">Parity</label>
              <input id="parity" type="number" min="0" value={form.parity} onChange={e => setForm({ ...form, parity: e.target.value })} className="input-field mt-1.5" />
            </div>
            <div>
              <label className="label-caps" htmlFor="yield">Last yield (L)</label>
              <input id="yield" type="number" step="0.1" min="0" value={form.last_milk_yield_kg} onChange={e => setForm({ ...form, last_milk_yield_kg: e.target.value })} placeholder="optional" className="input-field mt-1.5" />
            </div>
            <div className="flex items-end sm:col-span-2 lg:col-span-4">
              <button type="submit" className="h-11 rounded-xl bg-pine-800 px-6 text-[13px] font-bold text-cream-50 hover:bg-pine-700">Save to registry</button>
            </div>
          </form>
        </Card>
      )}

      {/* Farms cards */}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {farms.length === 0 && (
          <Card className="border-dashed md:col-span-2 xl:col-span-4">
            <EmptyState icon={<Wheat className="h-7 w-7" />} title="Start by adding your farm" body="Add your farm name and ward first. We’ll then take you straight to animal registration." action={<button onClick={() => setAddingFarm(true)} className="mt-1 h-10 rounded-xl bg-pine-800 px-4 text-[12px] font-bold text-cream-50 hover:bg-pine-700">Add my farm</button>} />
          </Card>
        )}
        {farms.map(f => {
          const fAnimals = db.animals.filter(a => a.farm_id === f.id);
          const owner = db.profiles.find(p => p.id === f.owner_id);
          const openCases = db.cases.filter(c => c.farm_id === f.id && !['recovered', 'closed', 'deceased'].includes(c.status)).length;
          return (
            <button key={f.id} onClick={() => setFarmFilter(farmFilter === f.id ? 'all' : f.id)} className={cn('rounded-2xl border bg-white p-4 text-left shadow-card transition hover:-translate-y-0.5', farmFilter === f.id ? 'border-pine-700 ring-2 ring-pine-700/30' : 'border-cream-200')}>
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase text-stone-500"><Tag className="h-3 w-3" />{f.farm_code}</span>
                {openCases > 0 && <Badge tone="amber">{openCases} OPEN CASE{openCases > 1 ? 'S' : ''}</Badge>}
              </div>
              <p className="mt-1.5 font-display text-[16px] font-semibold text-pine-950">{f.name}</p>
              <p className="mt-0.5 flex items-center gap-1 text-[11px] text-stone-500"><MapPin className="h-3 w-3" />{f.ward} · {f.county} · {f.herd_size} head</p>
              <p className="mt-0.5 truncate text-[10.5px] text-stone-400">{f.primary_breed}{owner && role !== 'farmer' ? ` · ${owner.full_name.split(' ')[0]}` : ''}</p>
              <div className="mt-2 flex items-center justify-between border-t border-cream-100 pt-2">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">{fAnimals.length} tagged · {fAnimals.filter(a => a.status === 'healthy').length} healthy</span>
                <span className="flex items-center gap-0.5 text-[10.5px] font-bold text-pine-800">{farmFilter === f.id ? 'Showing all' : 'Filter animals'}<ChevronRight className="h-3.5 w-3.5" /></span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Animal table */}
      <Card>
        <CardHeader title="Animal Registry" sub={`${animals.length} animal${animals.length === 1 ? '' : 's'}${farmFilter !== 'all' ? ' on selected farm' : ''}`}
          action={<div className="flex flex-wrap items-center gap-2">
            <div className="relative"><Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Search tag, breed, dam…" className="input-field h-9 w-44 pl-8 !text-[12px] sm:w-52" aria-label="Search animals" /></div>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as AnimalStatus | 'all')} className="input-field h-9 w-auto !text-[12px]" aria-label="Filter by status">
              <option value="all">All statuses</option>
              {Object.keys(STATUS_TONE).map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
            </select>
          </div>} />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px]">
            <thead className="border-b border-cream-200 bg-cream-50">
              <tr><Th>Tag</Th><Th>Farm</Th><Th>Breed</Th><Th>Sex / Age</Th><Th>Stage</Th><Th>Parity</Th><Th>Yield</Th><Th>Status</Th></tr>
            </thead>
            <tbody className="divide-y divide-cream-100">
              {animals.map(a => {
                const farm = db.farms.find(f => f.id === a.farm_id);
                return (
                  <tr key={a.id} className="hover:bg-pine-50/40">
                    <Td className="font-mono text-[11.5px] font-bold text-pine-900">{a.tag_number}</Td>
                    <Td className="text-[11.5px]">{farm?.name}</Td>
                    <Td className="text-[11.5px]">{a.breed}</Td>
                    <Td className="text-[11.5px] capitalize">{a.sex} · {ageYears(a.dob)}y</Td>
                    <Td className="text-[11.5px] capitalize">{a.stage}</Td>
                    <Td className="text-[11.5px]">{a.parity}</Td>
                    <Td className="font-mono text-[11.5px]">{a.last_milk_yield_kg ? `${a.last_milk_yield_kg.toFixed(1)} L` : '—'}</Td>
                    <Td><Badge tone={STATUS_TONE[a.status]}>{a.status.replace(/_/g, ' ').toUpperCase()}</Badge></Td>
                  </tr>
                );
              })}
              {animals.length === 0 && <tr><td colSpan={8}><EmptyState icon={<PawPrint className="h-7 w-7" />} title="No animals match" body="Adjust your search or filters." /></td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
