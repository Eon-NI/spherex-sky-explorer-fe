import { useEffect, useRef, useState } from 'react';
import { Minus, MoreHorizontal, Plus, Search } from 'lucide-react';
import { MAX_ZOOM, MIN_ZOOM } from './TimelapseViewer';

type ViewerToolsProps = {
  zoom: number;
  onZoomChange: (z: number) => void;
  fps: number;
  onFpsChange: (fps: number) => void;
  loop: boolean;
  onLoopChange: (loop: boolean) => void;
  fade: number;
  onFadeChange: (fade: number) => void;
};

const FPS_OPTIONS = [1, 2, 4, 8];
const FADE_OPTIONS = [
  { value: 0.35, label: 'Corta' },
  { value: 0.65, label: 'Media' },
  { value: 1, label: 'Continua' },
];

const iconBtn =
  'flex h-10 w-10 items-center justify-center rounded-full border border-white/15 text-slate-300 transition hover:border-white/40 hover:text-white disabled:opacity-30';

export default function ViewerTools({
  zoom,
  onZoomChange,
  fps,
  onFpsChange,
  loop,
  onLoopChange,
  fade,
  onFadeChange,
}: ViewerToolsProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  const chip = (active: boolean) =>
    `rounded-full px-3 py-1 text-xs font-medium transition ${
      active ? 'bg-sky-500 text-slate-950' : 'bg-white/5 text-slate-300 hover:bg-white/10'
    }`;

  return (
    <div className="flex items-center justify-end gap-2">
      <div className="flex items-center gap-1 rounded-full border border-white/15 py-1 pl-3 pr-1">
        <Search size={15} className="text-slate-400" />
        <span className="font-display w-10 text-center text-xs tabular-nums text-slate-300">
          {zoom.toFixed(1)}×
        </span>
        <button
          type="button"
          className="flex h-8 w-8 items-center justify-center rounded-full text-slate-300 hover:bg-white/10 hover:text-white disabled:opacity-30"
          onClick={() => onZoomChange(Math.min(MAX_ZOOM, zoom * 1.5))}
          disabled={zoom >= MAX_ZOOM}
          aria-label="Acercar"
        >
          <Plus size={16} />
        </button>
        <button
          type="button"
          className="flex h-8 w-8 items-center justify-center rounded-full text-slate-300 hover:bg-white/10 hover:text-white disabled:opacity-30"
          onClick={() => onZoomChange(Math.max(MIN_ZOOM, zoom / 1.5))}
          disabled={zoom <= MIN_ZOOM}
          aria-label="Alejar"
        >
          <Minus size={16} />
        </button>
      </div>

      <div className="relative" ref={menuRef}>
        <button
          type="button"
          className={iconBtn}
          onClick={() => setOpen((v) => !v)}
          aria-label="Más opciones"
          aria-expanded={open}
        >
          <MoreHorizontal size={18} />
        </button>

        {open && (
          <div className="absolute bottom-12 right-0 z-30 w-64">
            <div className="liquid-glass liquid-glass-dark space-y-4 rounded-2xl p-4">
              <div>
                <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.25em] text-sky-300">
                  Velocidad
                </p>
                <div className="flex gap-1.5">
                  {FPS_OPTIONS.map((f) => (
                    <button key={f} type="button" className={chip(fps === f)} onClick={() => onFpsChange(f)}>
                      {f} fps
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.25em] text-sky-300">
                  Transición
                </p>
                <div className="flex gap-1.5">
                  {FADE_OPTIONS.map((o) => (
                    <button
                      key={o.value}
                      type="button"
                      className={chip(fade === o.value)}
                      onClick={() => onFadeChange(o.value)}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>

              <label className="flex cursor-pointer items-center justify-between text-sm text-slate-300">
                Repetir en bucle
                <input
                  type="checkbox"
                  checked={loop}
                  onChange={(e) => onLoopChange(e.target.checked)}
                  className="h-4 w-4 accent-sky-400"
                />
              </label>

              <p className="text-xs leading-5 text-slate-500">
                Zoom con los botones o con Ctrl + rueda. Con zoom, arrastra para moverte.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
