import { useId } from 'react';
import type { SpectrumPoint } from '../../api/spherex';

type SpectrumChartProps = {
  points: SpectrumPoint[];
  unit: string;
  /** Rango del detector del frame actual, se sombrea en el gráfico */
  highlight?: [number, number];
  ariaLabel?: string;
};

const W = 300;
const H = 150;
const PAD = { l: 34, r: 18, t: 10, b: 24 };
const X_MIN = 0.75;
const X_MAX = 5;

export default function SpectrumChart({ points, unit, highlight, ariaLabel }: SpectrumChartProps) {
  const gid = useId();
  const fluxes = points.map((p) => p.flux);
  const yMin = Math.min(...fluxes);
  const yMax = Math.max(...fluxes);
  const pad = (yMax - yMin) * 0.1 || 1;
  const lo = yMin - pad;
  const hi = yMax + pad;

  const sx = (w: number) => PAD.l + ((w - X_MIN) / (X_MAX - X_MIN)) * (W - PAD.l - PAD.r);
  const sy = (f: number) => PAD.t + (1 - (f - lo) / (hi - lo)) * (H - PAD.t - PAD.b);

  const line = points.map((p, i) => `${i ? 'L' : 'M'}${sx(p.wavelength).toFixed(1)},${sy(p.flux).toFixed(1)}`).join(' ');
  const area = `${line} L${sx(X_MAX)},${H - PAD.b} L${sx(X_MIN)},${H - PAD.b} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={ariaLabel}>
      <defs>
        <linearGradient id={`${gid}-line`} x1="0" x2="1">
          <stop offset="0%" stopColor="#a78bfa" />
          <stop offset="50%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#7dd3fc" />
        </linearGradient>
        <linearGradient id={`${gid}-area`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
        </linearGradient>
      </defs>

      {highlight && (
        <rect
          x={sx(highlight[0])}
          y={PAD.t}
          width={sx(highlight[1]) - sx(highlight[0])}
          height={H - PAD.t - PAD.b}
          fill="rgba(255,255,255,0.06)"
        />
      )}

      {[1, 2, 3, 4, 5].map((w) => (
        <g key={w}>
          <line x1={sx(w)} x2={sx(w)} y1={PAD.t} y2={H - PAD.b} stroke="rgba(255,255,255,0.06)" />
          <text x={sx(w)} y={H - 8} textAnchor="middle" className="fill-mist text-[9px]">
            {w} µm
          </text>
        </g>
      ))}
      <text x={4} y={PAD.t + 6} className="fill-mist text-[9px]">
        {unit}
      </text>

      <path d={area} fill={`url(#${gid}-area)`} />
      <path d={line} fill="none" stroke={`url(#${gid}-line)`} strokeWidth={1.8} strokeLinejoin="round" />
    </svg>
  );
}
