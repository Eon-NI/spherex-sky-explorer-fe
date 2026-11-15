import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { ACTIONS } from './pointActions';
import type { PointAction } from './types';
import { useI18n } from '../../i18n/useI18n';


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
  const { m } = useI18n();
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
          <span className="text-[11px] font-medium uppercase tracking-[0.25em] text-mist">
            {m.modules.point.menuTitle}
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label={m.common.close}
            className="rounded-full p-1 text-mist hover:bg-white/10 hover:text-paper"
          >
            <X size={14} />
          </button>
        </div>
        {ACTIONS.map(({ id, icon: Icon }, i) => (
          <button
            key={id}
            ref={i === 0 ? firstRef : undefined}
            type="button"
            role="menuitem"
            onClick={() => onChoose(id)}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm text-paper/90 transition hover:bg-white/10 hover:text-paper focus:bg-white/10 focus:outline-none"
          >
            <Icon size={16} className="text-star" />
            {m.modules.point[id]}
          </button>
        ))}
      </div>
    </div>
  );
}
