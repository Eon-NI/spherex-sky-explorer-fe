import { useEffect, useRef } from 'react';
import { Activity, FileText, MapPin, Share2, X } from 'lucide-react';
import type { PointAction } from './types';

export const ACTIONS: { id: PointAction; label: string; icon: typeof MapPin }[] = [
  { id: 'coordinates', label: 'Coordenadas', icon: MapPin },
  { id: 'spectrum', label: 'Espectro', icon: Activity },
  { id: 'metadata', label: 'Metadatos', icon: FileText },
  { id: 'share', label: 'Compartir URL', icon: Share2 },
];

type PointActionsMenuProps = {
  x: number;
  y: number;
  containerWidth: number;
  containerHeight: number;
  onChoose: (action: PointAction) => void;
  onClose: () => void;
};

const MENU_W = 200;
const MENU_H = 210;

/** Menú que aparece donde se hizo clic en la imagen */
export default function PointActionsMenu({
  x,
  y,
  containerWidth,
  containerHeight,
  onChoose,
  onClose,
}: PointActionsMenuProps) {
  const firstRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    firstRef.current?.focus();
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [onClose]);

  // que no se salga del visor
  const left = Math.min(Math.max(8, x + 18), containerWidth - MENU_W - 8);
  const top = Math.min(Math.max(8, y - 20), containerHeight - MENU_H - 8);

  return (
    <div className="absolute z-20" style={{ left, top, width: MENU_W }} role="menu">
      <div className="liquid-glass liquid-glass-dark rounded-2xl p-2">
        <div className="flex items-center justify-between px-2 pb-1 pt-0.5">
          <span className="text-[11px] font-medium uppercase tracking-[0.25em] text-sky-300">
            Punto
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-full p-1 text-slate-400 hover:bg-white/10 hover:text-white"
          >
            <X size={14} />
          </button>
        </div>
        {ACTIONS.map(({ id, label, icon: Icon }, i) => (
          <button
            key={id}
            ref={i === 0 ? firstRef : undefined}
            type="button"
            role="menuitem"
            onClick={() => onChoose(id)}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm text-slate-200 transition hover:bg-white/10 hover:text-white focus:bg-white/10 focus:outline-none"
          >
            <Icon size={16} className="text-sky-300" />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
