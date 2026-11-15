

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
let liveChannelWavelengths: number[] | null = null;
export function setLiveChannels(channels: SpectralChannel[]) {
  liveChannelWavelengths = channels.map((channel) => channel.wavelength);
}

/** Longitud de onda central (µm) del canal 0–101 */
export function channelWavelength(index: number) {
  if (liveChannelWavelengths?.[index] !== undefined) return liveChannelWavelengths[index];
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

export type SpectrumPoint = { wavelength: number; flux: number | null; error?: number; nhits?: number; flags?: number; available?: boolean };

export type SpectralChannel = {
  /** 0–101 */
  index: number;
  wavelength: number;
  detector: string;
  /** Imagen del canal (cutout del All-Sky Spectral Cube convertido a PNG/JPEG) */
  imageUrl: string;
  available?: boolean;
};

export type SpectralCubeResponse = {
  target: { ra: number; dec: number; fovDeg: number };
  productId?: string;
  tileId?: number;
  imageUnit?: string | null;
  channels: SpectralChannel[];
};

export type SpectrumResponse = {
  ra: number;
  dec: number;
  unit: string;
  points: SpectrumPoint[];
  productId?: string;
  objectKey?: string;
  method?: string;
  flagsHeaderNames?: Record<string, string>;
};

/* =========================================================
   Cliente
   ========================================================= */
export const USE_MOCK = false;

const OBSERVATION_API_URL = import.meta.env.VITE_OBSERVATION_API_URL ?? 'http://localhost:8001';
const JOBS_API_URL = import.meta.env.VITE_JOBS_API_URL ?? 'http://localhost:8004';

export type TemporalProduct = { product_id: string; time_bounds_lower: number; detector: string };
type Frame = { index: number; product_id: string; timestamp: string; object_key: string };
type FrameMetadata = { wavelength_um: number; bandwidth_um: number };
type TimelapseStatus = {
  job_id: string; status: 'pending' | 'running' | 'completed' | 'failed';
  error: string | null; progress: number | null;
  result: { job_id: string; status: string; frames: Frame[];
    provenance: { observations: FrameMetadata[]; warning: string } } | null;
  delivery: { index: number; url: string }[];
};

/** Select unique real acquisition times, including both ends when maximum=2. */
export function selectTemporalProducts(products: TemporalProduct[], maximum: number): TemporalProduct[] {
  const ordered = [...products].sort((a, b) => a.time_bounds_lower - b.time_bounds_lower || a.product_id.localeCompare(b.product_id));
  const unique = ordered.filter((p, i) => i === 0 || p.time_bounds_lower !== ordered[i - 1].time_bounds_lower);
  if (unique.length <= maximum) return unique;
  if (maximum === 1) return [unique[0]];
  return Array.from({ length: maximum }, (_, i) => unique[Math.round(i * (unique.length - 1) / (maximum - 1))]);
}

function temporalFetch(url: URL, init: RequestInit = {}) {
  const timeout = AbortSignal.timeout(90000);
  return fetch(url, { ...init, signal: init.signal ? AbortSignal.any([init.signal, timeout]) : timeout });
}

async function checkedJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({})) as { detail?: string };
    throw new Error(error.detail ?? `HTTP ${response.status}`);
  }
  return response.json() as Promise<T>;
}

/** Real BE-01 discovery -> BE-03 orchestration -> BE-02 frames -> public delivery. */
export async function fetchObservations(q: ObservationQuery, signal?: AbortSignal,
  maximum = 2, onProgress?: (status: string) => void): Promise<ObservationsResponse> {
  if (q.detector === 'All') throw new Error('Select one detector for a comparable temporal sequence.');
  if (q.fovDeg > 0.2) throw new Error('Maximum temporal field size is 0.2 degrees.');
  const detector = `SPHEREx-${q.detector}`;
  const url = new URL('/api/v1/observations/temporal/', OBSERVATION_API_URL);
  Object.entries({ ra_deg: q.ra, dec_deg: q.dec, size_deg: q.fovDeg, detector, limit: 100 })
    .forEach(([key, value]) => url.searchParams.set(key, String(value)));
  const found = await checkedJson<{ results: TemporalProduct[] }>(await temporalFetch(url, { signal }));
  const start = Date.parse(q.start + 'T00:00:00Z');
  const end = Date.parse(q.end + 'T00:00:00Z') + 86400000;
  const selected = selectTemporalProducts(found.results.filter(p => {
    const time = (p.time_bounds_lower - 40587) * 86400000;
    return Number.isFinite(time) && p.detector === detector && time >= start && time < end;
  }), maximum);
  if (!selected.length) throw new Error('No real observations in the selected date interval.');
  return prepareSearchProducts(q, selected, signal, onProgress);
}

/** Prepare selected products together to retain the backend common grid and scale. */
export async function prepareSearchProducts(q: ObservationQuery, selected: TemporalProduct[], signal?: AbortSignal,
  onProgress?: (status: string) => void): Promise<ObservationsResponse> {
  const detector = `SPHEREx-${q.detector}`;
  if (!selected.length || new Set(selected.map(p => p.product_id)).size !== selected.length)
    throw new Error('Select distinct real observations.');
  const submitted = await checkedJson<{ job_id: string; status_url: string }>(await temporalFetch(
    new URL('/api/v1/timelapses/', JOBS_API_URL), {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, signal,
      body: JSON.stringify({ product_ids: selected.map(p => p.product_id), ra_deg: q.ra,
        dec_deg: q.dec, size_deg: q.fovDeg, detector }),
    }));
  const deadline = Date.now() + 480000;
  while (Date.now() < deadline) {
    const job = await checkedJson<TimelapseStatus>(await temporalFetch(new URL(submitted.status_url, JOBS_API_URL), { signal }));
    onProgress?.(job.progress == null ? job.status : `${job.status} ${job.progress}%`);
    if (job.status === 'failed') throw new Error(job.error ?? 'Scientific processing failed.');
    if (job.status === 'completed' && job.result) {
      const result = job.result;
      if (result.job_id !== submitted.job_id || result.status !== 'completed') throw new Error('Invalid processing manifest.');
      if (result.frames.length !== selected.length || new Set(result.frames.map(f => f.product_id)).size !== selected.length)
        throw new Error('Incomplete or duplicate processing frames.');
      return { target: { ra: q.ra, dec: q.dec, fovDeg: q.fovDeg }, observations: result.frames.map((frame, i) => {
        if (!selected.some(p => p.product_id === frame.product_id) || typeof frame.timestamp !== 'string' ||
            !/(Z|[+-]\d{2}:\d{2})$/.test(frame.timestamp) || !Number.isFinite(Date.parse(frame.timestamp)))
          throw new Error('Unexpected frame product or missing acquisition timestamp.');
        const meta = result.provenance.observations[i];
        const delivery = job.delivery.find(d => d.index === frame.index);
        if (!delivery || !meta || !Number.isFinite(meta.wavelength_um) || !Number.isFinite(meta.bandwidth_um))
          throw new Error('Missing frame delivery or scientific metadata.');
        return { id: frame.product_id, observationTime: frame.timestamp, detector: q.detector,
          wavelengthMin: meta.wavelength_um - meta.bandwidth_um / 2,
          wavelengthMax: meta.wavelength_um + meta.bandwidth_um / 2,
          imageUrl: new URL(delivery.url, JOBS_API_URL).href,
          flags: [result.provenance.warning], dataRelease: 'SPHEREx' };
      }) };
    }
    await waitWithAbort(2000, signal);
  }
  throw new Error('Temporal processing timed out; the existing job was not resubmitted.');
}

/** Search catalogue: preserve distinct products even when acquisition times coincide. */
export async function discoverSearchProducts(q: ObservationQuery, signal?: AbortSignal): Promise<TemporalProduct[]> {
  if (q.detector === 'All' || q.fovDeg > 0.2) throw new Error('Invalid temporal geometry or detector.');
  const detector = `SPHEREx-${q.detector}`;
  const url = new URL('/api/v1/observations/temporal/', OBSERVATION_API_URL);
  Object.entries({ ra_deg: q.ra, dec_deg: q.dec, size_deg: q.fovDeg, detector, limit: 100 })
    .forEach(([key, value]) => url.searchParams.set(key, String(value)));
  const found = await checkedJson<{ results: TemporalProduct[] }>(await temporalFetch(url, { signal }));
  if (!Array.isArray(found.results)) throw new Error('Missing temporal discovery results.');
  const start = Date.parse(q.start + 'T00:00:00Z');
  const end = Date.parse(q.end + 'T00:00:00Z') + 86400000;
  const products = found.results.filter(p => {
    if (typeof p.product_id !== 'string' || !p.product_id.trim() ||
        typeof p.time_bounds_lower !== 'number' || !Number.isFinite(p.time_bounds_lower))
      throw new Error('Missing temporal product identifier or acquisition MJD.');
    const time = (p.time_bounds_lower - 40587) * 86400000;
    if (!Number.isFinite(new Date(time).getTime())) throw new Error('Invalid acquisition MJD.');
    return p.detector === detector && time >= start && time < end;
  }).sort((a, b) => a.time_bounds_lower - b.time_bounds_lower || a.product_id.localeCompare(b.product_id));
  return products.filter((p, i) => products.findIndex(other => other.product_id === p.product_id) === i);
}

const SPECTRAL_API_URL = import.meta.env.VITE_SPECTRAL_API_URL ?? 'http://localhost:8003';
type SpectralJob<T> = { job_id: string; status: 'pending' | 'running' | 'completed' | 'failed'; progress: number | null; error: string | null; result: T | null };
type CubeResult = { product_id: string; tile_id: number; image_unit: string | null; channels: { channel_index: number; wavelength_um: number; band: number; available: boolean }[] };
type SpectrumResult = { product_id: string; object_key: string; unit: string; method: string; flags_header_names: Record<string, string>; points: { channel_index: number; wavelength_um: number | null; flux: number | null; nhits: number; flags: number; available: boolean }[] };

function waitWithAbort(milliseconds: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) { reject(new DOMException('Aborted', 'AbortError')); return; }
    const onAbort = () => { window.clearTimeout(timer); reject(new DOMException('Aborted', 'AbortError')); };
    const timer = window.setTimeout(() => { signal?.removeEventListener('abort', onAbort); resolve(); }, milliseconds);
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

async function runSpectralJob<T>(path: string, payload: object, signal?: AbortSignal, onProgress?: (progress: number | null) => void): Promise<T> {
  let submitted: Response;
  for (let attempt = 0; ; attempt++) {
    submitted = await fetch(new URL(path, SPECTRAL_API_URL), {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal,
    });
    if (submitted.status !== 429 || attempt >= 2) break;
    const retryAfter = Number(submitted.headers.get('Retry-After'));
    await waitWithAbort(Number.isFinite(retryAfter) && retryAfter > 0 ? Math.min(retryAfter * 1000, 60_000) : 60_000, signal);
  }
  if (submitted.status === 429) throw new Error('Límite de solicitudes espectrales alcanzado. Espera un minuto e inténtalo de nuevo.');
  if (submitted.status !== 202) throw new Error(`Error ${submitted.status} al solicitar el procesamiento espectral`);
  const { status_url } = await submitted.json() as { status_url: string };
  for (let attempt = 0; attempt < 900; attempt++) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    const response = await fetch(new URL(status_url, SPECTRAL_API_URL), { signal });
    if (!response.ok) throw new Error(`Error ${response.status} al consultar el trabajo espectral`);
    const job = await response.json() as SpectralJob<T>;
    onProgress?.(job.progress);
    if (job.status === 'completed' && job.result) return job.result;
    if (job.status === 'failed') throw new Error(job.error ?? 'Falló el procesamiento espectral');
    await waitWithAbort(2000, signal);
  }
  throw new Error('El procesamiento espectral tardó demasiado');
}

/** Prepara el tile oficial DR1 y resuelve las URLs del servicio Spectral. */
export async function fetchSpectralCube(
  q: { ra: number; dec: number; fovDeg: number },
  signal?: AbortSignal,
  onProgress?: (progress: number | null) => void,
): Promise<SpectralCubeResponse> {
  const result = await runSpectralJob<CubeResult>('/api/v1/spectral/cubes/',
    { ra_deg: q.ra, dec_deg: q.dec, fov_deg: q.fovDeg }, signal, onProgress);
  return { target: q, productId: result.product_id, tileId: result.tile_id, imageUnit: result.image_unit,
    channels: result.channels.map((channel) => ({
      index: channel.channel_index, wavelength: channel.wavelength_um,
      detector: `D${channel.band}`, available: channel.available,
      imageUrl: channel.available ? new URL(`/api/v1/spectral/cubes/${result.tile_id}/channels/${channel.channel_index}/preview/?ra_deg=${q.ra}&dec_deg=${q.dec}&fov_deg=${q.fovDeg}`, SPECTRAL_API_URL).href : '',
    })) };
}

/** Extrae un espectro exploratorio del tile oficial; los valores ausentes son null. */
export async function fetchSpectrum(ra: number, dec: number, fovOrSignal: number | AbortSignal = 0.5, signal?: AbortSignal): Promise<SpectrumResponse> {
  const fovDeg = typeof fovOrSignal === 'number' ? fovOrSignal : 0.5;
  const requestSignal = typeof fovOrSignal === 'number' ? signal : fovOrSignal;
  const result = await runSpectralJob<SpectrumResult>('/api/v1/spectral/spectra/',
    { ra_deg: ra, dec_deg: dec, fov_deg: fovDeg }, requestSignal);
  return { ra, dec, unit: result.unit, productId: result.product_id,
    objectKey: result.object_key, method: result.method, flagsHeaderNames: result.flags_header_names,
    points: result.points.map((point) => ({ wavelength: point.wavelength_um ?? NaN,
      flux: point.flux, nhits: point.nhits, flags: point.flags, available: point.available })) };
}

/** Traduce un clic de preview mediante el WCS real del tile. */
export async function resolveSpectralPoint(tileId: number, q: { ra: number; dec: number; fovDeg: number }, u: number, v: number) {
  const response = await fetch(new URL(`/api/v1/spectral/cubes/${tileId}/point/`, SPECTRAL_API_URL), {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ra_deg: q.ra, dec_deg: q.dec, fov_deg: q.fovDeg, u, v }),
  });
  if (!response.ok) throw new Error(`Error ${response.status} al convertir el punto con WCS`);
  const data = await response.json() as { ra_deg: number; dec_deg: number };
  return { ra: data.ra_deg, dec: data.dec_deg };
}
