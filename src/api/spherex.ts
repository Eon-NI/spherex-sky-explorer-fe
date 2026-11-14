import { mockFetchObservations, mockFetchSpectralCube, mockFetchSpectrum } from './spherexMock';

/* =========================================================
   Tipos del contrato con el backend (Django)
   ========================================================= */
export type Detector = 'All' | 'D1' | 'D2' | 'D3' | 'D4' | 'D5' | 'D6';

/** Rangos aproximados de longitud de onda de cada detector de SPHEREx (µm) */
export const DETECTORS: { id: Detector; label: string; range?: [number, number] }[] = [
  { id: 'All', label: 'Todos' },
  { id: 'D1', label: 'D1 · 0.75–1.09 µm', range: [0.75, 1.09] },
  { id: 'D2', label: 'D2 · 1.10–1.62 µm', range: [1.1, 1.62] },
  { id: 'D3', label: 'D3 · 1.63–2.41 µm', range: [1.63, 2.41] },
  { id: 'D4', label: 'D4 · 2.42–3.82 µm', range: [2.42, 3.82] },
  { id: 'D5', label: 'D5 · 3.83–4.41 µm', range: [3.83, 4.41] },
  { id: 'D6', label: 'D6 · 4.42–5.00 µm', range: [4.42, 5.0] },
];

/* ---------- 102 canales: 6 detectores × 17 canales ---------- */
export const CHANNEL_COUNT = 102;
const CHANNELS_PER_DETECTOR = 17;
const DETECTOR_RANGES = DETECTORS.filter((d) => d.range).map((d) => ({ id: d.id, range: d.range! }));

/** Longitud de onda central (µm) del canal 0–101 */
export function channelWavelength(index: number) {
  const det = DETECTOR_RANGES[Math.min(5, Math.floor(index / CHANNELS_PER_DETECTOR))];
  const k = index % CHANNELS_PER_DETECTOR;
  const [min, max] = det.range;
  return min + ((k + 0.5) * (max - min)) / CHANNELS_PER_DETECTOR;
}

/** Detector (D1–D6) al que pertenece el canal */
export const channelDetector = (index: number) =>
  DETECTOR_RANGES[Math.min(5, Math.floor(index / CHANNELS_PER_DETECTOR))].id;

/** Canal más cercano a una longitud de onda */
export function nearestChannel(wavelength: number) {
  let best = 0;
  for (let i = 1; i < CHANNEL_COUNT; i++) {
    if (Math.abs(channelWavelength(i) - wavelength) < Math.abs(channelWavelength(best) - wavelength)) best = i;
  }
  return best;
}

export type ObservationQuery = {
  ra: number;
  dec: number;
  fovDeg: number;
  /** Fecha ISO (YYYY-MM-DD) */
  start: string;
  end: string;
  detector: Detector;
};

export type Observation = {
  id: string;
  /** Fecha/hora ISO de la observación */
  observationTime: string;
  detector: string;
  wavelengthMin: number;
  wavelengthMax: number;
  /** Cutout ya convertido de FITS a PNG/JPEG por el backend */
  imageUrl: string;
  /** Vacío = observación válida. Si hay elementos, se muestran como aviso */
  flags: string[];
  dataRelease?: string;
};

export type ObservationsResponse = {
  target: { ra: number; dec: number; fovDeg: number };
  observations: Observation[];
};

export type SpectrumPoint = { wavelength: number; flux: number; error?: number };

export type SpectralChannel = {
  /** 0–101 */
  index: number;
  wavelength: number;
  detector: string;
  /** Imagen del canal (cutout del All-Sky Spectral Cube convertido a PNG/JPEG) */
  imageUrl: string;
};

export type SpectralCubeResponse = {
  target: { ra: number; dec: number; fovDeg: number };
  channels: SpectralChannel[];
};

export type SpectrumResponse = {
  ra: number;
  dec: number;
  unit: string;
  points: SpectrumPoint[];
};

/* =========================================================
   Cliente
   ========================================================= */
const API_URL: string = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

/** Mientras el backend no esté listo se usan datos simulados. Pon VITE_USE_MOCK=false para usar la API real. */
export const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false';

async function getJson<T>(
  path: string,
  params: Record<string, string | number>,
  signal?: AbortSignal,
): Promise<T> {
  const url = new URL(path, API_URL);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Error ${res.status} al consultar ${path}`);
  return (await res.json()) as T;
}

/** GET /api/observations?ra=&dec=&fov=&start=&end=&detector= */
export function fetchObservations(q: ObservationQuery, signal?: AbortSignal) {
  if (USE_MOCK) return mockFetchObservations(q, signal);
  return getJson<ObservationsResponse>(
    '/api/observations',
    { ra: q.ra, dec: q.dec, fov: q.fovDeg, start: q.start, end: q.end, detector: q.detector },
    signal,
  );
}

/** GET /api/spectral-cube?ra=&dec=&fov= → 102 imágenes, una por canal */
export function fetchSpectralCube(
  q: { ra: number; dec: number; fovDeg: number },
  signal?: AbortSignal,
) {
  if (USE_MOCK) return mockFetchSpectralCube(q, signal);
  return getJson<SpectralCubeResponse>('/api/spectral-cube', { ra: q.ra, dec: q.dec, fov: q.fovDeg }, signal);
}

/** GET /api/spectrum?ra=&dec= → 102 canales */
export function fetchSpectrum(ra: number, dec: number, signal?: AbortSignal) {
  if (USE_MOCK) return mockFetchSpectrum(ra, dec, signal);
  return getJson<SpectrumResponse>('/api/spectrum', { ra, dec }, signal);
}
