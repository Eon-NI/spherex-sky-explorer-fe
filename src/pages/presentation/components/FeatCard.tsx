import { Link } from 'react-router';
import { motion } from 'motion/react';
import { rise } from './motionPresets';

export type FeatTone = 'star' | 'sky' | 'mint' | 'blue';
export type FeatArt = 'rings' | 'frames' | 'split' | 'timeline' | 'coords' | 'spectrum';

export type FeatCardProps = {
    /** Etiqueta superior */
    label?: string;
    title: string;
    description: string;
    to: string;
    image?: string;
    imageAlt?: string;
    linkText: string;
    tone?: FeatTone;
    art?: FeatArt;
};

/**
 * Fondo de cada tono y color de "tinta" (texto + ilustración).
 * Los tonos oscuros usan tinta clara (paper) para mantener el contraste.
 */
const TONES: Record<FeatTone, { bg: string; dark?: boolean }> = {
    // ámbar oscurecido a partir del color star del proyecto
    star: { bg: 'bg-[color-mix(in_oklab,var(--color-star)_100%,black)]' },
    sky: { bg: 'bg-sky' },
    mint: { bg: 'bg-mint' },
    // azul noche, un poco más claro que #0d1230
    blue: { bg: 'bg-[#1b2456]', dark: true },
};

function CardArt({ variant }: { variant: FeatArt }) {
    const svg = 'mx-auto mt-auto w-full max-w-72 pt-8';
    const move = 'transition-transform duration-500 motion-reduce:transition-none';

    /* Tiempo: capturas sucesivas; el objeto avanza de una a otra */
    if (variant === 'timeline') {
        const frames = [0, 1, 2, 3];
        return (
            <svg viewBox="0 0 240 170" aria-hidden="true" focusable="false" className={svg}>
                {frames.map((i) => (
                    <g
                        key={i}
                        className={`${move} [transform:translate(var(--bx),var(--by))] group-hover/card:[transform:translate(var(--hx),var(--hy))]`}
                        style={{
                            ['--bx' as string]: `${18 + i * 18}px`,
                            ['--by' as string]: `${50 - i * 12}px`,
                            ['--hx' as string]: `${6 + i * 28}px`,
                            ['--hy' as string]: `${56 - i * 17}px`,
                        }}
                    >
                        <rect width="120" height="90" rx="10" className="fill-paper stroke-(--ink)" strokeWidth={3} />
                        <circle cx="30" cy="25" r="2.5" className="fill-(--ink)/50" />
                        <circle cx="92" cy="62" r="2.5" className="fill-(--ink)/50" />
                        <circle cx="70" cy="20" r="2" className="fill-(--ink)/50" />
                        <circle cx={34 + i * 16} cy={66 - i * 10} r="5.5" className="fill-(--ink)" />
                    </g>
                ))}
                <path d="M30 160 H210" className="stroke-(--ink)" strokeWidth={3} strokeLinecap="round" />
                {frames.map((i) => (
                    <circle key={i} cx={30 + i * 60} cy="160" r="5" className="fill-(--ink)" />
                ))}
            </svg>
        );
    }

    /* Coordenadas: rejilla RA/Dec con una mira que se fija en un punto */
    if (variant === 'coords') {
        return (
            <svg viewBox="0 0 240 170" aria-hidden="true" focusable="false" className={svg}>
                <g className="fill-none stroke-(--ink)/35" strokeWidth={2}>
                    {[40, 80, 120, 160, 200].map((x) => (
                        <path key={x} d={`M${x} 10 Q${x + (x - 120) * 0.25} 85 ${x} 160`} />
                    ))}
                    {[30, 70, 110, 150].map((y) => (
                        <path key={y} d={`M20 ${y} Q120 ${y - 14} 220 ${y}`} />
                    ))}
                </g>
                <g className={`${move} group-hover/card:translate-x-6 group-hover/card:-translate-y-5`}>
                    <circle cx="104" cy="96" r="22" className="fill-none stroke-(--ink)" strokeWidth={3} />
                    <path
                        d="M104 62v18M104 112v18M70 96h18M120 96h18"
                        className="stroke-(--ink)"
                        strokeWidth={3}
                        strokeLinecap="round"
                    />
                    <circle cx="104" cy="96" r="4" className="fill-(--ink)" />
                </g>
                <text x="20" y="166" className="fill-(--ink) text-[11px] font-bold">RA</text>
                <text x="200" y="22" className="fill-(--ink) text-[11px] font-bold">Dec</text>
            </svg>
        );
    }

    /* Espectro: barras de longitud de onda agrupadas en 6 detectores */
    if (variant === 'spectrum') {
        const bars = Array.from({ length: 34 }, (_, i) => i);
        return (
            <svg viewBox="0 0 240 170" aria-hidden="true" focusable="false" className={svg}>
                {bars.map((i) => {
                    const h = 30 + 55 * Math.abs(Math.sin(i * 0.42 + 0.6)) + (i % 6 === 2 ? 25 : 0);
                    return (
                        <rect
                            key={i}
                            x={14 + i * 6.3}
                            y={150 - h}
                            width={4.2}
                            height={h}
                            rx={2}
                            className={`origin-bottom fill-(--ink) [transform-box:fill-box] group-hover/card:scale-y-110 ${move}`}
                            style={{ transitionDelay: `${i * 12}ms`, opacity: 0.45 + (i % 6) * 0.1 }}
                        />
                    );
                })}
                <path d="M12 156 H228" className="stroke-(--ink)" strokeWidth={3} strokeLinecap="round" />
                {[0, 1, 2, 3, 4, 5].map((d) => (
                    <text key={d} x={30 + d * 37} y="169" textAnchor="middle" className="fill-(--ink) text-[10px] font-bold">
                        D{d + 1}
                    </text>
                ))}
            </svg>
        );
    }

    if (variant === 'frames') {
        return (
            <svg viewBox="0 0 240 180" aria-hidden="true" focusable="false" className={svg}>
                <g className="fill-paper/70 stroke-(--ink)" strokeWidth={3}>
                    <rect x="70" y="30" width="100" height="140" rx="12"
                        className={`origin-bottom [transform-box:fill-box] -rotate-8 group-hover/card:-rotate-16 ${move}`} />
                    <rect x="70" y="30" width="100" height="140" rx="12"
                        className={`origin-bottom [transform-box:fill-box] rotate-8 group-hover/card:rotate-16 ${move}`} />
                    <rect x="70" y="30" width="100" height="140" rx="12" />
                </g>
            </svg>
        );
    }

    if (variant === 'split') {
        return (
            <svg viewBox="0 0 240 180" aria-hidden="true" focusable="false" className={svg}>
                <circle cx="92" cy="110" r="62" strokeWidth={3}
                    className={`fill-none stroke-(--ink) group-hover/card:-translate-x-3 ${move}`} />
                <circle cx="148" cy="110" r="62"
                    className={`fill-(--ink)/90 group-hover/card:translate-x-3 ${move}`} />
            </svg>
        );
    }

    return (
        <svg viewBox="0 0 240 150" aria-hidden="true" focusable="false" className={svg}>
            <g className="fill-none stroke-(--ink)" strokeWidth={3}>
                {[36, 68, 100, 132].map((r, i) => (
                    <circle
                        key={r}
                        cx="120"
                        cy="150"
                        r={r}
                        style={{ transitionDelay: `${i * 60}ms` }}
                        className={`origin-center [transform-box:fill-box] group-hover/card:scale-110 ${move}`}
                    />
                ))}
            </g>
        </svg>
    );
}

export default function FeatCard({
    label,
    title,
    description,
    to,
    image,
    imageAlt,
    linkText,
    tone = 'star',
    art = 'rings',
}: FeatCardProps) {
    const t = TONES[tone];
    return (
        <motion.article
            variants={rise}
            className="group/card relative flex flex-col gap-5 transition-opacity duration-300 motion-reduce:transition-none group-hover/list:[&:not(:hover)]:opacity-40 group-focus-within/list:[&:not(:focus-within)]:opacity-40"
        >
            <div
                style={{ ['--ink' as string]: t.dark ? 'var(--color-paper)' : 'var(--color-night)' }}
                className={`flex min-h-[32rem] flex-1 flex-col overflow-hidden rounded-3xl px-6 pt-7 transition-transform duration-500 group-hover/card:-translate-y-1.5 group-focus-within/card:-translate-y-1.5 motion-reduce:transition-none lg:min-h-[38rem] ${t.bg}`}
            >
                {label && (
                    <span className="mx-auto mb-4 inline-flex rounded-full bg-(--ink)/10 px-3 py-1 text-xs font-bold tracking-wide text-(--ink) uppercase">
                        {label}
                    </span>
                )}

                <h3 className="font-display text-center text-2xl font-extrabold tracking-tight text-balance text-(--ink) lg:text-[1.75rem] lg:leading-tight">
                    {title}
                </h3>

                <p className="mt-3 text-center text-(--ink)/80">{description}</p>

                {image ? (
                    <figure className="mt-auto pt-8">
                        <img
                            src={image}
                            alt={imageAlt ?? title}
                            className="h-72 w-full translate-y-6 rounded-t-2xl object-cover object-top transition-transform duration-500 group-hover/card:translate-y-0 motion-reduce:transition-none"
                        />
                    </figure>
                ) : (
                    <CardArt variant={art} />
                )}
            </div>

            <Link
                to={to}
                className="mx-auto inline-flex items-center justify-center rounded-full bg-night px-6 py-3 font-bold text-paper transition duration-300 after:absolute after:inset-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-night motion-reduce:transition-none [@media(hover:hover)]:translate-y-2 [@media(hover:hover)]:opacity-0 group-hover/card:translate-y-0 group-hover/card:opacity-100 group-focus-within/card:translate-y-0 group-focus-within/card:opacity-100"
            >
                {linkText}
            </Link>
        </motion.article>
    );
}