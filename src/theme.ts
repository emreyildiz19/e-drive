import { Platform } from 'react-native';

export interface Palette {
  bg: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  text: string;
  textDim: string;
  textFaint: string;
  accent: string;
  accentText: string;
  ok: string;
  warn: string;
  danger: string;
  /** Güç sınıfına göre istasyon renkleri. */
  ultra: string;
  fast: string;
  slow: string;
  ac: string;
  shadow: string;
}

const light: Palette = {
  bg: '#F2F4F8',
  surface: '#FFFFFF',
  surfaceAlt: '#EEF1F6',
  border: '#DCE1E9',
  text: '#0E1726',
  textDim: '#5A6478',
  textFaint: '#8E97A8',
  accent: '#0B7A4B',
  accentText: '#FFFFFF',
  ok: '#128A5A',
  warn: '#B4690E',
  danger: '#C0392B',
  ultra: '#6D28D9',
  fast: '#0B7A4B',
  slow: '#1D6FB8',
  ac: '#6B7688',
  shadow: '#0E1726',
};

const dark: Palette = {
  bg: '#0B1220',
  surface: '#151D2E',
  surfaceAlt: '#1E2739',
  border: '#2A3549',
  text: '#F2F5FA',
  textDim: '#A3AEC2',
  textFaint: '#6C7788',
  accent: '#2ED47A',
  accentText: '#06231A',
  ok: '#2ED47A',
  warn: '#F5A623',
  danger: '#FF6B6B',
  ultra: '#A78BFA',
  fast: '#2ED47A',
  slow: '#5AB2F7',
  ac: '#8B97AB',
  shadow: '#000000',
};

export const palettes = { light, dark };

export type ThemeName = keyof typeof palettes;

export const radius = { sm: 8, md: 14, lg: 20, pill: 999 };
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 };

export const font = {
  // iOS'ta sistem yazı tipi (SF Pro) en okunur sonucu verir.
  ui: Platform.select({ ios: 'System', default: undefined }),
  mono: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
};

/** Güce göre istasyon rengi — haritada ve kartlarda tutarlı kullanılır. */
export function powerColor(p: Palette, kw: number, isDc: boolean): string {
  if (!isDc) return p.ac;
  if (kw >= 150) return p.ultra;
  if (kw >= 90) return p.fast;
  if (kw >= 40) return p.slow;
  return p.ac;
}

/** Güç sınıfının okunabilir adı. */
export function powerLabel(kw: number, isDc: boolean): string {
  if (!isDc) return 'AC';
  if (kw >= 150) return 'Ultra hızlı';
  if (kw >= 90) return 'Hızlı';
  if (kw >= 40) return 'Orta';
  return 'Yavaş DC';
}

/** Şarj yüzdesine göre renk. */
export function socColor(p: Palette, soc: number): string {
  if (soc <= 12) return p.danger;
  if (soc <= 25) return p.warn;
  return p.ok;
}
