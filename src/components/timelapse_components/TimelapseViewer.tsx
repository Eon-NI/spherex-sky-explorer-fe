import { useEffect, useRef, type PointerEvent, type RefObject } from 'react';

export type ViewerMarker = { u: number; v: number; color?: string; label?: string };
type Marker = ViewerMarker;

type TimelapseViewerProps = {
  images: HTMLImageElement[];
  /** Posición decimal del reproductor (ver useTimelapsePlayer) */
  posRef: RefObject<number>;
  /** 0–1: qué parte del intervalo entre frames ocupa el fundido (1 = fundido continuo) */
  fade: number;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  selected: Marker | null;
  markers: Marker[];
  /** Clic sobre la imagen: posición normalizada y posición en px dentro del visor */
  onSelect: (u: number, v: number, x: number, y: number) => void;
  /** Opcional: tono (0–360) con el que colorear la imagen según la posición (falso color espectral) */
  hueAt?: (pos: number) => number;
};

export const MIN_ZOOM = 1;
export const MAX_ZOOM = 8;

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export default function TimelapseViewer({
  images,
  posRef,
  fade,
  zoom,
  onZoomChange,
  selected,
  markers,
  onSelect,
  hueAt,
}: TimelapseViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pan = useRef({ x: 0, y: 0 });
  const layout = useRef({ x: 0, y: 0, w: 0, h: 0, dpr: 1 });
  const drag = useRef<{ x: number; y: number; px: number; py: number; moved: boolean } | null>(null);

  // Los props que usa el bucle de dibujo se guardan en un ref
  const props = useRef({ images, fade, zoom, selected, markers, hueAt });
  useEffect(() => {
    props.current = { images, fade, zoom, selected, markers, hueAt };
  }, [images, fade, zoom, selected, markers, hueAt]);

  // Al cambiar de búsqueda o al alejar, recentra
  useEffect(() => {
    if (zoom <= 1) pan.current = { x: 0, y: 0 };
  }, [zoom, images]);

  /* ---------- tamaño del canvas (nítido en pantallas retina) ---------- */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ro = new ResizeObserver(([entry]) => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(entry.contentRect.width * dpr);
      canvas.height = Math.round(entry.contentRect.height * dpr);
      layout.current.dpr = dpr;
    });
    ro.observe(canvas);
    return () => ro.disconnect();
  }, []);

  /* ---------- bucle de dibujo con fundido entre frames ---------- */
  useEffect(() => {
    let raf = 0;
    const draw = () => {
      raf = requestAnimationFrame(draw);
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) return;
      const { images: imgs, fade: f, zoom: z, selected: sel, markers: mk, hueAt: hue } = props.current;
      const W = canvas.width;
      const H = canvas.height;
      const dpr = layout.current.dpr;

      ctx.globalAlpha = 1;
      ctx.fillStyle = '#05070f';
      ctx.fillRect(0, 0, W, H);
      if (imgs.length === 0) return;

      const n = imgs.length;
      const p = posRef.current;
      const i = ((Math.floor(p) % n) + n) % n;
      const j = (i + 1) % n;
      const frac = p - Math.floor(p);
      const alpha = f <= 0 ? (frac > 0.5 ? 1 : 0) : smoothstep(1 - f, 1, frac);

      const iw = imgs[0].naturalWidth;
      const ih = imgs[0].naturalHeight;
      const scale = Math.min(W / iw, H / ih) * z;
      const dw = iw * scale;
      const dh = ih * scale;

      // limita el desplazamiento para no salirse de la imagen
      const maxX = Math.max(0, (dw - W) / 2);
      const maxY = Math.max(0, (dh - H) / 2);
      pan.current.x = Math.max(-maxX, Math.min(maxX, pan.current.x));
      pan.current.y = Math.max(-maxY, Math.min(maxY, pan.current.y));

      const x = (W - dw) / 2 + pan.current.x;
      const y = (H - dh) / 2 + pan.current.y;
      layout.current = { x, y, w: dw, h: dh, dpr };

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(imgs[i], x, y, dw, dh);
      if (alpha > 0.001) {
        ctx.globalAlpha = alpha;
        ctx.drawImage(imgs[j], x, y, dw, dh);
        ctx.globalAlpha = 1;
      }

      // falso color: tiñe la imagen según la longitud de onda
      if (hue) {
        ctx.globalCompositeOperation = 'multiply';
        ctx.fillStyle = `hsl(${hue(p)}, 90%, 66%)`;
        ctx.fillRect(x, y, dw, dh);
        ctx.globalCompositeOperation = 'source-over';
      }

      // marcadores (cambios registrados u objetos seleccionados)
      ctx.lineWidth = 1.5 * dpr;
      for (const m of mk) {
        const mx = x + m.u * dw;
        const my = y + m.v * dh;
        ctx.strokeStyle = m.color ?? 'rgba(167, 139, 250, 0.9)';
        ctx.beginPath();
        ctx.arc(mx, my, (m.label ? 11 : 7) * dpr, 0, Math.PI * 2);
        ctx.stroke();
        if (m.label) {
          ctx.font = `600 ${12 * dpr}px "Space Grotesk", system-ui, sans-serif`;
          ctx.fillStyle = m.color ?? '#ffffff';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          ctx.fillText(m.label, mx + 15 * dpr, my);
        }
      }

      // punto seleccionado
      if (sel) {
        const sx = x + sel.u * dw;
        const sy = y + sel.v * dh;
        const r = 14 * dpr;
        ctx.strokeStyle = '#7dd3fc';
        ctx.lineWidth = 2 * dpr;
        ctx.beginPath();
        ctx.arc(sx, sy, r, 0, Math.PI * 2);
        ctx.moveTo(sx - r * 2, sy); ctx.lineTo(sx - r * 1.2, sy);
        ctx.moveTo(sx + r * 1.2, sy); ctx.lineTo(sx + r * 2, sy);
        ctx.moveTo(sx, sy - r * 2); ctx.lineTo(sx, sy - r * 1.2);
        ctx.moveTo(sx, sy + r * 1.2); ctx.lineTo(sx, sy + r * 2);
        ctx.stroke();
      }
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [posRef]);

  /* ---------- zoom con Ctrl + rueda (o pellizco en trackpad) ---------- */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return; // la rueda sola sigue haciendo scroll en la página
      e.preventDefault();
      const z = props.current.zoom * Math.exp(-e.deltaY * 0.002);
      onZoomChange(Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z)));
    };
    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', onWheel);
  }, [onZoomChange]);

  /* ---------- arrastrar para mover / clic para seleccionar ---------- */
  const onPointerDown = (e: PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, px: pan.current.x, py: pan.current.y, moved: false };
  };

  const onPointerMove = (e: PointerEvent<HTMLCanvasElement>) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (Math.hypot(dx, dy) > 4) d.moved = true;
    if (d.moved && props.current.zoom > 1) {
      const dpr = layout.current.dpr;
      pan.current = { x: d.px + dx * dpr, y: d.py + dy * dpr };
    }
  };

  const onPointerUp = (e: PointerEvent<HTMLCanvasElement>) => {
    const d = drag.current;
    drag.current = null;
    if (!d || d.moved || props.current.images.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const { x, y, w, h, dpr } = layout.current;
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const u = (cx * dpr - x) / w;
    const v = (cy * dpr - y) / h;
    if (u < 0 || u > 1 || v < 0 || v > 1) return;
    onSelect(u, v, cx, cy);
  };

  return (
    <canvas
      ref={canvasRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => (drag.current = null)}
      className={`block h-full w-full touch-none ${
        zoom > 1 ? 'cursor-grab active:cursor-grabbing' : 'cursor-crosshair'
      }`}
      aria-label="Visor del timelapse. Haz clic sobre un objeto para ver sus opciones."
    />
  );
}
