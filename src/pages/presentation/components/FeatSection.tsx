import { motion } from 'motion/react';
import FeatCard from './FeatCard';
import type { FeatCardProps } from './FeatCard';
import { VIEWPORT, rise, stagger } from './motionPresets';
import { useI18n } from '../../../i18n/useI18n';

/** Datos fijos de cada tarjeta; los textos vienen del JSON (landing.features.<key>) */
const FEATURES: (Pick<FeatCardProps, 'to' | 'tone' | 'art'> & { key: 'timelapse' | 'search' | 'spectral' })[] = [
    { key: 'timelapse', to: '/timelapse', tone: 'star', art: 'timeline' },
    { key: 'search', to: '/search', tone: 'sky', art: 'coords' },
    { key: 'spectral', to: '/spectral', tone: 'blue', art: 'spectrum' },
];

export default function FeatSection() {
    const { m } = useI18n();
    const f = m.landing.features;
    return (
        <section
            id="servicios"
            aria-labelledby="feat-title"
            className="scroll-mt-20 bg-paper py-20 text-night [--focus:var(--color-night)] lg:py-28"
        >
            <div className="mx-auto max-w-6xl px-6">
                <motion.div
                    className="mx-auto max-w-2xl text-center"
                    variants={stagger(0.12)}
                    initial="hidden"
                    whileInView="show"
                    viewport={VIEWPORT}
                >
                    <motion.h2
                        id="feat-title"
                        variants={rise}
                        className="text-3xl font-extrabold tracking-tight text-balance lg:text-5xl"
                    >
                        {f.title}
                    </motion.h2>

                    <motion.p variants={rise} className="mt-4 text-lg text-dim">
                        {f.subtitle}
                    </motion.p>
                </motion.div>

                {/* group/list: permite atenuar las cards vecinas cuando una tiene el mouse encima */}
                <motion.div
                    className="group/list mt-12 grid gap-8 md:grid-cols-3 lg:mt-16"
                    variants={stagger(0.15, 0.1)}
                    initial="hidden"
                    whileInView="show"
                    viewport={{ once: true, amount: 0.15 }}
                >
                    {FEATURES.map(({ key, ...rest }) => (
                        <FeatCard
                            key={key}
                            {...rest}
                            label={f[key].label}
                            title={f[key].title}
                            description={f[key].description}
                            linkText={f[key].link}
                        />
                    ))}
                </motion.div>
            </div>
        </section>
    );
}
