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

/* Fechas de los módulos en formato estadounidense (MM/DD/YYYY), en cualquier idioma */
const US_DATE = new Intl.DateTimeFormat('en-US', { month: '2-digit', day: '2-digit', year: 'numeric', timeZone: 'UTC' });
const US_TIME = new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23', timeZone: 'UTC' });
const US_TIME_MS = new Intl.DateTimeFormat('en-US', {
  hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3, hourCycle: 'h23', timeZone: 'UTC',
});

/** "2025-05-13T…" → "05/13/2025" (sin sufijo) */
export const formatUsDay = (iso: string) => US_DATE.format(new Date(iso));

/** "2025-05-13T…" → "05/13/2025 UTC" */
export const formatDate = (iso: string) => `${formatUsDay(iso)} UTC`;

/** "05/13/2025 14:03:22 UTC"; con ms: "05/13/2025 14:03:22.123 UTC" */
export const formatDateTime = (iso: string, ms = false) =>
  `${formatUsDay(iso)} ${(ms ? US_TIME_MS : US_TIME).format(new Date(iso))} UTC`;

/** "2025-05-13" (valor de los campos) → "05/13/2025" */
export const isoDayToUs = (day: string) => {
  const [y, m, d] = day.split('-');
  return y && m && d ? `${m}/${d}/${y}` : '';
};

/** "05/13/2025" → "2025-05-13"; null si no es una fecha real */
export const usToIsoDay = (text: string) => {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text.trim());
  if (!match) return null;
  const [, m, d, y] = match;
  const date = new Date(`${y}-${m}-${d}T00:00:00Z`);
  return Number.isNaN(date.getTime()) || date.getUTCDate() !== Number(d) ? null : `${y}-${m}-${d}`;
};
