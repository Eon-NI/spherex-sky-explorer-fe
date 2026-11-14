import { Image as ImageIcon, Layers, Pause, Play, Repeat, SplitSquareHorizontal } from 'lucide-react';
import type { Observation } from '../../api/spherex';
import { formatDate } from '../timelapse_components/skyMath';

export type ViewMode = 'single' | 'blink' | 'difference' | 'stack';

const MODES: { id: ViewMode; label: string; icon: typeof Repeat; help: (n: number) => string }[] = [
  {
    id: 'single',
    label: 'Imagen',
    icon: ImageIcon,
    help: () => 'Muestra la observación de la época A.',
  },
  {
    id: 'blink',
    label: 'Blink',
    icon: Repeat,
    help: () => 'Alterna rápido entre A y B: lo que salta de sitio se está moviendo.',
  },
  {
    id: 'difference',
    label: 'Difference',
    icon: SplitSquareHorizontal,
    help: () => 'Resta A de B: en celeste lo que apareció o brilló más; en violeta lo que desapareció.',
  },
  {
    id: 'stack',
    label: 'Stack',
    icon: Layers,
    help: (n) => `Promedia las ${n} observaciones: más profundidad y menos ruido; lo que se mueve se borra.`,
  },
];

type ActionsPanelProps = {
  mode: ViewMode;
  onModeChange: (m: ViewMode) => void;
  observations: Observation[];
  epochA: number;
  epochB: number;
  onEpochA: (i: number) => void;
  onEpochB: (i: number) => void;
  disabled: boolean;
  blinkPlaying: boolean;
  onToggleBlink: () => void;
};

const selectClass =
  'font-display mt-1.5 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm tabular-nums text-white focus:border-sky-400 focus:outline-none disabled:opacity-40 [&>option]:bg-[#0a1230]';

export default function ActionsPanel({
  mode,
  onModeChange,
  observations,
  epochA,
  epochB,
  onEpochA,
  onEpochB,
  disabled,
  blinkPlaying,
  onToggleBlink,
}: ActionsPanelProps) {
  const current = MODES.find((m) => m.id === mode)!;
  const usesB = mode === 'blink' || mode === 'difference';

  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-[0.25em] text-sky-300">Acciones</p>

      <div className="mt-3 grid grid-cols-4 gap-2">
        {MODES.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            disabled={disabled}
            onClick={() => onModeChange(id)}
            aria-pressed={mode === id}
            className={`flex flex-col items-center gap-1.5 rounded-xl border px-2 py-2.5 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${
              mode === id
                ? 'border-sky-400/60 bg-sky-400/15 text-white'
                : 'border-white/10 bg-white/[0.03] text-slate-300 hover:border-white/25 hover:text-white'
            }`}
          >
            <Icon size={17} className={mode === id ? 'text-sky-300' : 'text-slate-400'} />
            {label}
          </button>
        ))}
      </div>

      <div className="mt-3 flex min-h-10 items-start gap-3">
        <p className="flex-1 text-sm leading-5 text-slate-400">{current.help(observations.length)}</p>
        {mode === 'blink' && (
          <button
            type="button"
            onClick={onToggleBlink}
            disabled={disabled}
            aria-label={blinkPlaying ? 'Pausar blink' : 'Reanudar blink'}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-500 text-slate-950 transition hover:bg-sky-400 disabled:opacity-40"
          >
            {blinkPlaying ? <Pause size={16} /> : <Play size={16} className="translate-x-px" />}
          </button>
        )}
      </div>

      {mode !== 'stack' && (
        <div className="mt-3 grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-[11px] font-medium uppercase tracking-[0.25em] text-slate-400">Época A</span>
            <select
              className={selectClass}
              value={epochA}
              disabled={disabled}
              onChange={(e) => onEpochA(Number(e.target.value))}
            >
              {observations.map((o, i) => (
                <option key={o.id} value={i}>
                  {formatDate(o.observationTime)}
                </option>
              ))}
            </select>
          </label>
          <label className={`block ${usesB ? '' : 'opacity-40'}`}>
            <span className="text-[11px] font-medium uppercase tracking-[0.25em] text-slate-400">Época B</span>
            <select
              className={selectClass}
              value={epochB}
              disabled={disabled || !usesB}
              onChange={(e) => onEpochB(Number(e.target.value))}
            >
              {observations.map((o, i) => (
                <option key={o.id} value={i}>
                  {formatDate(o.observationTime)}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}
    </div>
  );
}
