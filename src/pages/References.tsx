import { useLayoutEffect } from 'react';
import { MotionConfig, motion } from 'motion/react';
import Header from './presentation/components/Header';
import Footer from './presentation/components/Footer';
import { VIEWPORT, rise, stagger } from './presentation/components/motionPresets';
import ReferenceCard from '../components/references_components/ReferenceCard';
import type { ReferenceArtVariant } from '../components/references_components/ReferenceArt';
import { useI18n } from '../i18n/useI18n';
import { fmt } from '../i18n/format';

/** Fuentes externas: el texto de cada una vive en los JSON de idioma (references.items) */
const REFERENCES: { key: ReferenceArtVariant; href: string }[] = [
    { key: 'spherex', href: 'https://science.nasa.gov/mission/spherex/' },
    { key: 'planetX', href: 'https://science.nasa.gov/solar-system/planet-x/' },
    { key: 'coordinates', href: 'https://science.nasa.gov/learn/basics-of-space-flight/chapter2-2/' },
    { key: 'spectrum', href: 'https://youtu.be/BFPHN4yOy2Y?si=n-sMyz39V5_WwXHy' },
];

export default function References() {
    const { m } = useI18n();
    const r = m.references;

    useLayoutEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    return (
        <MotionConfig reducedMotion="user">
            <Header />

            <main className="relative isolate overflow-x-clip bg-night text-paper">
                {/* resplandor de fondo, como el horizonte del footer */}
                <div
                    aria-hidden="true"
                    className="absolute inset-x-0 top-0 -z-10 mx-auto h-96 max-w-5xl rounded-full bg-[radial-gradient(ellipse_at_center,color-mix(in_oklab,var(--color-star)_10%,transparent),transparent_70%)] blur-2xl"
                />

                <section aria-labelledby="references-title" className="mx-auto max-w-6xl px-6 py-16 lg:py-24">
                    <motion.div variants={stagger(0.1)} initial="hidden" animate="show" className="max-w-3xl">
                        <motion.p variants={rise} className="font-hud text-xs font-medium tracking-[0.25em] text-star uppercase">
                            {r.eyebrow}
                        </motion.p>
                        <motion.h1
                            id="references-title"
                            variants={rise}
                            className="mt-3 text-4xl font-extrabold tracking-tight text-balance lg:text-6xl"
                        >
                            {r.title}
                        </motion.h1>
                        <motion.p variants={rise} className="mt-5 text-lg leading-relaxed text-mist">
                            {r.text}
                        </motion.p>
                    </motion.div>

                    <motion.ul
                        aria-label={r.listAria}
                        variants={stagger(0.12, 0.2)}
                        initial="hidden"
                        whileInView="show"
                        viewport={VIEWPORT}
                        className="group/list mt-12 grid gap-6 sm:grid-cols-2 lg:mt-16 lg:grid-cols-4"
                    >
                        {REFERENCES.map((ref, i) => (
                            <ReferenceCard
                                key={ref.key}
                                index={i}
                                variant={ref.key}
                                href={ref.href}
                                title={r.items[ref.key].title}
                                description={r.items[ref.key].description}
                                source={r.items[ref.key].source}
                                cta={r.open}
                                newTab={r.newTab}
                            />
                        ))}
                    </motion.ul>

                    {/* línea de cierre */}
                    <div className="font-hud mt-12 flex items-center gap-4 text-xs tracking-[0.25em] text-mist uppercase">
                        <span aria-hidden="true" className="flex flex-1 items-center gap-1.5">
                            {REFERENCES.map((ref) => (
                                <span key={ref.key} className="h-0.5 w-6 rounded-full bg-star" />
                            ))}
                            <span className="h-px flex-1 bg-paper/10" />
                        </span>
                    </div>
                </section>
            </main>

            <Footer />
        </MotionConfig>
    );
}
