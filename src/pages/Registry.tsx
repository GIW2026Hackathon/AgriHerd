/* ==========================================================================
   Registry — Farms & Animals CRUD (Phase 3 deliverable)
   ========================================================================== */
import { useMemo, useState } from 'react';
import { Building2, Beef, Milk, Pencil, Trash2, Plus, MapPin, Tag, Weight, Search, PawPrint } from 'lucide-react';
import { useStore } from '../lib/store';
import { Card, PageHeader, Button, Avatar, StatusPill, Field, inputCls, selectCls, Modal, EmptyState } from '../components/ui';
import { cn } from '../lib/cn';
import { fmtDate } from '../lib/geo';
import { GUSII_WARDS } from '../lib/types';
import type { Animal } from '../lib/types';

export default function Registry() {
  const { db, currentUser, addFarm, updateFarm, deleteFarm, addAnimal, updateAnimal, toast } = useStore();
  const me = currentUser!;
  const [tab, setTab] = useState<'farms' | 'animals'>('animals');
  const [query, setQuery] = useState('');
  const [farmModal, setFarmModal] = useState<'new' | string | null>(null);
  const [animalModal, setAnimalModal] = useState<'new' | string | null>(null);

  const isAdmin = me.role === 'admin';
  const myFarms = isAdmin ? db.farms : db.farms.filter((f) => f.farmer_id === me.id);
  const myFarmIds = new Set(myFarms.map((f) => f.id));
  const myAnimals = db.animals.filter((a) => myFarmIds.has(a.farm_id));
  const q = query.trim().toLowerCase();
  const filteredAnimals = q ? myAnimals.filter((a) => [a.name, a.tag_number, a.breed, a.species].join(' ').toLowerCase().includes(q)) : myAnimals;
  const filteredFarms = q ? myFarms.filter((f) => [f.name, f.ward].join(' ').toLowerCase().includes(q)) : myFarms;

  const [farmForm, setFarmForm] = useState({ name: '', ward: GUSII_WARDS[0].name, hectares: '2.0', lat: '-0.6817', lng: '34.7717' });
  const [animalForm, setAnimalForm] = useState({ farm_id: '', tag_number: '', name: '', species: 'dairy_cattle' as Animal['species'], breed: 'Friesian', sex: 'female' as Animal['sex'], dob: '2021-06-01', weight_kg: '480' });

  const openNewFarm = () => { setFarmForm({ name: '', ward: GUSII_WARDS[0].name, hectares: '2.0', lat: String(GUSII_WARDS[0].lat), lng: String(GUSII_WARDS[0].lng) }); setFarmModal('new'); };
  const openEditFarm = (id: string) => { const f = db.farms.find((x) => x.id === id)!; setFarmForm({ name: f.name, ward: f.ward, hectares: String(f.hectares), lat: String(f.lat), lng: String(f.lng) }); setFarmModal(id); };
  const saveFarm = (e: React.FormEvent) => {
    e.preventDefault();
    const data = { name: farmForm.name, ward: farmForm.ward, hectares: Number(farmForm.hectares), lat: Number(farmForm.lat), lng: Number(farmForm.lng), farmer_id: me.id };
    if (farmModal === 'new') addFarm(data); else if (farmModal) updateFarm(farmModal, data);
    setFarmModal(null);
  };

  const openNewAnimal = () => { setAnimalForm({ farm_id: myFarms[0]?.id ?? '', tag_number: `KES-NEW-${String(Math.floor(Math.random() * 900) + 100)}`, name: '', species: 'dairy_cattle', breed: 'Friesian', sex: 'female', dob: '2021-06-01', weight_kg: '450' }); setAnimalModal('new'); };
  const openEditAnimal = (id: string) => { const a = db.animals.find((x) => x.id === id)!; setAnimalForm({ farm_id: a.farm_id, tag_number: a.tag_number, name: a.name, species: a.species, breed: a.breed, sex: a.sex, dob: a.dob, weight_kg: String(a.weight_kg) }); setAnimalModal(id); };
  const saveAnimal = (e: React.FormEvent) => {
    e.preventDefault();
    const a = db.animals.find((x) => x.id === animalModal);
    if (animalModal === 'new') {
      addAnimal({ ...animalForm, weight_kg: Number(animalForm.weight_kg), status: 'active' });
    } else if (a) {
      updateAnimal(animalModal!, { ...animalForm, weight_kg: Number(animalForm.weight_kg) });
    }
    setAnimalModal(null);
  };

  const deleteAnimal = (id: string) => {
    // soft delete via status flag
    updateAnimal(id, { status: 'sold' });
    toast('info', 'Animal removed from active herd', 'Record retained for traceability (status=sold).');
  };

  return (
    <div className="max-w-6xl">
      <PageHeader
        title="Herd & Farm Registry"
        sub="Tagged identity for every animal — the single source of truth for cases, claims and surveillance."
        actions={
          <div className="flex items-center gap-2">
            <button onClick={() => setTab('farms')} className={cn('h-9 px-4 rounded-xl text-[12px] font-bold border transition-colors', tab === 'farms' ? 'bg-pine-800 text-maize-300 border-pine-800' : 'bg-white text-pine-900 border-pine-200')}><Building2 size={13} className="inline mr-1.5 -mt-0.5" />Farms ({myFarms.length})</button>
            <button onClick={() => setTab('animals')} className={cn('h-9 px-4 rounded-xl text-[12px] font-bold border transition-colors', tab === 'animals' ? 'bg-pine-800 text-maize-300 border-pine-800' : 'bg-white text-pine-900 border-pine-200')}><PawPrint size={13} className="inline mr-1.5 -mt-0.5" />Animals ({myAnimals.length})</button>
            <Button variant="maize" onClick={tab === 'farms' ? openNewFarm : openNewAnimal}><Plus size={15} />{tab === 'farms' ? 'Add farm' : 'Tag animal'}</Button>
          </div>
        }
      />

      <div className="relative mb-4 max-w-md">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-pine-400" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={tab === 'farms' ? 'Search farms or wards…' : 'Search name, tag, breed…'} className="w-full h-10 pl-9 pr-4 rounded-xl border border-pine-200 bg-white text-[12.5px] outline-none focus:ring-2 focus:ring-pine-500/40" />
      </div>

      {tab === 'farms' ? (
        <div className="grid md:grid-cols-2 gap-4">
          {filteredFarms.map((f) => {
            const herd = db.animals.filter((a) => a.farm_id === f.id);
            const owner = db.profiles.find((p) => p.id === f.farmer_id);
            return (
              <Card key={f.id} className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 rounded-xl bg-pine-100 text-pine-800"><Building2 size={19} /></div>
                    <div>
                      <h3 className="font-display font-semibold text-[15px] text-pine-950 leading-tight">{f.name}</h3>
                      <div className="font-mono text-[9.5px] text-pine-600 mt-1 flex items-center gap-1"><MapPin size={9} />{f.ward}{isAdmin && owner ? ` · ${owner.full_name}` : ''}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => openEditFarm(f.id)} className="p-2 rounded-lg hover:bg-pine-50 text-pine-700"><Pencil size={14} /></button>
                    <button onClick={() => deleteFarm(f.id)} className="p-2 rounded-lg hover:bg-red-50 text-red-600"><Trash2 size={14} /></button>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[11px]">
                  <div className="bg-pine-50 rounded-lg py-2 border border-pine-100"><b className="text-pine-950 tabular">{herd.length}</b><div className="font-mono text-[8px] uppercase text-pine-500">Animals</div></div>
                  <div className="bg-pine-50 rounded-lg py-2 border border-pine-100"><b className="text-pine-950 tabular">{f.hectares}</b><div className="font-mono text-[8px] uppercase text-pine-500">Hectares</div></div>
                  <div className="bg-pine-50 rounded-lg py-2 border border-pine-100"><b className="text-pine-950 tabular text-[10px]">{f.lat.toFixed(2)}, {f.lng.toFixed(2)}</b><div className="font-mono text-[8px] uppercase text-pine-500">GPS</div></div>
                </div>
              </Card>
            );
          })}
          {filteredFarms.length === 0 && <EmptyState icon={<Building2 size={26} />} title="No farms found" body="Register your first farm to start tagging animals." />}
        </div>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="text-left font-mono text-[9px] uppercase tracking-[0.18em] text-pine-600 border-b border-pine-900/10">
                  <th className="px-4 py-3">Animal</th><th className="px-4 py-3">Tag</th><th className="px-4 py-3">Species / Breed</th><th className="px-4 py-3">Farm</th><th className="px-4 py-3">DOB · Wt</th><th className="px-4 py-3">Status</th><th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-pine-900/8">
                {filteredAnimals.map((a) => {
                  const f = db.farms.find((x) => x.id === a.farm_id)!;
                  return (
                    <tr key={a.id} className="hover:bg-pine-50/60">
                      <td className="px-4 py-2.5"><div className="flex items-center gap-2.5"><Avatar initials={a.name.slice(0, 2).toUpperCase()} tone="pine" size="xs" /><b className="text-pine-950">{a.name}</b></div></td>
                      <td className="px-4 py-2.5 font-mono text-[10.5px] text-pine-800"><Tag size={10} className="inline mr-1" />{a.tag_number}</td>
                      <td className="px-4 py-2.5"><span className="flex items-center gap-1.5 text-pine-900">{a.species === 'dairy_cattle' ? <Milk size={12} className="text-sky-700" /> : <Beef size={12} className="text-red-800" />}{a.breed}</span></td>
                      <td className="px-4 py-2.5 text-pine-800 max-w-[160px] truncate">{f.name}</td>
                      <td className="px-4 py-2.5 text-pine-800 whitespace-nowrap">{fmtDate(a.dob)} · <Weight size={10} className="inline" />{a.weight_kg}kg</td>
                      <td className="px-4 py-2.5"><StatusPill status={a.status === 'active' ? 'active' : a.status === 'quarantine' ? 'pending_vet' : 'cancelled'} /></td>
                      <td className="px-4 py-2.5"><div className="flex gap-1 justify-end"><button onClick={() => openEditAnimal(a.id)} className="p-2 rounded-lg hover:bg-pine-100 text-pine-700"><Pencil size={13} /></button><button onClick={() => deleteAnimal(a.id)} className="p-2 rounded-lg hover:bg-red-50 text-red-600"><Trash2 size={13} /></button></div></td>
                    </tr>
                  );
                })}
                {filteredAnimals.length === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-pine-600">No animals match “{query}”.</td></tr>}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Farm modal */}
      <Modal open={farmModal !== null} onClose={() => setFarmModal(null)} title={farmModal === 'new' ? 'Register farm' : 'Edit farm'}>
        <form onSubmit={saveFarm} className="space-y-3">
          <Field label="Farm name *"><input required className={inputCls} value={farmForm.name} onChange={(e) => setFarmForm({ ...farmForm, name: e.target.value })} placeholder="Riabai Dairy — East Paddock" /></Field>
          <Field label="Ward"><select className={selectCls} value={farmForm.ward} onChange={(e) => { const w = GUSII_WARDS.find((x) => x.name === e.target.value)!; setFarmForm({ ...farmForm, ward: w.name, lat: String(w.lat), lng: String(w.lng) }); }}>{GUSII_WARDS.map((w) => <option key={w.name}>{w.name}</option>)}</select></Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Hectares"><input required type="number" step="0.1" className={inputCls} value={farmForm.hectares} onChange={(e) => setFarmForm({ ...farmForm, hectares: e.target.value })} /></Field>
            <Field label="Latitude"><input required className={inputCls} value={farmForm.lat} onChange={(e) => setFarmForm({ ...farmForm, lat: e.target.value })} /></Field>
            <Field label="Longitude"><input required className={inputCls} value={farmForm.lng} onChange={(e) => setFarmForm({ ...farmForm, lng: e.target.value })} /></Field>
          </div>
          <Button type="submit" className="w-full">Save farm</Button>
        </form>
      </Modal>

      {/* Animal modal */}
      <Modal open={animalModal !== null} onClose={() => setAnimalModal(null)} title={animalModal === 'new' ? 'Tag & register animal' : 'Edit animal'}>
        <form onSubmit={saveAnimal} className="space-y-3">
          <Field label="Farm *"><select className={selectCls} value={animalForm.farm_id} onChange={(e) => setAnimalForm({ ...animalForm, farm_id: e.target.value })}>{myFarms.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}</select></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tag number *"><input required className={inputCls} value={animalForm.tag_number} onChange={(e) => setAnimalForm({ ...animalForm, tag_number: e.target.value })} /></Field>
            <Field label="Name *"><input required className={inputCls} value={animalForm.name} onChange={(e) => setAnimalForm({ ...animalForm, name: e.target.value })} placeholder="e.g. Nyachaki" /></Field>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Species"><select className={selectCls} value={animalForm.species} onChange={(e) => setAnimalForm({ ...animalForm, species: e.target.value as Animal['species'] })}><option value="dairy_cattle">Dairy</option><option value="beef_cattle">Beef</option></select></Field>
            <Field label="Sex"><select className={selectCls} value={animalForm.sex} onChange={(e) => setAnimalForm({ ...animalForm, sex: e.target.value as Animal['sex'] })}><option value="female">Female</option><option value="male">Male</option></select></Field>
            <Field label="Breed"><input required className={inputCls} value={animalForm.breed} onChange={(e) => setAnimalForm({ ...animalForm, breed: e.target.value })} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Date of birth"><input required type="date" className={inputCls} value={animalForm.dob} onChange={(e) => setAnimalForm({ ...animalForm, dob: e.target.value })} /></Field>
            <Field label="Weight (kg)"><input required type="number" className={inputCls} value={animalForm.weight_kg} onChange={(e) => setAnimalForm({ ...animalForm, weight_kg: e.target.value })} /></Field>
          </div>
          <Button type="submit" className="w-full">Save animal</Button>
        </form>
      </Modal>
    </div>
  );
}
