import { Image as ImageIcon, Pause, Play, Repeat } from 'lucide-react';
import type { Observation } from '../../api/spherex';
import { formatDate } from '../timelapse_components/skyMath';
import { useI18n } from '../../i18n/useI18n';
import { fmt } from '../../i18n/format';

export type ViewMode = 'single' | 'blink';

const MODES: { id: ViewMode; icon: typeof Repeat }[] = [
  { id: 'single', icon: ImageIcon },
  { id: 'blink', icon: Repeat },
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
  'font-hud mt-1.5 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm tabular-nums text-paper focus:border-star focus:outline-none disabled:opacity-40 [&>option]:bg-night-soft';

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
  const { m } = useI18n();
  const t = m.modules.search.actions;
  const loc = m.common.dateLocale;
  const help = fmt(t[`${mode}Help`], { count: observations.length });
  const usesB = mode === 'blink';

  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-[0.25em] text-mist">{t.title}</p>

      <div className="mt-3 grid grid-cols-2 gap-2">
        {MODES.map(({ id, icon: Icon }) => (
          <button
            key={id}
            type="button"
            disabled={disabled}
            onClick={() => onModeChange(id)}
            aria-pressed={mode === id}
            className={`flex flex-col items-center gap-1.5 rounded-xl border px-2 py-2.5 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${
              mode === id
                ? 'border-star/60 bg-star/15 text-paper'
                : 'border-white/10 bg-white/[0.03] text-paper/80 hover:border-white/25 hover:text-paper'
            }`}
          >
            <Icon size={17} className={mode === id ? 'text-star' : 'text-mist'} />
            {t[id]}
          </button>
        ))}
      </div>

      <div className="mt-3 flex min-h-10 items-start gap-3">
        <p className="flex-1 text-sm leading-5 text-mist">{help}</p>
        {mode === 'blink' && (
          <button
            type="button"
            onClick={onToggleBlink}
            disabled={disabled}
            aria-label={blinkPlaying ? t.pauseBlink : t.resumeBlink}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-star text-night transition hover:bg-star-hover disabled:opacity-40"
          >
            {blinkPlaying ? <Pause size={16} /> : <Play size={16} className="translate-x-px" />}
          </button>
        )}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-[11px] font-medium uppercase tracking-[0.25em] text-mist">{t.epochA}</span>
          <select
            className={selectClass}
            value={epochA}
            disabled={disabled}
            onChange={(e) => onEpochA(Number(e.target.value))}
          >
            {observations.map((o, i) => (
              <option key={o.id} value={i}>
                {formatDate(o.observationTime, loc)}
              </option>
            ))}
          </select>
        </label>
        <label className={`block ${usesB ? '' : 'opacity-40'}`}>
          <span className="text-[11px] font-medium uppercase tracking-[0.25em] text-mist">{t.epochB}</span>
          <select
            className={selectClass}
            value={epochB}
            disabled={disabled || !usesB}
            onChange={(e) => onEpochB(Number(e.target.value))}
          >
            {observations.map((o, i) => (
              <option key={o.id} value={i}>
                {formatDate(o.observationTime, loc)}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
