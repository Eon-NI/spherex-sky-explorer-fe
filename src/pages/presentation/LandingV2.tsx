import { MotionConfig, motion } from 'motion/react';

import Header from './components/Header';
import Hero from '../presentation/components/Hero';
import TravelHook from '../presentation/components/TravelHook';
import InfoSection, { Highlight } from '../presentation/components/InfoSection';
import { HiddenWorldTrail, SpherexScan } from '../presentation/components/InfoOverlays';
import FeatSection from '../presentation/components/FeatSection';
import About from '../presentation/components/About';
import Footer from './components/Footer';
import { VIEWPORT, rise } from './components/motionPresets';
import { useI18n } from '../../i18n/useI18n';
import { rich } from '../../i18n/format';

import spherexImage from '../../assets/Spherex.webp';
import planetXImage from '../../assets/Plantex.webp';

export default function LandingV2() {
    const { m } = useI18n();
    const info = m.landing.info;
    return (
        // reducedMotion="user": con prefers-reduced-motion se quitan desplazamientos y escalas
        <MotionConfig reducedMotion="user">
            <Header />

            <main className="overflow-x-clip">
                {/* 1 · Presentación principal */}
                <Hero />

                {/* 2 · Descubrimiento por comparación temporal */}
                <TravelHook />

                {/* 3 y 4 · Información astronómica */}
                <section
                    id="caracteristicas"
                    aria-labelledby="astronomy-title"
                    className="scroll-mt-20 bg-night py-20 lg:py-28"
                >
                    <div className="mx-auto max-w-6xl px-6">
                        <motion.h2
                            id="astronomy-title"
                            variants={rise}
                            initial="hidden"
                            whileInView="show"
                            viewport={VIEWPORT}
                            className="mx-auto max-w-3xl text-center text-3xl font-extrabold tracking-tight text-balance lg:text-5xl"
                        >
                            {info.title}
                        </motion.h2>

                        <div className="mt-16 flex flex-col gap-20 lg:mt-24 lg:gap-32">
                            <InfoSection
                                id="spherex"
                                title={info.spherex.title}
                                description={rich(info.spherex.text, { hl: (t) => <Highlight>{t}</Highlight> })}
                                image={spherexImage}
                                imageAlt={info.spherex.imageAlt}
                                overlay={<SpherexScan />}
                            />

                            <InfoSection
                                id="planet-x"
                                title={info.planetX.title}
                                description={info.planetX.text}
                                image={planetXImage}
                                imageAlt={info.planetX.imageAlt}
                                overlay={<HiddenWorldTrail />}
                                caption={info.planetX.caption}
                                reverse
                            />
                        </div>
                    </div>
                </section>

                {/* 5 · Funcionalidades */}
                <FeatSection />

                {/* Acerca del equipo */}
                <About />
            </main>

            <Footer />
        </MotionConfig>
    );
}
