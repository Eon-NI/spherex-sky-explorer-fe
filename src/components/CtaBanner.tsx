import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { motion, useReducedMotion } from 'motion/react';
import type { LucideIcon } from 'lucide-react';

/**
 * Llamada a la acción grande y llamativa, compartida por el footer de la landing
 * y el del Observatorio: panel nocturno con un "sol" del color de acento,
 * una órbita que gira y un botón con pulso de luz.
 */
type CtaBannerProps = {
    /** Opcional: texto pequeño sobre el título */
    eyebrow?: string;
    title: ReactNode;
    text: string;
    to: string;
    label: string;
    icon: LucideIcon;
    /** El icono va antes del texto (p. ej. "volver") */
    iconFirst?: boolean;
};

export default function CtaBanner({ eyebrow, title, text, to, label, icon: Icon, iconFirst = false }: CtaBannerProps) {
    const reduced = useReducedMotion();

    return (
        <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            className="relative isolate overflow-hidden rounded-[2rem] bg-[linear-gradient(135deg,#1f2a63_0%,var(--color-night-soft)_45%,var(--color-night)_100%)] px-7 py-12 ring-1 ring-star/30 sm:px-12 md:py-16"
        >
            {/* estrellas */}
            <div
                aria-hidden="true"
                className="absolute inset-0 -z-10 opacity-50 [background-image:radial-gradient(circle,color-mix(in_oklab,var(--color-paper)_60%,transparent)_1px,transparent_1.5px)] [background-size:38px_38px] [mask-image:linear-gradient(90deg,black,transparent_75%)]"
            />

            {/* "sol" de acento con su órbita */}
            <div aria-hidden="true" className="pointer-events-none absolute -right-24 -bottom-24 -z-10 size-[26rem] sm:-right-16 md:right-0 md:-bottom-32">
                <div className="absolute inset-[28%] rounded-full bg-[radial-gradient(circle,var(--color-star)_0%,color-mix(in_oklab,var(--color-star)_55%,transparent)_35%,transparent_70%)] opacity-70 blur-xl" />
                <div className="absolute inset-[38%] rounded-full bg-star shadow-[0_0_80px_10px_color-mix(in_oklab,var(--color-star)_45%,transparent)]" />
                <motion.div
                    className="absolute inset-[10%] rounded-full border border-dashed border-star/40"
                    animate={reduced ? undefined : { rotate: 360 }}
                    transition={{ duration: 60, ease: 'linear', repeat: Infinity }}
                >
                    <span className="absolute top-0 left-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-paper" />
                </motion.div>
                <div className="absolute inset-0 rounded-full border border-paper/10" />
            </div>

            <div className="relative max-w-2xl">
                {eyebrow && (
                    <p className="font-hud mb-4 text-xs font-medium tracking-[0.3em] text-star uppercase">{eyebrow}</p>
                )}
                <h2 className="text-3xl font-extrabold tracking-tight text-paper sm:text-4xl lg:text-5xl">{title}</h2>
                <p className="mt-4 max-w-xl text-lg text-mist">{text}</p>

                <div className="relative mt-9 inline-flex">
                    {/* pulso de luz detrás del botón */}
                    {!reduced && (
                        <motion.span
                            aria-hidden="true"
                            className="absolute inset-0 rounded-full bg-star"
                            animate={{ scale: [1, 1.18], opacity: [0.45, 0] }}
                            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeOut' }}
                        />
                    )}
                    <Link
                        to={to}
                        className="group relative inline-flex items-center gap-3 rounded-full bg-star px-8 py-4 text-lg font-bold text-night shadow-[0_10px_30px_-10px_color-mix(in_oklab,var(--color-star)_70%,transparent)] transition-colors hover:bg-star-hover"
                    >
                        {iconFirst && (
                            <Icon aria-hidden="true" className="size-5 transition-transform group-hover:-translate-x-1 motion-reduce:transition-none" />
                        )}
                        {label}
                        {!iconFirst && (
                            <Icon aria-hidden="true" className="size-5 transition-transform group-hover:translate-x-1 motion-reduce:transition-none" />
                        )}
                    </Link>
                </div>
            </div>
        </motion.div>
    );
}
