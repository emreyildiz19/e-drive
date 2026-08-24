import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { CUSTOM_VEHICLE, findVehicle } from '../data/vehicles';
import type { DrivingStyle, PlanOptions, Vehicle } from '../types';

const STORAGE_KEY = 'edrive.settings.v1';

export interface Settings {
  vehicleId: string;
  /** vehicleId === 'custom' iken kullanılan elle girilmiş araç. */
  custom: Vehicle;
  /** Seçili araçlar için kullanıcı düzeltmeleri (id → alanlar). */
  overrides: Record<string, { batteryKwh?: number; whPerKm?: number }>;
  startSoc: number;
  arrivalBufferPct: number;
  maxChargePct: number;
  maxDetourKm: number;
  tempC: number;
  style: DrivingStyle;
  minStationKw: number;
  /** Sadece hızlı (DC) istasyonları haritada göster. */
  onlyDc: boolean;
  orsKey: string;
  ocmKey: string;
}

export const DEFAULT_SETTINGS: Settings = {
  vehicleId: 'togg-t10x-lr',
  custom: { ...CUSTOM_VEHICLE },
  overrides: {},
  startSoc: 80,
  arrivalBufferPct: 10,
  maxChargePct: 80,
  maxDetourKm: 5,
  tempC: 20,
  style: 'normal',
  minStationKw: 40,
  onlyDc: true,
  orsKey: '',
  ocmKey: '',
};

interface Ctx {
  settings: Settings;
  ready: boolean;
  update: (patch: Partial<Settings>) => void;
  /** Düzeltmeler uygulanmış, plan hesabında kullanılacak araç. */
  vehicle: Vehicle;
  planOptions: PlanOptions;
  reset: () => void;
}

const SettingsContext = createContext<Ctx | null>(null);

function sanitize(raw: unknown): Settings {
  if (typeof raw !== 'object' || raw === null) return DEFAULT_SETTINGS;
  const r = raw as Partial<Settings>;
  const num = (v: unknown, fallback: number, lo: number, hi: number) =>
    typeof v === 'number' && Number.isFinite(v)
      ? Math.max(lo, Math.min(hi, v))
      : fallback;
  return {
    vehicleId:
      typeof r.vehicleId === 'string' ? r.vehicleId : DEFAULT_SETTINGS.vehicleId,
    custom:
      r.custom && typeof r.custom === 'object'
        ? { ...CUSTOM_VEHICLE, ...r.custom, id: 'custom' }
        : { ...CUSTOM_VEHICLE },
    overrides:
      r.overrides && typeof r.overrides === 'object' ? r.overrides : {},
    startSoc: num(r.startSoc, 80, 1, 100),
    arrivalBufferPct: num(r.arrivalBufferPct, 10, 0, 40),
    maxChargePct: num(r.maxChargePct, 80, 50, 100),
    maxDetourKm: num(r.maxDetourKm, 5, 0.5, 30),
    tempC: num(r.tempC, 20, -30, 50),
    style:
      r.style === 'eco' || r.style === 'sport' || r.style === 'normal'
        ? r.style
        : 'normal',
    minStationKw: num(r.minStationKw, 40, 0, 350),
    onlyDc: typeof r.onlyDc === 'boolean' ? r.onlyDc : true,
    orsKey: typeof r.orsKey === 'string' ? r.orsKey : '',
    ocmKey: typeof r.ocmKey === 'string' ? r.ocmKey : '',
  };
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!alive) return;
        if (raw) {
          try {
            setSettings(sanitize(JSON.parse(raw)));
          } catch {
            // Bozuk kayıt — varsayılanlarla devam et.
          }
        }
      })
      .finally(() => {
        if (alive) setReady(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  const persist = useCallback((next: Settings) => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {
      // Kalıcı yazma başarısız olsa da oturum içinde çalışmaya devam et.
    });
  }, []);

  const update = useCallback(
    (patch: Partial<Settings>) => {
      setSettings((prev) => {
        const next = sanitize({ ...prev, ...patch });
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const reset = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    persist(DEFAULT_SETTINGS);
  }, [persist]);

  const vehicle = useMemo<Vehicle>(() => {
    const base =
      settings.vehicleId === 'custom'
        ? settings.custom
        : findVehicle(settings.vehicleId) ?? settings.custom;
    const ov = settings.overrides[base.id];
    if (!ov) return base;
    return {
      ...base,
      batteryKwh: ov.batteryKwh ?? base.batteryKwh,
      whPerKm: ov.whPerKm ?? base.whPerKm,
    };
  }, [settings]);

  const planOptions = useMemo<PlanOptions>(
    () => ({
      arrivalBufferPct: settings.arrivalBufferPct,
      maxChargePct: settings.maxChargePct,
      maxDetourKm: settings.maxDetourKm,
      tempC: settings.tempC,
      style: settings.style,
      minStationKw: settings.minStationKw,
    }),
    [settings],
  );

  const value = useMemo<Ctx>(
    () => ({ settings, ready, update, vehicle, planOptions, reset }),
    [settings, ready, update, vehicle, planOptions, reset],
  );

  return (
    <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
  );
}

export function useSettings(): Ctx {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings, SettingsProvider içinde kullanılmalı');
  return ctx;
}
