import { fetchJson } from './http';
import type { LatLng, Place } from '../../types';

/**
 * Adres arama ve ters geocoding — Photon (komoot) üzerinden.
 * OpenStreetMap verisi, anahtar gerektirmez.
 */

interface PhotonFeature {
  properties: {
    osm_id?: number;
    osm_type?: string;
    name?: string;
    street?: string;
    housenumber?: string;
    district?: string;
    city?: string;
    county?: string;
    state?: string;
    country?: string;
    postcode?: string;
    osm_value?: string;
  };
  geometry: { coordinates: [number, number] };
}

interface PhotonResponse {
  features?: PhotonFeature[];
}

const PHOTON = 'https://photon.komoot.io';

function detailOf(p: PhotonFeature['properties']): string {
  const parts = [
    p.street && p.housenumber ? `${p.street} ${p.housenumber}` : p.street,
    p.district,
    p.city ?? p.county,
    p.state,
    p.country,
  ].filter((x): x is string => Boolean(x));
  // Aynı bilgiyi iki kez göstermemek için tekilleştir.
  return [...new Set(parts)].join(', ');
}

function toPlace(f: PhotonFeature, i: number): Place {
  const p = f.properties;
  const [lon, lat] = f.geometry.coordinates;
  return {
    id: `${p.osm_type ?? 'x'}${p.osm_id ?? i}-${lat.toFixed(4)}-${lon.toFixed(4)}`,
    label: p.name ?? p.street ?? p.city ?? 'İsimsiz konum',
    detail: detailOf(p),
    latitude: lat,
    longitude: lon,
  };
}

/** Metinle yer arama. `near` verilirse sonuçlar o noktaya göre önceliklendirilir. */
export async function searchPlaces(
  query: string,
  near?: LatLng,
  limit = 8,
): Promise<Place[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const params = new URLSearchParams({
    q,
    limit: String(limit),
    lang: 'default',
  });
  if (near) {
    params.set('lat', near.latitude.toFixed(5));
    params.set('lon', near.longitude.toFixed(5));
  }
  const data = await fetchJson<PhotonResponse>(
    `${PHOTON}/api/?${params.toString()}`,
    { timeoutMs: 12000 },
  );
  const seen = new Set<string>();
  const out: Place[] = [];
  for (const [i, f] of (data.features ?? []).entries()) {
    if (!f.geometry?.coordinates) continue;
    const place = toPlace(f, i);
    const key = `${place.label}|${place.detail}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(place);
  }
  return out;
}

/** Koordinattan okunabilir adres. */
export async function reverseGeocode(point: LatLng): Promise<Place | null> {
  const params = new URLSearchParams({
    lat: point.latitude.toFixed(5),
    lon: point.longitude.toFixed(5),
    lang: 'default',
  });
  try {
    const data = await fetchJson<PhotonResponse>(
      `${PHOTON}/reverse?${params.toString()}`,
      { timeoutMs: 10000 },
    );
    const f = data.features?.[0];
    return f ? toPlace(f, 0) : null;
  } catch {
    return null;
  }
}
