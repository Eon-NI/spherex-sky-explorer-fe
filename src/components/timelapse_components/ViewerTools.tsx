import { useEffect, useRef, useState } from 'react';
import { Minus, MoreHorizontal, Plus, Search } from 'lucide-react';
import { MAX_ZOOM, MIN_ZOOM } from './TimelapseViewer';
import { useI18n } from '../../i18n/useI18n';

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
  { value: 0.35, key: 'fadeShort' },
  { value: 0.65, key: 'fadeMedium' },
  { value: 1, key: 'fadeContinuous' },
] as const;

const iconBtn =
  'flex h-10 w-10 items-center justify-center rounded-full border border-white/15 text-paper/80 transition hover:border-white/40 hover:text-paper disabled:opacity-30';

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
  const { m } = useI18n();
  const t = m.modules.tools;
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
      active ? 'bg-star text-night' : 'bg-white/5 text-paper/80 hover:bg-white/10'
    }`;

  return (
    <div className="flex items-center justify-end gap-2">
      <div className="flex items-center gap-1 rounded-full border border-white/15 py-1 pl-3 pr-1">
        <Search size={15} className="text-mist" />
        <span className="font-hud w-10 text-center text-xs tabular-nums text-paper/80">
          {zoom.toFixed(1)}×
        </span>
        <button
          type="button"
          className="flex h-8 w-8 items-center justify-center rounded-full text-paper/80 hover:bg-white/10 hover:text-paper disabled:opacity-30"
          onClick={() => onZoomChange(Math.min(MAX_ZOOM, zoom * 1.5))}
          disabled={zoom >= MAX_ZOOM}
          aria-label={m.common.zoomIn}
        >
          <Plus size={16} />
        </button>
        <button
          type="button"
          className="flex h-8 w-8 items-center justify-center rounded-full text-paper/80 hover:bg-white/10 hover:text-paper disabled:opacity-30"
          onClick={() => onZoomChange(Math.max(MIN_ZOOM, zoom / 1.5))}
          disabled={zoom <= MIN_ZOOM}
          aria-label={m.common.zoomOut}
        >
          <Minus size={16} />
        </button>
      </div>

      <div className="relative" ref={menuRef}>
        <button
          type="button"
          className={iconBtn}
          onClick={() => setOpen((v) => !v)}
          aria-label={t.more}
          aria-expanded={open}
        >
          <MoreHorizontal size={18} />
        </button>

        {open && (
          <div className="absolute bottom-12 right-0 z-30 w-64">
            <div className="liquid-glass liquid-glass-dark space-y-4 rounded-2xl p-4">
              <div>
                <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.25em] text-mist">
                  {t.speed}
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
                <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.25em] text-mist">
                  {t.transition}
                </p>
                <div className="flex gap-1.5">
                  {FADE_OPTIONS.map((o) => (
                    <button
                      key={o.value}
                      type="button"
                      className={chip(fade === o.value)}
                      onClick={() => onFadeChange(o.value)}
                    >
                      {t[o.key]}
                    </button>
                  ))}
                </div>
              </div>

              <label className="flex cursor-pointer items-center justify-between text-sm text-paper/80">
                {t.loop}
                <input
                  type="checkbox"
                  checked={loop}
                  onChange={(e) => onLoopChange(e.target.checked)}
                  className="h-4 w-4 accent-star"
                />
              </label>

              <p className="text-xs leading-5 text-mist/70">
                {t.hint}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
