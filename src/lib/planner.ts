import { isDcType } from './api/chargers';
import {
  averageWhPerKm,
  detourEnergyKwh,
  detourMinutes,
  energyKwh,
  estimateCharge,
  reachableKm,
  type EnergyContext,
} from './energy';
import { clamp, projectOnRoute, thinRoute } from './geo';
import { optimizeStops } from './optimizer';
import type {
  Charger,
  ConnectorType,
  PlanOptions,
  PlannedStop,
  RouteCharger,
  RouteResult,
  StopAlternative,
  TripPlan,
  Vehicle,
} from '../types';

/**
 * Bir DC konnektörünün araca uyup uymadığı.
 *
 * Avrupa'daki Tesla Supercharger'larda fiziksel konnektör CCS2'dir; OSM'de
 * `socket:tesla_supercharger` olarak etiketlenmiş olsa da CCS2 araçlara
 * fiziksel olarak uyar (erişim politikası ayrı konu — plan ekranında uyarılır).
 */
function dcConnectorWorks(type: ConnectorType, vehicle: Vehicle): boolean {
  if (!isDcType(type)) return false;
  if (type === vehicle.dcConnector) return true;
  return type === 'TESLA' && vehicle.dcConnector === 'CCS2';
}

/** Aracın bu istasyondan DC hızlı şarj alabilmesi. */
export function dcCompatible(charger: Charger, vehicle: Vehicle): boolean {
  return charger.connectors.some((c) => dcConnectorWorks(c.type, vehicle));
}

/** Aracın bu istasyona herhangi bir şekilde (AC dahil) bağlanabilmesi. */
export function anyCompatible(charger: Charger, vehicle: Vehicle): boolean {
  return charger.connectors.some(
    (c) =>
      dcConnectorWorks(c.type, vehicle) ||
      c.type === vehicle.acConnector ||
      c.type === 'SCHUKO',
  );
}

/**
 * İstasyonun uyumlu DC soketindeki gücü — araç sınırıyla kırpılmadan.
 * Minimum güç filtresi bununla karşılaştırılır: aksi halde 30 kW alan bir araç
 * (ör. Dacia Spring) için 150 kW'lık istasyon da "yetersiz" sayılırdı.
 */
export function stationDcKw(charger: Charger, vehicle: Vehicle): number {
  return charger.connectors
    .filter((c) => dcConnectorWorks(c.type, vehicle))
    .reduce((max, c) => Math.max(max, c.kw ?? 0), 0);
}

/** İstasyonun araca gerçekte verebileceği tepe DC gücü. */
export function effectiveKw(charger: Charger, vehicle: Vehicle): number {
  const station = stationDcKw(charger, vehicle);
  return Math.min(station || charger.maxKw, vehicle.maxDcKw);
}

/** Tesla işletmeli ama araç Tesla değilse erişim uyarısı gerekir. */
export function needsTeslaAccessWarning(charger: Charger, vehicle: Vehicle): boolean {
  if (vehicle.brand === 'Tesla') return false;
  const teslaOperated = /tesla/i.test(`${charger.operator ?? ''} ${charger.name}`);
  return teslaOperated || charger.connectors.some((c) => c.type === 'TESLA');
}

/** İstasyonları rota üzerine izdüşür, koridor dışındakileri atar. */
export function projectChargers(
  chargers: Charger[],
  route: RouteResult,
  maxDetourKm: number,
): RouteCharger[] {
  // İzdüşüm maliyetini düşürmek için rotayı ~250 m'ye seyrelt.
  const thin = thinRoute(route.points, route.cums, 0.25);
  const out: RouteCharger[] = [];
  for (const c of chargers) {
    const { routeKm, detourKm } = projectOnRoute(
      { latitude: c.lat, longitude: c.lon },
      thin.points,
      thin.cums,
    );
    if (detourKm <= maxDetourKm) out.push({ ...c, routeKm, detourKm });
  }
  return out.sort((a, b) => a.routeKm - b.routeKm);
}

/** İstasyon verisinin ne kadar güvenilir olduğu (0-1). */
function trustOf(c: RouteCharger): number {
  let trust = c.kwEstimated ? 0.4 : 1;
  if (c.connectorsEstimated) trust *= 0.65;
  if ((c.capacity ?? 1) >= 2) trust = Math.min(1, trust + 0.2);
  if (c.open24) trust = Math.min(1, trust + 0.12);
  return trust;
}

export interface PlanInput {
  route: RouteResult;
  ctx: EnergyContext;
  vehicle: Vehicle;
  startSoc: number;
  chargers: RouteCharger[];
  opts: PlanOptions;
}

/** Bir alternatifin seçilen duraktan farkını tek cümlede anlatır. */
function alternativeReason(
  alt: RouteCharger,
  altKw: number,
  altMin: number,
  chosen: RouteCharger,
  chosenKw: number,
  chosenMin: number,
): string {
  if (altKw > chosenKw * 1.25) return `${Math.round(altKw)} kW — daha hızlı şarj`;
  if (altMin < chosenMin - 4) return `~${Math.round(altMin)} dk — daha kısa mola`;
  if (alt.detourKm < chosen.detourKm - 0.7)
    return `${alt.detourKm.toFixed(1)} km sapma — rotaya daha yakın`;
  if (alt.routeKm > chosen.routeKm + 15)
    return `${Math.round(alt.routeKm - chosen.routeKm)} km daha ileride`;
  if (alt.open24 && !chosen.open24) return '24 saat açık';
  if (!alt.kwEstimated && chosen.kwEstimated) return 'güç bilgisi doğrulanmış';
  return `${Math.round(altKw)} kW · ~${Math.round(altMin)} dk`;
}

/**
 * Yolculuk planı.
 *
 * Durak seçimi `optimizeStops` içindeki en kısa süre aramasına bırakılır;
 * bu fonksiyon sonucu insanın okuyabileceği hale getirir: her durak için şarj
 * tahmini, aynı bacakta değerlendirilmiş alternatifler ve öneriler.
 */
export function planTrip(input: PlanInput): TripPlan {
  const { route, ctx, vehicle, startSoc, chargers, opts } = input;
  const totalKm = route.distanceKm;

  const advisories: string[] = [];

  // Plan durağı olabilecek istasyonlar: uyumlu, herkese açık, yeterli güçte.
  const usable = chargers.filter(
    (c) =>
      dcCompatible(c, vehicle) &&
      !c.accessRestricted &&
      stationDcKw(c, vehicle) >= opts.minStationKw,
  );

  const kwOf = (c: RouteCharger) => effectiveKw(c, vehicle);
  const baseInput = {
    ctx,
    vehicle,
    stations: usable,
    totalKm,
    startSoc,
    arrivalBufferPct: opts.arrivalBufferPct,
    effectiveKw: kwOf,
  };

  let opt = optimizeStops({ ...baseInput, maxChargePct: opts.maxChargePct });

  // Üst sınır yüzünden çözüm bulunamadıysa %100'e izin verip tekrar dene:
  // yolculuğu imkânsız ilan etmek yerine "daha fazla şarj gerekiyor" demek
  // kullanıcı için daha yararlı.
  if (!opt.feasible && opts.maxChargePct < 100) {
    const retry = optimizeStops({ ...baseInput, maxChargePct: 100 });
    if (retry.feasible) {
      opt = retry;
      advisories.push(
        `Planı tamamlamak için bazı duraklarda %${opts.maxChargePct} üst sınırının ` +
          'üstüne çıkmak gerekiyor; bu hesapta sınır esnetildi.',
      );
    }
  }

  const stops: PlannedStop[] = [];
  let chargeMin = 0;
  let detourKmTotal = 0;

  for (const [i, s] of opt.stops.entries()) {
    const est = estimateCharge(vehicle, s.effKw, true, s.arriveSoc, s.departSoc);
    chargeMin += est.minutes;
    detourKmTotal += 2 * s.charger.detourKm;

    // Bu durağın alternatifleri: aynı bacakta, yani önceki duraktan (veya
    // kalkıştan) eldeki şarjla ulaşılabilen diğer uyumlu istasyonlar.
    const prevKm = i === 0 ? 0 : opt.stops[i - 1].charger.routeKm;
    const prevSoc = i === 0 ? startSoc : opt.stops[i - 1].departSoc;
    const reach = reachableKm(
      ctx,
      prevKm,
      (vehicle.batteryKwh * (prevSoc - opts.arrivalBufferPct)) / 100,
    );
    const alternatives: StopAlternative[] = usable
      .filter(
        (c) =>
          c.id !== s.charger.id &&
          c.routeKm > prevKm + 3 &&
          c.routeKm <= prevKm + reach,
      )
      .map((c) => {
        const kw = kwOf(c);
        const need =
          energyKwh(ctx, prevKm, c.routeKm) + detourEnergyKwh(ctx, c.detourKm);
        const arrive = prevSoc - (need / vehicle.batteryKwh) * 100;
        const altEst = estimateCharge(
          vehicle,
          kw,
          true,
          arrive,
          Math.max(arrive + 2, s.departSoc),
        );
        return { c, kw, minutes: altEst.minutes, arrive };
      })
      .filter((x) => x.arrive >= opts.arrivalBufferPct)
      .sort((a, b) => b.kw - a.kw || a.c.detourKm - b.c.detourKm)
      .slice(0, 3)
      .map((x) => ({
        charger: x.c,
        score: trustOf(x.c),
        reason: alternativeReason(
          x.c,
          x.kw,
          x.minutes,
          s.charger,
          s.effKw,
          est.minutes,
        ),
      }));

    const whyParts: string[] = [];
    if (i + 1 < opt.stops.length) {
      const nextKm = opt.stops[i + 1].charger.routeKm;
      whyParts.push(`sonraki durağa (${Math.round(nextKm)}. km) yetecek kadar şarj`);
    } else {
      whyParts.push('buradan hedefe tek seferde ulaşılıyor');
    }
    whyParts.push(`${s.charger.kwEstimated ? '~' : ''}${Math.round(s.effKw)} kW`);
    whyParts.push(
      s.charger.detourKm < 0.5
        ? 'rota üstünde'
        : `${s.charger.detourKm.toFixed(1)} km sapma`,
    );
    if (s.charger.open24) whyParts.push('24 saat');

    stops.push({
      charger: s.charger,
      arriveSoc: s.arriveSoc,
      departSoc: s.departSoc,
      chargeMin: est.minutes,
      addedKwh: est.kwh,
      avgKw: est.avgKw,
      effectiveKw: s.effKw,
      score: trustOf(s.charger),
      why: whyParts.join(' · '),
      alternatives,
    });
  }

  const feasible = opt.feasible;
  let reason: string | undefined;
  if (!feasible) {
    const blocked = opt.blockedAtKm ?? 0;
    const next = usable.find((c) => c.routeKm > blocked + 3);
    if (usable.length === 0) {
      reason =
        'Rota üzerinde aracınla uyumlu, herkese açık hızlı şarj istasyonu ' +
        'bulunamadı. Ayarlardan sapma toleransını artırmayı veya minimum güç ' +
        'filtresini düşürmeyi dene.';
    } else if (next) {
      reason =
        `${Math.round(blocked)}. km'den sonrası menzil dışında kalıyor: sıradaki ` +
        `uyumlu istasyon (${next.name}) ${Math.round(next.routeKm)}. km'de ve ` +
        'oraya bu şarjla ulaşılamıyor. Daha yüksek şarjla yola çıkmayı, varış ' +
        'tamponunu düşürmeyi veya sapma toleransını artırmayı dene.';
    } else {
      reason =
        `Son uyumlu istasyondan sonra hedefe kadar ${Math.round(totalKm - blocked)} ` +
        'km şarjsız yol var ve bu menzilin üstünde. Varış tamponunu düşürmek ' +
        'veya yolculuğu bölmek gerekiyor.';
    }

    // Tipi belirsiz kayıtlar çoksa sorun büyük olasılıkla açık veri eksikliği.
    const unknown = chargers.filter(
      (c) => c.connectorsEstimated && !dcCompatible(c, vehicle),
    ).length;
    if (unknown >= 3) {
      reason +=
        ` Not: koridorda konnektör bilgisi olmayan ${unknown} kayıt daha var; ` +
        'bunlar güvenlik gereği plana alınmadı. Ayarlardan ücretsiz Open Charge ' +
        'Map anahtarı eklersen bu bölgede kapsama belirgin artar.';
    }
  }

  const arrivalSoc = clamp(opt.arrivalSoc, 0, 100);
  const driveMin = feasible && opt.driveMin > 0 ? opt.driveMin : route.durationMin;
  const effWhPerKm = averageWhPerKm(ctx);

  // ── Öneriler ────────────────────────────────────────────────────

  if (ctx.tempF > 1.08) {
    advisories.push(
      `Hava soğuk: tüketim normale göre ~%${Math.round((ctx.tempF - 1) * 100)} ` +
        `daha yüksek hesaplandı (${Math.round(effWhPerKm)} Wh/km). Menzil buna ` +
        'göre kısaldı.',
    );
  }

  if (ctx.styleF > 1.05 && stops.length > 0) {
    advisories.push(
      'Sürüş tarzı "hızlı" seçili. Otoyolda 110 yerine 100 km/h gitmek tipik ' +
        'olarak %8-10 menzil kazandırır ve bir molayı tamamen kaldırabilir.',
    );
  }

  if (feasible && stops.length === 0) {
    advisories.push(
      `Şarj molası gerekmiyor — hedefe %${Math.round(arrivalSoc)} ile varıyorsun.`,
    );
  }

  if (feasible && stops.length > 0 && arrivalSoc < opts.arrivalBufferPct + 4) {
    advisories.push(
      `Varışta batarya %${Math.round(arrivalSoc)}'e düşüyor — tamponun hemen ` +
        'üstü. Son durakta 5-10 dk fazla şarj etmek rampa ve rüzgâr ' +
        'sürprizlerine karşı rahatlatır.',
    );
  }

  // Aynı bacakta belirgin şekilde daha hızlı bir istasyon varsa söyle: plan
  // toplam süreye göre seçim yapar, kullanıcı molayı kısaltmayı tercih edebilir.
  for (const [i, s] of stops.entries()) {
    const faster = s.alternatives.find(
      (a) => effectiveKw(a.charger, vehicle) > s.effectiveKw * 1.5,
    );
    if (!faster) continue;
    const fKw = effectiveKw(faster.charger, vehicle);
    const altEst = estimateCharge(vehicle, fKw, true, s.arriveSoc, s.departSoc);
    const saved =
      s.chargeMin +
      detourMinutes(s.charger.detourKm) -
      altEst.minutes -
      detourMinutes(faster.charger.detourKm);
    if (saved > 6) {
      advisories.push(
        `${i + 1}. durakta molayı kısaltmak istersen ${faster.charger.name} ` +
          `(${Math.round(fKw)} kW, ${faster.charger.detourKm.toFixed(1)} km sapma) ` +
          `bu bacakta ~${Math.round(saved)} dk daha hızlı şarj eder.`,
      );
    }
  }

  const slowStops = stops.filter((s) => s.effectiveKw < 50);
  if (slowStops.length > 0 && opts.minStationKw < 50) {
    advisories.push(
      `${slowStops.length} durakta güç 50 kW altında ve bu molayı uzatıyor. ` +
        'Ayarlardan minimum gücü 50 kW yapıp planı yeniden hesaplamayı dene.',
    );
  }

  const estimatedStops = stops.filter((s) => s.charger.kwEstimated);
  if (estimatedStops.length > 0) {
    advisories.push(
      `${estimatedStops.length} durağın gücü açık veride belirtilmemiş, tipine ` +
        'göre temkinli tahmin edildi — gerçek mola daha kısa olabilir.',
    );
  }

  const teslaStops = stops.filter((s) => needsTeslaAccessWarning(s.charger, vehicle));
  if (teslaStops.length > 0) {
    advisories.push(
      `${teslaStops.length} durak Tesla işletmeli. Avrupa'da konnektör CCS2'dir ` +
        'ama her lokasyon diğer markalara açık değil — yola çıkmadan Tesla ' +
        'uygulamasından teyit et.',
    );
  }

  if (feasible && startSoc > 92 && stops.length > 0) {
    advisories.push(
      'Yola %100 ile çıkmak yerine %90 ile çıkıp ilk durakta biraz daha uzun ' +
        'kalmak batarya sağlığı için daha iyi; toplam süre neredeyse aynı.',
    );
  }

  return {
    feasible,
    reason,
    stops,
    arrivalSoc,
    driveMin,
    chargeMin,
    totalMin: driveMin + chargeMin,
    distanceKm: totalKm + detourKmTotal,
    detourKm: detourKmTotal,
    effectiveWhPerKm: effWhPerKm,
    advisories,
  };
}
