import { motion } from 'motion/react';
import { ArrowUpRight, ExternalLink } from 'lucide-react';
import { rise } from '../../pages/presentation/components/motionPresets';
import ReferenceArt, { type ReferenceArtVariant } from './ReferenceArt';

/** Tinte del panel de la ilustración, con los mismos tonos de las tarjetas de la landing */
const TINTS: Record<ReferenceArtVariant, string> = {
    spherex: 'from-[#1b2456] to-[#0d1230]',
    planetX: 'from-[#241a3d] to-[#0d1230]',
    coordinates: 'from-[#15304f] to-[#0d1230]',
    spectrum: 'from-[#2a2140] to-[#0d1230]',
};

export type ReferenceCardProps = {
    index: number;
    variant: ReferenceArtVariant;
    title: string;
    description: string;
    source: string;
    href: string;
    cta: string;
    newTab: string;
};

/** Tarjeta de referencia externa: toda la tarjeta es un enlace que se abre en otra pestaña */
export default function ReferenceCard({ index, variant, title, description, source, href, cta, newTab }: ReferenceCardProps) {
    return (
        // la opacidad de motion va en línea; el atenuado de las vecinas va en un div interior
        <motion.li variants={rise} className="flex">
            <div className="flex flex-1 transition-opacity duration-300 motion-reduce:transition-none group-hover/list:[&:not(:hover)]:opacity-45 group-focus-within/list:[&:not(:focus-within)]:opacity-45">
                <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group/card flex flex-1 flex-col overflow-hidden rounded-3xl border border-paper/10 bg-night-soft/70 transition duration-500 hover:-translate-y-1.5 hover:border-star/40 hover:shadow-[0_24px_60px_-30px_color-mix(in_oklab,var(--color-star)_45%,transparent)] focus-visible:-translate-y-1.5 focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-star motion-reduce:transition-none"
                >
                    {/* ilustración */}
                    <div className={`relative aspect-[16/10] overflow-hidden bg-linear-to-b ${TINTS[variant]}`}>
                        <ReferenceArt variant={variant} />
                        <span className="font-hud absolute top-3 left-3 rounded-full border border-paper/15 bg-night/60 px-2.5 py-1 text-[11px] tracking-widest text-paper/80 uppercase backdrop-blur-sm">
                            {String(index + 1).padStart(2, '0')} · {source}
                        </span>
                    </div>

                    {/* contenido */}
                    <div className="flex flex-1 flex-col gap-3 p-6">
                        <div className="flex items-start justify-between gap-3">
                            <h2 className="text-xl font-bold leading-tight text-paper">{title}</h2>
                            <span
                                aria-hidden="true"
                                className="flex size-9 shrink-0 items-center justify-center rounded-full bg-star text-night transition-transform duration-300 group-hover/card:rotate-45 motion-reduce:transition-none"
                            >
                                <ArrowUpRight className="size-5" />
                            </span>
                        </div>

                        <p className="leading-relaxed text-mist">{description}</p>

                        <span className="mt-auto inline-flex w-fit items-center gap-2 rounded-full border border-star/60 px-4 py-2 text-sm font-semibold text-star transition-colors group-hover/card:bg-star group-hover/card:text-night">
                            {cta}
                            <ExternalLink aria-hidden="true" className="size-4" />
                            <span className="sr-only">{newTab}</span>
                        </span>
                    </div>
                </a>
            </div>
        </motion.li>
    );
}
