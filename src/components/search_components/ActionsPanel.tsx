import { Image as ImageIcon, Pause, Play, Repeat } from 'lucide-react';
import type { Observation } from '../../api/spherex';
import EpochPicker from './EpochPicker';
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
  observations: (Pick<Observation, 'id' | 'observationTime'> & { detector?: string })[];
  epochA: number;
  epochB: number;
  onEpochA: (i: number) => void;
  onEpochB: (i: number) => void;
  disabled: boolean;
  blinkPlaying: boolean;
  onToggleBlink: () => void;
};

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
  const help = mode === 'blink' && (observations.length < 2 || epochA === epochB)
    ? t.blinkUnavailable : fmt(t[`${mode}Help`], { count: observations.length });
  const usesB = mode === 'blink';

  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-[0.25em] text-mist">{t.title}</p>

      <div className="mt-3 grid grid-cols-2 gap-2">
        {MODES.map(({ id, icon: Icon }) => (
          <button
            key={id}
            type="button"
            disabled={disabled || (id === 'blink' && observations.length < 2)}
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
            disabled={disabled || observations.length < 2 || epochA === epochB}
            aria-label={blinkPlaying ? t.pauseBlink : t.resumeBlink}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-star text-night transition hover:bg-star-hover disabled:opacity-40"
          >
            {blinkPlaying ? <Pause size={16} /> : <Play size={16} className="translate-x-px" />}
          </button>
        )}
      </div>

      <div className="mt-3 grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
        <EpochPicker key={`a:${JSON.stringify(observations)}`} label={t.epochA} observations={observations}
          value={observations[epochA]?.id} excludedId={usesB ? observations[epochB]?.id : undefined}
          disabled={disabled} onChange={id => onEpochA(observations.findIndex(o => o.id === id))} />
        <EpochPicker key={`b:${JSON.stringify(observations)}`} label={t.epochB} observations={observations}
          value={observations[epochB]?.id} excludedId={observations[epochA]?.id}
          disabled={disabled || !usesB || observations.length < 2}
          onChange={id => onEpochB(observations.findIndex(o => o.id === id))} />
      </div>
    </div>
  );
}
