import { ChevronLeft, ChevronRight, Pause, Play, Square } from 'lucide-react';
import type { Observation } from '../../api/spherex';
import { formatDate } from './skyMath';

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
  'flex h-10 w-10 items-center justify-center rounded-full border border-white/15 text-slate-300 transition hover:border-white/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-white/15';

export function PlaybackButtons({
  playing,
  disabled,
  onPlay,
  onPause,
  onStop,
  onPrev,
  onNext,
}: Omit<PlaybackControlsProps, 'observations' | 'index' | 'onSeek'>) {
  return (
    <div className="flex items-center justify-center gap-2">
      <button type="button" className={btn} onClick={onPrev} disabled={disabled} aria-label="Frame anterior">
        <ChevronLeft size={18} />
      </button>
      <button
        type="button"
        onClick={playing ? onPause : onPlay}
        disabled={disabled}
        aria-label={playing ? 'Pausar' : 'Reproducir'}
        className="flex h-12 w-12 items-center justify-center rounded-full bg-sky-500 text-slate-950 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {playing ? <Pause size={20} /> : <Play size={20} className="translate-x-px" />}
      </button>
      <button type="button" className={btn} onClick={onStop} disabled={disabled} aria-label="Detener y volver al inicio">
        <Square size={15} />
      </button>
      <button type="button" className={btn} onClick={onNext} disabled={disabled} aria-label="Frame siguiente">
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
  const n = observations.length;
  const current = observations[index];

  return (
    <div className="flex items-center gap-4">
      <span className="font-display hidden w-24 shrink-0 text-xs tabular-nums text-slate-400 sm:block">
        {n ? formatDate(observations[0].observationTime) : '—'}
      </span>

      <div className="relative flex-1">
        {/* marcas de observaciones */}
        <div className="pointer-events-none absolute inset-x-[7px] top-1/2 flex -translate-y-1/2 justify-between">
          {observations.map((o, i) => (
            <span
              key={o.id}
              className={`h-2.5 w-px ${
                i === index ? 'bg-sky-300' : o.flags.length ? 'bg-violet-400/70' : 'bg-white/25'
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
          aria-label="Posición en el timelapse"
          aria-valuetext={current ? formatDate(current.observationTime) : undefined}
          className="relative w-full cursor-pointer accent-sky-400 disabled:cursor-not-allowed disabled:opacity-40"
        />
      </div>

      <span className="font-display hidden w-24 shrink-0 text-right text-xs tabular-nums text-slate-400 sm:block">
        {n ? formatDate(observations[n - 1].observationTime) : '—'}
      </span>
    </div>
  );
}
