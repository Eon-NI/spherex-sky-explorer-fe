type ArtProps = { className?: string };


export function PlanetArt({ className = '' }: ArtProps) {
    return (
        <svg
            viewBox="0 0 400 400"
            aria-hidden="true"
            focusable="false"
            className={className}
        >
            {/* Órbitas fijas */}
            <g className="fill-none stroke-night/20" strokeWidth={2}>
                <circle cx="200" cy="200" r="100" />
                <circle cx="200" cy="200" r="190" />
            </g>

            {/* Órbita de la luna: todo el grupo gira alrededor del centro */}
            <g
                className="animate-orbit motion-reduce:animate-none"
                style={{ transformBox: 'view-box', transformOrigin: '200px 200px' }}
            >
                <circle
                    cx="200"
                    cy="200"
                    r="145"
                    className="fill-none stroke-night/40"
                    strokeWidth={2}
                    strokeDasharray="2 9"
                    strokeLinecap="round"
                />
                <circle cx="200" cy="55" r="11" className="fill-night" />
            </g>

            {/* Anillo (mitad de atrás) -> planeta -> anillo (mitad de adelante) */}
            <g transform="rotate(-20 200 200)">
                <path
                    d="M82 200 A118 30 0 0 1 318 200"
                    className="fill-none stroke-night"
                    strokeWidth={4}
                />
            </g>

            <circle
                cx="200"
                cy="200"
                r="62"
                className="fill-star stroke-night"
                strokeWidth={4}
            />

            <g transform="rotate(-20 200 200)">
                <path
                    d="M82 200 A118 30 0 0 0 318 200"
                    className="fill-none stroke-night"
                    strokeWidth={4}
                />
            </g>

            {/* Destellos */}
            <g transform="translate(72 92)">
                <path
                    d="M0 -14 L3 -3 L14 0 L3 3 L0 14 L-3 3 L-14 0 L-3 -3Z"
                    className="origin-center animate-twinkle fill-night [transform-box:fill-box] motion-reduce:animate-none"
                />
            </g>
            <g transform="translate(332 318)">
                <path
                    d="M0 -9 L2 -2 L9 0 L2 2 L0 9 L-2 2 L-9 0 L-2 -2Z"
                    className="origin-center animate-twinkle fill-night [transform-box:fill-box] motion-reduce:animate-none"
                    style={{ animationDelay: '1.4s' }}
                />
            </g>
        </svg>
    );
}

/* Satélite inclinado que flota suavemente y emite señal. */
export function SatelliteArt({ className = '' }: ArtProps) {
    return (
        <svg
            viewBox="0 0 400 400"
            aria-hidden="true"
            focusable="false"
            className={className}
        >
            {/* Órbitas fijas */}
            <g className="fill-none stroke-night/20" strokeWidth={2}>
                <circle cx="200" cy="200" r="110" />
                <circle cx="200" cy="200" r="160" />
                <circle cx="200" cy="200" r="195" />
            </g>

            <g transform="rotate(-28 200 200)">
                <g className="animate-float motion-reduce:animate-none">
                    <g transform="translate(100 100)">

                        {/* Señal que sale de la antena */}
                        <g className="fill-none stroke-night" strokeWidth={3} strokeLinecap="round">
                            <path
                                d="M88 38 a17 17 0 0 1 24 0"
                                className="animate-signal motion-reduce:animate-none"
                            />
                            <path
                                d="M80 28 a30 30 0 0 1 40 0"
                                className="animate-signal motion-reduce:animate-none"
                                style={{ animationDelay: '0.5s' }}
                            />
                        </g>

                        {/* Antena */}
                        <path d="M100 78 V60" className="stroke-night" strokeWidth={4} strokeLinecap="round" />
                        <path
                            d="M85 60 a15 15 0 0 1 30 0z"
                            className="fill-paper stroke-night"
                            strokeWidth={4}
                            strokeLinejoin="round"
                        />

                        {/* Paneles solares */}
                        <rect x="8" y="84" width="56" height="32" rx="3" className="fill-night" />
                        <rect x="136" y="84" width="56" height="32" rx="3" className="fill-night" />
                        <path
                            d="M22 84v32M36 84v32M50 84v32M8 100h56M150 84v32M164 84v32M178 84v32M136 100h56"
                            className="stroke-paper/50"
                            strokeWidth={2}
                        />
                        <path d="M64 100h14M122 100h14" className="stroke-night" strokeWidth={4} />

                        {/* Cuerpo */}
                        <rect
                            x="78"
                            y="78"
                            width="44"
                            height="44"
                            rx="10"
                            className="fill-paper stroke-night"
                            strokeWidth={4}
                        />
                        <circle cx="100" cy="100" r="11" className="fill-star stroke-night" strokeWidth={4} />
                    </g>
                </g>
            </g>
        </svg>
    );
}