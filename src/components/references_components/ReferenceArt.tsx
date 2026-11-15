export type ReferenceArtVariant = 'spherex' | 'planetX' | 'coordinates' | 'spectrum';

const svg = 'h-full w-full';
const move = 'transition-transform duration-700 ease-out motion-reduce:transition-none';

/** Estrellas de fondo fijas (mismas posiciones en cada render) */
const STARS = [
    [22, 18, 1.2], [58, 44, 0.8], [96, 14, 1], [140, 30, 0.7], [186, 12, 1.1], [232, 38, 0.8],
    [276, 16, 1], [300, 58, 0.7], [14, 82, 0.8], [44, 132, 1], [292, 118, 1.1], [270, 168, 0.8],
    [20, 176, 0.9], [120, 184, 0.7], [210, 186, 1],
] as const;

function Stars() {
    return (
        <g className="fill-paper">
            {STARS.map(([x, y, r], i) => (
                <circle key={i} cx={x} cy={y} r={r} opacity={0.35 + (i % 4) * 0.15} />
            ))}
        </g>
    );
}

/** Misión SPHEREx: el observatorio con sus conos y el barrido de bandas infrarrojas */
function Spherex() {
    const bands = ['#7b6cff', '#5b8cff', '#43b8ff', '#4fd6c4', '#a3e6cc', '#ffd36e', '#ffb938', '#ff8a4c', '#ff5f6d'];
    return (
        <svg viewBox="0 0 320 200" aria-hidden="true" focusable="false" className={svg}>
            <Stars />
            {/* barrido del cielo: un abanico con las bandas del espectro */}
            <g className={`origin-[160px_120px] group-hover/card:rotate-6 ${move}`}>
                {bands.map((c, i) => (
                    <path
                        key={c}
                        d={`M160 112 L${40 + i * 27} 0 L${67 + i * 27} 0 Z`}
                        fill={c}
                        opacity={0.16}
                    />
                ))}
            </g>
            {/* conos protectores apilados */}
            <g className={`group-hover/card:-translate-y-1.5 ${move}`}>
                <g className="fill-night-soft stroke-paper" strokeWidth={2} strokeLinejoin="round">
                    <path d="M112 82 L208 82 L190 104 L130 104 Z" />
                    <path d="M120 100 L200 100 L186 120 L134 120 Z" />
                    <path d="M128 116 L192 116 L182 134 L138 134 Z" />
                </g>
                <ellipse cx="160" cy="82" rx="48" ry="7" className="fill-star/25 stroke-star" strokeWidth={2} />
                {/* bus y paneles */}
                <rect x="140" y="134" width="40" height="22" rx="4" className="fill-paper/90" />
                <rect x="96" y="140" width="40" height="12" rx="2" className="fill-[#43b8ff]/40 stroke-[#a9d4ff]" strokeWidth={1.5} />
                <rect x="184" y="140" width="40" height="12" rx="2" className="fill-[#43b8ff]/40 stroke-[#a9d4ff]" strokeWidth={1.5} />
                <path d="M136 146 h4 M180 146 h4" className="stroke-paper" strokeWidth={2} />
            </g>
            <text x="16" y="190" className="font-hud fill-paper/60 text-[10px] tracking-widest">102 BANDS · 0.75–5 µm</text>
        </svg>
    );
}

/** Planeta X: un mundo oscuro en una órbita lejana, apenas iluminado por el Sol */
function PlanetX() {
    return (
        <svg viewBox="0 0 320 200" aria-hidden="true" focusable="false" className={svg}>
            <defs>
                <radialGradient id="ref-sun" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#fff3d1" />
                    <stop offset="40%" stopColor="#ffb938" />
                    <stop offset="100%" stopColor="#ffb938" stopOpacity="0" />
                </radialGradient>
                <radialGradient id="ref-planet" cx="25%" cy="35%" r="80%">
                    <stop offset="0%" stopColor="#4b5173" />
                    <stop offset="55%" stopColor="#171e4a" />
                    <stop offset="100%" stopColor="#0d1230" />
                </radialGradient>
            </defs>
            <Stars />
            {/* órbitas */}
            <g className="fill-none stroke-paper/25" strokeWidth={1.5}>
                <ellipse cx="60" cy="110" rx="70" ry="22" />
                <ellipse cx="60" cy="110" rx="150" ry="48" />
                <ellipse cx="60" cy="110" rx="236" ry="76" strokeDasharray="4 7" className="stroke-star/60" />
            </g>
            {/* Sol lejano */}
            <circle cx="60" cy="110" r="26" fill="url(#ref-sun)" />
            <circle cx="60" cy="110" r="7" className="fill-[#fff3d1]" />
            {/* planetas conocidos */}
            <circle cx="122" cy="122" r="3.5" className="fill-[#a9d4ff]" />
            <circle cx="196" cy="94" r="5" className="fill-[#a3e6cc]" />
            {/* Planeta X */}
            <g className={`group-hover/card:-translate-x-2 group-hover/card:translate-y-1 ${move}`}>
                <circle cx="262" cy="70" r="26" fill="url(#ref-planet)" />
                <path d="M244 52 A26 26 0 0 0 250 92" className="fill-none stroke-star/70" strokeWidth={2} strokeLinecap="round" />
                <circle cx="262" cy="70" r="36" className="fill-none stroke-paper/30" strokeWidth={1} strokeDasharray="2 4" />
                <text x="262" y="122" textAnchor="middle" className="font-hud fill-star text-[11px] font-bold">?</text>
            </g>
        </svg>
    );
}

/** Ascensión recta y declinación: la esfera celeste con su rejilla */
function Coordinates() {
    return (
        <svg viewBox="0 0 320 200" aria-hidden="true" focusable="false" className={svg}>
            <Stars />
            <g className="fill-none stroke-paper/30" strokeWidth={1.3}>
                <circle cx="160" cy="100" r="78" className="stroke-paper/60" strokeWidth={2} />
                {/* paralelos (declinación) */}
                <ellipse cx="160" cy="70" rx="68" ry="12" />
                <ellipse cx="160" cy="130" rx="68" ry="12" />
                {/* meridianos (ascensión recta) */}
                <ellipse cx="160" cy="100" rx="28" ry="78" />
                <ellipse cx="160" cy="100" rx="56" ry="78" />
            </g>
            {/* ecuador celeste */}
            <ellipse cx="160" cy="100" rx="78" ry="16" className="fill-none stroke-[#a9d4ff]" strokeWidth={2} />
            {/* eje polar */}
            <path d="M160 6 V194" className="stroke-paper/50" strokeWidth={1.5} strokeDasharray="3 5" />
            {/* objeto y sus coordenadas */}
            <g className={`group-hover/card:-translate-y-1 ${move}`}>
                <path d="M160 100 L206 112" className="stroke-star" strokeWidth={2} />
                <path d="M206 112 L214 58" className="stroke-star" strokeWidth={2} strokeDasharray="4 4" />
                <circle cx="214" cy="58" r="6" className="fill-star" />
                <circle cx="214" cy="58" r="12" className="fill-none stroke-star/50" strokeWidth={1.5} />
                <path d="M180 105 A22 22 0 0 0 182 96" className="fill-none stroke-[#a3e6cc]" strokeWidth={2} />
                <text x="186" y="94" className="font-hud fill-[#a3e6cc] text-[13px] font-bold">α</text>
                <text x="222" y="90" className="font-hud fill-star text-[13px] font-bold">δ</text>
            </g>
            <text x="16" y="190" className="font-hud fill-paper/60 text-[10px] tracking-widest">RA · DEC</text>
        </svg>
    );
}

/** Espectro: la luz blanca se abre en colores y deja su huella en una gráfica */
function Spectrum() {
    const colors = ['#ff5f6d', '#ff8a4c', '#ffb938', '#ffd36e', '#a3e6cc', '#43b8ff', '#7b6cff'];
    return (
        <svg viewBox="0 0 320 200" aria-hidden="true" focusable="false" className={svg}>
            <Stars />
            {/* haz de luz blanca */}
            <path d="M10 92 L118 84" className="stroke-paper" strokeWidth={3} strokeLinecap="round" />
            {/* abanico de colores */}
            <g className={`origin-[150px_84px] group-hover/card:scale-y-110 ${move}`}>
                {colors.map((c, i) => (
                    <path key={c} d={`M150 84 L310 ${36 + i * 13} L310 ${49 + i * 13} Z`} fill={c} opacity={0.85} />
                ))}
            </g>
            {/* prisma */}
            <path d="M134 40 L174 118 L94 118 Z" className="fill-paper/10 stroke-paper" strokeWidth={2} strokeLinejoin="round" />
            {/* espectro resultante con líneas de absorción */}
            <g transform="translate(0 142)">
                <path d="M16 6 H304" className="stroke-paper/20" strokeWidth={1} />
                <path
                    d="M16 40 C40 34 56 18 80 16 S120 30 140 12 S170 4 182 26 L188 36 L194 22 S230 8 250 20 S280 34 304 30"
                    className="fill-none stroke-star"
                    strokeWidth={2}
                    strokeLinecap="round"
                />
                <path d="M16 46 H304" className="stroke-paper/40" strokeWidth={1.5} />
            </g>
        </svg>
    );
}

export default function ReferenceArt({ variant }: { variant: ReferenceArtVariant }) {
    if (variant === 'spherex') return <Spherex />;
    if (variant === 'planetX') return <PlanetX />;
    if (variant === 'coordinates') return <Coordinates />;
    return <Spectrum />;
}
