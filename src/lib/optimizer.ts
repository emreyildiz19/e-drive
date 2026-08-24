import {
  CHARGE_OVERHEAD_MIN,
  chargeTimeTable,
  detourEnergyKwh,
  detourMinutes,
  driveMinutes,
  energyKwh,
  peakChargeKw,
  type EnergyContext,
} from './energy';
import type { RouteCharger, Vehicle } from '../types';

/**
 * Şarj durağı optimizasyonu.
 *
 * Problem, açgözlü seçimle doğru çözülmüyor: "menzil içindeki en iyi istasyon"
 * mantığı ya yolun başında 4 dakikalık anlamsız molalar zinciri kuruyor, ya da
 * yüksek şarjla geçilen istasyonları tamamen eliyor. Doğru kurgu, düğümleri
 * (istasyon × şarj seviyesi) olan bir grafta en kısa *süre*yi aramaktır.
 *
 * Düğüm: i numaralı nokta (0 = kalkış, son = varış) ve %stepPct çözünürlükte
 * şarj kovası. Kenar: i'den j'ye git (enerji yeterse) ve j'de istediğin kadar
 * şarj et. Kenar maliyeti dakikadır, dolayısıyla Dijkstra doğrudan en kısa
 * süreli yolculuğu verir.
 */

/** Şarj seviyesi çözünürlüğü (%). Küçültmek doğruluğu artırır, maliyeti büyütür. */
const SOC_STEP = 2.5;

/** Graf büyümesin diye değerlendirmeye alınacak en fazla istasyon. */
const MAX_STATIONS = 80;

export interface OptimizeInput {
  ctx: EnergyContext;
  vehicle: Vehicle;
  stations: RouteCharger[];
  totalKm: number;
  startSoc: number;
  arrivalBufferPct: number;
  maxChargePct: number;
  /** İstasyonun araca verebileceği tepe gücü döndürür. */
  effectiveKw: (c: RouteCharger) => number;
}

export interface OptimizedStop {
  charger: RouteCharger;
  arriveSoc: number;
  departSoc: number;
  effKw: number;
}

export interface OptimizeResult {
  feasible: boolean;
  stops: OptimizedStop[];
  arrivalSoc: number;
  /** Sürüş + sapma süresi (dk). */
  driveMin: number;
  /** Toplam şarj süresi (dk). */
  chargeMin: number;
  /** Menzilin bittiği km — çözüm yoksa nereye kadar gidilebildiği. */
  blockedAtKm?: number;
}

/**
 * İstasyon sayısı çok fazlaysa rotaya yayılımı koruyarak seyreltir:
 * rota dilimlere bölünür, her dilimden en güçlü ve en az sapmalı olanlar alınır.
 * Sadece en güçlüleri almak, güçlü istasyonların yoğun olduğu bölgede
 * kümelenmeye ve arada boşluk kalmasına yol açardı.
 */
function thinStations(
  stations: RouteCharger[],
  totalKm: number,
  limit: number,
): RouteCharger[] {
  if (stations.length <= limit) return stations;
  const slices = Math.max(1, Math.floor(limit / 2));
  const perSlice = Math.max(1, Math.floor(limit / slices));
  const width = totalKm / slices;
  const kept: RouteCharger[] = [];
  for (let s = 0; s < slices; s++) {
    const lo = s * width;
    const hi = (s + 1) * width;
    const inSlice = stations
      .filter((c) => c.routeKm >= lo && c.routeKm < hi)
      .sort((a, b) => b.maxKw - a.maxKw || a.detourKm - b.detourKm);
    kept.push(...inSlice.slice(0, perSlice));
  }
  return kept.sort((a, b) => a.routeKm - b.routeKm);
}

/** Basit ikili yığın — Dijkstra kuyruğu için. */
class MinHeap {
  private keys: number[] = [];
  private vals: number[] = [];

  get size(): number {
    return this.keys.length;
  }

  push(key: number, val: number): void {
    this.keys.push(key);
    this.vals.push(val);
    let i = this.keys.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.keys[parent] <= this.keys[i]) break;
      this.swap(parent, i);
      i = parent;
    }
  }

  pop(): { key: number; val: number } {
    const key = this.keys[0];
    const val = this.vals[0];
    const lastK = this.keys.pop() as number;
    const lastV = this.vals.pop() as number;
    if (this.keys.length > 0) {
      this.keys[0] = lastK;
      this.vals[0] = lastV;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1;
        const r = l + 1;
        let m = i;
        if (l < this.keys.length && this.keys[l] < this.keys[m]) m = l;
        if (r < this.keys.length && this.keys[r] < this.keys[m]) m = r;
        if (m === i) break;
        this.swap(i, m);
        i = m;
      }
    }
    return { key, val };
  }

  private swap(a: number, b: number): void {
    const k = this.keys[a];
    this.keys[a] = this.keys[b];
    this.keys[b] = k;
    const v = this.vals[a];
    this.vals[a] = this.vals[b];
    this.vals[b] = v;
  }
}

export function optimizeStops(input: OptimizeInput): OptimizeResult {
  const {
    ctx,
    vehicle,
    totalKm,
    startSoc,
    arrivalBufferPct,
    maxChargePct,
    effectiveKw,
  } = input;

  const buckets = Math.round(100 / SOC_STEP) + 1;
  const socOf = (b: number) => b * SOC_STEP;
  const bucketFloor = (soc: number) =>
    Math.max(0, Math.min(buckets - 1, Math.floor(soc / SOC_STEP + 1e-9)));
  const maxBucket = bucketFloor(maxChargePct);
  const kwhToSoc = (kwh: number) => (kwh / vehicle.batteryKwh) * 100;
  const socToKwh = (pct: number) => (vehicle.batteryKwh * pct) / 100;

  // Düğümler: 0 = kalkış, 1..n = istasyon, n+1 = varış.
  const stations = thinStations(
    input.stations.filter((c) => c.routeKm > 1 && c.routeKm < totalKm - 1),
    totalKm,
    MAX_STATIONS,
  );
  const nodeKm = [0, ...stations.map((c) => c.routeKm), totalKm];
  const nodeCount = nodeKm.length;
  const destIdx = nodeCount - 1;
  const stationOf = (i: number): RouteCharger | null =>
    i >= 1 && i <= stations.length ? stations[i - 1] : null;

  // Rota boyunca enerji ve süre kümülatif olduğu için önek dizisi yeterli:
  // i→j maliyeti iki değerin farkı. Aksi halde her kenar için baştan
  // integral almak gerekirdi.
  const energyPrefix = nodeKm.map((km) => energyKwh(ctx, 0, km));
  const timePrefix = nodeKm.map((km) => driveMinutes(ctx, 0, km));

  // Her istasyon için şarj süresi tablosu ve tepe güç.
  const chargeTables: (number[] | null)[] = [];
  const peaks: number[] = [];
  for (let i = 0; i < nodeCount; i++) {
    const st = stationOf(i);
    if (!st) {
      chargeTables.push(null);
      peaks.push(0);
      continue;
    }
    const peak = peakChargeKw(vehicle, effectiveKw(st), true);
    peaks.push(peak);
    chargeTables.push(chargeTimeTable(vehicle, peak, true, SOC_STEP, buckets));
  }

  const stateCount = nodeCount * buckets;
  const dist = new Float64Array(stateCount).fill(Number.POSITIVE_INFINITY);
  const prev = new Int32Array(stateCount).fill(-1);
  const heap = new MinHeap();

  const startBucket = bucketFloor(startSoc);
  const startState = 0 * buckets + startBucket;
  dist[startState] = 0;
  heap.push(0, startState);

  let bestDest = -1;
  let bestDestCost = Number.POSITIVE_INFINITY;
  let farthestKm = 0;

  const relax = (next: number, cost: number, from: number): void => {
    if (cost < dist[next] - 1e-9) {
      dist[next] = cost;
      prev[next] = from;
      heap.push(cost, next);
    }
  };

  while (heap.size > 0) {
    const { key: d, val: state } = heap.pop();
    if (d > dist[state] + 1e-9) continue;

    const i = Math.floor(state / buckets);
    const b = state % buckets;
    farthestKm = Math.max(farthestKm, nodeKm[i]);

    if (i === destIdx) {
      if (d < bestDestCost) {
        bestDestCost = d;
        bestDest = state;
      }
      // Varışa ulaşan en kısa süre bulundu; Dijkstra sırası gereği devamı
      // daha iyi olamaz.
      break;
    }

    const availableKwh = socToKwh(socOf(b) - arrivalBufferPct);
    if (availableKwh <= 0) continue;

    for (let j = i + 1; j < nodeCount; j++) {
      // Rota boyunca enerji artan olduğu için burada durabiliriz.
      if (energyPrefix[j] - energyPrefix[i] > availableKwh) break;

      const st = stationOf(j);
      // Sapma enerjisi istasyona göre değişir, dolayısıyla monoton değil:
      // bu yüzden döngüyü kesmek yerine sadece bu adayı atlıyoruz.
      const legKwh =
        energyPrefix[j] - energyPrefix[i] + (st ? detourEnergyKwh(ctx, st.detourKm) : 0);
      if (legKwh > availableKwh) continue;

      const arriveSoc = socOf(b) - kwhToSoc(legKwh);
      const bArr = bucketFloor(arriveSoc);
      const travelMin =
        timePrefix[j] - timePrefix[i] + (st ? detourMinutes(st.detourKm) : 0);

      // Şarj etmeden geçmek her zaman mümkün (yüksek şarjla gelinen
      // istasyonlar bu yüzden elenmez).
      relax(j * buckets + bArr, d + travelMin, state);

      const table = chargeTables[j];
      if (!table || peaks[j] <= 0) continue;
      for (let bb = bArr + 1; bb <= maxBucket; bb++) {
        const cost =
          travelMin + CHARGE_OVERHEAD_MIN + (table[bb] - table[bArr]);
        relax(j * buckets + bb, d + cost, state);
      }
    }
  }

  if (bestDest < 0) {
    return {
      feasible: false,
      stops: [],
      arrivalSoc: startSoc,
      driveMin: 0,
      chargeMin: 0,
      blockedAtKm: farthestKm,
    };
  }

  // Yolu geri izle.
  const chain: number[] = [];
  for (let s = bestDest; s !== -1; s = prev[s]) chain.push(s);
  chain.reverse();

  const stops: OptimizedStop[] = [];
  let driveMin = 0;
  let chargeMin = 0;
  let soc = startSoc;

  for (let k = 1; k < chain.length; k++) {
    const fromIdx = Math.floor(chain[k - 1] / buckets);
    const toState = chain[k];
    const j = Math.floor(toState / buckets);
    const bb = toState % buckets;
    const st = stationOf(j);

    const legKwh =
      energyPrefix[j] - energyPrefix[fromIdx] +
      (st ? detourEnergyKwh(ctx, st.detourKm) : 0);
    const travelMin =
      timePrefix[j] - timePrefix[fromIdx] + (st ? detourMinutes(st.detourKm) : 0);
    driveMin += travelMin;

    const arriveSoc = soc - kwhToSoc(legKwh);
    const departSoc = socOf(bb);

    if (st && departSoc > arriveSoc + 1e-6) {
      const table = chargeTables[j] as number[];
      const minutes =
        CHARGE_OVERHEAD_MIN + (table[bb] - table[bucketFloor(arriveSoc)]);
      chargeMin += minutes;
      stops.push({ charger: st, arriveSoc, departSoc, effKw: peaks[j] });
      soc = departSoc;
    } else {
      // Şarj etmeden geçildi: kova yuvarlamasını taşımayıp gerçek değeri koru.
      soc = arriveSoc;
    }
  }

  return {
    feasible: true,
    stops,
    arrivalSoc: soc,
    driveMin,
    chargeMin,
  };
}
