import { useEffect, useState } from 'react';

type PreloadState = {
  urls: string[];
  images: HTMLImageElement[];
  loaded: number;
  error?: string;
};

/**
 * Descarga y decodifica todas las imágenes antes de reproducir,
 * para que el timelapse no se trabe a mitad de la animación.
 */
export function useFramePreloader(urls: string[], crossOrigin?: 'anonymous') {
  const [state, setState] = useState<PreloadState>({ urls: [], images: [], loaded: 0 });

  useEffect(() => {
    if (urls.length === 0) return;
    let cancelled = false;
    let loaded = 0;

    Promise.all(
      urls.map(
        (src) =>
          new Promise<HTMLImageElement>((resolve, reject) => {
            const img = new Image();
            // necesario para leer píxeles (diferencia/apilado) de imágenes de otro dominio
            if (crossOrigin) img.crossOrigin = crossOrigin;
            img.decoding = 'async';
            img.onload = () => {
              img
                .decode()
                .catch(() => undefined)
                .finally(() => {
                  loaded += 1;
                  if (!cancelled) setState({ urls, images: [], loaded });
                  resolve(img);
                });
            };
            img.onerror = () => reject(new Error('No se pudo cargar una de las imágenes.'));
            img.src = src;
          }),
      ),
    )
      .then((images) => {
        if (!cancelled) setState({ urls, images, loaded: images.length });
      })
      .catch((e: Error) => {
        if (!cancelled) setState({ urls, images: [], loaded, error: e.message });
      });

    return () => {
      cancelled = true;
    };
  }, [urls, crossOrigin]);

  // Si el estado pertenece a otra búsqueda, aún estamos cargando
  const current = state.urls === urls;
  return {
    images: current ? state.images : [],
    loaded: current ? state.loaded : 0,
    total: urls.length,
    loading: urls.length > 0 && (!current || (state.images.length === 0 && !state.error)),
    error: current ? state.error : undefined,
  };
}
