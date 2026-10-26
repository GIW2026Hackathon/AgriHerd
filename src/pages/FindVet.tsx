/* ==========================================================================
   Find a Vet — geo-verified directory with live SVG ward map (Haversine)
   ========================================================================== */
import { useMemo, useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MapPin, Star, Navigation, BadgeCheck, Phone, ShieldCheck, Clock, Wifi, Search, X } from 'lucide-react';
import { useStore } from '../lib/store';
import { haversineKm } from '../lib/geo';
import { vetsNearby } from './dashboards/shared';
import { GUSII_WARDS } from '../lib/types';
import { Card, PageHeader, Button, Avatar, StatusPill } from '../components/ui';
import { cn } from '../lib/cn';

/* Projection bounds: lng [34.72, 35.02] · lat [-0.87, -0.62] → viewBox 0 0 340 250 */
const project = (lat: number, lng: number) => ({
  x: ((lng - 34.72) / 0.3) * 330 + 5,
  y: 245 - ((lat - -0.87) / 0.25) * 240,
});

export default function FindVet() {
  const { db, currentUser, assignVet, toast } = useStore();
  const me = currentUser!;
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const caseId = params.get('case');

  const [origin, setOrigin] = useState<{ lat: number; lng: number }>(() => {
    const farms = db.farms.filter((f) => f.farmer_id === me.id);
    return farms[0] ? { lat: farms[0].lat, lng: farms[0].lng } : { lat: me.lat, lng: me.lng };
  });
  const [specialty, setSpecialty] = useState<string>('All');
  const [verifiedOnly, setVerifiedOnly] = useState(true);
  const [availableOnly, setAvailableOnly] = useState(true);
  const [query, setQuery] = useState('');

  const pendingCase = caseId ? db.cases.find((c) => c.id === caseId) : undefined;

  const vets = useMemo(() => {
    let list = vetsNearby(db.profiles, db.vetProfiles, origin.lat, origin.lng);
    if (verifiedOnly) list = list.filter((v) => v.verification === 'verified');
    if (availableOnly) list = list.filter((v) => v.available);
    if (specialty !== 'All') list = list.filter((v) => v.specialty.toLowerCase().includes(specialty.toLowerCase()));
    if (query.trim()) list = list.filter((v) => [v.full_name, v.specialty, v.license_number, v.ward].join(' ').toLowerCase().includes(query.toLowerCase()));
    return list;
  }, [db.profiles, db.vetProfiles, origin, verifiedOnly, availableOnly, specialty, query]);

  const farms = db.farms.filter((f) => f.farmer_id === me.id);
  const [selectedFarm, setSelectedFarm] = useState(farms[0]?.id ?? '');
  useEffect(() => { setOrigin((o) => { const f = farms.find((x) => x.id === selectedFarm); return f ? { lat: f.lat, lng: f.lng } : o; }); }, [selectedFarm]); // eslint-disable-line

  const requestVisit = (vetId: string, vetName: string) => {
    if (pendingCase) {
      assignVet(pendingCase.id, vetId);
      setParams({});
      navigate('/app/cases');
    } else {
      toast('info', `${vetName} bookmarked`, 'Create a case from Symptom Check and this vet can be assigned in one tap.');
    }
  };

  const mapVets = vets.slice(0, 14);

  return (
    <div>
      <PageHeader
        title="Find a Verified Veterinary Officer"
        sub={pendingCase ? `Assigning a vet to case ${pendingCase.case_number} — choose below.` : 'GPS-matched to your farms. Every listed officer is KVB-license verified by the platform administrator.'}
        actions={
          <select className="h-9 px-3 rounded-xl border border-pine-200 bg-white text-[12px] font-medium outline-none" value={selectedFarm} onChange={(e) => setSelectedFarm(e.target.value)}>
            {farms.map((f) => <option key={f.id} value={f.id}>📍 {f.name}</option>)}
          </select>
        }
      />

      {pendingCase && (
        <div className="mb-4 flex items-center gap-2.5 bg-amber-50 border border-amber-300 rounded-xl px-4 py-2.5 text-[12px] text-amber-900">
          <ShieldCheck size={15} className="shrink-0" /> Assigning for <b className="font-mono">{pendingCase.case_number}</b> · {pendingCase.suspected_dx} · urgency {pendingCase.triage_urgency}/100
          <button className="ml-auto p-1 hover:bg-amber-100 rounded" onClick={() => setParams({})}><X size={14} /></button>
        </div>
      )}

      <div className="grid lg:grid-cols-5 gap-4">
        {/* ============ SVG WARD MAP ============ */}
        <Card className="lg:col-span-2 p-4">
          <div className="flex items-center justify-between mb-2 px-1">
            <div className="font-mono text-[9.5px] uppercase tracking-[0.2em] text-pine-600 font-semibold">Gusii Service Map</div>
            <span className="font-mono text-[9px] text-pine-500 flex items-center gap-1"><Wifi size={9} /> GPS live</span>
          </div>
          <svg viewBox="0 0 340 252" className="w-full h-auto select-none" role="img" aria-label="Map of Gusii wards with vet locations">
            <rect width="340" height="252" rx="14" fill="#e8f0e9" />
            {/* ward blobs (stylized boundaries) */}
            <path d="M20 40 L150 18 L190 90 L120 130 L30 120 Z" fill="#d5e7db" stroke="#b8d4c4" strokeWidth="1.5" />
            <path d="M150 18 L330 40 L322 130 L190 90 Z" fill="#cfe3d6" stroke="#b8d4c4" strokeWidth="1.5" />
            <path d="M30 120 L120 130 L150 235 L18 225 Z" fill="#dcebe1" stroke="#b8d4c4" strokeWidth="1.5" />
            <path d="M120 130 L190 90 L322 130 L300 240 L150 235 Z" fill="#d5e7db" stroke="#b8d4c4" strokeWidth="1.5" />
            {GUSII_WARDS.map((w) => { const p = project(w.lat, w.lng); return <text key={w.name} x={p.x} y={p.y - 10} textAnchor="middle" fontSize="6.4" fill="#2b6147" fontWeight="700" fontFamily="IBM Plex Mono">{w.name.replace('Bomachoge Chache', 'Bomachoge C.')}</text>; })}
            {/* origin (you) */}
            {(() => { const p = project(origin.lat, origin.lng); return (
              <g>
                <circle cx={p.x} cy={p.y} r="10" fill="#f6c945" opacity="0.4"><animate attributeName="r" values="7;13;7" dur="2.4s" repeatCount="indefinite" /></circle>
                <circle cx={p.x} cy={p.y} r="4.6" fill="#0f231b" stroke="#f6c945" strokeWidth="2" />
              </g>
            ); })()}
            {/* vets */}
            {mapVets.map((v) => { const p = project(v.lat, v.lng); return (
              <g key={v.id}>
                <circle cx={p.x} cy={p.y} r="5.2" fill={v.available ? '#0284c7' : '#94a3b8'} stroke="#fff" strokeWidth="1.6"><title>{v.full_name}</title></circle>
              </g>
            ); })}
          </svg>
          <div className="flex items-center gap-4 px-1 mt-2 font-mono text-[8.5px] text-pine-700">
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-pine-950 ring-2 ring-maize-400" /> Your farm</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-sky-600" /> Verified vet (available)</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-slate-400" /> Unavailable / pending</span>
          </div>
        </Card>

        {/* ============ LIST ============ */}
        <div className="lg:col-span-3 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[180px]">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-pine-400" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, license, specialty…" className="w-full h-9 pl-8 pr-3 rounded-xl border border-pine-200 bg-white text-[12px] outline-none focus:ring-2 focus:ring-pine-500/40" />
            </div>
            <select value={specialty} onChange={(e) => setSpecialty(e.target.value)} className="h-9 px-2 rounded-xl border border-pine-200 bg-white text-[11.5px] outline-none">
              {['All', 'Dairy', 'Surgery', 'Nutrition', 'Infectious'].map((s) => <option key={s}>{s}</option>)}
            </select>
            <label className="flex items-center gap-1.5 text-[10.5px] font-semibold text-pine-800 bg-white border border-pine-200 rounded-xl h-9 px-2.5 cursor-pointer"><input type="checkbox" checked={verifiedOnly} onChange={(e) => setVerifiedOnly(e.target.checked)} className="accent-pine-700" />Verified only</label>
            <label className="flex items-center gap-1.5 text-[10.5px] font-semibold text-pine-800 bg-white border border-pine-200 rounded-xl h-9 px-2.5 cursor-pointer"><input type="checkbox" checked={availableOnly} onChange={(e) => setAvailableOnly(e.target.checked)} className="accent-pine-700" />Available today</label>
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            {vets.map((v) => (
              <Card key={v.id} className="p-4 flex flex-col hover:shadow-lg transition-shadow">
                <div className="flex items-start gap-3">
                  <Avatar initials={v.initials} tone={v.available ? 'blue' : 'slate'} size="lg" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap"><span className="text-[12.5px] font-bold text-pine-950 leading-tight">{v.full_name}</span>{v.verification === 'verified' && <BadgeCheck size={14} className="text-sky-600 shrink-0" />}</div>
                    <div className="font-mono text-[9px] text-pine-600 mt-0.5">{v.license_number} · {v.years_experience} yrs exp</div>
                    <div className="text-[10.5px] text-pine-800 mt-1 leading-snug">{v.specialty}</div>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  <div className="bg-pine-50 rounded-xl py-1.5 border border-pine-100"><div className="font-display font-semibold text-[15px] text-pine-900 tabular">{v.distance.toFixed(1)}<span className="text-[9px]"> km</span></div><div className="font-mono text-[7.5px] uppercase text-pine-500">Distance</div></div>
                  <div className="bg-pine-50 rounded-xl py-1.5 border border-pine-100"><div className="font-display font-semibold text-[15px] text-pine-900 flex items-center justify-center gap-1">{v.rating}<Star size={11} className="fill-maize-400 text-maize-500" /></div><div className="font-mono text-[7.5px] uppercase text-pine-500">Rating</div></div>
                  <div className="bg-pine-50 rounded-xl py-1.5 border border-pine-100"><div className="font-display font-semibold text-[15px] text-pine-900 tabular">{v.cases_completed}</div><div className="font-mono text-[7.5px] uppercase text-pine-500">Cases</div></div>
                </div>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <div className="flex flex-col">
                    <StatusPill status={v.available ? 'active' : 'pending'} />
                    <span className="font-mono text-[8px] text-pine-500 mt-1 flex items-center gap-1"><Clock size={8} /> Radius {v.service_radius_km} km · {v.ward}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <a href={`tel:${v.phone.replace(/\s/g, '')}`} className="p-2.5 rounded-xl border border-pine-200 text-pine-800 hover:bg-pine-50" title={v.phone}><Phone size={14} /></a>
                    <Button size="sm" onClick={() => requestVisit(v.id, v.full_name)}><Navigation size={12} />{pendingCase ? 'Assign' : 'Request'}</Button>
                  </div>
                </div>
              </Card>
            ))}
            {vets.length === 0 && <Card className="md:col-span-2 p-8 text-center text-[12px] text-pine-700">No vets match those filters. Try widening specialty or clearing “Available today”.</Card>}
          </div>
        </div>
      </div>
    </div>
  );
}
