import { CHANNEL_COUNT, channelWavelength } from '../../api/spherex';
import { channelColor } from './spectralColors';

type SpectralCubeProps = {
  channel: number;
  onSelect: (index: number) => void;
};

const W = 280;
const H = 190;
const LAYER_W = 96;
const LAYER_H = 54;
const SKEW = 36;
const DX = 1.15;
const DY = 0.82;

/**
 * Cubo espectral: las 102 imágenes de la misma región apiladas,
 * del canal 1 al 102; las longitudes de onda proceden de DR1.
 */
export default function SpectralCube({ channel, onSelect }: SpectralCubeProps) {
  const layer = (i: number, lift = 0) => {
    const ox = 14 + i * DX;
    const oy = H - 24 - LAYER_H - i * DY - lift;
    return `${ox},${oy + LAYER_H} ${ox + LAYER_W},${oy + LAYER_H} ${ox + LAYER_W + SKEW},${oy} ${ox + SKEW},${oy}`;
  };

  // del fondo hacia delante
  const order = Array.from({ length: CHANNEL_COUNT }, (_, k) => CHANNEL_COUNT - 1 - k);
  const sel = layer(channel, 16);
  const selX = 14 + channel * DX + LAYER_W + SKEW + 6;
  const selY = H - 24 - LAYER_H / 2 - channel * DY - 16;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Cubo espectral de 102 canales">
      {order.map((i) => (
        <polygon
          key={i}
          points={layer(i)}
          fill={channelColor(i, i === channel ? 0.2 : 0.55)}
          stroke="rgba(5,7,15,0.55)"
          strokeWidth={0.6}
          className="cursor-pointer transition-opacity hover:opacity-70"
          onClick={() => onSelect(i)}
        >
          <title>{`Canal ${i + 1} · ${channelWavelength(i).toFixed(2)} µm`}</title>
        </polygon>
      ))}

      {/* canal seleccionado, levantado sobre la pila */}
      <polygon points={sel} fill={channelColor(channel, 0.95)} stroke="#ffffff" strokeWidth={1.2} pointerEvents="none" />
      <text x={Math.min(selX, W - 4)} y={Math.max(14, selY)} textAnchor="end" className="fill-white text-[10px] font-semibold">
        CH {String(channel + 1).padStart(3, '0')}
      </text>

      <text x={14} y={H - 6} className="fill-slate-500 text-[9px]">
        {channelWavelength(0).toFixed(3)} µm
      </text>
      <text x={W - 4} y={H - 6} textAnchor="end" className="fill-slate-500 text-[9px]">
        {channelWavelength(CHANNEL_COUNT - 1).toFixed(3)} µm al fondo
      </text>
    </svg>
  );
}
