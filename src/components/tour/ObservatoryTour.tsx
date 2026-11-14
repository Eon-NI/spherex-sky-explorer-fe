import { Suspense, useEffect, useRef, useState, useSyncExternalStore, type ReactNode, type RefObject } from 'react';
import { Canvas } from '@react-three/fiber';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  ChevronDown,
  Crosshair,
  Dices,
  Pause,
  Play,
  SkipBack,
  SkipForward,
} from 'lucide-react';

import SatelliteScene from './SatelliteScene';
import {
  CHANNELS,
  STOPS,
  WL_MAX,
  WL_MIN,
  wavelengthToChannel,
  type TourControls,
} from './tourConfig';

gsap.registerPlugin(ScrollTrigger);

/** Altura de scroll por tramo entre paradas (en vh) */
const VH_PER_STOP = 110;

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
type ObservatoryTourProps = {
  /** Qué hacer al pulsar "Ir a un lugar al azar". Por defecto navega a #sorpresa */
  onSurprise?: () => void;
};

export default function ObservatoryTour({ onSurprise }: ObservatoryTourProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef(0);
  const controls = useRef<TourControls>({ playing: true, tlTime: 0, wavelength: 2.2 });
  const [active, setActive] = useState(0);

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

  const handleSurprise = () => {
    if (onSurprise) onSurprise();
    else window.location.hash = 'sorpresa';
  };

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
              controls={controls}
              isMobile={isMobile}
              reducedMotion={reducedMotion}
            />
          </Suspense>
        </Canvas>

        {/* fundidos con el resto de la página */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-[#05070f] to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#05070f] to-transparent" />

        {/* ---------- Navegación de paradas ---------- */}
        <div className="absolute inset-x-0 top-20 z-20 flex justify-center px-4">
        <nav
          aria-label="Paradas del tour"
          className="liquid-glass flex items-center gap-1 rounded-full px-2 py-1.5"
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
        <Stop index={0} active={active}>
          <HeroContent onStart={() => goTo(1)} />
        </Stop>

        <Stop index={1} active={active}>
          <HudCard code="01" label="Timelapse" title="El cielo a través del tiempo">
            <TimelapseContent controls={controls} />
          </HudCard>
        </Stop>

        <Stop index={2} active={active}>
          <HudCard code="02" label="Search" title="Busca un punto de interés">
            <SearchContent />
          </HudCard>
        </Stop>

        <Stop index={3} active={active}>
          <HudCard code="03" label="Spectral Explorer" title="Los 102 canales de SPHEREx">
            <SpectralContent controls={controls} />
          </HudCard>
        </Stop>

        <Stop index={4} active={active}>
          <HudCard code="04" label="Discovery" title="Descubre lugares asombrosos">
            <SurpriseContent onSurprise={handleSurprise} />
          </HudCard>
        </Stop>

        {/* ---------- Lectura de telemetría + progreso ---------- */}
        <div className="pointer-events-none absolute bottom-5 left-5 z-20 hidden text-xs font-medium uppercase tracking-[0.35em] text-slate-500 md:block">
          CAM · STOP {STOPS[active].code}/{STOPS[STOPS.length - 1].code} · {STOPS[active].label}
        </div>
        <div className="absolute inset-x-0 bottom-0 z-20 h-px bg-white/10">
          <div ref={barRef} className="h-px origin-left scale-x-0 bg-sky-400" />
        </div>
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
        <span className="text-xs font-medium uppercase tracking-[0.35em] text-sky-400">
          {code} · {label}
        </span>
        <span className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
          </span>
          Activo
        </span>
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
      <span className="text-xs font-medium uppercase tracking-[0.35em] text-sky-400">
        Observatorio EON · Tour de bienvenida
      </span>
      <h1 className="font-display mt-4 text-4xl font-bold leading-[1.05] tracking-tight text-white md:text-6xl">
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

function TimelapseContent({ controls }: { controls: RefObject<TourControls> }) {
  const [playing, setPlaying] = useState(true);

  const toggle = () => {
    const next = !playing;
    setPlaying(next);
    controls.current.playing = next;
  };

  const ctrlBtn =
    'flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-slate-300 transition hover:border-white/40 hover:text-white';

  return (
    <>
      <p>
        Une cientos de imágenes del mismo trozo de cielo tomadas en fechas distintas y las
        reproduce como un vídeo. Así ves cómo se mueven las estrellas, cometas y asteroides a lo
        largo de los años.
      </p>

      {/* placeholder de ejemplo */}
      <div className="bg-nasa relative hidden aspect-video overflow-hidden rounded-2xl ring-1 ring-white/10 sm:block">
        <span className="absolute left-4 top-3 text-[11px] font-medium uppercase tracking-[0.3em] text-sky-300">
          Vista previa
        </span>
        <span className="font-display absolute bottom-3 right-4 text-xs tabular-nums text-slate-400">
          FRAME 042/120
        </span>
      </div>

      <div className="flex items-center gap-3">
        <button type="button" className={ctrlBtn} aria-label="Frame anterior">
          <SkipBack size={15} />
        </button>
        <button
          type="button"
          onClick={toggle}
          aria-label={playing ? 'Pausar' : 'Reproducir'}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-sky-500 text-slate-950 transition hover:bg-sky-400"
        >
          {playing ? <Pause size={18} /> : <Play size={18} className="translate-x-px" />}
        </button>
        <button type="button" className={ctrlBtn} aria-label="Frame siguiente">
          <SkipForward size={15} />
        </button>

        <div className="ml-2 flex-1">
          <div className="h-1 overflow-hidden rounded-full bg-white/10">
            <div className="h-full w-1/3 rounded-full bg-gradient-to-r from-sky-400 to-violet-400" />
          </div>
          <div className="font-display mt-1.5 flex justify-between text-xs tabular-nums text-slate-500">
            <span>2010</span>
            <span>2026</span>
          </div>
        </div>
      </div>
    </>
  );
}

function SearchContent() {
  const field =
    'font-display mt-1.5 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm tabular-nums text-white placeholder:text-slate-500 focus:border-sky-400 focus:outline-none';

  return (
    <>
      <p>
        Cada punto del cielo tiene una "dirección", igual que la latitud y longitud en la Tierra.
        Escríbela y la cámara viaja hasta esa región.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-xs font-medium uppercase tracking-[0.25em] text-sky-300">
            RA · Ascensión recta
          </span>
          <input readOnly className={field} placeholder="210.80227°" />
          <span className="mt-1.5 block text-xs leading-5 text-slate-400">
            Como la longitud: de 0° a 360° hacia el este.
          </span>
        </label>

        <label className="block">
          <span className="text-xs font-medium uppercase tracking-[0.25em] text-sky-300">
            Dec · Declinación
          </span>
          <input readOnly className={field} placeholder="54.34895°" />
          <span className="mt-1.5 block text-xs leading-5 text-slate-400">
            Como la latitud: de −90° a +90° desde el ecuador celeste.
          </span>
        </label>
      </div>

      <button
        type="button"
        className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/10"
      >
        <Crosshair size={14} /> Ejemplo: Galaxia del Molinete (M101)
      </button>
    </>
  );
}

function SpectralContent({ controls }: { controls: RefObject<TourControls> }) {
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
            controls.current.wavelength = v;
          }}
          aria-label="Longitud de onda en micrómetros"
          className="w-full cursor-pointer accent-sky-400"
        />
        <div className="font-display mt-1 flex justify-between text-xs tabular-nums text-slate-500">
          <span>0.75 µm</span>
          <span>5 µm</span>
        </div>
      </div>

      <p className="text-xs text-slate-400">Mueve el control: las perillas del satélite responden.</p>
    </>
  );
}

function SurpriseContent({ onSurprise }: { onSurprise: () => void }) {
  return (
    <>
      <p>
        ¿No sabes por dónde empezar? El radar elige al azar una región interesante del cielo
        (nebulosas, cúmulos o galaxias) y te lleva hasta ella.
      </p>
      <button
        type="button"
        onClick={onSurprise}
        className="group inline-flex items-center gap-3 rounded-full bg-sky-500 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-400"
      >
        <Dices size={18} className="transition-transform duration-500 group-hover:rotate-180" />
        Ir a un lugar al azar
      </button>
    </>
  );
}
