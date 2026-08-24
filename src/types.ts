export interface LatLng {
  latitude: number;
  longitude: number;
}

/** Fiziksel konnektör tipleri. */
export type ConnectorType =
  | 'CCS2'
  | 'CCS1'
  | 'CHAdeMO'
  | 'TESLA'
  | 'TYPE2'
  | 'TYPE1'
  | 'SCHUKO'
  | 'OTHER';

export interface Connector {
  type: ConnectorType;
  kw?: number;
  count?: number;
}

export interface Charger {
  id: string;
  source: 'osm' | 'ocm';
  name: string;
  operator?: string;
  lat: number;
  lon: number;
  connectors: Connector[];
  /** En hızlı konnektörün gücü (kW). */
  maxKw: number;
  /** true ise güç veriden okunmadı, tipe/işletmeciye göre tahmin edildi. */
  kwEstimated: boolean;
  /** true ise konnektör tipi de etiketli değildi, en olası tip varsayıldı. */
  connectorsEstimated?: boolean;
  /** access=private/no — herkese açık değil, plan durağı olarak seçilmez. */
  accessRestricted?: boolean;
  isDc: boolean;
  /** Kaç araç aynı anda şarj olabilir. */
  capacity?: number;
  open24?: boolean;
  fee?: boolean;
  address?: string;
}

/** Rota üzerine izdüşümü hesaplanmış istasyon. */
export interface RouteCharger extends Charger {
  /** Rota başlangıcından itibaren kaçıncı km'de. */
  routeKm: number;
  /** Rotadan tek yön sapma mesafesi (km). */
  detourKm: number;
}

export interface RouteSegment {
  startKm: number;
  endKm: number;
  kmh: number;
}

export interface RouteResult {
  points: LatLng[];
  /** points ile aynı uzunlukta, kümülatif km. */
  cums: number[];
  distanceKm: number;
  durationMin: number;
  segments: RouteSegment[];
  provider: 'osrm' | 'ors';
}

export type DrivingStyle = 'eco' | 'normal' | 'sport';

export interface Vehicle {
  id: string;
  brand: string;
  model: string;
  /** Kullanılabilir batarya kapasitesi (kWh). */
  batteryKwh: number;
  /** Gerçek dünya ortalama tüketim (Wh/km). */
  whPerKm: number;
  maxDcKw: number;
  maxAcKw: number;
  dcConnector: 'CCS2' | 'CHAdeMO' | 'TESLA';
  acConnector: 'TYPE2' | 'TYPE1';
}

export interface Place {
  id: string;
  label: string;
  detail: string;
  latitude: number;
  longitude: number;
}

export interface PlanOptions {
  /** Varışta bataryada kalması istenen minimum yüzde. */
  arrivalBufferPct: number;
  /** DC duraklarda şarjın kesileceği üst yüzde. */
  maxChargePct: number;
  /** Rotadan kabul edilen maksimum tek yön sapma (km). */
  maxDetourKm: number;
  tempC: number;
  style: DrivingStyle;
  /** Bu gücün altındaki istasyonlar durak olarak seçilmesin (kW). */
  minStationKw: number;
}

export interface StopAlternative {
  charger: RouteCharger;
  score: number;
  reason: string;
}

export interface PlannedStop {
  charger: RouteCharger;
  arriveSoc: number;
  departSoc: number;
  chargeMin: number;
  addedKwh: number;
  /** Şarj boyunca ulaşılan ortalama güç (kW). */
  avgKw: number;
  /** İstasyonun araca verebileceği tepe güç (kW). */
  effectiveKw: number;
  score: number;
  why: string;
  alternatives: StopAlternative[];
}

export interface TripPlan {
  feasible: boolean;
  reason?: string;
  stops: PlannedStop[];
  arrivalSoc: number;
  driveMin: number;
  chargeMin: number;
  totalMin: number;
  distanceKm: number;
  detourKm: number;
  /** Hesapta kullanılan efektif tüketim (Wh/km). */
  effectiveWhPerKm: number;
  advisories: string[];
}
