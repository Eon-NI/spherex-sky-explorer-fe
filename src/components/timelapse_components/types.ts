import type { Detector } from '../../api/spherex';

/** Valores del formulario (texto, tal y como los escribe la persona) */
export type SearchFormValues = {
  ra: string;
  dec: string;
  fov: string;
  fovUnit: 'deg' | 'arcmin';
  start: string;
  end: string;
  detector: Detector;
};

/** Punto del cielo seleccionado con un clic sobre la imagen */
export type SelectedPoint = {
  /** Posición normalizada dentro de la imagen (0–1) */
  u: number;
  v: number;
  ra: number;
  dec: number;
  frameIndex: number;
};

export type PointAction = 'coordinates' | 'spectrum' | 'metadata' | 'share';

/** Cambio registrado por la persona usuaria */
export type ChangeRecord = {
  id: string;
  /** Región (RA,Dec del centro) a la que pertenece el registro */
  region: string;
  ra: number;
  dec: number;
  u: number;
  v: number;
  observationTime: string;
  note: string;
  createdAt: string;
};
