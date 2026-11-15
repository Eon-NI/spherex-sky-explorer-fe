import type { TourControls } from './tourConfig';
import { CHANNELS, WL_MAX, WL_MIN, wavelengthToChannel } from './tourConfig';

/** Función que dibuja un frame de una pantalla del satélite */
export type DrawFn = (
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  t: number,
  c: TourControls,
) => void;

/* ---------- Estrellas deterministas (siempre iguales) ---------- */
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let r = Math.imul(a ^ (a >>> 15), 1 | a);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(2026);
const SKY = Array.from({ length: 180 }, () => ({
  r: Math.sqrt(rand()),
  a: rand() * Math.PI * 2,
  x: rand(),
  y: rand(),
  s: rand() * 1.6 + 0.5,
  b: rand(),
}));

// Paleta del landing: sky-300 / sky-400 / blue-500 / violet-400
const SKY300 = '#ffc95e'; // --color-star-hover
const SKY400 = '#ffb938'; // --color-star
// Pantallas tipo HUD: JetBrains Mono (font-hud del sitio)
const HUD_FONT = '600 20px "JetBrains Mono", ui-monospace, monospace';
const HUD_FONT_SM = '500 15px "JetBrains Mono", ui-monospace, monospace';

/* ---------- Utilidades comunes de HUD ---------- */
function background(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#171e4a'); // --color-night-soft
  g.addColorStop(1, '#0d1230'); // --color-night
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

function hudFrame(ctx: CanvasRenderingContext2D, w: number, h: number, label: string) {
  // líneas de escaneo
  ctx.fillStyle = 'rgba(255, 185, 56, 0.035)';
  for (let y = 0; y < h; y += 4) ctx.fillRect(0, y, w, 1);

  // esquinas
  const m = 12;
  const l = 26;
  ctx.strokeStyle = SKY300;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(m, m + l); ctx.lineTo(m, m); ctx.lineTo(m + l, m);
  ctx.moveTo(w - m - l, m); ctx.lineTo(w - m, m); ctx.lineTo(w - m, m + l);
  ctx.moveTo(m, h - m - l); ctx.lineTo(m, h - m); ctx.lineTo(m + l, h - m);
  ctx.moveTo(w - m - l, h - m); ctx.lineTo(w - m, h - m); ctx.lineTo(w - m, h - m - l);
  ctx.stroke();

  ctx.font = HUD_FONT_SM;
  ctx.fillStyle = 'rgba(255, 185, 56, 0.9)';
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  ctx.fillText(label, m + 16, m + 10);
}

/* ---------- 01 · Timelapse: rotación del cielo con estelas ---------- */
export const drawTimelapse: DrawFn = (ctx, w, h, _t, c) => {
  background(ctx, w, h);
  const cx = w * 0.5;
  const cy = h * 1.05;
  const R = Math.hypot(w, h) * 0.75;
  const rot = c.tlTime * 0.12;

  ctx.lineCap = 'round';
  for (const s of SKY) {
    const r = s.r * R;
    const a = s.a + rot;
    ctx.strokeStyle = `rgba(186, 230, 253, ${0.12 + s.b * 0.3})`;
    ctx.lineWidth = s.s * 0.7;
    ctx.beginPath();
    ctx.arc(cx, cy, r, a - 0.22, a);
    ctx.stroke();
    ctx.fillStyle = `rgba(255, 255, 255, ${0.55 + s.b * 0.45})`;
    ctx.beginPath();
    ctx.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r, s.s, 0, Math.PI * 2);
    ctx.fill();
  }

  // horizonte
  const hg = ctx.createLinearGradient(0, h * 0.75, 0, h);
  hg.addColorStop(0, 'rgba(37, 99, 235, 0)');
  hg.addColorStop(1, 'rgba(124, 58, 237, 0.35)');
  ctx.fillStyle = hg;
  ctx.fillRect(0, h * 0.75, w, h * 0.25);

  hudFrame(ctx, w, h, 'MOD 01 // TIMELAPSE');

  const frame = Math.floor(c.tlTime * 10) % 120;
  const year = 2025 + Math.floor((frame / 119) * 1.99); // misión SPHEREx: 2025 → 2026
  ctx.font = HUD_FONT;
  ctx.textAlign = 'right';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(`${year}`, w - 28, 22);

  // barra de progreso
  const bx = 28;
  const by = h - 40;
  const bw = w - 56;
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.fillRect(bx, by, bw, 3);
  ctx.fillStyle = SKY400;
  ctx.fillRect(bx, by, bw * (frame / 119), 3);

  ctx.font = HUD_FONT_SM;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'bottom';
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.fillText(c.playing ? '▶ PLAY' : '❚❚ PAUSE', bx, by - 8);
  ctx.textAlign = 'right';
  ctx.fillText(`FRAME ${String(frame + 1).padStart(3, '0')}/120`, bx + bw, by - 8);
};

/* ---------- 02 · Search: rejilla de coordenadas y mira ---------- */
export const drawSearch: DrawFn = (ctx, w, h, t) => {
  background(ctx, w, h);

  for (const s of SKY) {
    ctx.fillStyle = `rgba(255,255,255,${0.3 + s.b * 0.6})`;
    ctx.fillRect(s.x * w, s.y * h, s.s, s.s);
  }

  // rejilla RA/Dec
  ctx.strokeStyle = 'rgba(255, 185, 56, 0.12)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= w; x += 48) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
  }
  for (let y = 0; y <= h; y += 48) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
  }

  // mira que "busca" y se fija
  const settle = (Math.sin(t * 0.6) + 1) / 2;
  const px = w * 0.56 + Math.sin(t * 1.3) * 70 * settle;
  const py = h * 0.5 + Math.cos(t * 0.9) * 40 * settle;
  const pulse = 26 + Math.sin(t * 4) * 4;

  ctx.strokeStyle = SKY300;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(px, py, pulse, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(px - 50, py); ctx.lineTo(px - 14, py);
  ctx.moveTo(px + 14, py); ctx.lineTo(px + 50, py);
  ctx.moveTo(px, py - 50); ctx.lineTo(px, py - 14);
  ctx.moveTo(px, py + 14); ctx.lineTo(px, py + 50);
  ctx.stroke();

  hudFrame(ctx, w, h, 'MOD 02 // SEARCH');

  ctx.font = HUD_FONT_SM;
  ctx.textBaseline = 'bottom';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('RA  210.80227°', 28, h - 46);
  ctx.fillText('DEC +54.34895°', 28, h - 24);
  ctx.textAlign = 'right';
  ctx.fillStyle = settle < 0.25 ? '#34d399' : 'rgba(255,255,255,0.6)';
  ctx.fillText(settle < 0.25 ? '● TARGET LOCK' : '○ SCANNING', w - 28, h - 24);
};

/* ---------- 03 · Spectral: 102 canales ---------- */
export const drawSpectral: DrawFn = (ctx, w, h, t, c) => {
  background(ctx, w, h);
  hudFrame(ctx, w, h, 'MOD 03 // SPECTRAL');

  const left = 28;
  const right = w - 28;
  const top = 56;
  const bottom = h - 56;
  const bw = (right - left) / CHANNELS;
  const selected = wavelengthToChannel(c.wavelength) - 1;

  for (let i = 0; i < CHANNELS; i++) {
    const n =
      0.45 +
      0.22 * Math.sin(i * 0.21 + t * 1.4) +
      0.15 * Math.sin(i * 0.067 - t * 0.7) -
      (i > 30 && i < 36 ? 0.3 : 0) - // bandas de absorción (ej. hielo de agua)
      (i > 68 && i < 72 ? 0.25 : 0);
    const val = Math.max(0.05, Math.min(1, n));
    const bh = (bottom - top) * val;
    // degradado violet-400 → blue-500 → sky-300 (paleta del landing)
    const hue = 265 - (i / (CHANNELS - 1)) * 70;
    const light = 62 + (i / (CHANNELS - 1)) * 12;
    const isSel = Math.abs(i - selected) <= 1;
    ctx.fillStyle = isSel ? '#ffffff' : `hsla(${hue}, 90%, ${light}%, 0.9)`;
    ctx.fillRect(left + i * bw, bottom - bh, Math.max(1, bw - 1), bh);
  }

  // cursor de longitud de onda
  const cx = left + ((c.wavelength - WL_MIN) / (WL_MAX - WL_MIN)) * (right - left);
  ctx.strokeStyle = '#ffffff';
  ctx.setLineDash([4, 4]);
  ctx.beginPath(); ctx.moveTo(cx, top - 6); ctx.lineTo(cx, bottom); ctx.stroke();
  ctx.setLineDash([]);

  ctx.font = HUD_FONT_SM;
  ctx.textBaseline = 'top';
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.textAlign = 'left';
  ctx.fillText('0.75 µm', left, bottom + 10);
  ctx.textAlign = 'right';
  ctx.fillText('5.00 µm', right, bottom + 10);
  ctx.textAlign = 'center';
  ctx.fillStyle = SKY300;
  ctx.fillText(
    `λ ${c.wavelength.toFixed(2)} µm · CH ${String(selected + 1).padStart(3, '0')}`,
    w / 2,
    bottom + 10,
  );
};

/* ---------- 04 · Surprise: radar (lienzo cuadrado para un disco) ---------- */
export const drawRadar: DrawFn = (ctx, w, h, t) => {
  const cx = w / 2;
  const cy = h / 2;
  const R = w / 2 - 6;

  ctx.fillStyle = '#0d1230';
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = 'rgba(255, 185, 56, 0.3)';
  ctx.lineWidth = 2;
  for (let i = 1; i <= 4; i++) {
    ctx.beginPath();
    ctx.arc(cx, cy, (R * i) / 4, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(cx - R, cy); ctx.lineTo(cx + R, cy);
  ctx.moveTo(cx, cy - R); ctx.lineTo(cx, cy + R);
  ctx.stroke();

  // barrido
  const sweep = (t * 1.2) % (Math.PI * 2);
  for (let i = 0; i < 30; i++) {
    const a0 = sweep - (i + 1) * 0.035;
    ctx.fillStyle = `rgba(56, 189, 248, ${0.3 * (1 - i / 30)})`;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, R, a0, a0 + 0.036);
    ctx.closePath();
    ctx.fill();
  }

  // "lugares" detectados
  for (let i = 0; i < 14; i++) {
    const s = SKY[i];
    const a = s.a;
    let diff = (sweep - a) % (Math.PI * 2);
    if (diff < 0) diff += Math.PI * 2;
    const glow = Math.max(0, 1 - diff / 2.5);
    if (glow <= 0) continue;
    const r = (0.2 + s.r * 0.75) * R;
    ctx.fillStyle = `rgba(167, 139, 250, ${glow})`;
    ctx.beginPath();
    ctx.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 6 + glow * 4, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.font = '600 24px "JetBrains Mono", ui-monospace, monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fillText('DISCOVERY', cx, cy + R * 0.62);
};

/* ---------- Textura estática del panel solar ---------- */
export function drawSolarPanel(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = '#171e4a';
  ctx.fillRect(0, 0, w, h);
  const cols = 12;
  const rows = 6;
  const cw = w / cols;
  const rh = h / rows;
  for (let x = 0; x < cols; x++) {
    for (let y = 0; y < rows; y++) {
      const g = ctx.createLinearGradient(x * cw, y * rh, (x + 1) * cw, (y + 1) * rh);
      g.addColorStop(0, '#1e40af');
      g.addColorStop(1, '#172554');
      ctx.fillStyle = g;
      ctx.fillRect(x * cw + 2, y * rh + 2, cw - 4, rh - 4);
    }
  }
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.5)';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, w - 2, h - 2);
}
