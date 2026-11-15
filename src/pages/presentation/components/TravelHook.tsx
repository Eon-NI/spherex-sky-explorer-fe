import { Link } from 'react-router';
import { motion } from 'motion/react';
import { PlanetArt, SatelliteArt } from './HookArt';
import SkyCompare from './SkyCompare';
import { useI18n } from '../../../i18n/useI18n';
import { EASE_OUT, VIEWPORT, rise, stagger } from './motionPresets';

export default function TravelHook() {
    const { m } = useI18n();
    return (
        <section
            aria-labelledby="travel-hook-title"
            className="relative isolate overflow-hidden bg-paper py-24 text-night [--focus:var(--color-night)] lg:py-36"
        >
            {/* Gráficos decorativos: planeta arriba a la derecha, satélite abajo a la izquierda */}
            <PlanetArt className="pointer-events-none absolute -top-12 -right-12 -z-10 w-36 opacity-60 sm:w-48 lg:w-64" />
            <SatelliteArt className="pointer-events-none absolute -bottom-12 -left-12 -z-10 w-36 opacity-60 sm:w-44 lg:w-56" />

            <div className="mx-auto grid max-w-6xl items-center gap-14 px-6 lg:grid-cols-[1fr_1.05fr] lg:gap-16">
                <motion.div
                    className="text-center lg:text-left"
                    variants={stagger(0.14)}
                    initial="hidden"
                    whileInView="show"
                    viewport={VIEWPORT}
                >
                    <motion.h2
                        id="travel-hook-title"
                        variants={rise}
                        className="text-3xl font-extrabold tracking-tight text-balance sm:text-4xl lg:text-5xl"
                    >
                        {m.landing.hook.title}
                    </motion.h2>

                    <motion.p variants={rise} className="mt-6 text-lg leading-relaxed text-dim">
                        {m.landing.hook.text}
                    </motion.p>

                    <motion.div variants={rise}>
                        <Link
                            to="/observatorio"
                            className="mt-10 inline-flex items-center justify-center rounded-full bg-night px-8 py-4 text-lg font-bold text-paper transition-colors hover:bg-night-soft"
                        >
                            {m.landing.hook.cta}
                        </Link>
                    </motion.div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 40, rotate: 1.5, filter: 'blur(10px)' }}
                    whileInView={{ opacity: 1, y: 0, rotate: 0, filter: 'blur(0px)' }}
                    viewport={VIEWPORT}
                    transition={{ duration: 1.1, ease: EASE_OUT, delay: 0.2 }}
                >
                    <SkyCompare />
                </motion.div>
            </div>
        </section>
    );
}
