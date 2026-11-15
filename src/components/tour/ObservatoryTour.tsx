import {
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
  type RefObject,
} from 'react';
import { useNavigate } from 'react-router';
import { Canvas } from '@react-three/fiber';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ChevronDown, Crosshair, Dices, Maximize2, MousePointerClick, Pause, Play } from 'lucide-react';

import { nearestChannel } from '../../api/spherex';

import SatelliteScene from './SatelliteScene';
import {
  CHANNELS,
  STOPS,
  WL_MAX,
  WL_MIN,
  wavelengthToChannel,
  type TourControls,
  type ZoomTarget,
} from './tourConfig';

gsap.registerPlugin(ScrollTrigger);

/** Altura de scroll por tramo entre paradas (en vh) */
const VH_PER_STOP = 110;

/** Duración del zoom hacia la pantalla antes de cambiar de página (ms) */
const ZOOM_DURATION = 1300;

/** Región de ejemplo con la que se abre el Spectral Explorer (galaxia de Andrómeda, M31) */
const SPECTRAL_EXAMPLE = { ra: 10.6847, dec: 41.26875, fov: 0.5 };

/** Ejemplo del módulo Search: Galaxia del Molinete (M101) */
const SEARCH_EXAMPLE = { ra: '210.80227', dec: '54.34895', fov: '0.1' };

type SearchCoords = { ra: string; dec: string };

/* ---------- media queries sin re-renders innecesarios ---------- */
function useMediaQuery(query: string) {
  return useSyncExternalStore(
    (cb) => {
      const mql = window.matchMedia(query);
      mql.addEventListener('change', cb);
      return () => mql.removeEventListener('change', cb);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}



export default function ObservatoryTour() {
  const sectionRef = useRef<HTMLElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef(0);
  const controlsRef = useRef<TourControls>({ playing: true, tlTime: 0, wavelength: 2.2 });
  const [active, setActive] = useState(0);
  const navigate = useNavigate();
  const zoomRef = useRef<ZoomTarget | null>(null);
  /** Coordenadas escritas en la tarjeta Search (se usan al entrar por la pantalla o el botón) */
  const searchRef = useRef<SearchCoords>({ ra: SEARCH_EXAMPLE.ra, dec: SEARCH_EXAMPLE.dec });
  const leaveTimer = useRef<number | undefined>(undefined);
  const [leaving, setLeaving] = useState(false);

  const isMobile = useMediaQuery('(max-width: 767px)');
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const last = STOPS.length - 1;
    const proxy = { p: 0 };

    const ctx = gsap.context(() => {
      gsap.to(proxy, {
        p: 1,
        ease: 'none',
        scrollTrigger: {
          trigger: section,
          start: 'top top',
          end: 'bottom bottom',
          scrub: reducedMotion ? true : 1.2,
          snap: {
            snapTo: 1 / last,
            inertia: false, // va a la parada más cercana, sin saltarse varias
            duration: { min: 0.3, max: 0.9 },
            delay: 0.12,
            ease: 'power2.inOut',
          },
        },
        onUpdate: () => {
          progressRef.current = proxy.p;
          setActive(Math.round(proxy.p * last));
          if (barRef.current) barRef.current.style.transform = `scaleX(${proxy.p})`;
        },
      });
    }, section);

    return () => ctx.revert();
  }, [reducedMotion]);

  const goTo = (i: number) => {
    const section = sectionRef.current;
    if (!section) return;
    const top = section.getBoundingClientRect().top + window.scrollY;
    const distance = section.offsetHeight - window.innerHeight;
    window.scrollTo({
      top: top + distance * (i / (STOPS.length - 1)),
      behavior: reducedMotion ? 'auto' : 'smooth',
    });
  };

  /** Zoom de la cámara hacia una pantalla y cambio a su página */
  const openScreen = useCallback(
    (target: ZoomTarget) => {
      if (zoomRef.current) return;
      // la página Spectral se abre en el canal elegido en el slider del tour
      let route = '/timelapse';
      if (target === 'spectral') {
        route = `/spectral?ra=${SPECTRAL_EXAMPLE.ra}&dec=${SPECTRAL_EXAMPLE.dec}&fov=${SPECTRAL_EXAMPLE.fov}&ch=${
          nearestChannel(controlsRef.current.wavelength) + 1
        }`;
      } else if (target === 'search') {
        const { ra, dec } = searchRef.current;
        const params = new URLSearchParams({
          ra: ra.trim() || SEARCH_EXAMPLE.ra,
          dec: dec.trim() || SEARCH_EXAMPLE.dec,
          fov: SEARCH_EXAMPLE.fov,
        });
        route = `/search?${params}`;
      }
      zoomRef.current = target;
      setLeaving(true);
      leaveTimer.current = window.setTimeout(
        () => {
          window.scrollTo(0, 0);
          navigate(route);
        },
        reducedMotion ? 150 : ZOOM_DURATION,
      );
    },
    [navigate, reducedMotion],
  );

  useEffect(() => () => window.clearTimeout(leaveTimer.current), []);

  const shown = leaving ? -1 : active;



  return (
    <section
      ref={sectionRef}
      aria-label="Tour de bienvenida del Observatorio EON"
      className="bg-nasa relative"
      style={{ height: `${(STOPS.length - 1) * VH_PER_STOP + 100}vh` }}
    >
      <div className="sticky top-0 h-screen w-full overflow-hidden">
        {/* ---------- Escena 3D ---------- */}
        <Canvas
          className="!absolute inset-0"
          dpr={[1, 1.75]}
          camera={{ fov: 40, near: 0.1, far: 200, position: [6.5, 3.4, 9.5] }}
          gl={{ antialias: true, powerPreference: 'high-performance' }}
        >
          <Suspense fallback={null}>
            <SatelliteScene
              progressRef={progressRef}
              controlsRef={controlsRef}
              isMobile={isMobile}
              reducedMotion={reducedMotion}
              zoomRef={zoomRef}
              onOpenScreen={openScreen}
            />
          </Suspense>
        </Canvas>

        {/* fundidos con el resto de la página */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-[#05070f] to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#05070f] to-transparent" />

        {/* ---------- Navegación de paradas ---------- */}
        <div
          className={`pointer-events-none absolute inset-x-0 top-20 z-20 flex justify-center px-4 transition-opacity duration-500 ${
            leaving ? 'opacity-0' : ''
          }`}
        >
        <nav
          aria-label="Paradas del tour"
          className="liquid-glass pointer-events-auto flex items-center gap-1 rounded-full px-2 py-1.5"
        >
          {STOPS.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => goTo(i)}
              aria-current={active === i ? 'step' : undefined}
              className={`font-display flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium tabular-nums transition ${
                active === i ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>{s.code}</span>
              <span className="hidden lg:inline">{s.label}</span>
            </button>
          ))}
        </nav>
        </div>

        {/* ---------- Contenido HTML por parada ---------- */}
        <Stop index={0} active={shown}>
          <HeroContent onStart={() => goTo(1)} />
        </Stop>

        <Stop index={1} active={shown}>
          <HudCard code="01" label="Timelapse" title="El cielo a través del tiempo">
            <TimelapseContent controlsRef={controlsRef} onOpen={() => openScreen('timelapse')} />
          </HudCard>
        </Stop>

        <Stop index={2} active={shown}>
          <HudCard code="02" label="Search" title="Busca un punto de interés">
            <SearchContent searchRef={searchRef} onOpen={() => openScreen('search')} />
          </HudCard>
        </Stop>

        <Stop index={3} active={shown}>
          <HudCard code="03" label="Spectral Explorer" title="Los 102 canales de SPHEREx">
            <SpectralContent controlsRef={controlsRef} onOpen={() => openScreen('spectral')} />
          </HudCard>
        </Stop>

       

        {/* ---------- Lectura de telemetría + progreso ---------- */}
        <div className="pointer-events-none absolute bottom-5 left-5 z-20 hidden text-xs font-medium uppercase tracking-[0.35em] text-slate-500 md:block">
          CAM · STOP {STOPS[active].code}/{STOPS[STOPS.length - 1].code} · {STOPS[active].label}
        </div>
        <div className="absolute inset-x-0 bottom-0 z-20 h-px bg-white/10">
          <div ref={barRef} className="h-px origin-left scale-x-0 bg-sky-400" />
        </div>

        {/* ---------- Fundido al "entrar" en la pantalla del timelapse ---------- */}
        <div
          aria-hidden
          className={`pointer-events-none absolute inset-0 z-40 transition-opacity ease-in ${
            leaving ? 'opacity-100 delay-700 duration-500' : 'opacity-0 duration-300'
          }`}
          style={{ background: 'radial-gradient(circle at 50% 50%, #0a1230 0%, #05070f 75%)' }}
        />
      </div>
    </section>
  );
}

/* =========================================================
   Contenedor de cada parada (posición + transición)
   ========================================================= */
function Stop({ index, active, children }: { index: number; active: number; children: ReactNode }) {
  const visible = index === active;
  const align = STOPS[index].align === 'right' ? 'md:justify-end' : 'md:justify-start';

  return (
    <div
      aria-hidden={!visible}
      className={`pointer-events-none absolute inset-0 z-10 flex items-end px-4 pb-10 pt-32 md:items-center md:px-12 md:pb-12 lg:px-20 ${align}`}
    >
      <div
        className={`w-full transition-all duration-700 ease-out md:max-w-md ${
          visible
            ? 'pointer-events-auto translate-y-0 opacity-100 blur-0'
            : 'translate-y-6 opacity-0 blur-sm'
        }`}
      >
        {children}
      </div>
    </div>
  );
}

/* =========================================================
   Tarjeta HUD
   ========================================================= */
function HudCard({
  code,
  label,
  title,
  children,
}: {
  code: string;
  label: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="liquid-glass liquid-glass-dark rounded-3xl p-6 md:p-8">
      {/* velo oscuro para que el texto se lea aunque detrás haya metal brillante */}
      <div className="pointer-events-none absolute inset-0 -z-10 rounded-[inherit] bg-[#05070f]/45" />
      <div className="mb-4 flex items-center justify-between gap-4">
        
      </div>

      <h3 className="font-display text-2xl font-semibold text-white md:text-3xl">{title}</h3>
      <div className="mt-3 space-y-4 text-sm leading-6 text-slate-300">{children}</div>
    </div>
  );
}

/* =========================================================
   Contenido de cada parada
   ========================================================= */
function HeroContent({ onStart }: { onStart: () => void }) {
  return (
    <div className="md:max-w-xl">
      
      <h1 className="font-display mt-0 text-4xl font-bold leading-[1.05] tracking-tight text-white md:text-6xl">
        Descubriendo
        <span className="block bg-gradient-to-r from-sky-300 via-blue-400 to-violet-400 bg-clip-text text-transparent">
          más allá del cosmos
        </span>
      </h1>
      <p className="mt-5 max-w-md text-base leading-7 text-slate-300">
        Recorre el panel de control del satélite. Cada pantalla es un módulo del observatorio:
        desliza hacia abajo y descúbrelos paso a paso.
      </p>
      <button
        type="button"
        onClick={onStart}
        className="mt-8 inline-flex items-center gap-3 rounded-full bg-sky-500 py-2 pl-2 pr-5 text-sm font-semibold text-slate-950 transition hover:bg-sky-400"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-950/15">
          <ChevronDown size={16} className="animate-bounce" />
        </span>
        Comenzar recorrido
      </button>
    </div>
  );
}

/** Gráfico: 5 fotogramas del mismo trozo de cielo con un objeto que se desplaza */
function FilmStrip() {
  const frames = ['May', 'Jul', 'Sep', 'Nov', 'Ene'];
  const stars = [
    [10, 12], [34, 9], [44, 30], [16, 38], [28, 22], [40, 44], [8, 26],
  ];
  return (
    <svg viewBox="0 0 300 74" className="w-full" role="img" aria-label="Cinco fotogramas en los que un objeto se desplaza">
      <defs>
        <linearGradient id="tl-strip" x1="0" x2="1">
          <stop offset="0%" stopColor="#a78bfa" />
          <stop offset="100%" stopColor="#38bdf8" />
        </linearGradient>
      </defs>
      {/* trayectoria del objeto a través de los fotogramas */}
      <path d="M18 44 L 286 16" stroke="url(#tl-strip)" strokeWidth="1" strokeDasharray="3 4" opacity="0.6" />
      {frames.map((label, i) => {
        const x = 4 + i * 59;
        const t = i / (frames.length - 1);
        return (
          <g key={label} transform={`translate(${x} 4)`}>
            <rect width="52" height="52" rx="8" fill="#0a1230" stroke="rgba(255,255,255,0.12)" />
            {stars.map(([sx, sy], k) => (
              <circle key={k} cx={sx} cy={sy} r={k % 3 === 0 ? 1.4 : 0.9} fill="#e2e8f0" opacity={0.7} />
            ))}
            {/* objeto en movimiento */}
            <circle cx={12 + t * 30} cy={40 - t * 24} r="5" fill="#7dd3fc" opacity="0.25" />
            <circle cx={12 + t * 30} cy={40 - t * 24} r="2.2" fill="#ffffff" />
            <text x="26" y="66" textAnchor="middle" className="fill-slate-500 text-[9px]">
              {label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function TimelapseContent({
  controlsRef,
  onOpen,
}: {
  controlsRef: RefObject<TourControls>;
  onOpen: () => void;
}) {
  const [playing, setPlaying] = useState(true);

  const toggle = () => {
    const next = !playing;
    setPlaying(next);
    controlsRef.current.playing = next;
  };

  return (
    <>
      <p>
        Une las imágenes de un mismo trozo de cielo tomadas en fechas distintas y las reproduce como
        un vídeo: lo que se desplaza o cambia de brillo puede ser un asteroide, un cometa o una
        estrella variable.
      </p>

      <div className="hidden rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 sm:block">
        <FilmStrip />
      </div>

      <div className="flex flex-wrap items-center gap-3 pt-1">
        <button
          type="button"
          onClick={onOpen}
          className="inline-flex items-center gap-2 rounded-full bg-sky-500 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-sky-400"
        >
          <Maximize2 size={16} />
          Abrir Timelapse
        </button>
        <button
          type="button"
          onClick={toggle}
          aria-label={playing ? 'Pausar la pantalla del satélite' : 'Reproducir la pantalla del satélite'}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 text-slate-300 transition hover:border-white/40 hover:text-white"
        >
          {playing ? <Pause size={16} /> : <Play size={16} className="translate-x-px" />}
        </button>
      </div>

      <p className="flex items-center gap-2 text-xs text-slate-500">
        <MousePointerClick size={14} /> También puedes hacer clic en la pantalla del satélite.
      </p>
    </>
  );
}

function SearchContent({
  searchRef,
  onOpen,
}: {
  searchRef: RefObject<SearchCoords>;
  onOpen: () => void;
}) {
  const [ra, setRa] = useState('');
  const [dec, setDec] = useState('');
  const field =
    'font-display mt-1.5 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm tabular-nums text-white placeholder:text-slate-500 focus:border-sky-400 focus:outline-none';

  const update = (next: SearchCoords) => {
    setRa(next.ra);
    setDec(next.dec);
    searchRef.current = next;
  };

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        onOpen();
      }}
    >
      <p>
        Cada punto del cielo tiene una "dirección", igual que la latitud y longitud en la Tierra.
        Escríbela y la cámara viaja hasta esa región.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-xs font-medium uppercase tracking-[0.25em] text-sky-300">
            RA · Ascensión recta
          </span>
          <input
            className={field}
            inputMode="decimal"
            placeholder="210.80227°"
            value={ra}
            onChange={(e) => update({ ra: e.target.value, dec })}
          />
          <span className="mt-1.5 block text-xs leading-5 text-slate-400">
            Como la longitud: de 0° a 360° hacia el este.
          </span>
        </label>

        <label className="block">
          <span className="text-xs font-medium uppercase tracking-[0.25em] text-sky-300">
            Dec · Declinación
          </span>
          <input
            className={field}
            inputMode="decimal"
            placeholder="54.34895°"
            value={dec}
            onChange={(e) => update({ ra, dec: e.target.value })}
          />
          <span className="mt-1.5 block text-xs leading-5 text-slate-400">
            Como la latitud: de −90° a +90° desde el ecuador celeste.
          </span>
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          className="inline-flex items-center gap-2 rounded-full bg-sky-500 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-sky-400"
        >
          <Maximize2 size={16} />
          Buscar
        </button>
        <button
          type="button"
          onClick={() => update({ ra: SEARCH_EXAMPLE.ra, dec: SEARCH_EXAMPLE.dec })}
          className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/10"
        >
          <Crosshair size={14} /> Ejemplo: M101
        </button>
      </div>

      <p className="flex items-center gap-2 text-xs text-slate-500">
        <MousePointerClick size={14} /> También puedes hacer clic en la pantalla del satélite.
      </p>
    </form>
  );
}

function SpectralContent({
  controlsRef,
  onOpen,
}: {
  controlsRef: RefObject<TourControls>;
  onOpen: () => void;
}) {
  const [wl, setWl] = useState(2.2);
  const channel = wavelengthToChannel(wl);

  return (
    <>
      <p>
        SPHEREx no toma una sola foto: divide la luz infrarroja en {CHANNELS} canales, de{' '}
        {WL_MIN} µm a {WL_MAX} µm. Cada canal revela algo distinto, como hielo de agua, polvo o
        galaxias lejanas.
      </p>

      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
        <div className="mb-3 flex items-baseline justify-between gap-3 text-xs">
          <span className="font-medium uppercase tracking-[0.25em] text-slate-400">Longitud de onda</span>
          <span className="font-display tabular-nums text-sky-300">
            λ {wl.toFixed(2)} µm · CH {String(channel).padStart(3, '0')}
          </span>
        </div>

        <div className="mb-2 h-2 rounded-full bg-gradient-to-r from-violet-400 via-blue-500 to-sky-300" />
        <input
          type="range"
          min={WL_MIN}
          max={WL_MAX}
          step={0.01}
          value={wl}
          onChange={(e) => {
            const v = Number(e.target.value);
            setWl(v);
            controlsRef.current.wavelength = v;
          }}
          aria-label="Longitud de onda en micrómetros"
          className="w-full cursor-pointer accent-sky-400"
        />
        <div className="font-display mt-1 flex justify-between text-xs tabular-nums text-slate-500">
          <span>0.75 µm</span>
          <span>5 µm</span>
        </div>
      </div>

      <button
        type="button"
        onClick={onOpen}
        className="inline-flex items-center gap-2 rounded-full bg-sky-500 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-sky-400"
      >
        <Maximize2 size={16} />
        Abrir Spectral Explorer
      </button>

      <p className="flex items-center gap-2 text-xs text-slate-500">
        <MousePointerClick size={14} /> Mueve el control (las perillas responden) o haz clic en la
        pantalla del satélite.
      </p>
    </>
  );
}

