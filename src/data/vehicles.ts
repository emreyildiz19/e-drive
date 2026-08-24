import type { Vehicle } from '../types';

/**
 * Elektrikli araç veritabanı.
 *
 * batteryKwh  : kullanılabilir (net) batarya kapasitesi
 * whPerKm     : karma gerçek dünya tüketimi — WLTP değil, ~20 °C'de
 *               normal sürüşte beklenen değer
 * maxDcKw     : aracın kabul ettiği tepe DC gücü
 * maxAcKw     : yerleşik AC şarj cihazının gücü
 *
 * Değerler yaklaşıktır (üretici verisi + gerçek dünya ortalamaları).
 * Ayarlar ekranından seçtiğin araç için batarya ve tüketimi elle
 * düzeltebilirsin.
 */
export const VEHICLES: Vehicle[] = [
  // ── Togg ─────────────────────────────────────────────────────────
  { id: 'togg-t10x-sr', brand: 'Togg', model: 'T10X Standart Menzil', batteryKwh: 52.4, whPerKm: 165, maxDcKw: 120, maxAcKw: 11, dcConnector: 'CCS2', acConnector: 'TYPE2' },
  { id: 'togg-t10x-lr', brand: 'Togg', model: 'T10X Uzun Menzil', batteryKwh: 88.5, whPerKm: 172, maxDcKw: 180, maxAcKw: 11, dcConnector: 'CCS2', acConnector: 'TYPE2' },
  { id: 'togg-t10f-sr', brand: 'Togg', model: 'T10F Standart Menzil', batteryKwh: 52.4, whPerKm: 158, maxDcKw: 120, maxAcKw: 11, dcConnector: 'CCS2', acConnector: 'TYPE2' },
  { id: 'togg-t10f-lr', brand: 'Togg', model: 'T10F Uzun Menzil', batteryKwh: 88.5, whPerKm: 165, maxDcKw: 180, maxAcKw: 11, dcConnector: 'CCS2', acConnector: 'TYPE2' },

  // ── Tesla ────────────────────────────────────────────────────────
  { id: 'tesla-m3-rwd', brand: 'Tesla', model: 'Model 3 RWD', batteryKwh: 57.5, whPerKm: 145, maxDcKw: 170, maxAcKw: 11, dcConnector: 'CCS2', acConnector: 'TYPE2' },
  { id: 'tesla-m3-lr', brand: 'Tesla', model: 'Model 3 Long Range AWD', batteryKwh: 75, whPerKm: 158, maxDcKw: 250, maxAcKw: 11, dcConnector: 'CCS2', acConnector: 'TYPE2' },
  { id: 'tesla-m3-perf', brand: 'Tesla', model: 'Model 3 Performance', batteryKwh: 75, whPerKm: 172, maxDcKw: 250, maxAcKw: 11, dcConnector: 'CCS2', acConnector: 'TYPE2' },
  { id: 'tesla-my-rwd', brand: 'Tesla', model: 'Model Y RWD', batteryKwh: 57.5, whPerKm: 158, maxDcKw: 170, maxAcKw: 11, dcConnector: 'CCS2', acConnector: 'TYPE2' },
  { id: 'tesla-my-lr', brand: 'Tesla', model: 'Model Y Long Range AWD', batteryKwh: 75, whPerKm: 168, maxDcKw: 250, maxAcKw: 11, dcConnector: 'CCS2', acConnector: 'TYPE2' },
  { id: 'tesla-my-perf', brand: 'Tesla', model: 'Model Y Performance', batteryKwh: 75, whPerKm: 182, maxDcKw: 250, maxAcKw: 11, dcConnector: 'CCS2', acConnector: 'TYPE2' },
  { id: 'tesla-ms', brand: 'Tesla', model: 'Model S', batteryKwh: 95, whPerKm: 200, maxDcKw: 250, maxAcKw: 11, dcConnector: 'CCS2', acConnector: 'TYPE2' },
  { id: 'tesla-mx', brand: 'Tesla', model: 'Model X', batteryKwh: 95, whPerKm: 215, maxDcKw: 250, maxAcKw: 11, dcConnector: 'CCS2', acConnector: 'TYPE2' },

  // ── Hyundai ──────────────────────────────────────────────────────
  { id: 'hyundai-ioniq5-77', brand: 'Hyundai', model: 'Ioniq 5 77,4 kWh', batteryKwh: 77.4, whPerKm: 168, maxDcKw: 233, maxAcKw: 11, dcConnector: 'CCS2', acConnector: 'TYPE2' },
  { id: 'hyundai-ioniq5-58', brand: 'Hyundai', model: 'Ioniq 5 58 kWh', batteryKwh: 58, whPerKm: 160, maxDcKw: 175, maxAcKw: 11, dcConnector: 'CCS2', acConnector: 'TYPE2' },
  { id: 'hyundai-ioniq6-77', brand: 'Hyundai', model: 'Ioniq 6 77,4 kWh', batteryKwh: 77.4, whPerKm: 145, maxDcKw: 233, maxAcKw: 11, dcConnector: 'CCS2', acConnector: 'TYPE2' },
  { id: 'hyundai-ioniq9', brand: 'Hyundai', model: 'Ioniq 9', batteryKwh: 110.3, whPerKm: 190, maxDcKw: 233, maxAcKw: 11, dcConnector: 'CCS2', acConnector: 'TYPE2' },
  { id: 'hyundai-kona-65', brand: 'Hyundai', model: 'Kona Electric 65 kWh', batteryKwh: 65.4, whPerKm: 155, maxDcKw: 102, maxAcKw: 11, dcConnector: 'CCS2', acConnector: 'TYPE2' },
  { id: 'hyundai-kona-48', brand: 'Hyundai', model: 'Kona Electric 48 kWh', batteryKwh: 48.6, whPerKm: 148, maxDcKw: 74, maxAcKw: 11, dcConnector: 'CCS2', acConnector: 'TYPE2' },
  { id: 'hyundai-inster', brand: 'Hyundai', model: 'Inster', batteryKwh: 46.4, whPerKm: 140, maxDcKw: 85, maxAcKw: 11, dcConnector: 'CCS2', acConnector: 'TYPE2' },

  // ── Kia ──────────────────────────────────────────────────────────
  { id: 'kia-ev6-77', brand: 'Kia', model: 'EV6 77,4 kWh', batteryKwh: 77.4, whPerKm: 165, maxDcKw: 240, maxAcKw: 11, dcConnector: 'CCS2', acConnector: 'TYPE2' },
  { id: 'kia-ev6-gt', brand: 'Kia', model: 'EV6 GT', batteryKwh: 77.4, whPerKm: 195, maxDcKw: 240, maxAcKw: 11, dcConnector: 'CCS2', acConnector: 'TYPE2' },
  { id: 'kia-ev3-81', brand: 'Kia', model: 'EV3 81,4 kWh', batteryKwh: 81.4, whPerKm: 150, maxDcKw: 128, maxAcKw: 11, dcConnector: 'CCS2', acConnector: 'TYPE2' },
  { id: 'kia-ev3-58', brand: 'Kia', model: 'EV3 58,3 kWh', batteryKwh: 58.3, whPerKm: 145, maxDcKw: 102, maxAcKw: 11, dcConnector: 'CCS2', acConnector: 'TYPE2' },
  { id: 'kia-ev5', brand: 'Kia', model: 'EV5', batteryKwh: 81.4, whPerKm: 170, maxDcKw: 150, maxAcKw: 11, dcConnector: 'CCS2', acConnector: 'TYPE2' },
  { id: 'kia-ev9', brand: 'Kia', model: 'EV9', batteryKwh: 99.8, whPerKm: 195, maxDcKw: 210, maxAcKw: 11, dcConnector: 'CCS2', acConnector: 'TYPE2' },
  { id: 'kia-niro', brand: 'Kia', model: 'Niro EV', batteryKwh: 64.8, whPerKm: 155, maxDcKw: 80, maxAcKw: 11, dcConnector: 'CCS2', acConnector: 'TYPE2' },

  // ── BYD ──────────────────────────────────────────────────────────
  { id: 'byd-atto3', brand: 'BYD', model: 'Atto 3', batteryKwh: 60, whPerKm: 175, maxDcKw: 88, maxAcKw: 11, dcConnector: 'CCS2', acConnector: 'TYPE2' },
  { id: 'byd-dolphin', brand: 'BYD', model: 'Dolphin 60,4 kWh', batteryKwh: 60.4, whPerKm: 155, maxDcKw: 88, maxAcKw: 11, dcConnector: 'CCS2', acConnector: 'TYPE2' },
  { id: 'byd-seal-rwd', brand: 'BYD', model: 'Seal RWD', batteryKwh: 82.5, whPerKm: 160, maxDcKw: 150, maxAcKw: 11, dcConnector: 'CCS2', acConnector: 'TYPE2' },
  { id: 'byd-seal-awd', brand: 'BYD', model: 'Seal AWD', batteryKwh: 82.5, whPerKm: 175, maxDcKw: 150, maxAcKw: 11, dcConnector: 'CCS2', acConnector: 'TYPE2' },
  { id: 'byd-sealu', brand: 'BYD', model: 'Seal U EV', batteryKwh: 71.8, whPerKm: 190, maxDcKw: 115, maxAcKw: 11, dcConnector: 'CCS2', acConnector: 'TYPE2' },
  { id: 'byd-sealion7', brand: 'BYD', model: 'Sealion 7', batteryKwh: 82.5, whPerKm: 190, maxDcKw: 150, maxAcKw: 11, dcConnector: 'CCS2', acConnector: 'TYPE2' },
  { id: 'byd-han', brand: 'BYD', model: 'Han', batteryKwh: 85.4, whPerKm: 180, maxDcKw: 120, maxAcKw: 11, dcConnector: 'CCS2', acConnector: 'TYPE2' },
  { id: 'byd-tang', brand: 'BYD', model: 'Tang', batteryKwh: 108.8, whPerKm: 220, maxDcKw: 170, maxAcKw: 11, dcConnector: 'CCS2', acConnector: 'TYPE2' },

  // ── Volkswagen ───────────────────────────────────────────────────
  { id: 'vw-id3-58', brand: 'Volkswagen', model: 'ID.3 Pro 58 kWh', batteryKwh: 58, whPerKm: 155, maxDcKw: 120, maxAcKw: 11, dcConnector: 'CCS2', acConnector: 'TYPE2' },
  { id: 'vw-id3-77', brand: 'Volkswagen', model: 'ID.3 Pro S 77 kWh', batteryKwh: 77, whPerKm: 160, maxDcKw: 170, maxAcKw: 11, dcConnector: 'CCS2', acConnector: 'TYPE2' },
  { id: 'vw-id4-77', brand: 'Volkswagen', model: 'ID.4 Pro 77 kWh', batteryKwh: 77, whPerKm: 178, maxDcKw: 135, maxAcKw: 11, dcConnector: 'CCS2', acConnector: 'TYPE2' },
  { id: 'vw-id5-77', brand: 'Volkswagen', model: 'ID.5 Pro 77 kWh', batteryKwh: 77, whPerKm: 172, maxDcKw: 135, maxAcKw: 11, dcConnector: 'CCS2', acConnector: 'TYPE2' },
  { id: 'vw-id7-77', brand: 'Volkswagen', model: 'ID.7 Pro 77 kWh', batteryKwh: 77, whPerKm: 165, maxDcKw: 175, maxAcKw: 11, dcConnector: 'CCS2', acConnector: 'TYPE2' },
  { id: 'vw-id7-86', brand: 'Volkswagen', model: 'ID.7 Pro S 86 kWh', batteryKwh: 86, whPerKm: 168, maxDcKw: 200, maxAcKw: 11, dcConnector: 'CCS2', acConnector: 'TYPE2' },
  { id: 'vw-idbuzz', brand: 'Volkswagen', model: 'ID. Buzz 79 kWh', batteryKwh: 79, whPerKm: 215, maxDcKw: 170, maxAcKw: 11, dcConnector: 'CCS2', acConnector: 'TYPE2' },

  // ── Skoda / Cupra ────────────────────────────────────────────────
  { id: 'skoda-enyaq-85', brand: 'Skoda', model: 'Enyaq 85', batteryKwh: 77, whPerKm: 178, maxDcKw: 135, maxAcKw: 11, dcConnector: 'CCS2', acConnector: 'TYPE2' },
  { id: 'skoda-elroq-85', brand: 'Skoda', model: 'Elroq 85', batteryKwh: 77, whPerKm: 165, maxDcKw: 175, maxAcKw: 11, dcConnector: 'CCS2', acConnector: 'TYPE2' },
  { id: 'cupra-born-58', brand: 'Cupra', model: 'Born 58 kWh', batteryKwh: 58, whPerKm: 158, maxDcKw: 170, maxAcKw: 11, dcConnector: 'CCS2', acConnector: 'TYPE2' },
  { id: 'cupra-born-77', brand: 'Cupra', model: 'Born 77 kWh', batteryKwh: 77, whPerKm: 162, maxDcKw: 170, maxAcKw: 11, dcConnector: 'CCS2', acConnector: 'TYPE2' },
  { id: 'cupra-tavascan', brand: 'Cupra', model: 'Tavascan', batteryKwh: 77, whPerKm: 178, maxDcKw: 135, maxAcKw: 11, dcConnector: 'CCS2', acConnector: 'TYPE2' },

  // ── Audi ─────────────────────────────────────────────────────────
  { id: 'audi-q4-45', brand: 'Audi', model: 'Q4 45 e-tron', batteryKwh: 77, whPerKm: 175, maxDcKw: 135, maxAcKw: 11, dcConnector: 'CCS2', acConnector: 'TYPE2' },
  { id: 'audi-q6', brand: 'Audi', model: 'Q6 e-tron', batteryKwh: 94.9, whPerKm: 180, maxDcKw: 270, maxAcKw: 11, dcConnector: 'CCS2', acConnector: 'TYPE2' },
  { id: 'audi-q8-55', brand: 'Audi', model: 'Q8 55 e-tron', batteryKwh: 106, whPerKm: 215, maxDcKw: 170, maxAcKw: 11, dcConnector: 'CCS2', acConnector: 'TYPE2' },
  { id: 'audi-a6-etron', brand: 'Audi', model: 'A6 e-tron', batteryKwh: 94.9, whPerKm: 160, maxDcKw: 270, maxAcKw: 11, dcConnector: 'CCS2', acConnector: 'TYPE2' },
  { id: 'audi-etron-gt', brand: 'Audi', model: 'e-tron GT', batteryKwh: 93.4, whPerKm: 195, maxDcKw: 320, maxAcKw: 11, dcConnector: 'CCS2', acConnector: 'TYPE2' },

  // ── BMW / Mini ───────────────────────────────────────────────────
  { id: 'bmw-i4-40', brand: 'BMW', model: 'i4 eDrive40', batteryKwh: 81.3, whPerKm: 165, maxDcKw: 205, maxAcKw: 11, dcConnector: 'CCS2', acConnector: 'TYPE2' },
  { id: 'bmw-i4-m50', brand: 'BMW', model: 'i4 M50', batteryKwh: 81.3, whPerKm: 190, maxDcKw: 205, maxAcKw: 11, dcConnector: 'CCS2', acConnector: 'TYPE2' },
  { id: 'bmw-ix1', brand: 'BMW', model: 'iX1 xDrive30', batteryKwh: 64.8, whPerKm: 175, maxDcKw: 130, maxAcKw: 11, dcConnector: 'CCS2', acConnector: 'TYPE2' },
  { id: 'bmw-ix2', brand: 'BMW', model: 'iX2 xDrive30', batteryKwh: 64.8, whPerKm: 170, maxDcKw: 130, maxAcKw: 11, dcConnector: 'CCS2', acConnector: 'TYPE2' },
  { id: 'bmw-ix3-nk', brand: 'BMW', model: 'iX3 (Neue Klasse)', batteryKwh: 108, whPerKm: 175, maxDcKw: 400, maxAcKw: 11, dcConnector: 'CCS2', acConnector: 'TYPE2' },
  { id: 'bmw-ix-50', brand: 'BMW', model: 'iX xDrive50', batteryKwh: 105.2, whPerKm: 195, maxDcKw: 195, maxAcKw: 11, dcConnector: 'CCS2', acConnector: 'TYPE2' },
  { id: 'bmw-i5-40', brand: 'BMW', model: 'i5 eDrive40', batteryKwh: 81.2, whPerKm: 175, maxDcKw: 205, maxAcKw: 11, dcConnector: 'CCS2', acConnector: 'TYPE2' },
  { id: 'bmw-i7-60', brand: 'BMW', model: 'i7 xDrive60', batteryKwh: 101.7, whPerKm: 200, maxDcKw: 195, maxAcKw: 11, dcConnector: 'CCS2', acConnector: 'TYPE2' },
  { id: 'mini-cooper-se', brand: 'Mini', model: 'Cooper SE 54 kWh', batteryKwh: 49.2, whPerKm: 155, maxDcKw: 95, maxAcKw: 11, dcConnector: 'CCS2', acConnector: 'TYPE2' },
  { id: 'mini-countryman-e', brand: 'Mini', model: 'Countryman E', batteryKwh: 64.7, whPerKm: 175, maxDcKw: 130, maxAcKw: 11, dcConnector: 'CCS2', acConnector: 'TYPE2' },

  // ── Mercedes-Benz ────────────────────────────────────────────────
  { id: 'mb-eqa-250', brand: 'Mercedes-Benz', model: 'EQA 250', batteryKwh: 66.5, whPerKm: 165, maxDcKw: 100, maxAcKw: 11, dcConnector: 'CCS2', acConnector: 'TYPE2' },
  { id: 'mb-eqb-300', brand: 'Mercedes-Benz', model: 'EQB 300', batteryKwh: 66.5, whPerKm: 190, maxDcKw: 100, maxAcKw: 11, dcConnector: 'CCS2', acConnector: 'TYPE2' },
  { id: 'mb-eqe-350', brand: 'Mercedes-Benz', model: 'EQE 350+', batteryKwh: 89, whPerKm: 175, maxDcKw: 170, maxAcKw: 11, dcConnector: 'CCS2', acConnector: 'TYPE2' },
  { id: 'mb-eqs-450', brand: 'Mercedes-Benz', model: 'EQS 450+', batteryKwh: 107.8, whPerKm: 175, maxDcKw: 200, maxAcKw: 11, dcConnector: 'CCS2', acConnector: 'TYPE2' },
  { id: 'mb-cla-ev', brand: 'Mercedes-Benz', model: 'CLA 250+ EV', batteryKwh: 85, whPerKm: 135, maxDcKw: 320, maxAcKw: 11, dcConnector: 'CCS2', acConnector: 'TYPE2' },

  // ── Renault / Dacia ──────────────────────────────────────────────
  { id: 'renault-megane-60', brand: 'Renault', model: 'Megane E-Tech EV60', batteryKwh: 60, whPerKm: 160, maxDcKw: 130, maxAcKw: 22, dcConnector: 'CCS2', acConnector: 'TYPE2' },
  { id: 'renault-scenic-87', brand: 'Renault', model: 'Scenic E-Tech 87 kWh', batteryKwh: 87, whPerKm: 165, maxDcKw: 150, maxAcKw: 22, dcConnector: 'CCS2', acConnector: 'TYPE2' },
  { id: 'renault-5-52', brand: 'Renault', model: '5 E-Tech 52 kWh', batteryKwh: 52, whPerKm: 145, maxDcKw: 100, maxAcKw: 11, dcConnector: 'CCS2', acConnector: 'TYPE2' },
  { id: 'renault-4-52', brand: 'Renault', model: '4 E-Tech 52 kWh', batteryKwh: 52, whPerKm: 155, maxDcKw: 100, maxAcKw: 11, dcConnector: 'CCS2', acConnector: 'TYPE2' },
  { id: 'renault-zoe-52', brand: 'Renault', model: 'Zoe ZE50 R135', batteryKwh: 52, whPerKm: 165, maxDcKw: 46, maxAcKw: 22, dcConnector: 'CCS2', acConnector: 'TYPE2' },
  { id: 'dacia-spring-45', brand: 'Dacia', model: 'Spring 45', batteryKwh: 26.8, whPerKm: 140, maxDcKw: 30, maxAcKw: 7, dcConnector: 'CCS2', acConnector: 'TYPE2' },

  // ── Stellantis ───────────────────────────────────────────────────
  { id: 'peugeot-e208-51', brand: 'Peugeot', model: 'e-208 51 kWh', batteryKwh: 51, whPerKm: 150, maxDcKw: 100, maxAcKw: 11, dcConnector: 'CCS2', acConnector: 'TYPE2' },
  { id: 'peugeot-e2008-54', brand: 'Peugeot', model: 'e-2008 54 kWh', batteryKwh: 54, whPerKm: 165, maxDcKw: 100, maxAcKw: 11, dcConnector: 'CCS2', acConnector: 'TYPE2' },
  { id: 'peugeot-e3008-73', brand: 'Peugeot', model: 'e-3008 73 kWh', batteryKwh: 73, whPerKm: 168, maxDcKw: 160, maxAcKw: 11, dcConnector: 'CCS2', acConnector: 'TYPE2' },
  { id: 'citroen-ec4-54', brand: 'Citroen', model: 'e-C4 54 kWh', batteryKwh: 54, whPerKm: 168, maxDcKw: 100, maxAcKw: 11, dcConnector: 'CCS2', acConnector: 'TYPE2' },
  { id: 'citroen-ec3-44', brand: 'Citroen', model: 'e-C3 44 kWh', batteryKwh: 44, whPerKm: 155, maxDcKw: 100, maxAcKw: 11, dcConnector: 'CCS2', acConnector: 'TYPE2' },
  { id: 'opel-corsa-e-51', brand: 'Opel', model: 'Corsa Electric 51 kWh', batteryKwh: 51, whPerKm: 148, maxDcKw: 100, maxAcKw: 11, dcConnector: 'CCS2', acConnector: 'TYPE2' },
  { id: 'opel-mokka-e-50', brand: 'Opel', model: 'Mokka Electric 50 kWh', batteryKwh: 46, whPerKm: 160, maxDcKw: 100, maxAcKw: 11, dcConnector: 'CCS2', acConnector: 'TYPE2' },
  { id: 'opel-astra-e', brand: 'Opel', model: 'Astra Electric', batteryKwh: 54, whPerKm: 155, maxDcKw: 100, maxAcKw: 11, dcConnector: 'CCS2', acConnector: 'TYPE2' },
  { id: 'opel-frontera-e', brand: 'Opel', model: 'Frontera Electric', batteryKwh: 44, whPerKm: 165, maxDcKw: 100, maxAcKw: 11, dcConnector: 'CCS2', acConnector: 'TYPE2' },
  { id: 'fiat-500e', brand: 'Fiat', model: '500e 42 kWh', batteryKwh: 37.3, whPerKm: 148, maxDcKw: 85, maxAcKw: 11, dcConnector: 'CCS2', acConnector: 'TYPE2' },
  { id: 'fiat-600e', brand: 'Fiat', model: '600e', batteryKwh: 54, whPerKm: 158, maxDcKw: 100, maxAcKw: 11, dcConnector: 'CCS2', acConnector: 'TYPE2' },
  { id: 'fiat-grande-panda', brand: 'Fiat', model: 'Grande Panda Electric', batteryKwh: 44, whPerKm: 152, maxDcKw: 100, maxAcKw: 11, dcConnector: 'CCS2', acConnector: 'TYPE2' },
  { id: 'jeep-avenger-e', brand: 'Jeep', model: 'Avenger Electric', batteryKwh: 51, whPerKm: 158, maxDcKw: 100, maxAcKw: 11, dcConnector: 'CCS2', acConnector: 'TYPE2' },
  { id: 'alfa-junior-e', brand: 'Alfa Romeo', model: 'Junior Elettrica', batteryKwh: 51, whPerKm: 155, maxDcKw: 100, maxAcKw: 11, dcConnector: 'CCS2', acConnector: 'TYPE2' },
  { id: 'ds-3-etense', brand: 'DS', model: '3 E-Tense', batteryKwh: 51, whPerKm: 155, maxDcKw: 100, maxAcKw: 11, dcConnector: 'CCS2', acConnector: 'TYPE2' },

  // ── MG ───────────────────────────────────────────────────────────
  { id: 'mg-mg4-51', brand: 'MG', model: 'MG4 Standard 51 kWh', batteryKwh: 50, whPerKm: 155, maxDcKw: 88, maxAcKw: 11, dcConnector: 'CCS2', acConnector: 'TYPE2' },
  { id: 'mg-mg4-64', brand: 'MG', model: 'MG4 Comfort 64 kWh', batteryKwh: 61.7, whPerKm: 165, maxDcKw: 140, maxAcKw: 11, dcConnector: 'CCS2', acConnector: 'TYPE2' },
  { id: 'mg-zs-ev-lr', brand: 'MG', model: 'ZS EV Long Range', batteryKwh: 68.3, whPerKm: 175, maxDcKw: 92, maxAcKw: 11, dcConnector: 'CCS2', acConnector: 'TYPE2' },
  { id: 'mg-marvel-r', brand: 'MG', model: 'Marvel R', batteryKwh: 70, whPerKm: 195, maxDcKw: 92, maxAcKw: 11, dcConnector: 'CCS2', acConnector: 'TYPE2' },
  { id: 'mg-mg5', brand: 'MG', model: 'MG5 Electric', batteryKwh: 57.4, whPerKm: 165, maxDcKw: 87, maxAcKw: 11, dcConnector: 'CCS2', acConnector: 'TYPE2' },
  { id: 'mg-s5', brand: 'MG', model: 'S5 EV', batteryKwh: 62, whPerKm: 160, maxDcKw: 139, maxAcKw: 11, dcConnector: 'CCS2', acConnector: 'TYPE2' },

  // ── Volvo / Polestar ─────────────────────────────────────────────
  { id: 'volvo-ex30-se', brand: 'Volvo', model: 'EX30 Single Extended', batteryKwh: 65, whPerKm: 155, maxDcKw: 153, maxAcKw: 11, dcConnector: 'CCS2', acConnector: 'TYPE2' },
  { id: 'volvo-ex30-twin', brand: 'Volvo', model: 'EX30 Twin Performance', batteryKwh: 65, whPerKm: 168, maxDcKw: 153, maxAcKw: 11, dcConnector: 'CCS2', acConnector: 'TYPE2' },
  { id: 'volvo-ex40', brand: 'Volvo', model: 'EX40 (XC40) Twin', batteryKwh: 78, whPerKm: 185, maxDcKw: 200, maxAcKw: 11, dcConnector: 'CCS2', acConnector: 'TYPE2' },
  { id: 'volvo-ec40', brand: 'Volvo', model: 'EC40', batteryKwh: 78, whPerKm: 178, maxDcKw: 200, maxAcKw: 11, dcConnector: 'CCS2', acConnector: 'TYPE2' },
  { id: 'volvo-ex90', brand: 'Volvo', model: 'EX90', batteryKwh: 107, whPerKm: 205, maxDcKw: 250, maxAcKw: 11, dcConnector: 'CCS2', acConnector: 'TYPE2' },
  { id: 'polestar-2-lr', brand: 'Polestar', model: '2 Long Range Single', batteryKwh: 78, whPerKm: 165, maxDcKw: 205, maxAcKw: 11, dcConnector: 'CCS2', acConnector: 'TYPE2' },
  { id: 'polestar-3', brand: 'Polestar', model: '3', batteryKwh: 107, whPerKm: 200, maxDcKw: 250, maxAcKw: 11, dcConnector: 'CCS2', acConnector: 'TYPE2' },
  { id: 'polestar-4', brand: 'Polestar', model: '4', batteryKwh: 94, whPerKm: 175, maxDcKw: 200, maxAcKw: 11, dcConnector: 'CCS2', acConnector: 'TYPE2' },

  // ── Nissan ───────────────────────────────────────────────────────
  { id: 'nissan-leaf-40', brand: 'Nissan', model: 'Leaf 40 kWh (CHAdeMO)', batteryKwh: 39, whPerKm: 165, maxDcKw: 46, maxAcKw: 6.6, dcConnector: 'CHAdeMO', acConnector: 'TYPE2' },
  { id: 'nissan-leaf-62', brand: 'Nissan', model: 'Leaf e+ 62 kWh (CHAdeMO)', batteryKwh: 59, whPerKm: 175, maxDcKw: 100, maxAcKw: 6.6, dcConnector: 'CHAdeMO', acConnector: 'TYPE2' },
  { id: 'nissan-leaf-2026', brand: 'Nissan', model: 'Leaf (2026, CCS)', batteryKwh: 75, whPerKm: 150, maxDcKw: 150, maxAcKw: 11, dcConnector: 'CCS2', acConnector: 'TYPE2' },
  { id: 'nissan-ariya-87', brand: 'Nissan', model: 'Ariya 87 kWh', batteryKwh: 87, whPerKm: 185, maxDcKw: 130, maxAcKw: 22, dcConnector: 'CCS2', acConnector: 'TYPE2' },

  // ── Ford ─────────────────────────────────────────────────────────
  { id: 'ford-mache-er', brand: 'Ford', model: 'Mustang Mach-E ER RWD', batteryKwh: 91, whPerKm: 185, maxDcKw: 150, maxAcKw: 11, dcConnector: 'CCS2', acConnector: 'TYPE2' },
  { id: 'ford-mache-sr', brand: 'Ford', model: 'Mustang Mach-E SR', batteryKwh: 70, whPerKm: 178, maxDcKw: 115, maxAcKw: 11, dcConnector: 'CCS2', acConnector: 'TYPE2' },
  { id: 'ford-explorer-ev', brand: 'Ford', model: 'Explorer EV ER', batteryKwh: 77, whPerKm: 175, maxDcKw: 135, maxAcKw: 11, dcConnector: 'CCS2', acConnector: 'TYPE2' },
  { id: 'ford-capri-ev', brand: 'Ford', model: 'Capri EV ER', batteryKwh: 77, whPerKm: 172, maxDcKw: 135, maxAcKw: 11, dcConnector: 'CCS2', acConnector: 'TYPE2' },
  { id: 'ford-etransit-custom', brand: 'Ford', model: 'E-Transit Custom', batteryKwh: 64, whPerKm: 230, maxDcKw: 125, maxAcKw: 11, dcConnector: 'CCS2', acConnector: 'TYPE2' },

  // ── Japon markaları ──────────────────────────────────────────────
  { id: 'toyota-bz4x', brand: 'Toyota', model: 'bZ4X FWD', batteryKwh: 64, whPerKm: 168, maxDcKw: 150, maxAcKw: 11, dcConnector: 'CCS2', acConnector: 'TYPE2' },
  { id: 'toyota-urban', brand: 'Toyota', model: 'Urban Cruiser BEV', batteryKwh: 61, whPerKm: 160, maxDcKw: 67, maxAcKw: 11, dcConnector: 'CCS2', acConnector: 'TYPE2' },
  { id: 'lexus-rz450e', brand: 'Lexus', model: 'RZ 450e', batteryKwh: 64, whPerKm: 180, maxDcKw: 150, maxAcKw: 11, dcConnector: 'CCS2', acConnector: 'TYPE2' },
  { id: 'subaru-solterra', brand: 'Subaru', model: 'Solterra', batteryKwh: 64, whPerKm: 172, maxDcKw: 150, maxAcKw: 11, dcConnector: 'CCS2', acConnector: 'TYPE2' },
  { id: 'honda-eny1', brand: 'Honda', model: 'e:Ny1', batteryKwh: 61.9, whPerKm: 175, maxDcKw: 78, maxAcKw: 11, dcConnector: 'CCS2', acConnector: 'TYPE2' },

  // ── Porsche / Jaguar / Genesis ───────────────────────────────────
  { id: 'porsche-taycan-89', brand: 'Porsche', model: 'Taycan 89 kWh', batteryKwh: 82.3, whPerKm: 190, maxDcKw: 270, maxAcKw: 11, dcConnector: 'CCS2', acConnector: 'TYPE2' },
  { id: 'porsche-taycan-105', brand: 'Porsche', model: 'Taycan Turbo 105 kWh', batteryKwh: 97, whPerKm: 200, maxDcKw: 320, maxAcKw: 11, dcConnector: 'CCS2', acConnector: 'TYPE2' },
  { id: 'porsche-macan-4', brand: 'Porsche', model: 'Macan 4 Electric', batteryKwh: 95, whPerKm: 185, maxDcKw: 270, maxAcKw: 11, dcConnector: 'CCS2', acConnector: 'TYPE2' },
  { id: 'jaguar-ipace', brand: 'Jaguar', model: 'I-Pace EV400', batteryKwh: 84.7, whPerKm: 215, maxDcKw: 104, maxAcKw: 11, dcConnector: 'CCS2', acConnector: 'TYPE2' },
  { id: 'genesis-gv60', brand: 'Genesis', model: 'GV60', batteryKwh: 77.4, whPerKm: 180, maxDcKw: 240, maxAcKw: 11, dcConnector: 'CCS2', acConnector: 'TYPE2' },

  // ── Çin markaları (Türkiye pazarı) ───────────────────────────────
  { id: 'smart-1', brand: 'smart', model: '#1', batteryKwh: 62, whPerKm: 170, maxDcKw: 150, maxAcKw: 22, dcConnector: 'CCS2', acConnector: 'TYPE2' },
  { id: 'smart-3', brand: 'smart', model: '#3', batteryKwh: 62, whPerKm: 165, maxDcKw: 150, maxAcKw: 22, dcConnector: 'CCS2', acConnector: 'TYPE2' },
  { id: 'chery-omoda-e5', brand: 'Chery', model: 'Omoda E5', batteryKwh: 61, whPerKm: 165, maxDcKw: 80, maxAcKw: 9.9, dcConnector: 'CCS2', acConnector: 'TYPE2' },
  { id: 'leapmotor-c10', brand: 'Leapmotor', model: 'C10', batteryKwh: 69.9, whPerKm: 185, maxDcKw: 84, maxAcKw: 11, dcConnector: 'CCS2', acConnector: 'TYPE2' },
  { id: 'leapmotor-b10', brand: 'Leapmotor', model: 'B10', batteryKwh: 67.1, whPerKm: 165, maxDcKw: 168, maxAcKw: 11, dcConnector: 'CCS2', acConnector: 'TYPE2' },
  { id: 'leapmotor-t03', brand: 'Leapmotor', model: 'T03', batteryKwh: 37.3, whPerKm: 150, maxDcKw: 48, maxAcKw: 6.6, dcConnector: 'CCS2', acConnector: 'TYPE2' },
  { id: 'xpeng-g6', brand: 'Xpeng', model: 'G6', batteryKwh: 87.5, whPerKm: 170, maxDcKw: 280, maxAcKw: 11, dcConnector: 'CCS2', acConnector: 'TYPE2' },
  { id: 'xpeng-g9', brand: 'Xpeng', model: 'G9', batteryKwh: 93.1, whPerKm: 190, maxDcKw: 300, maxAcKw: 11, dcConnector: 'CCS2', acConnector: 'TYPE2' },
  { id: 'zeekr-001', brand: 'Zeekr', model: '001', batteryKwh: 95, whPerKm: 180, maxDcKw: 200, maxAcKw: 11, dcConnector: 'CCS2', acConnector: 'TYPE2' },
  { id: 'zeekr-x', brand: 'Zeekr', model: 'X', batteryKwh: 66, whPerKm: 165, maxDcKw: 150, maxAcKw: 11, dcConnector: 'CCS2', acConnector: 'TYPE2' },
  { id: 'skywell-be11-lr', brand: 'Skywell', model: 'BE11 Long Range', batteryKwh: 86, whPerKm: 200, maxDcKw: 80, maxAcKw: 11, dcConnector: 'CCS2', acConnector: 'TYPE2' },
  { id: 'seres-3', brand: 'Seres', model: '3', batteryKwh: 49, whPerKm: 165, maxDcKw: 60, maxAcKw: 6.6, dcConnector: 'CCS2', acConnector: 'TYPE2' },
  { id: 'hongqi-ehs9', brand: 'Hongqi', model: 'E-HS9', batteryKwh: 99, whPerKm: 235, maxDcKw: 130, maxAcKw: 11, dcConnector: 'CCS2', acConnector: 'TYPE2' },
  { id: 'aiways-u5', brand: 'Aiways', model: 'U5', batteryKwh: 60, whPerKm: 180, maxDcKw: 90, maxAcKw: 6.6, dcConnector: 'CCS2', acConnector: 'TYPE2' },
  { id: 'voyah-free', brand: 'Voyah', model: 'Free EV', batteryKwh: 106, whPerKm: 220, maxDcKw: 100, maxAcKw: 11, dcConnector: 'CCS2', acConnector: 'TYPE2' },
  { id: 'ora-03', brand: 'Ora', model: '03 (Funky Cat)', batteryKwh: 63, whPerKm: 165, maxDcKw: 67, maxAcKw: 11, dcConnector: 'CCS2', acConnector: 'TYPE2' },
  { id: 'maxus-mifa9', brand: 'Maxus', model: 'Mifa 9', batteryKwh: 90, whPerKm: 230, maxDcKw: 120, maxAcKw: 11, dcConnector: 'CCS2', acConnector: 'TYPE2' },

  // ── Ticari ───────────────────────────────────────────────────────
  { id: 'citroen-e-berlingo', brand: 'Citroen', model: 'e-Berlingo', batteryKwh: 50, whPerKm: 210, maxDcKw: 100, maxAcKw: 11, dcConnector: 'CCS2', acConnector: 'TYPE2' },
  { id: 'fiat-e-doblo', brand: 'Fiat', model: 'E-Doblo', batteryKwh: 50, whPerKm: 205, maxDcKw: 100, maxAcKw: 11, dcConnector: 'CCS2', acConnector: 'TYPE2' },
];

/** Listede olmayan araçlar için: kullanıcı değerleri elle girer. */
export const CUSTOM_VEHICLE: Vehicle = {
  id: 'custom',
  brand: 'Diğer',
  model: 'Elle gir',
  batteryKwh: 60,
  whPerKm: 175,
  maxDcKw: 100,
  maxAcKw: 11,
  dcConnector: 'CCS2',
  acConnector: 'TYPE2',
};

export const ALL_VEHICLES: Vehicle[] = [...VEHICLES, CUSTOM_VEHICLE];

export function brands(): string[] {
  const set = new Set<string>();
  for (const v of ALL_VEHICLES) set.add(v.brand);
  return [...set].sort((a, b) => a.localeCompare(b, 'tr'));
}

export function modelsOf(brand: string): Vehicle[] {
  return ALL_VEHICLES.filter((v) => v.brand === brand);
}

export function findVehicle(id: string): Vehicle | undefined {
  return ALL_VEHICLES.find((v) => v.id === id);
}

/** 20 °C'de normal sürüşte tam şarjla beklenen menzil (km). */
export function nominalRangeKm(v: Vehicle): number {
  return Math.round((v.batteryKwh * 1000) / v.whPerKm);
}
