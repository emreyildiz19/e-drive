import { clamp } from './geo';
import type { DrivingStyle, RouteSegment, Vehicle } from '../types';

/**
 * Hız katsayısı.
 *
 * Tüketim, yuvarlanma direnci (hızdan bağımsız) + aerodinamik direnç
 * (hızın karesi) toplamıdır. 90 km/h referans alınarak normalize edildi:
 * 90'da 1.00, 120'de ~1.37, 70'te ~0.83.
 */
export function speedFactor(kmh: number): number {
  const v = clamp(kmh, 20, 150);
  const roll = 150;
  const aero = 0.0165;
  const ref = roll + aero * 90 * 90;
  return clamp((roll + aero * v * v) / ref, 0.82, 1.55);
}

/**
 * Sıcaklık katsayısı. Kabin ısıtması ve batarya verimi soğukta tüketimi
 * ciddi artırır; çok sıcakta klima nedeniyle daha az ama gözle görülür
 * bir artış olur.
 */
export function tempFactor(tempC: number): number {
  const pts: [number, number][] = [
    [-20, 1.55],
    [-10, 1.38],
    [0, 1.24],
    [10, 1.1],
    [20, 1.0],
    [30, 1.06],
    [40, 1.14],
  ];
  if (tempC <= pts[0][0]) return pts[0][1];
  if (tempC >= pts[pts.length - 1][0]) return pts[pts.length - 1][1];
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[i + 1];
    if (tempC >= x0 && tempC <= x1) {
      const t = (tempC - x0) / (x1 - x0);
      return y0 + t * (y1 - y0);
    }
  }
  return 1;
}

export function styleFactor(style: DrivingStyle): number {
  if (style === 'eco') return 0.92;
  if (style === 'sport') return 1.16;
  return 1;
}

export interface EnergyContext {
  vehicle: Vehicle;
  segments: RouteSegment[];
  totalKm: number;
  tempF: number;
  styleF: number;
}

export function makeEnergyContext(
  vehicle: Vehicle,
  segments: RouteSegment[],
  totalKm: number,
  tempC: number,
  style: DrivingStyle,
): EnergyContext {
  return {
    vehicle,
    segments:
      segments.length > 0
        ? segments
        : [{ startKm: 0, endKm: Math.max(totalKm, 1), kmh: 90 }],
    totalKm,
    tempF: tempFactor(tempC),
    styleF: styleFactor(style),
  };
}

/**
 * Rotanın [aKm, bKm] aralığında harcanan enerji (kWh). Her yol parçasının
 * kendi ortalama hızı kullanılır — otoyol bölümleri şehir içinden pahalıdır.
 */
export function energyKwh(ctx: EnergyContext, aKm: number, bKm: number): number {
  if (bKm <= aKm) return 0;
  const base = ctx.vehicle.whPerKm * ctx.tempF * ctx.styleF;
  let wh = 0;
  for (const s of ctx.segments) {
    const lo = Math.max(aKm, s.startKm);
    const hi = Math.min(bKm, s.endKm);
    if (hi > lo) wh += (hi - lo) * base * speedFactor(s.kmh);
  }
  // Rota parçalarının dışına düşen kısım (ör. sapma) için ortalama hız.
  const covered = ctx.segments.reduce((acc, s) => {
    const lo = Math.max(aKm, s.startKm);
    const hi = Math.min(bKm, s.endKm);
    return acc + Math.max(0, hi - lo);
  }, 0);
  const missing = bKm - aKm - covered;
  if (missing > 0.001) wh += missing * base * speedFactor(90);
  return wh / 1000;
}

/** Rotadan sapıp istasyona gidip dönmenin enerjisi (kWh). ~50 km/h. */
export function detourEnergyKwh(ctx: EnergyContext, detourKm: number): number {
  const base = ctx.vehicle.whPerKm * ctx.tempF * ctx.styleF;
  return (2 * detourKm * base * speedFactor(50)) / 1000;
}

/** Sapma için harcanan ek süre (dk). */
export function detourMinutes(detourKm: number): number {
  return (2 * detourKm) / 45 * 60;
}

/** Rotanın [aKm, bKm] aralığındaki sürüş süresi (dk), segment hızlarından. */
export function driveMinutes(ctx: EnergyContext, aKm: number, bKm: number): number {
  if (bKm <= aKm) return 0;
  let hours = 0;
  let covered = 0;
  for (const s of ctx.segments) {
    const lo = Math.max(aKm, s.startKm);
    const hi = Math.min(bKm, s.endKm);
    if (hi > lo) {
      hours += (hi - lo) / s.kmh;
      covered += hi - lo;
    }
  }
  const missing = bKm - aKm - covered;
  if (missing > 0.001) hours += missing / 90;
  return hours * 60;
}

/** Rotanın [aKm, bKm] aralığındaki ortalama efektif tüketim (Wh/km). */
export function averageWhPerKm(ctx: EnergyContext, aKm = 0, bKm?: number): number {
  const end = bKm ?? ctx.totalKm;
  const span = Math.max(0.001, end - aKm);
  return (energyKwh(ctx, aKm, end) * 1000) / span;
}

/**
 * Verilen enerji bütçesiyle aKm'den kaç km ileri gidilebilir.
 * Segment hızları değiştiği için sayısal olarak ilerlenir.
 */
export function reachableKm(
  ctx: EnergyContext,
  fromKm: number,
  budgetKwh: number,
): number {
  if (budgetKwh <= 0) return 0;
  let km = fromKm;
  let left = budgetKwh;
  const step = 2;
  const limit = ctx.totalKm + 50;
  while (km < limit) {
    const e = energyKwh(ctx, km, km + step);
    if (e <= 0) break;
    if (e >= left) return km - fromKm + step * (left / e);
    left -= e;
    km += step;
  }
  return km - fromKm;
}

/**
 * DC şarj eğrisi. Batarya doldukça kabul edilen güç düşer; %80 üstü
 * belirgin şekilde yavaşlar. Değerler tipik bir CCS aracının davranışı.
 */
export function taperFactor(socPct: number): number {
  const s = clamp(socPct, 0, 100);
  if (s <= 20) return 1;
  if (s <= 50) return 1 - ((s - 20) / 30) * 0.08; // 1.00 → 0.92
  if (s <= 80) return 0.92 - ((s - 50) / 30) * 0.35; // 0.92 → 0.57
  if (s <= 95) return 0.57 - ((s - 80) / 15) * 0.35; // 0.57 → 0.22
  return 0.22 - ((s - 95) / 5) * 0.13; // 0.22 → 0.09
}

export interface ChargeEstimate {
  minutes: number;
  kwh: number;
  avgKw: number;
  /** İstasyon ve aracın birlikte ulaşabildiği tepe güç. */
  peakKw: number;
}

/** Fişe takma, kimlik doğrulama ve araca dönme için sabit ek süre (dk). */
export const CHARGE_OVERHEAD_MIN = 3;

/** İstasyon ve aracın birlikte ulaşabildiği tepe güç. */
export function peakChargeKw(
  vehicle: Vehicle,
  stationKw: number,
  isDc: boolean,
): number {
  return isDc
    ? Math.min(stationKw, vehicle.maxDcKw)
    : Math.min(stationKw, vehicle.maxAcKw);
}

/**
 * Sabit ek süre hariç net şarj süresi (saat). DC'de %1'lik adımlarla
 * şarj eğrisi boyunca integral alınır; AC'de güç sabit kabul edilir.
 */
function chargeHours(
  vehicle: Vehicle,
  peakKw: number,
  isDc: boolean,
  fromSoc: number,
  toSoc: number,
): number {
  if (toSoc <= fromSoc || peakKw <= 0) return 0;
  const kwhPerPct = vehicle.batteryKwh / 100;
  let hours = 0;
  for (let s = fromSoc; s < toSoc; s += 1) {
    const stepPct = Math.min(1, toSoc - s);
    const power = isDc
      ? Math.max(3, peakKw * taperFactor(s + stepPct / 2))
      : peakKw;
    hours += (kwhPerPct * stepPct) / power;
  }
  return hours;
}

/**
 * Şarj süresi tablosu: cum[b] = %0'dan b*stepPct seviyesine kadar geçen
 * net dakika. Rota optimizasyonunda her kenar için integrali yeniden almak
 * yerine iki tablo değerinin farkı kullanılır.
 */
export function chargeTimeTable(
  vehicle: Vehicle,
  peakKw: number,
  isDc: boolean,
  stepPct: number,
  buckets: number,
): number[] {
  const cum = new Array<number>(buckets).fill(0);
  for (let b = 1; b < buckets; b++) {
    cum[b] =
      cum[b - 1] +
      chargeHours(vehicle, peakKw, isDc, (b - 1) * stepPct, b * stepPct) * 60;
  }
  return cum;
}

/** fromSoc → toSoc şarj tahmini (sabit ek süre dahil). */
export function estimateCharge(
  vehicle: Vehicle,
  stationKw: number,
  isDc: boolean,
  fromSoc: number,
  toSoc: number,
): ChargeEstimate {
  const lo = clamp(fromSoc, 0, 100);
  const hi = clamp(toSoc, 0, 100);
  const peakKw = peakChargeKw(vehicle, stationKw, isDc);
  if (hi <= lo || peakKw <= 0) {
    return { minutes: 0, kwh: 0, avgKw: 0, peakKw: Math.max(0, peakKw) };
  }
  const hours = chargeHours(vehicle, peakKw, isDc, lo, hi);
  const kwh = (vehicle.batteryKwh / 100) * (hi - lo);
  return {
    minutes: hours * 60 + (isDc ? CHARGE_OVERHEAD_MIN : 2),
    kwh,
    avgKw: kwh / Math.max(hours, 1e-6),
    peakKw,
  };
}
