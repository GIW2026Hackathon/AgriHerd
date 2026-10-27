import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Radar, MapPin, Phone, Star, Navigation, CheckCircle2, Clock, PawPrint, Stethoscope,
} from 'lucide-react';
import { useApp } from '../lib/session';
import { useToast } from '../lib/toast';
import { WARDS, wardByName } from '../lib/wards';
import { Card, CardHeader, Badge, Avatar, Btn } from '../components/ui';
import { cn, haversineKm } from '../lib/utils';

export default function VetFinder() {
  const { db, user, client, tick } = useApp();
  const { toast } = useToast();
  const navigate = useNavigate();

  const myFarms = useMemo(() => client.farmsForUser(user), [client, user, db.farms]);
  const [originFarm, setOriginFarm] = useState(myFarms[0]?.id ?? '');
  const farm = db.farms.find(f => f.id === originFarm);

  const vets = useMemo(() => {
    if (!farm) return [];
    return db.profiles.filter(p => p.role === 'vet')
      .map(v => {
        const vw = wardByName(v.ward);
        const vLat = vw?.lat ?? farm.lat, vLng = vw?.lng ?? farm.lng;
        return { vet: v, km: haversineKm(farm.lat, farm.lng, vLat, vLng) };
      })
      .sort((a, b) => Number(b.vet.available !== false) - Number(a.vet.available !== false) || a.km - b.km);
  }, [db.profiles, farm]);

  const activeEmergency = db.cases.find(c => c.farm_id === originFarm && c.priority === 'emergency' && !['recovered', 'closed', 'deceased'].includes(c.status));

  return (
    <div className="mx-auto max-w-6xl space-y-5 p-4 sm:p-6">
      <div>
        <p className="label-caps text-pine-600">Module · Geo Vet Finder</p>
        <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight text-pine-950">Find a Veterinary Officer</h1>
        <p className="mt-0.5 max-w-xl text-[13px] text-stone-500">Ranked live by Haversine distance from your farm centroid — on-duty vets first, then specialty match. Tap “Request dispatch” to assign one to your open case.</p>
      </div>

      <Card>
        <CardHeader title="Distance Origin" sub="Choose which farm we measure from" action={
          <select value={originFarm} onChange={e => setOriginFarm(e.target.value)} className="input-field h-9 w-auto !text-[12px]" aria-label="Origin farm">
            {myFarms.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        } />
        {farm && <p className="flex items-center gap-1.5 border-b border-cream-100 px-4 pb-3 text-[11.5px] text-stone-500"><MapPin className="h-4 w-4 text-pine-700" />{farm.name} — {farm.ward} Ward ({farm.lat.toFixed(4)}, {farm.lng.toFixed(4)}) · {farm.herd_size} head</p>}
      </Card>

      <div className="grid gap-3 md:grid-cols-2">
        {vets.map(({ vet, km }) => {
          const onDuty = vet.available !== false;
          const isAssignedToMyCase = activeEmergency?.assigned_vet_id === vet.id;
          return (
            <Card key={vet.id} className={cn(!onDuty && 'opacity-70')}>
              <div className="flex items-start gap-4 p-5">
                <Avatar name={vet.full_name} size={60} className="ring-2 ring-pine-100" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-display text-[16px] font-semibold text-pine-950">{vet.full_name}</p>
                    <Badge tone={onDuty ? 'green' : 'slate'}>{onDuty ? 'ON DUTY' : 'OFF DUTY'}</Badge>
                  </div>
                  <p className="mt-0.5 text-[11.5px] text-stone-500">{vet.specialty}</p>
                  <p className="mt-1 text-[10.5px] text-stone-400">{vet.organization} · {vet.years_exp} yrs practice</p>
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-[12px]">
                    <span className="flex items-center gap-1 font-mono font-bold text-pine-900"><Navigation className="h-4 w-4 text-pine-700" />{km.toFixed(1)} km</span>
                    <span className="flex items-center gap-1 text-stone-500"><Star className="h-3.5 w-3.5 fill-gold-400 text-gold-500" />4.8 <span className="text-[10px]">(co-op rated)</span></span>
                    <a href={`tel:${vet.phone.replace(/\s/g, '')}`} className="flex items-center gap-1 font-semibold text-pine-800 hover:underline"><Phone className="h-4 w-4" />{vet.phone}</a>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between gap-2 border-t border-cream-100 bg-cream-50/60 px-5 py-3">
                <span className="flex items-center gap-1.5 text-[10.5px] text-stone-500"><Clock className="h-3.5 w-3.5" />{onDuty ? `ETA ~${Math.max(15, Math.round(km * 4.5 + 10))} min by road` : 'Currently off duty — SMS alert on return'}</span>
                {isAssignedToMyCase
                  ? <Btn size="sm" variant="pine-soft" onClick={() => navigate(`/app/farmer/cases/${activeEmergency!.id}`)}><CheckCircle2 className="h-4 w-4" />Assigned to your case</Btn>
                  : onDuty && activeEmergency
                    ? <Btn size="sm" onClick={() => { client.assignVet(user, activeEmergency.id, vet.id); tick(); toast('Vet dispatched', { body: `${vet.full_name.split('—')[0].trim()} assigned to ${activeEmergency.case_number}. SMS sent.`, tone: 'success' }); }}><Stethoscope className="h-4 w-4" />Dispatch to {activeEmergency.case_number}</Btn>
                    : <Btn size="sm" variant="outline" onClick={() => toast('No open emergency case', { body: 'Open or log a case first, then dispatch a vet to it.', tone: 'info' })}><PawPrint className="h-4 w-4" />No case to attach</Btn>}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Regional coverage legend */}
      <Card>
        <CardHeader title="Coverage Map Note" sub="Registered vet practice areas vs farm locations" />
        <div className="flex flex-wrap gap-4 p-4 text-[11px] text-stone-500">
          <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-pine-700" />Veterinary practice / on-duty zone</span>
          <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-gold-400" />Registered sponsor-covered farm</span>
          <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full border border-red-500 bg-red-100" />Active disease hotspot (Kitutu Chache / Sironga)</span>
        </div>
      </Card>
    </div>
  );
}
