/**
 * Datos simulados se  hace cutouts sintéticos (estrellas fijas + un asteroide que se mueve + una estrella variable)
 * para poder probar el timelapse, el clic y las acciones.
 */
import type { ObservationQuery, ObservationsResponse, SpectrumResponse } from './spherex';

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const seedFrom = (ra: number, dec: number) => Math.floor(ra * 1000) * 7919 + Math.floor((dec + 90) * 1000);

const wait = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(t);
      reject(new DOMException('Aborted', 'AbortError'));
    });
  });

const SIZE = 512;
const DETS = ['D1', 'D2', 'D3', 'D4', 'D5', 'D6'];
const RANGES: Record<string, [number, number]> = {
  D1: [0.75, 1.09], D2: [1.1, 1.62], D3: [1.63, 2.41], D4: [2.42, 3.82], D5: [3.83, 4.41], D6: [4.42, 5.0],
};

function drawFrame(seed: number, k: number, n: number, stray: boolean): Promise<string> {
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#04060c';
  ctx.fillRect(0, 0, SIZE, SIZE);

  // nebulosidad fija de la región
  const rn = mulberry32(seed);
  for (let i = 0; i < 5; i++) {
    const x = rn() * SIZE;
    const y = rn() * SIZE;
    const r = 80 + rn() * 180;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(150, 170, 210, ${0.05 + rn() * 0.08})`);
    g.addColorStop(1, 'rgba(150, 170, 210, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, SIZE, SIZE);
  }

  // estrellas fijas (mismas en todos los frames)
  const rs = mulberry32(seed + 1);
  const rf = mulberry32(seed * 31 + k * 977);
  for (let i = 0; i < 280; i++) {
    const x = rs() * SIZE;
    const y = rs() * SIZE;
    const m = Math.pow(rs(), 3);
    const twinkle = 0.9 + rf() * 0.2;
    const r = 0.6 + m * 3.2;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r * 3);
    g.addColorStop(0, `rgba(255,255,255,${Math.min(1, (0.35 + m) * twinkle)})`);
    g.addColorStop(0.35, `rgba(200,220,255,${0.25 * m})`);
    g.addColorStop(1, 'rgba(200,220,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r * 3, 0, Math.PI * 2);
    ctx.fill();
  }

  const progress = n > 1 ? k / (n - 1) : 0;

  // estrella variable
  const vb = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(progress * Math.PI * 4));
  const vg = ctx.createRadialGradient(SIZE * 0.68, SIZE * 0.32, 0, SIZE * 0.68, SIZE * 0.32, 12);
  vg.addColorStop(0, `rgba(255,255,255,${vb})`);
  vg.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = vg;
  ctx.beginPath();
  ctx.arc(SIZE * 0.68, SIZE * 0.32, 12, 0, Math.PI * 2);
  ctx.fill();

  // objeto en movimiento (asteroide)
  const ax = SIZE * (0.15 + 0.7 * progress);
  const ay = SIZE * (0.62 - 0.25 * progress);
  const ag = ctx.createRadialGradient(ax, ay, 0, ax, ay, 7);
  ag.addColorStop(0, 'rgba(255,255,255,0.95)');
  ag.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = ag;
  ctx.beginPath();
  ctx.arc(ax, ay, 7, 0, Math.PI * 2);
  ctx.fill();

  // ruido + rayos cósmicos (cambian en cada frame)
  for (let i = 0; i < 900; i++) {
    ctx.fillStyle = `rgba(255,255,255,${rf() * 0.06})`;
    ctx.fillRect(rf() * SIZE, rf() * SIZE, 1, 1);
  }
  for (let i = 0; i < 6; i++) {
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.fillRect(rf() * SIZE, rf() * SIZE, 1 + rf() * 2, 1);
  }

  // luz dispersa en frames con flags
  if (stray) {
    const sg = ctx.createRadialGradient(0, 0, 0, 0, 0, SIZE * 0.9);
    sg.addColorStop(0, 'rgba(200,210,255,0.28)');
    sg.addColorStop(1, 'rgba(200,210,255,0)');
    ctx.fillStyle = sg;
    ctx.fillRect(0, 0, SIZE, SIZE);
  }

  return new Promise((resolve) =>
    canvas.toBlob((b) => resolve(b ? URL.createObjectURL(b) : canvas.toDataURL()), 'image/jpeg', 0.92),
  );
}

const cache = new Map<string, ObservationsResponse>();

export async function mockFetchObservations(
  q: ObservationQuery,
  signal?: AbortSignal,
): Promise<ObservationsResponse> {
  const key = JSON.stringify(q);
  const cached = cache.get(key);
  if (cached) return cached;

  await wait(700, signal);

  const seed = seedFrom(q.ra, q.dec);
  const start = new Date(q.start).getTime();
  const end = new Date(q.end).getTime();
  const n = 24;
  const r = mulberry32(seed + 5);

  const observations = await Promise.all(
    Array.from({ length: n }, async (_, k) => {
      const t = start + ((end - start) * (k + 0.5)) / n + (r() - 0.5) * 2 * 86400000;
      const det = q.detector === 'All' ? DETS[k % DETS.length] : q.detector;
      const stray = r() < 0.15;
      const [wmin, wmax] = RANGES[det];
      return {
        id: `spherex-${det}-${new Date(t).toISOString().slice(0, 10)}-${k}`,
        observationTime: new Date(t).toISOString(),
        detector: det,
        wavelengthMin: wmin,
        wavelengthMax: wmax,
        imageUrl: await drawFrame(seed, k, n, stray),
        flags: stray ? ['Luz dispersa (stray light)'] : [],
        dataRelease: 'QR3',
      };
    }),
  );

  const res: ObservationsResponse = {
    target: { ra: q.ra, dec: q.dec, fovDeg: q.fovDeg },
    observations,
  };
  cache.set(key, res);
  return res;
}

export async function mockFetchSpectrum(
  ra: number,
  dec: number,
  signal?: AbortSignal,
): Promise<SpectrumResponse> {
  await wait(450, signal);
  const r = mulberry32(seedFrom(ra, dec) + 9);
  const amp = 20 + r() * 40;
  const gauss = (x: number, mu: number, s: number) => Math.exp(-((x - mu) ** 2) / (2 * s * s));
  const points = Array.from({ length: 102 }, (_, i) => {
    const wl = 0.75 + (i * 4.25) / 101;
    const flux =
      amp * Math.pow(wl, -1.1) +
      7 * gauss(wl, 3.3, 0.05) - // PAH
      6 * gauss(wl, 3.05, 0.12) + // hielo de agua
      (r() - 0.5) * 1.6;
    return { wavelength: wl, flux, error: 0.8 + r() * 0.6 };
  });
  return { ra, dec, unit: 'µJy', points };
}
