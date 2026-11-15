import { Pause, Play } from 'lucide-react';
import { CHANNEL_COUNT, channelDetector, channelWavelength } from '../../api/spherex';
import { channelColor } from './spectralColors';
import { useI18n } from '../../i18n/useI18n';
import { fmt } from '../../i18n/format';

type ChannelSliderProps = {
  channel: number;
  onChange: (index: number) => void;
  playing: boolean;
  onPlay: () => void;
  onPause: () => void;
  disabled: boolean;
};

const DETECTOR_IDS = ['D1', 'D2', 'D3', 'D4', 'D5', 'D6'];

/** Panel "Espectro" del wireframe: 0.75 µm ──●── 5 µm, con los 102 canales a la vista */
export default function ChannelSlider({ channel, onChange, playing, onPlay, onPause, disabled }: ChannelSliderProps) {
  const wl = channelWavelength(channel);
  const { m } = useI18n();
  const t = m.modules.spectral.slider;

  return (
    <div>
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
<<<<<<< HEAD
          <p className="text-[11px] font-medium uppercase tracking-[0.25em] text-sky-300">Espectro</p>
          <p className="font-display mt-1 text-2xl font-semibold tabular-nums text-white">
            {disabled ? '—' : wl.toFixed(3)} <span className="text-base text-slate-400">µm</span>
=======
          <p className="text-[11px] font-medium uppercase tracking-[0.25em] text-mist">{t.title}</p>
          <p className="font-hud mt-1 text-2xl font-semibold tabular-nums text-paper">
            {wl.toFixed(3)} <span className="text-base text-mist">µm</span>
>>>>>>> origin/development
          </p>
        </div>
        <div className="text-right">
          <p className="font-hud text-sm tabular-nums text-paper/80">
            {t.channel} {channel + 1} <span className="text-mist/70">/ {CHANNEL_COUNT}</span>
          </p>
          <p className="text-xs text-mist/70">{fmt(t.detector, { d: channelDetector(channel) })}</p>
        </div>
      </div>

      {/* los 102 canales como una cinta de color */}
      <div className="flex h-6 gap-px overflow-hidden rounded-lg" aria-hidden>
        {Array.from({ length: CHANNEL_COUNT }, (_, i) => (
          <button
            key={i}
            type="button"
            tabIndex={-1}
            disabled={disabled}
            onClick={() => onChange(i)}
<<<<<<< HEAD
            title={disabled ? `Canal ${i + 1}` : `Canal ${i + 1} · ${channelWavelength(i).toFixed(2)} µm`}
=======
            title={fmt(m.modules.spectral.channelTitle, { n: i + 1, wl: channelWavelength(i).toFixed(2) })}
>>>>>>> origin/development
            className="flex-1 transition-transform hover:scale-y-110 disabled:cursor-not-allowed"
            style={{
              background: channelColor(i, i === channel ? 1 : 0.45),
              boxShadow: i === channel ? '0 0 0 1px #fff inset' : undefined,
            }}
          />
        ))}
      </div>

      {/* separadores de detectores */}
      <div className="mt-1 grid grid-cols-6 text-center text-[10px] font-medium text-mist/70">
        {DETECTOR_IDS.map((d) => (
          <span key={d} className={channelDetector(channel) === d ? 'text-star' : ''}>
            {d}
          </span>
        ))}
      </div>

      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={playing ? onPause : onPlay}
          disabled={disabled}
          aria-label={playing ? t.pauseSweep : t.sweep}
          title={t.sweep}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-star text-night transition hover:bg-star-hover disabled:opacity-40"
        >
          {playing ? <Pause size={17} /> : <Play size={17} className="translate-x-px" />}
        </button>
<<<<<<< HEAD
        <span className="font-display text-xs tabular-nums text-slate-400">{disabled ? '—' : `${channelWavelength(0).toFixed(3)} µm`}</span>
=======
        <span className="font-hud text-xs tabular-nums text-mist">0.75 µm</span>
>>>>>>> origin/development
        <input
          type="range"
          min={0}
          max={CHANNEL_COUNT - 1}
          step={1}
          value={channel}
          disabled={disabled}
          onChange={(e) => onChange(Number(e.target.value))}
<<<<<<< HEAD
          aria-label="Canal espectral"
          aria-valuetext={disabled ? `Canal ${channel + 1}, sin metadatos` : `${wl.toFixed(2)} micrómetros, canal ${channel + 1}`}
          className="min-w-0 flex-1 cursor-pointer accent-sky-400 disabled:opacity-40"
        />
        <span className="font-display text-xs tabular-nums text-slate-400">{disabled ? '—' : `${channelWavelength(CHANNEL_COUNT - 1).toFixed(3)} µm`}</span>
=======
          aria-label={t.aria}
          aria-valuetext={fmt(t.valueText, { wl: wl.toFixed(2), n: channel + 1 })}
          className="min-w-0 flex-1 cursor-pointer accent-star disabled:opacity-40"
        />
        <span className="font-hud text-xs tabular-nums text-mist">5 µm</span>
>>>>>>> origin/development
      </div>
    </div>
  );
}
