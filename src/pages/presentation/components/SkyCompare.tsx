import { useEffect, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';

/**
 * Demostración ilustrativa de un "comparador de parpadeo" (blink comparator),
 * el método con el que se descubrió Plutón en 1930: dos capturas del mismo campo
 * de estrellas tomadas en fechas distintas se alternan; las estrellas no se mueven,
 * pero el objeto cercano "salta" de posición.
 */

function mulberry32(seed: number) {
    let a = seed;
    return () => {
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

const rand = mulberry32(1930);
const STARS = Array.from({ length: 90 }, () => ({
    x: rand() * 300,
    y: rand() * 200,
    r: Math.pow(rand(), 2.4) * 2.4 + 0.5,
}));

/** Posición del objeto en cada captura */
const OBJECT = [
    { x: 118, y: 120 },
    { x: 176, y: 88 },
];

const EPOCHS = ['Captura A', 'Captura B · 6 meses después'];

function Field({ epoch, showTrail = false }: { epoch: 0 | 1; showTrail?: boolean }) {
    const o = OBJECT[epoch];
    const prev = OBJECT[epoch === 0 ? 1 : 0];
    return (
        <svg viewBox="0 0 300 200" className="block h-full w-full" aria-hidden="true">
            <rect width="300" height="200" className="fill-night" />
            {STARS.map((s, i) => (
                <circle key={i} cx={s.x} cy={s.y} r={s.r} className="fill-paper" opacity={0.55 + s.r / 6} />
            ))}

            {showTrail && (
                <g>
                    <line
                        x1={prev.x}
                        y1={prev.y}
                        x2={o.x}
                        y2={o.y}
                        className="stroke-star"
                        strokeWidth={1}
                        strokeDasharray="3 4"
                        opacity={0.7}
                    />
                    <circle cx={prev.x} cy={prev.y} r={9} className="fill-none stroke-star/50" strokeDasharray="2 3" />
                </g>
            )}

            {/* el objeto que se mueve */}
            <circle cx={o.x} cy={o.y} r={8} className="fill-star/20" />
            <circle cx={o.x} cy={o.y} r={2.4} className="fill-star" />
            <circle cx={o.x} cy={o.y} r={11} className="fill-none stroke-star" strokeWidth={1.2} />
        </svg>
    );
}

export default function SkyCompare() {
    const [epoch, setEpoch] = useState<0 | 1>(0);
    const [playing, setPlaying] = useState(true);
    const [cycles, setCycles] = useState(0);
    const rootRef = useRef<HTMLDivElement>(null);
    const [inView, setInView] = useState(false);

    // solo parpadea cuando se ve, y nunca con prefers-reduced-motion
    useEffect(() => {
        const el = rootRef.current;
        if (!el) return;
        const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.3 });
        io.observe(el);
        return () => io.disconnect();
    }, []);

    useEffect(() => {
        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (!playing || !inView || reduced) return;
        const id = window.setInterval(() => {
            setEpoch((e) => (e === 0 ? 1 : 0));
            setCycles((c) => c + 1);
        }, 1300);
        return () => window.clearInterval(id);
    }, [playing, inView]);

    return (
        <div ref={rootRef} className="w-full">
            <figure className="overflow-hidden rounded-3xl bg-night p-3 shadow-2xl shadow-night/30 ring-1 ring-night/10">
                {/* visor principal: alterna A y B con un fundido corto */}
                <div className="relative aspect-[3/2] overflow-hidden rounded-2xl">
                    {[0, 1].map((e) => (
                        <div
                            key={e}
                            className={`absolute inset-0 transition-opacity duration-200 motion-reduce:transition-none ${
                                epoch === e ? 'opacity-100' : 'opacity-0'
                            }`}
                        >
                            {/* tras el primer parpadeo se dibuja el rastro del desplazamiento */}
                            <Field epoch={e as 0 | 1} showTrail={cycles > 1} />
                        </div>
                    ))}

                    <div className="pointer-events-none absolute top-3 left-3 flex items-center gap-2 rounded-full bg-night/75 px-3 py-1 text-xs font-semibold text-paper backdrop-blur">
                        <span className={`size-2 rounded-full ${epoch === 0 ? 'bg-sky' : 'bg-star'}`} />
                        {EPOCHS[epoch]}
                    </div>

                    <button
                        type="button"
                        onClick={() => setPlaying((p) => !p)}
                        aria-label={playing ? 'Pausar la comparación' : 'Reanudar la comparación'}
                        className="absolute right-3 bottom-3 flex size-9 items-center justify-center rounded-full bg-paper text-night transition hover:bg-star focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-star"
                    >
                        {playing ? <Pause className="size-4" /> : <Play className="size-4 translate-x-px" />}
                    </button>
                </div>

                {/* las dos capturas, fijas, para comparar a simple vista */}
                <p className="mt-4 px-1 text-[11px] font-semibold tracking-wider text-mist uppercase">
                    Capturas originales
                </p>
                <div className="mt-2 grid grid-cols-2 gap-3">
                    {[0, 1].map((e) => (
                        <button
                            key={e}
                            type="button"
                            onClick={() => {
                                setPlaying(false);
                                setEpoch(e as 0 | 1);
                            }}
                            aria-label={`Ver ${EPOCHS[e]}`}
                            aria-pressed={epoch === e}
                            className={`overflow-hidden rounded-xl ring-2 transition ${
                                epoch === e ? 'ring-star' : 'ring-transparent hover:ring-paper/30'
                            }`}
                        >
                            <span className="block aspect-[3/2]">
                                <Field epoch={e as 0 | 1} />
                            </span>
                            <span className="block bg-night-soft px-2 py-1.5 text-left text-xs font-semibold text-paper">
                                {EPOCHS[e]}
                            </span>
                        </button>
                    ))}
                </div>

                <figcaption className="mt-3 px-1 text-xs text-mist">
                    Demostración ilustrativa: las estrellas permanecen fijas; el objeto marcado cambia de
                    posición entre ambas capturas.
                </figcaption>
            </figure>
        </div>
    );
}
