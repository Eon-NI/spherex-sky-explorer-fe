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
import { ChevronDown, Crosshair, Maximize2, MousePointerClick, Pause, Play } from 'lucide-react';

import { nearestChannel } from '../../api/spherex';
import { useI18n } from '../../i18n/useI18n';
import { fmt } from '../../i18n/format';

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

/* =========================================================
   Componente principal
   ========================================================= */
export default function ObservatoryTour() {
  const { m } = useI18n();
  const tt = m.observatory.tour;
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
      aria-label={tt.aria}
      className="bg-night relative"
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
        <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-night to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-night to-transparent" />

        {/* ---------- Navegación de paradas ---------- */}
        <div
          className={`pointer-events-none absolute inset-x-0 top-20 z-20 flex justify-center px-4 transition-opacity duration-500 ${
            leaving ? 'opacity-0' : ''
          }`}
        >
        <nav
          aria-label={tt.stopsNav}
          className="pointer-events-auto flex items-center gap-1 rounded-full border border-paper/15 bg-night/70 p-1.5 shadow-[0_12px_40px_-12px_rgba(0,0,0,0.7)] backdrop-blur-md md:gap-1.5 md:p-2"
        >
          {STOPS.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => goTo(i)}
              aria-current={active === i ? 'step' : undefined}
              aria-label={`${s.code} ${tt.stops[s.id]}`}
              className={`flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition-colors md:px-5 md:py-3 md:text-base ${
                active === i ? 'bg-star text-night' : 'text-mist hover:bg-paper/10 hover:text-paper'
              }`}
            >
              <span className="font-hud tabular-nums">{s.code}</span>
              <span className="hidden sm:inline">{tt.stops[s.id]}</span>
            </button>
          ))}
        </nav>
        </div>

        {/* ---------- Contenido HTML por parada ---------- */}
        <Stop index={0} active={shown}>
          <HeroContent onStart={() => goTo(1)} />
        </Stop>

        <Stop index={1} active={shown}>
          <HudCard code="01" label={tt.timelapse.label} title={tt.timelapse.title} activeLabel={tt.active}>
            <TimelapseContent controlsRef={controlsRef} onOpen={() => openScreen('timelapse')} />
          </HudCard>
        </Stop>

        <Stop index={2} active={shown}>
          <HudCard code="02" label={tt.search.label} title={tt.search.title} activeLabel={tt.active}>
            <SearchContent searchRef={searchRef} onOpen={() => openScreen('search')} />
          </HudCard>
        </Stop>

        <Stop index={3} active={shown}>
          <HudCard code="03" label={tt.spectral.label} title={tt.spectral.title} activeLabel={tt.active}>
            <SpectralContent controlsRef={controlsRef} onOpen={() => openScreen('spectral')} />
          </HudCard>
        </Stop>

        {/* ---------- Lectura de telemetría + progreso ---------- */}
        <div className="pointer-events-none absolute bottom-5 left-5 z-20 hidden text-xs font-medium uppercase tracking-[0.35em] text-mist/70 md:block">
          CAM · STOP {STOPS[active].code}/{STOPS[STOPS.length - 1].code} · {tt.stops[STOPS[active].id]}
        </div>
        <div className="absolute inset-x-0 bottom-0 z-20 h-px bg-white/10">
          <div ref={barRef} className="h-px origin-left scale-x-0 bg-star" />
        </div>

        {/* ---------- Fundido al "entrar" en la pantalla del timelapse ---------- */}
        <div
          aria-hidden
          className={`pointer-events-none absolute inset-0 z-40 transition-opacity ease-in ${
            leaving ? 'opacity-100 delay-700 duration-500' : 'opacity-0 duration-300'
          }`}
          style={{ background: 'radial-gradient(circle at 50% 50%, var(--color-night-soft) 0%, var(--color-night) 75%)' }}
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

  title,
  activeLabel,
  children,
}: {
  
  title: string;
  activeLabel: string;
  children: ReactNode;
}) {
  return (
    <div className="liquid-glass liquid-glass-dark rounded-3xl p-6 md:p-8">
      {/* velo oscuro para que el texto se lea aunque detrás haya metal brillante */}
      <div className="pointer-events-none absolute inset-0 -z-10 rounded-[inherit] bg-night/45" />
      <div className="mb-4 flex items-center justify-between gap-4">
       
       
      </div>

      <h3 className="text-2xl font-semibold text-paper md:text-3xl">{title}</h3>
      <div className="mt-3 space-y-4 text-sm leading-6 text-paper/80">{children}</div>
    </div>
  );
}

/* =========================================================
   Contenido de cada parada
   ========================================================= */
function HeroContent({ onStart }: { onStart: () => void }) {
  const { m } = useI18n();
  const h = m.observatory.tour.hero;
  return (
    <div className="md:max-w-xl">
      <span className="text-xs font-medium uppercase tracking-[0.35em] text-star">
        {h.eyebrow}
      </span>
      <h1 className="mt-4 text-4xl font-bold leading-[1.05] tracking-tight text-paper md:text-6xl">
        {h.titleA}
        <span className="block text-star">
          {h.titleB}
        </span>
      </h1>
      <p className="mt-5 max-w-md text-base leading-7 text-paper/80">
        {h.text}
      </p>
      <button
        type="button"
        onClick={onStart}
        className="mt-8 inline-flex items-center gap-3 rounded-full bg-star py-2 pl-2 pr-5 text-sm font-semibold text-night transition hover:bg-star-hover"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-night/15">
          <ChevronDown size={16} className="animate-bounce" />
        </span>
        {h.start}
      </button>
    </div>
  );
}

/** Gráfico: 5 fotogramas del mismo trozo de cielo con un objeto que se desplaza */
function FilmStrip() {
  const { m } = useI18n();
  const frames = m.observatory.tour.timelapse.months;
  const stars = [
    [10, 12], [34, 9], [44, 30], [16, 38], [28, 22], [40, 44], [8, 26],
  ];
  return (
    <svg viewBox="0 0 300 74" className="w-full" role="img" aria-label={m.observatory.tour.timelapse.filmStripAria}>
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
          <g key={i} transform={`translate(${x} 4)`}>
            <rect width="52" height="52" rx="8" fill="#0a1230" stroke="rgba(255,255,255,0.12)" />
            {stars.map(([sx, sy], k) => (
              <circle key={k} cx={sx} cy={sy} r={k % 3 === 0 ? 1.4 : 0.9} fill="#e2e8f0" opacity={0.7} />
            ))}
            {/* objeto en movimiento */}
            <circle cx={12 + t * 30} cy={40 - t * 24} r="5" fill="#7dd3fc" opacity="0.25" />
            <circle cx={12 + t * 30} cy={40 - t * 24} r="2.2" fill="#ffffff" />
            <text x="26" y="66" textAnchor="middle" className="fill-mist text-[9px]">
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
  const { m } = useI18n();
  const tl = m.observatory.tour.timelapse;

  const toggle = () => {
    const next = !playing;
    setPlaying(next);
    controlsRef.current.playing = next;
  };

  return (
    <>
      <p>
        {tl.text}
      </p>

      <div className="hidden rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 sm:block">
        <FilmStrip />
      </div>

      <div className="flex flex-wrap items-center gap-3 pt-1">
        <button
          type="button"
          onClick={onOpen}
          className="inline-flex items-center gap-2 rounded-full bg-star px-5 py-2.5 text-sm font-semibold text-night transition hover:bg-star-hover"
        >
          <Maximize2 size={16} />
          {tl.open}
        </button>
        <button
          type="button"
          onClick={toggle}
          aria-label={playing ? tl.pause : tl.play}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 text-paper/80 transition hover:border-white/40 hover:text-paper"
        >
          {playing ? <Pause size={16} /> : <Play size={16} className="translate-x-px" />}
        </button>
      </div>

      <p className="flex items-center gap-2 text-xs text-mist/70">
        <MousePointerClick size={14} /> {tl.hint}
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
  const { m } = useI18n();
  const sc = m.observatory.tour.search;
  const [ra, setRa] = useState('');
  const [dec, setDec] = useState('');
  const field =
    'font-hud mt-1.5 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm tabular-nums text-paper placeholder:text-mist/70 focus:border-star focus:outline-none';

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
        {sc.text}
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-xs font-medium uppercase tracking-[0.25em] text-mist">
            {sc.ra}
          </span>
          <input
            className={field}
            inputMode="decimal"
            placeholder="210.80227°"
            value={ra}
            onChange={(e) => update({ ra: e.target.value, dec })}
          />
          <span className="mt-1.5 block text-xs leading-5 text-mist">
            {sc.raHelp}
          </span>
        </label>

        <label className="block">
          <span className="text-xs font-medium uppercase tracking-[0.25em] text-mist">
            {sc.dec}
          </span>
          <input
            className={field}
            inputMode="decimal"
            placeholder="54.34895°"
            value={dec}
            onChange={(e) => update({ ra, dec: e.target.value })}
          />
          <span className="mt-1.5 block text-xs leading-5 text-mist">
            {sc.decHelp}
          </span>
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          className="inline-flex items-center gap-2 rounded-full bg-star px-5 py-2.5 text-sm font-semibold text-night transition hover:bg-star-hover"
        >
          <Maximize2 size={16} />
          {sc.submit}
        </button>
        <button
          type="button"
          onClick={() => update({ ra: SEARCH_EXAMPLE.ra, dec: SEARCH_EXAMPLE.dec })}
          className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-2 text-sm font-medium text-paper/90 transition hover:bg-white/10"
        >
          <Crosshair size={14} /> {sc.example}
        </button>
      </div>

      <p className="flex items-center gap-2 text-xs text-mist/70">
        <MousePointerClick size={14} /> {sc.hint}
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
  const { m } = useI18n();
  const sp = m.observatory.tour.spectral;
  const [wl, setWl] = useState(2.2);
  const channel = wavelengthToChannel(wl);

  return (
    <>
      <p>
        {fmt(sp.text, { channels: CHANNELS, min: WL_MIN, max: WL_MAX })}
      </p>

      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
        <div className="mb-3 flex items-baseline justify-between gap-3 text-xs">
          <span className="font-medium uppercase tracking-[0.25em] text-mist">{sp.wavelength}</span>
          <span className="font-hud tabular-nums text-star">
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
          aria-label={sp.sliderAria}
          className="w-full cursor-pointer accent-star"
        />
        <div className="font-hud mt-1 flex justify-between text-xs tabular-nums text-mist/70">
          <span>0.75 µm</span>
          <span>5 µm</span>
        </div>
      </div>

      <button
        type="button"
        onClick={onOpen}
        className="inline-flex items-center gap-2 rounded-full bg-star px-5 py-2.5 text-sm font-semibold text-night transition hover:bg-star-hover"
      >
        <Maximize2 size={16} />
        {sp.open}
      </button>

      <p className="flex items-center gap-2 text-xs text-mist/70">
        <MousePointerClick size={14} /> {sp.hint}
      </p>
    </>
  );
}
