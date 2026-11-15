import type { ReactNode } from 'react';
import { motion } from 'motion/react';
import { VIEWPORT, revealFrame, revealImage, rise, stagger } from './motionPresets';

type InfoSectionProps = {
    id: string;
    title: string;
    /** Puede incluir texto resaltado (<Highlight>) */
    description: ReactNode;
    image: string;
    imageAlt: string;
    reverse?: boolean;
    /** Capa animada opcional sobre la imagen (escaneo, objeto en movimiento…) */
    overlay?: ReactNode;
    /** Pie de la imagen, p. ej. para marcar una ilustración */
    caption?: string;
};

/** Resalta una idea clave sin cambiar el texto */
export function Highlight({ children }: { children: ReactNode }) {
    return <strong className="font-bold text-star">{children}</strong>;
}

export default function InfoSection({
    id,
    title,
    description,
    image,
    imageAlt,
    reverse = false,
    overlay,
    caption,
}: InfoSectionProps) {
    return (
        <article
            id={id}
            aria-labelledby={`${id}-title`}
            className="grid scroll-mt-24 items-center gap-8 lg:grid-cols-2 lg:gap-16"
        >
            {/* En móvil la imagen va primero; en escritorio, `reverse` la pasa a la derecha */}
            {/* el observador de scroll va en el figure (sin recorte); el recorte va en el hijo,
                porque un elemento recortado al 100 % no cuenta como visible */}
            <motion.figure
                className={`relative ${reverse ? 'lg:order-2' : ''}`}
                initial="hidden"
                whileInView="show"
                viewport={VIEWPORT}
            >
                <motion.div variants={revealFrame} className="relative overflow-hidden rounded-3xl bg-night-soft">
                    <motion.img
                        src={image}
                        alt={imageAlt}
                        variants={revealImage}
                        className="aspect-4/3 w-full object-cover"
                    />
                    {overlay}
                </motion.div>
                {caption && <figcaption className="mt-3 text-sm text-mist">{caption}</figcaption>}
            </motion.figure>

            <motion.div
                className="max-w-xl"
                variants={stagger(0.14, 0.15)}
                initial="hidden"
                whileInView="show"
                viewport={VIEWPORT}
            >
                {/* h3 porque la sección padre ya tiene un h2 */}
                <motion.h3
                    id={`${id}-title`}
                    variants={rise}
                    className="font-display text-3xl font-extrabold tracking-tight text-balance lg:text-4xl"
                >
                    {title}
                </motion.h3>

                <motion.p variants={rise} className="mt-5 max-w-[62ch] text-lg leading-relaxed text-mist">
                    {description}
                </motion.p>
            </motion.div>
        </article>
    );
}
