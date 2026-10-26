import type { Profile, VetProfile } from '../../lib/types';
import { haversineKm } from '../../lib/geo';

/** Verified, active vets with distance from a reference point */
export function vetsNearby(vets: Profile[], vetProfiles: VetProfile[], lat: number, lng: number) {
  return vets
    .filter((p) => p.role === 'vet' && p.active)
    .map((p) => {
      const vp = vetProfiles.find((v) => v.profile_id === p.id);
      return {
        ...p,
        ...vp,
        distance: haversineKm(lat, lng, p.lat, p.lng),
        verification: vp?.verification ?? 'pending',
        rating: vp?.rating ?? 0,
        cases_completed: vp?.cases_completed ?? 0,
        specialty: vp?.specialty ?? 'General Practice',
        service_radius_km: vp?.service_radius_km ?? 10,
        available: vp?.available ?? false,
        license_number: vp?.license_number ?? '—',
        years_experience: vp?.years_experience ?? 0,
      };
    })
    .sort((a, b) => a.distance - b.distance);
}
