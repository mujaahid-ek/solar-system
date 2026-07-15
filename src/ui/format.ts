// − is U+2212 (proper minus), not a hyphen.
const MINUS = '−';

export const fmtInt = (n: number): string => n.toLocaleString('en-US');

export function fmtTemp(c: number): string {
  return c < 0 ? `${MINUS}${fmtInt(Math.abs(c))} °C` : `${fmtInt(c)} °C`;
}

export function fmtRotation(hours: number): string {
  const retro = hours < 0;
  const h = Math.abs(hours);
  const main = h < 100 ? `${h.toFixed(2)} h` : `${(h / 24).toFixed(1)} d`;
  return retro ? `${main} · retrograde` : main;
}

export function fmtPeriod(days: number): string {
  if (days < 1200) return `${days.toFixed(days < 100 ? 1 : 0)} d`;
  return `${(days / 365.25).toFixed(1)} y`;
}

export function fmtDistance(km6: number): string {
  return `${km6 < 1 ? km6.toFixed(3) : fmtInt(Math.round(km6))} ×10⁶ km`;
}

export function fmtAU(au: number): string {
  return au < 0.01 ? `${au.toFixed(5)} AU` : `${au.toFixed(3)} AU`;
}

export const fmtDeg = (d: number): string => `${d.toFixed(d < 1 ? 3 : 2)}°`;
export const fmtEcc = (e: number): string => e.toFixed(3);
export const fmtKm = (km: number): string => `${fmtInt(km)} km`;
export const fmtG = (g: number): string => `${g >= 100 ? g.toFixed(0) : g.toFixed(2)} m/s²`;
export const fmtEsc = (v: number): string => `${v.toFixed(1)} km/s`;
export const fmtDensity = (d: number): string => `${fmtInt(d)} kg/m³`;
