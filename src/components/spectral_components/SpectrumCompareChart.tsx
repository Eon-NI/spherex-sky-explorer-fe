import { useId, type MouseEvent } from 'react';
import { channelWavelength, nearestChannel, type SpectrumPoint } from '../../api/spherex';
import { wavelengthHue } from './spectralColors';

export type SpectrumSeries = {
  id: string;
  label: string;
  color: string;
  points?: SpectrumPoint[];
  loading?: boolean;
};

type Props = {
  series: SpectrumSeries[];
  channel: number;
  unit: string;
  onChannelChange: (index: number) => void;
  ariaLabel?: string;
};

const W = 340;
const H = 190;
const PAD = { l: 36, r: 14, t: 12, b: 34 };
const X_MIN = 0.75;
const X_MAX = 5;

/** Espectros de hasta 3 objetos; clic en el gráfico para cambiar de canal */
export default function SpectrumCompareChart({ series, channel, unit, onChannelChange, ariaLabel }: Props) {
  const gid = useId();
  const all = series.flatMap((s) => s.points ?? []);
  const fluxes = all.map((p) => p.flux);
  const yMin = fluxes.length ? Math.min(...fluxes) : 0;
  const yMax = fluxes.length ? Math.max(...fluxes) : 1;
  const pad = (yMax - yMin) * 0.12 || 1;
  const lo = yMin - pad;
  const hi = yMax + pad;

  const sx = (w: number) => PAD.l + ((w - X_MIN) / (X_MAX - X_MIN)) * (W - PAD.l - PAD.r);
  const sy = (f: number) => PAD.t + (1 - (f - lo) / (hi - lo)) * (H - PAD.t - PAD.b);
  const wl = channelWavelength(channel);

  const onClick = (e: MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const w = X_MIN + ((px - PAD.l) / (W - PAD.l - PAD.r)) * (X_MAX - X_MIN);
    onChannelChange(nearestChannel(Math.max(X_MIN, Math.min(X_MAX, w))));
  };

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full cursor-crosshair"
      onClick={onClick}
      role="img"
      aria-label={ariaLabel}
    >
      <defs>
        <linearGradient id={`${gid}-band`} x1="0" x2="1">
          {[0, 0.25, 0.5, 0.75, 1].map((t) => (
            <stop key={t} offset={`${t * 100}%`} stopColor={`hsl(${wavelengthHue(X_MIN + t * (X_MAX - X_MIN))}, 85%, 60%)`} />
          ))}
        </linearGradient>
      </defs>

      {/* rejilla y eje */}
      {[1, 2, 3, 4, 5].map((w) => (
        <g key={w}>
          <line x1={sx(w)} x2={sx(w)} y1={PAD.t} y2={H - PAD.b} stroke="rgba(255,255,255,0.06)" />
          <text x={sx(w)} y={H - 8} textAnchor="middle" className="fill-mist text-[9px]">
            {w} µm
          </text>
        </g>
      ))}
      <rect x={PAD.l} y={H - PAD.b + 4} width={W - PAD.l - PAD.r} height={4} rx={2} fill={`url(#${gid}-band)`} opacity={0.8} />
      <text x={4} y={PAD.t + 6} className="fill-mist text-[9px]">
        {unit}
      </text>

      {/* canal actual */}
      <line x1={sx(wl)} x2={sx(wl)} y1={PAD.t} y2={H - PAD.b} stroke="#ffffff" strokeDasharray="3 3" opacity={0.6} />

      {series.map((s) =>
        s.points ? (
          <g key={s.id}>
            <path
              d={s.points.map((p, i) => `${i ? 'L' : 'M'}${sx(p.wavelength).toFixed(1)},${sy(p.flux).toFixed(1)}`).join(' ')}
              fill="none"
              stroke={s.color}
              strokeWidth={1.4}
              strokeLinejoin="round"
              opacity={0.9}
            />
            {s.points.map((p, i) => (
              <circle key={i} cx={sx(p.wavelength)} cy={sy(p.flux)} r={1.1} fill={s.color} opacity={0.6} />
            ))}
            {s.points[channel] && (
              <circle
                cx={sx(s.points[channel].wavelength)}
                cy={sy(s.points[channel].flux)}
                r={4}
                fill={s.color}
                stroke="#0d1230"
                strokeWidth={1.5}
              />
            )}
          </g>
        ) : null,
      )}
    </svg>
  );
}
