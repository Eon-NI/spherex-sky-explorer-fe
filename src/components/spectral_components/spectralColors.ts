import { CHANNEL_COUNT, channelWavelength } from '../../api/spherex';

/**
 * Falso color espectral, como en la figura del cubo de SPHEREx:
 * violeta en 0.75 µm → rojo en 5 µm.
 */
export function wavelengthHue(wavelength: number) {
  const x = Math.min(1, Math.max(0, (wavelength - 0.75) / 4.25));
  return 270 - 270 * x;
}

export const channelHue = (index: number) => wavelengthHue(channelWavelength(index));

/** Tono para una posición decimal del reproductor (interpola entre canales) */
export function hueAtPosition(pos: number) {
  const i = Math.max(0, Math.min(CHANNEL_COUNT - 1, Math.floor(pos)));
  const j = Math.min(CHANNEL_COUNT - 1, i + 1);
  const f = pos - Math.floor(pos);
  return channelHue(i) * (1 - f) + channelHue(j) * f;
}

export const channelColor = (index: number, alpha = 1) => `hsla(${channelHue(index)}, 85%, 62%, ${alpha})`;

/** Colores de los objetos comparados (paleta del landing) */
export const OBJECT_COLORS = ['#ffb938', '#7dd3fc', '#e2e8f0'];
