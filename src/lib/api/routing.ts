import { cumulativeKm, decodePolyline } from '../geo';
import { fetchJson, HttpError } from './http';
import type { LatLng, RouteResult, RouteSegment } from '../../types';

/**
 * Rota servisi.
 *
 * Varsayılan: OSRM demo sunucusu — anahtar gerektirmez, ücretsiz, sınırsız
 * bir garanti vermez ama halka açıktır.
 * Anahtar girilirse: OpenRouteService — daha stabil, günlük 2000 istek
 * ücretsiz, kredi kartı istemez.
 */

const OSRM = 'https://router.project-osrm.org';
const ORS = 'https://api.openrouteservice.org';

interface OsrmStep {
  distance: number;
  duration: number;
}
interface OsrmLeg {
  distance: number;
  duration: number;
  steps?: OsrmStep[];
}
interface OsrmRoute {
  distance: number;
  duration: number;
  geometry: string;
  legs: OsrmLeg[];
}
interface OsrmResponse {
  code: string;
  message?: string;
  routes?: OsrmRoute[];
}

/** Adım listesinden hız profili çıkarır (km başına ortalama hız). */
function segmentsFromSteps(
  steps: { distance: number; duration: number }[],
): RouteSegment[] {
  const out: RouteSegment[] = [];
  let acc = 0;
  for (const s of steps) {
    const km = s.distance / 1000;
    if (km <= 0.0005) continue;
    const hours = s.duration / 3600;
    const kmh = hours > 0 ? km / hours : 60;
    out.push({
      startKm: acc,
      endKm: acc + km,
      kmh: Math.max(15, Math.min(145, kmh)),
    });
    acc += km;
  }
  return out;
}

async function routeOsrm(from: LatLng, to: LatLng): Promise<RouteResult> {
  const coords = `${from.longitude},${from.latitude};${to.longitude},${to.latitude}`;
  const url =
    `${OSRM}/route/v1/driving/${coords}` +
    `?overview=full&geometries=polyline6&steps=true&alternatives=false`;
  const data = await fetchJson<OsrmResponse>(url, { timeoutMs: 25000 });
  if (data.code !== 'Ok' || !data.routes?.length) {
    throw new HttpError(
      data.code === 'NoRoute'
        ? 'Bu iki nokta arasında karayolu rotası bulunamadı.'
        : `Rota servisi hatası: ${data.message ?? data.code}`,
    );
  }
  const r = data.routes[0];
  const points = decodePolyline(r.geometry, 6);
  const cums = cumulativeKm(points);
  const steps = r.legs.flatMap((l) => l.steps ?? []);
  return {
    points,
    cums,
    distanceKm: r.distance / 1000,
    durationMin: r.duration / 60,
    segments: segmentsFromSteps(steps),
    provider: 'osrm',
  };
}

interface OrsResponse {
  features?: {
    geometry: { coordinates: [number, number][] };
    properties: {
      summary?: { distance: number; duration: number };
      segments?: { steps?: { distance: number; duration: number }[] }[];
    };
  }[];
  error?: { message?: string };
}

async function routeOrs(
  from: LatLng,
  to: LatLng,
  apiKey: string,
): Promise<RouteResult> {
  const data = await fetchJson<OrsResponse>(
    `${ORS}/v2/directions/driving-car/geojson`,
    {
      method: 'POST',
      timeoutMs: 25000,
      headers: {
        Authorization: apiKey,
        'Content-Type': 'application/json',
        Accept: 'application/geo+json',
      },
      body: JSON.stringify({
        coordinates: [
          [from.longitude, from.latitude],
          [to.longitude, to.latitude],
        ],
        instructions: true,
        units: 'km',
      }),
    },
  );
  const f = data.features?.[0];
  if (!f?.geometry?.coordinates?.length) {
    throw new HttpError(
      data.error?.message ?? 'OpenRouteService rota döndürmedi.',
    );
  }
  const points: LatLng[] = f.geometry.coordinates.map(([lon, lat]) => ({
    latitude: lat,
    longitude: lon,
  }));
  const cums = cumulativeKm(points);
  const steps = (f.properties.segments ?? []).flatMap((s) => s.steps ?? []);
  const summary = f.properties.summary;
  return {
    points,
    cums,
    distanceKm: summary ? summary.distance : cums[cums.length - 1],
    durationMin: summary ? summary.duration / 60 : 0,
    segments: segmentsFromSteps(steps),
    provider: 'ors',
  };
}

/**
 * Rota hesapla. ORS anahtarı varsa onu dener, başarısız olursa OSRM'e döner —
 * böylece anahtar olmasa da uygulama çalışmaya devam eder.
 */
export async function getRoute(
  from: LatLng,
  to: LatLng,
  orsKey?: string,
): Promise<RouteResult> {
  if (orsKey && orsKey.trim().length > 10) {
    try {
      return await routeOrs(from, to, orsKey.trim());
    } catch {
      // Anahtar geçersiz veya kota bitti — sessizce ücretsiz servise düş.
    }
  }
  return routeOsrm(from, to);
}
