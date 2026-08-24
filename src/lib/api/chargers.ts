import { fetchJson, fetchWithTimeout, HttpError } from './http';
import type { Charger, Connector, ConnectorType, LatLng } from '../../types';

/**
 * Şarj istasyonu verisi.
 *
 * Ana kaynak: OpenStreetMap / Overpass API — anahtar gerektirmez, Türkiye'de
 * ZES, Eşarj, Trugo, Voltrun, Sharz, Tesla gibi işletmecileri kapsar.
 * Ek kaynak: Open Charge Map — ücretsiz anahtarla (kredi kartı gerekmez)
 * güç ve konnektör bilgisi daha eksiksiz gelir.
 */

const OVERPASS_MIRRORS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];

const OCM = 'https://api.openchargemap.io/v3/poi';

// ── OSM etiket eşleştirme ──────────────────────────────────────────

const SOCKET_MAP: Record<string, ConnectorType> = {
  type2_combo: 'CCS2',
  type2_ccs: 'CCS2',
  ccs2: 'CCS2',
  ccs: 'CCS2',
  type1_combo: 'CCS1',
  chademo: 'CHAdeMO',
  type2: 'TYPE2',
  type2_cable: 'TYPE2',
  type2_socket: 'TYPE2',
  type1: 'TYPE1',
  type1_cable: 'TYPE1',
  tesla_supercharger: 'TESLA',
  tesla_standard: 'TESLA',
  tesla_supercharger_ccs: 'CCS2',
  tesla_destination: 'TYPE2',
  schuko: 'SCHUKO',
  typee: 'SCHUKO',
};

const DEFAULT_KW: Record<ConnectorType, number> = {
  CCS2: 50,
  CCS1: 50,
  CHAdeMO: 50,
  TESLA: 150,
  TYPE2: 22,
  TYPE1: 7.4,
  SCHUKO: 3.7,
  OTHER: 22,
};

const DC_TYPES: ConnectorType[] = ['CCS2', 'CCS1', 'CHAdeMO', 'TESLA'];

export const isDcType = (t: ConnectorType) => DC_TYPES.includes(t);

export const CONNECTOR_LABEL: Record<ConnectorType, string> = {
  CCS2: 'CCS2',
  CCS1: 'CCS1',
  CHAdeMO: 'CHAdeMO',
  TESLA: 'Tesla',
  TYPE2: 'Type 2 (AC)',
  TYPE1: 'Type 1 (AC)',
  SCHUKO: 'Priz (Schuko)',
  OTHER: 'Bilinmiyor',
};

/** "150 kW", "50000", "2 x 120 kW", "7.4" gibi değerleri kW'a çevirir. */
export function parsePowerKw(raw?: string): number | undefined {
  if (!raw) return undefined;
  const s = raw.toLowerCase().replace(/,/g, '.');
  const nums = s.match(/\d+(?:\.\d+)?/g);
  if (!nums) return undefined;
  let v = Math.max(...nums.map(Number));
  if (!/kw/.test(s) && (/\bw\b/.test(s) || v > 1000)) v = v / 1000;
  if (!Number.isFinite(v) || v <= 0 || v > 1000) return undefined;
  return Math.round(v * 10) / 10;
}

function parseIntSafe(raw?: string): number | undefined {
  if (!raw) return undefined;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

/**
 * voltage + amperage etiketlerinden güç. 380 V üstü üç fazlı AC kabul edilir
 * (400 V / 32 A = 22 kW), 500 V üstü DC olarak doğrudan çarpılır.
 */
function powerFromVoltAmp(voltage?: string, amperage?: string): number | undefined {
  const v = Number(voltage);
  const a = Number(amperage);
  if (!Number.isFinite(v) || !Number.isFinite(a) || v <= 0 || a <= 0) return undefined;
  const watts = v >= 500 ? v * a : v >= 380 ? Math.sqrt(3) * v * a : v * a;
  const kw = watts / 1000;
  if (kw < 1 || kw > 1000) return undefined;
  return Math.round(kw * 10) / 10;
}

/**
 * Ağırlıklı olarak DC hızlı şarj kuran ağlar. Türkiye'deki OSM kayıtlarının
 * yarısından fazlasında soket etiketi yok; bu ağların adı geçtiğinde DC kabul
 * etmek kapsamı ciddi artırıyor (ör. Doğu Anadolu'da başka kayıt yok).
 *
 * Listeye yalnızca DC ağırlıklı ağlar alındı. ZES ve Eşarj gibi hem AC hem DC
 * işleten ağlar bilinçli olarak dışarıda: onları DC saymak, aslında 22 kW AC
 * olan bir noktaya güvenen bir plan üretme riski taşır.
 */
const DC_FIRST_OPERATORS = /tru\s?go|trugo|astor|voltrun|beefull|onarge|powerz|zeplin/i;

/** Bu ağların DC olduğunu varsayarken kullanılan temkinli güç (kW). */
const DC_FIRST_ASSUMED_KW = 60;

/**
 * Serbest metinden ipucu. Türkiye'deki OSM kayıtlarının çoğunda soket etiketi
 * yok ama isim alanında bilgi var: "ZES ... 22kw AC", "Trugo DC 180 kW".
 */
function hintsFromText(text: string): { kw?: number; dc?: boolean } {
  const s = text.toLowerCase();
  const kw = /kw/.test(s) ? parsePowerKw(s) : undefined;
  if (/\bdc\b|hızlı|hizli|supercharger|\bccs\b|ultra|fast charg/.test(s)) {
    return { kw, dc: true };
  }
  if (/\bac\b|type ?2|t2 |yavaş|yavas/.test(s)) return { kw, dc: false };
  return { kw };
}

/** Araç şarjı olmayan noktalar (telefon/USB/scooter) plana girmemeli. */
function isNotForCars(tags: Record<string, string>, bestKw: number): boolean {
  if (tags['motorcar'] === 'no') return true;
  const text = `${tags['name'] ?? ''} ${tags['description'] ?? ''}`.toLowerCase();
  if (/\busb\b|\b5\s?v\b|telefon|phone|scooter|skuter|bisiklet|e-bike|bicycle/.test(text)) {
    return true;
  }
  // 1 kW altı bir "şarj istasyonu" araç için anlamsız.
  return bestKw > 0 && bestKw < 1;
}

interface OverpassElement {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

function chargerFromOsm(el: OverpassElement): Charger | null {
  const tags = el.tags ?? {};
  const lat = el.lat ?? el.center?.lat;
  const lon = el.lon ?? el.center?.lon;
  if (lat == null || lon == null) return null;

  const freeText = `${tags['name'] ?? ''} ${tags['capacity'] ?? ''} ${tags['description'] ?? ''}`;
  const hint = hintsFromText(freeText);

  const taggedKw =
    parsePowerKw(tags['charging_station:output']) ??
    parsePowerKw(tags['maxpower']) ??
    parsePowerKw(tags['charging_station:output:1']);
  const voltAmpKw = powerFromVoltAmp(tags['voltage'], tags['amperage']);
  // Sıra güven derecesine göre: açık güç etiketi > volt/amper > isimdeki metin.
  const stationKw = taggedKw ?? voltAmpKw ?? hint.kw;

  if (isNotForCars(tags, stationKw ?? 0)) return null;

  const connectors: Connector[] = [];
  let anyPowerFromData = false;

  for (const [key, value] of Object.entries(tags)) {
    if (!key.startsWith('socket:')) continue;
    const rest = key.slice('socket:'.length);
    // socket:type2:output gibi alt etiketleri burada atla.
    if (rest.includes(':')) continue;
    const type = SOCKET_MAP[rest];
    if (!type) continue;
    if (value === 'no' || value === '0') continue;

    const kwRaw =
      parsePowerKw(tags[`socket:${rest}:output`]) ??
      parsePowerKw(tags[`socket:${rest}:maxpower`]);
    if (kwRaw != null) anyPowerFromData = true;

    connectors.push({
      type,
      kw: kwRaw ?? (isDcType(type) ? stationKw : undefined) ?? DEFAULT_KW[type],
      count: parseIntSafe(value),
    });
  }

  let connectorsEstimated = false;
  if (connectors.length === 0) {
    // Konnektör etiketi yok: elde ne varsa ona göre en olası tipi varsay.
    // Bilinmeyeni DC saymak tehlikeli olurdu (plan o istasyona güvenir),
    // bu yüzden yalnızca somut bir DC işareti varsa DC kabul edilir.
    connectorsEstimated = true;
    const network = `${tags['brand'] ?? ''} ${tags['operator'] ?? ''} ${tags['name'] ?? ''}`;
    const brandIsTesla = /tesla/i.test(network);
    const dcFirstNetwork = DC_FIRST_OPERATORS.test(network);
    const looksDc =
      brandIsTesla || dcFirstNetwork || hint.dc === true || (stationKw ?? 0) >= 25;
    if (looksDc && hint.dc !== false) {
      const assumed = brandIsTesla ? 150 : dcFirstNetwork ? DC_FIRST_ASSUMED_KW : 50;
      connectors.push({ type: 'CCS2', kw: stationKw ?? assumed });
    } else {
      connectors.push({ type: 'TYPE2', kw: stationKw ?? DEFAULT_KW.TYPE2 });
    }
  }

  const dc = connectors.filter((c) => isDcType(c.type));
  const best = (dc.length > 0 ? dc : connectors).reduce((a, b) =>
    (b.kw ?? 0) > (a.kw ?? 0) ? b : a,
  );
  const maxKw = best.kw ?? DEFAULT_KW[best.type];
  // Açık güç etiketi veya volt/amper varsa "tahmin" sayılmaz; isimden okunan
  // değer tahmindir çünkü hangi sokete ait olduğu belirsizdir.
  const kwEstimated = !anyPowerFromData && taggedKw == null && voltAmpKw == null;

  const name =
    tags['name'] ??
    tags['operator'] ??
    tags['brand'] ??
    (dc.length > 0 ? 'Hızlı şarj istasyonu' : 'Şarj istasyonu');

  const address = [tags['addr:street'], tags['addr:city']]
    .filter(Boolean)
    .join(', ');

  return {
    id: `osm-${el.type[0]}${el.id}`,
    source: 'osm',
    name,
    operator: tags['operator'] ?? tags['brand'],
    lat,
    lon,
    connectors,
    maxKw,
    kwEstimated,
    connectorsEstimated,
    accessRestricted: tags['access'] === 'private' || tags['access'] === 'no',
    isDc: dc.length > 0,
    capacity: parseIntSafe(tags['capacity']),
    open24: tags['opening_hours'] === '24/7',
    fee: tags['fee'] === 'yes' ? true : tags['fee'] === 'no' ? false : undefined,
    address: address || undefined,
  };
}

/** Yakın koordinatlı ve aynı işletmeciye ait kayıtları tek istasyona indirir. */
function dedupe(list: Charger[]): Charger[] {
  const byKey = new Map<string, Charger>();
  for (const c of list) {
    // ~55 m ızgara
    const key = [
      c.operator?.toLowerCase().trim() ?? c.name.toLowerCase().trim(),
      c.lat.toFixed(3),
      c.lon.toFixed(3),
    ].join('|');
    const prev = byKey.get(key);
    if (!prev) {
      byKey.set(key, c);
      continue;
    }
    // Daha zengin/güçlü kaydı sakla.
    const prevScore = prev.maxKw + (prev.kwEstimated ? 0 : 25);
    const curScore = c.maxKw + (c.kwEstimated ? 0 : 25);
    if (curScore > prevScore) byKey.set(key, c);
  }
  return [...byKey.values()];
}

// ── Overpass ───────────────────────────────────────────────────────

/**
 * Rota koridorunu kapsayan dikdörtgenlerin birleşimi olarak sorgu kurar.
 *
 * `around:` ile uzun bir çokgen vermek genel Overpass sunucularında dakikalar
 * sürüyor (666 km'lik rotada zaman aşımına düşüyor). Aynı alan bbox filtresiyle
 * saniyeler içinde geliyor; koridor dışında kalanları zaten yerel olarak
 * sapma mesafesine göre eliyoruz.
 */
function overpassBboxQuery(points: LatLng[], radiusKm: number): string {
  const boxes = chunk(points, 12).map((group) => {
    let minLat = 90;
    let maxLat = -90;
    let minLon = 180;
    let maxLon = -180;
    for (const q of group) {
      minLat = Math.min(minLat, q.latitude);
      maxLat = Math.max(maxLat, q.latitude);
      minLon = Math.min(minLon, q.longitude);
      maxLon = Math.max(maxLon, q.longitude);
    }
    const latPad = radiusKm / 110.574;
    const midLat = ((minLat + maxLat) / 2) * (Math.PI / 180);
    const lonPad = radiusKm / Math.max(10, 111.32 * Math.cos(midLat));
    return [
      (minLat - latPad).toFixed(4),
      (minLon - lonPad).toFixed(4),
      (maxLat + latPad).toFixed(4),
      (maxLon + lonPad).toFixed(4),
    ].join(',');
  });

  const clauses = boxes
    .map((b) => `nwr["amenity"="charging_station"](${b});`)
    .join('');
  return `[out:json][timeout:90];(${clauses});out center tags;`;
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * Sorgu bazlı önbellek. Genel Overpass sunucuları IP başına hız sınırlıyor;
 * kullanıcı aynı rotayı yeniden planladığında (ör. şarj yüzdesini değiştirip)
 * sunucuyu tekrar yormamak için sonuç 10 dakika saklanır.
 */
const CACHE_TTL_MS = 10 * 60 * 1000;
const overpassCache = new Map<string, { at: number; data: OverpassElement[] }>();

/**
 * Aynaları sırayla dener. Hepsi başarısız olursa bir tur bekleyip tekrar
 * dener — genel Overpass sunucuları anlık olarak 429/502 dönebiliyor.
 */
async function overpass(query: string): Promise<OverpassElement[]> {
  const cached = overpassCache.get(query);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.data;

  let lastErr: unknown;
  for (let round = 0; round < 2; round++) {
    if (round > 0) await sleep(1500);
    for (const mirror of OVERPASS_MIRRORS) {
      try {
        const res = await fetchWithTimeout(mirror, {
          method: 'POST',
          timeoutMs: 40000,
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `data=${encodeURIComponent(query)}`,
        });
        if (!res.ok) throw new HttpError(`${res.status} ${res.statusText}`, res.status);
        const text = await res.text();
        // Aşırı yüklü sunucular JSON yerine HTML hata sayfası döndürebiliyor.
        if (!text.trimStart().startsWith('{')) {
          throw new HttpError('Overpass sunucusu meşgul.');
        }
        const data = JSON.parse(text) as { elements?: OverpassElement[] };
        const elements = data.elements ?? [];
        overpassCache.set(query, { at: Date.now(), data: elements });
        return elements;
      } catch (e) {
        lastErr = e;
      }
    }
  }
  throw lastErr instanceof Error
    ? lastErr
    : new HttpError('Şarj istasyonu servisine ulaşılamadı.');
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

// ── Open Charge Map (opsiyonel) ────────────────────────────────────

interface OcmConnection {
  ConnectionType?: { Title?: string };
  PowerKW?: number | null;
  Quantity?: number | null;
  CurrentType?: { Title?: string };
}
interface OcmPoi {
  ID: number;
  AddressInfo?: {
    Title?: string;
    AddressLine1?: string;
    Town?: string;
    Latitude: number;
    Longitude: number;
  };
  OperatorInfo?: { Title?: string };
  Connections?: OcmConnection[];
  NumberOfPoints?: number | null;
  UsageCost?: string | null;
}

function ocmConnectorType(title?: string): ConnectorType {
  const t = (title ?? '').toLowerCase();
  if (t.includes('ccs') && t.includes('type 1')) return 'CCS1';
  if (t.includes('ccs')) return 'CCS2';
  if (t.includes('chademo')) return 'CHAdeMO';
  if (t.includes('tesla')) return 'TESLA';
  if (t.includes('type 2')) return 'TYPE2';
  if (t.includes('type 1')) return 'TYPE1';
  if (t.includes('schuko') || t.includes('domestic')) return 'SCHUKO';
  return 'OTHER';
}

function chargerFromOcm(p: OcmPoi): Charger | null {
  const info = p.AddressInfo;
  if (!info || info.Latitude == null || info.Longitude == null) return null;

  const connectors: Connector[] = (p.Connections ?? [])
    .map((c) => {
      const type = ocmConnectorType(c.ConnectionType?.Title);
      const kw = c.PowerKW && c.PowerKW > 0 ? c.PowerKW : DEFAULT_KW[type];
      return { type, kw, count: c.Quantity ?? undefined };
    })
    .filter((c) => c.type !== 'OTHER' || (c.kw ?? 0) > 0);

  if (connectors.length === 0) {
    connectors.push({ type: 'TYPE2', kw: DEFAULT_KW.TYPE2 });
  }

  const hasRealPower = (p.Connections ?? []).some(
    (c) => c.PowerKW != null && c.PowerKW > 0,
  );
  const dc = connectors.filter((c) => isDcType(c.type));
  const best = (dc.length > 0 ? dc : connectors).reduce((a, b) =>
    (b.kw ?? 0) > (a.kw ?? 0) ? b : a,
  );

  return {
    id: `ocm-${p.ID}`,
    source: 'ocm',
    name: info.Title ?? p.OperatorInfo?.Title ?? 'Şarj istasyonu',
    operator: p.OperatorInfo?.Title ?? undefined,
    lat: info.Latitude,
    lon: info.Longitude,
    connectors,
    maxKw: best.kw ?? DEFAULT_KW[best.type],
    kwEstimated: !hasRealPower,
    connectorsEstimated: (p.Connections ?? []).length === 0,
    isDc: dc.length > 0,
    capacity: p.NumberOfPoints ?? undefined,
    address: [info.AddressLine1, info.Town].filter(Boolean).join(', ') || undefined,
  };
}

async function ocmByBox(
  sw: LatLng,
  ne: LatLng,
  key: string,
  maxResults = 400,
): Promise<Charger[]> {
  const box = `(${sw.latitude.toFixed(4)},${sw.longitude.toFixed(4)}),(${ne.latitude.toFixed(4)},${ne.longitude.toFixed(4)})`;
  const params = new URLSearchParams({
    output: 'json',
    countrycode: '',
    boundingbox: box,
    maxresults: String(maxResults),
    compact: 'true',
    verbose: 'false',
    key,
  });
  params.delete('countrycode');
  const data = await fetchJson<OcmPoi[]>(`${OCM}?${params.toString()}`, {
    timeoutMs: 25000,
  });
  return data.map(chargerFromOcm).filter((c): c is Charger => c !== null);
}

function boxOf(points: LatLng[], padDeg = 0.06): { sw: LatLng; ne: LatLng } {
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
  return {
    sw: { latitude: minLat - padDeg, longitude: minLon - padDeg },
    ne: { latitude: maxLat + padDeg, longitude: maxLon + padDeg },
  };
}

// ── Genel API ──────────────────────────────────────────────────────

export interface ChargerFetchResult {
  chargers: Charger[];
  /** Hangi kaynaklardan veri geldi. */
  sources: string[];
  /** Kısmi hatalar — kullanıcıya bilgi olarak gösterilebilir. */
  warnings: string[];
}

/**
 * Rota koridorundaki tüm şarj istasyonları.
 * @param routePoints Seyreltilmiş rota noktaları (10-20 km aralık ideal)
 * @param radiusKm Koridor yarıçapı
 */
export async function fetchChargersAlongRoute(
  routePoints: LatLng[],
  radiusKm: number,
  ocmKey?: string,
): Promise<ChargerFetchResult> {
  const sources: string[] = [];
  const warnings: string[] = [];
  const all: Charger[] = [];

  // Overpass: tüm koridor tek sorguda (bbox birleşimi olarak) gelir.
  try {
    const els = await overpass(overpassBboxQuery(routePoints, radiusKm));
    for (const el of els) {
      const c = chargerFromOsm(el);
      if (c) all.push(c);
    }
    sources.push('OpenStreetMap');
  } catch (e) {
    warnings.push(
      `OpenStreetMap şarj verisi alınamadı: ${e instanceof Error ? e.message : 'bilinmeyen hata'}`,
    );
  }

  // Open Charge Map: anahtar varsa ek kaynak.
  if (ocmKey && ocmKey.trim().length > 8) {
    try {
      const parts = chunk(routePoints, Math.ceil(routePoints.length / 3) || 1);
      for (const part of parts) {
        if (part.length === 0) continue;
        const { sw, ne } = boxOf(part);
        all.push(...(await ocmByBox(sw, ne, ocmKey.trim())));
      }
      sources.push('Open Charge Map');
    } catch (e) {
      warnings.push(
        `Open Charge Map alınamadı: ${e instanceof Error ? e.message : 'bilinmeyen hata'}`,
      );
    }
  }

  if (all.length === 0 && warnings.length > 0) {
    throw new HttpError(warnings.join(' • '));
  }

  return { chargers: dedupe(all), sources, warnings };
}

/** Tek bir noktanın çevresindeki istasyonlar (harita keşfi için). */
export async function fetchChargersNear(
  center: LatLng,
  radiusKm: number,
  ocmKey?: string,
): Promise<ChargerFetchResult> {
  return fetchChargersAlongRoute([center], radiusKm, ocmKey);
}
