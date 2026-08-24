import type { LatLng } from '../types';

const EARTH_KM = 6371.0088;
const toRad = (d: number) => (d * Math.PI) / 180;

export function haversineKm(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const la1 = toRad(a.latitude);
  const la2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Google/OSRM encoded polyline çözücü. precision 5 veya 6. */
export function decodePolyline(str: string, precision = 5): LatLng[] {
  const factor = Math.pow(10, precision);
  const out: LatLng[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < str.length) {
    let shift = 0;
    let result = 0;
    let byte = 0;
    do {
      byte = str.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;

    shift = 0;
    result = 0;
    do {
      byte = str.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;

    out.push({ latitude: lat / factor, longitude: lng / factor });
  }
  return out;
}

/** Her noktaya kadarki kümülatif mesafe (km). */
export function cumulativeKm(points: LatLng[]): number[] {
  const cums = new Array<number>(points.length);
  cums[0] = 0;
  for (let i = 1; i < points.length; i++) {
    cums[i] = cums[i - 1] + haversineKm(points[i - 1], points[i]);
  }
  return cums;
}

/**
 * Rotayı en az stepKm aralıklı noktalara indirger. Hem Overpass sorgusunu
 * hem de istasyon izdüşümünü ucuzlatmak için.
 */
export function thinRoute(
  points: LatLng[],
  cums: number[],
  stepKm: number,
): { points: LatLng[]; cums: number[] } {
  if (points.length === 0) return { points: [], cums: [] };
  const p: LatLng[] = [points[0]];
  const c: number[] = [cums[0]];
  let last = cums[0];
  for (let i = 1; i < points.length; i++) {
    if (cums[i] - last >= stepKm) {
      p.push(points[i]);
      c.push(cums[i]);
      last = cums[i];
    }
  }
  const lastIdx = points.length - 1;
  if (c[c.length - 1] !== cums[lastIdx]) {
    p.push(points[lastIdx]);
    c.push(cums[lastIdx]);
  }
  return { points: p, cums: c };
}

/** Küçük mesafelerde hızlı düzlemsel yaklaşım için ölçek katsayıları. */
function scaleAt(latDeg: number): { kx: number; ky: number } {
  return { kx: 111.32 * Math.cos(toRad(latDeg)), ky: 110.574 };
}

/** Noktanın [a,b] parçasına dik uzaklığı ve parça üzerindeki oranı. */
function pointToSegment(
  p: LatLng,
  a: LatLng,
  b: LatLng,
): { distKm: number; t: number } {
  const { kx, ky } = scaleAt((a.latitude + b.latitude) / 2);
  const ax = a.longitude * kx;
  const ay = a.latitude * ky;
  const bx = b.longitude * kx;
  const by = b.latitude * ky;
  const px = p.longitude * kx;
  const py = p.latitude * ky;
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  let t = len2 === 0 ? 0 : ((px - ax) * dx + (py - ay) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const cx = ax + t * dx;
  const cy = ay + t * dy;
  return { distKm: Math.hypot(px - cx, py - cy), t };
}

/** Bir noktanın rotaya izdüşümü: kaçıncı km'de ve kaç km sapmada. */
export function projectOnRoute(
  point: LatLng,
  points: LatLng[],
  cums: number[],
): { routeKm: number; detourKm: number } {
  let best = { routeKm: 0, detourKm: Number.POSITIVE_INFINITY };
  for (let i = 0; i < points.length - 1; i++) {
    const { distKm, t } = pointToSegment(point, points[i], points[i + 1]);
    if (distKm < best.detourKm) {
      best = {
        detourKm: distKm,
        routeKm: cums[i] + t * (cums[i + 1] - cums[i]),
      };
    }
  }
  return best;
}

export interface Region {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

export function regionFor(points: LatLng[], padRatio = 0.25): Region {
  let minLat = 90;
  let maxLat = -90;
  let minLon = 180;
  let maxLon = -180;
  for (const p of points) {
    minLat = Math.min(minLat, p.latitude);
    maxLat = Math.max(maxLat, p.latitude);
    minLon = Math.min(minLon, p.longitude);
    maxLon = Math.max(maxLon, p.longitude);
  }
  const latDelta = Math.max(0.02, (maxLat - minLat) * (1 + padRatio));
  const lonDelta = Math.max(0.02, (maxLon - minLon) * (1 + padRatio));
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLon + maxLon) / 2,
    latitudeDelta: latDelta,
    longitudeDelta: lonDelta,
  };
}

export const clamp = (v: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, v));

export function formatKm(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  if (km < 10) return `${km.toFixed(1)} km`;
  return `${Math.round(km)} km`;
}

export function formatMin(min: number): string {
  const m = Math.round(min);
  if (m < 60) return `${m} dk`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r === 0 ? `${h} sa` : `${h} sa ${r} dk`;
}
