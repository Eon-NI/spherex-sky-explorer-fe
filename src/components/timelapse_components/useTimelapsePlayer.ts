import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Motor del timelapse.
 * La posición es un número decimal (ej. 3.4 = 40 % del camino entre el frame 3 y el 4),
 * así el visor puede hacer un fundido continuo entre imágenes, casi como un vídeo.
 */
export function useTimelapsePlayer(count: number) {
  const posRef = useRef(0);
  const targetRef = useRef<number | null>(null);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [fps, setFps] = useState(2);
  const [loop, setLoop] = useState(true);

  const playingRef = useRef(playing);
  const fpsRef = useRef(fps);
  const loopRef = useRef(loop);
  useEffect(() => {
    playingRef.current = playing;
    fpsRef.current = fps;
    loopRef.current = loop;
  }, [playing, fps, loop]);

  useEffect(() => {
    posRef.current = 0;
    targetRef.current = null;
    if (count === 0) return;

    let raf = 0;
    let last = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      let p = posRef.current;
      const target = targetRef.current;

      if (target !== null) {
        // salto manual: se desliza suavemente hasta el frame pedido
        const diff = target - p;
        p += diff * (1 - Math.exp(-9 * dt));
        if (Math.abs(diff) < 0.003) {
          p = target;
          targetRef.current = null;
        }
      } else if (playingRef.current) {
        p += dt * fpsRef.current;
        if (loopRef.current) {
          if (p >= count) p -= count; // el último frame se funde con el primero
        } else if (p >= count - 1) {
          p = count - 1;
          setPlaying(false);
        }
      }

      posRef.current = p;
      const i = Math.round(p) % count;
      setIndex((prev) => (prev === i ? prev : i));
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [count]);

  /** Va a un frame con transición suave */
  const goTo = useCallback(
    (i: number) => {
      if (count === 0) return;
      setPlaying(false);
      targetRef.current = Math.max(0, Math.min(count - 1, i));
    },
    [count],
  );

  /** Coloca un frame al instante (sin animación), ej. al abrir un enlace compartido */
  const jumpTo = useCallback(
    (i: number) => {
      if (count === 0) return;
      targetRef.current = null;
      posRef.current = Math.max(0, Math.min(count - 1, i));
    },
    [count],
  );

  return {
    posRef,
    index,
    playing,
    fps,
    loop,
    setFps,
    setLoop,
    play: () => {
      if (count === 0) return;
      targetRef.current = null;
      if (!loopRef.current && posRef.current >= count - 1) posRef.current = 0;
      setPlaying(true);
    },
    pause: () => setPlaying(false),
    stop: () => {
      setPlaying(false);
      targetRef.current = 0;
    },
    prev: () => goTo(Math.round(posRef.current) - 1),
    next: () => goTo(Math.round(posRef.current) + 1),
    goTo,
    jumpTo,
  };
}
