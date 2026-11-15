/**
 * Conversión píxel ↔ cielo con una proyección tangente (gnomónica) simple,
 * suponiendo que el cutout está centrado en (ra0, dec0), Norte arriba y Este a la izquierda.
 * Si el backend devuelve el WCS del cutout, sustituye estas funciones por las suyas.
 */
const D2R = Math.PI / 180;

const norm360 = (deg: number) => ((deg % 360) + 360) % 360;

export function uvToSky(u: number, v: number, ra0: number, dec0: number, fovDeg: number) {
  const xi = -(u - 0.5) * fovDeg * D2R;
  const eta = (0.5 - v) * fovDeg * D2R;
  const d0 = dec0 * D2R;
  const denom = Math.cos(d0) - eta * Math.sin(d0);
  const ra = ra0 * D2R + Math.atan2(xi, denom);
  const dec = Math.atan2(Math.sin(d0) + eta * Math.cos(d0), Math.hypot(xi, denom));
  return { ra: norm360(ra / D2R), dec: dec / D2R };
}

export function skyToUv(ra: number, dec: number, ra0: number, dec0: number, fovDeg: number) {
  const a = ra * D2R;
  const d = dec * D2R;
  const a0 = ra0 * D2R;
  const d0 = dec0 * D2R;
  const cosc = Math.sin(d0) * Math.sin(d) + Math.cos(d0) * Math.cos(d) * Math.cos(a - a0);
  const xi = (Math.cos(d) * Math.sin(a - a0)) / cosc;
  const eta = (Math.cos(d0) * Math.sin(d) - Math.sin(d0) * Math.cos(d) * Math.cos(a - a0)) / cosc;
  return { u: 0.5 - xi / (fovDeg * D2R), v: 0.5 - eta / (fovDeg * D2R) };
}

const pad = (n: number, w = 2) => String(Math.floor(n)).padStart(w, '0');

/** 210.80227 → "14h 03m 12.54s" */
export function formatRaHms(raDeg: number) {
  const h = norm360(raDeg) / 15;
  const m = (h - Math.floor(h)) * 60;
  const s = (m - Math.floor(m)) * 60;
  return `${pad(h)}h ${pad(m)}m ${s.toFixed(2).padStart(5, '0')}s`;
}

/** 54.34895 → "+54° 20′ 56.2″" */
export function formatDecDms(decDeg: number) {
  const sign = decDeg < 0 ? '−' : '+';
  const a = Math.abs(decDeg);
  const m = (a - Math.floor(a)) * 60;
  const s = (m - Math.floor(m)) * 60;
  return `${sign}${pad(a)}° ${pad(m)}′ ${s.toFixed(1).padStart(4, '0')}″`;
}

export const formatDate = (iso: string, locale = 'es') =>
  new Date(iso).toLocaleDateString(locale, { year: 'numeric', month: 'short', day: '2-digit', timeZone: 'UTC' }) + ' UTC';
