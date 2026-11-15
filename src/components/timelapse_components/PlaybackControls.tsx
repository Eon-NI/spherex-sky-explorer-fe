import { ChevronLeft, ChevronRight, Pause, Play, Square } from 'lucide-react';
import type { Observation } from '../../api/spherex';
import { formatDate } from './skyMath';
import { useI18n } from '../../i18n/useI18n';

type PlaybackControlsProps = {
  observations: Observation[];
  index: number;
  playing: boolean;
  disabled: boolean;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onPrev: () => void;
  onNext: () => void;
  onSeek: (i: number) => void;
};

const btn =
  'flex h-10 w-10 items-center justify-center rounded-full border border-white/15 text-paper/80 transition hover:border-white/40 hover:text-paper disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-white/15';

export function PlaybackButtons({
  playing,
  disabled,
  onPlay,
  onPause,
  onStop,
  onPrev,
  onNext,
}: Omit<PlaybackControlsProps, 'observations' | 'index' | 'onSeek'>) {
  const { m } = useI18n();
  const t = m.modules.player;
  return (
    <div className="flex items-center justify-center gap-2">
      <button type="button" className={btn} onClick={onPrev} disabled={disabled} aria-label={t.prev}>
        <ChevronLeft size={18} />
      </button>
      <button
        type="button"
        onClick={playing ? onPause : onPlay}
        disabled={disabled}
        aria-label={playing ? t.pause : t.play}
        className="flex h-12 w-12 items-center justify-center rounded-full bg-star text-night transition hover:bg-star-hover disabled:cursor-not-allowed disabled:opacity-40"
      >
        {playing ? <Pause size={20} /> : <Play size={20} className="translate-x-px" />}
      </button>
      <button type="button" className={btn} onClick={onStop} disabled={disabled} aria-label={t.stop}>
        <Square size={15} />
      </button>
      <button type="button" className={btn} onClick={onNext} disabled={disabled} aria-label={t.next}>
        <ChevronRight size={18} />
      </button>
    </div>
  );
}

/** Línea de tiempo con una marca por observación */
export function Timeline({
  observations,
  index,
  disabled,
  onSeek,
}: Pick<PlaybackControlsProps, 'observations' | 'index' | 'disabled' | 'onSeek'>) {
  const { m } = useI18n();
  const loc = m.common.dateLocale;
  const n = observations.length;
  const current = observations[index];

  return (
    <div className="flex items-center gap-4">
      <span className="font-hud hidden w-24 shrink-0 text-xs tabular-nums text-mist sm:block">
        {n ? formatDate(observations[0].observationTime, loc) : '—'}
      </span>

      <div className="relative flex-1">
        {/* marcas de observaciones */}
        <div className="pointer-events-none absolute inset-x-[7px] top-1/2 flex -translate-y-1/2 justify-between">
          {observations.map((o, i) => (
            <span
              key={o.id}
              className={`h-2.5 w-px ${
                i === index ? 'bg-star' : o.flags.length ? 'bg-star/60' : 'bg-white/25'
              }`}
            />
          ))}
        </div>
        <input
          type="range"
          min={0}
          max={Math.max(0, n - 1)}
          step={1}
          value={index}
          disabled={disabled || n === 0}
          onChange={(e) => onSeek(Number(e.target.value))}
          aria-label={m.modules.player.timeline}
          aria-valuetext={current ? formatDate(current.observationTime, loc) : undefined}
          className="relative w-full cursor-pointer accent-star disabled:cursor-not-allowed disabled:opacity-40"
        />
      </div>

      <span className="font-hud hidden w-24 shrink-0 text-right text-xs tabular-nums text-mist sm:block">
        {n ? formatDate(observations[n - 1].observationTime, loc) : '—'}
      </span>
    </div>
  );
}
