import { Activity, FileText, MapPin, Share2 } from 'lucide-react';
import type { PointAction } from './types';

/** Acciones disponibles al hacer clic en un punto (los textos están en el JSON: modules.point.<id>) */
export const ACTIONS: { id: PointAction; icon: typeof MapPin }[] = [
  { id: 'coordinates', icon: MapPin },
  { id: 'spectrum', icon: Activity },
  { id: 'metadata', icon: FileText },
  { id: 'share', icon: Share2 },
];
