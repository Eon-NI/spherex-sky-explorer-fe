import * as THREE from 'three';

/* ---------- Geometría base del satélite ---------- */
export const BUS_RADIUS = 1.5;
export const BUS_HEIGHT = 1.5;
/** Distancia del centro al centro de cada cara del bus octogonal */
export const BUS_APOTHEM = BUS_RADIUS * Math.cos(Math.PI / 8);

/** Ángulo (alrededor del eje Y) de la cara donde vive cada pantalla */
export const FACE = {
  timelapse: -Math.PI / 2,
  search: 0,
  spectral: Math.PI / 2,
} as const;

const facePoint = (angle: number, distance: number, y: number) =>
  new THREE.Vector3(Math.sin(angle) * distance, y, Math.cos(angle) * distance);

/* ---------- Estado compartido entre la UI HTML y la escena 3D ---------- */
export type TourControls = {
  /** Play/Pause del timelapse */
  playing: boolean;
  /** Tiempo acumulado del timelapse (solo avanza si playing) */
  tlTime: number;
  /** Longitud de onda seleccionada en µm (0.75 – 5) */
  wavelength: number;
};

export const WL_MIN = 0.75;
export const WL_MAX = 5;
export const CHANNELS = 102;

export const wavelengthToChannel = (wl: number) =>
  Math.round(((wl - WL_MIN) / (WL_MAX - WL_MIN)) * (CHANNELS - 1)) + 1;

/* ---------- Paradas de la cámara ---------- */
export type StopId = 'hero' | 'timelapse' | 'search' | 'spectral' | 'surprise';

export type CameraStop = {
  id: StopId;
  code: string;
  label: string;
  /** Lado donde va la tarjeta HTML en escritorio */
  align: 'left' | 'right';
  position: THREE.Vector3;
  target: THREE.Vector3;
  /** Desplazamiento lateral de la cámara (escritorio) para dejar sitio a la tarjeta */
  shiftX: number;
  /** Desplazamiento vertical de la cámara (móvil) para que el objeto quede arriba */
  shiftY: number;
};

export const STOPS: CameraStop[] = [
  {
    id: 'hero',
    code: '00',
    label: 'Inicio',
    align: 'left',
    position: new THREE.Vector3(6.5, 3.4, 9.5),
    target: new THREE.Vector3(0, 0.9, 0),
    shiftX: -2.6,
    shiftY: -1.4,
  },
  {
    id: 'timelapse',
    code: '01',
    label: 'Timelapse',
    align: 'left',
    position: facePoint(FACE.timelapse + 0.2, 3.6, 0.4),
    target: facePoint(FACE.timelapse, BUS_APOTHEM, 0.2),
    shiftX: -0.55,
    shiftY: -0.3,
  },
  {
    id: 'search',
    code: '02',
    label: 'Search',
    align: 'right',
    position: facePoint(FACE.search - 0.2, 3.6, 0.4),
    target: facePoint(FACE.search, BUS_APOTHEM, 0.15),
    shiftX: 0.55,
    shiftY: -0.3,
  },
  {
    id: 'spectral',
    code: '03',
    label: 'Spectral',
    align: 'left',
    position: facePoint(FACE.spectral + 0.2, 3.7, 0.15),
    target: facePoint(FACE.spectral, BUS_APOTHEM, 0.05),
    shiftX: -0.55,
    shiftY: -0.35,
  },
  {
    id: 'surprise',
    code: '04',
    label: 'Sorpresa',
    align: 'right',
    position: new THREE.Vector3(1.9, 5.4, 2.3),
    target: new THREE.Vector3(0, 1.8, 0),
    shiftX: 0.7,
    shiftY: -0.5,
  },
];
