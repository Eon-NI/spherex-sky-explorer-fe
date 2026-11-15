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

import spherexImage from '../../assets/Spherex.webp';
import planetXImage from '../../assets/Plantex.webp';

export default function LandingV2() {
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
                            className="font-display mx-auto max-w-3xl text-center text-3xl font-extrabold tracking-tight text-balance lg:text-5xl"
                        >
                            Conoce el universo detrás de LOOK-EON
                        </motion.h2>

                        <div className="mt-16 flex flex-col gap-20 lg:mt-24 lg:gap-32">
                            <InfoSection
                                id="spherex"
                                title="¿Qué es la misión SPHEREx?"
                                description={
                                    <>
                                        Lanzada en <Highlight>2025</Highlight>, SPHEREx es el observatorio
                                        espacial de la NASA que escanea la totalidad del cielo{' '}
                                        <Highlight>cada seis meses</Highlight>. A diferencia de los
                                        telescopios convencionales, observa el cosmos en{' '}
                                        <Highlight>102 bandas</Highlight> de luz infrarroja cercana,
                                        permitiendo detectar la huella química de moléculas esenciales
                                        como agua, carbono e hidrógeno en más de mil millones de objetos
                                        (desde galaxias lejanas y cuásares hasta cometas cercanos).
                                    </>
                                }
                                image={spherexImage}
                                imageAlt="Imagen astronómica de SPHEREx"
                                overlay={<SpherexScan />}
                            />

                            <InfoSection
                                id="planet-x"
                                title="En la búsqueda del Planeta X y mundos ocultos"
                                description="En los confines de nuestro sistema solar y más allá, existen cuerpos celestes demasiado fríos y oscuros para verse a simple vista: desde enanas marrones (cuerpos masivos a medio camino entre un planeta gigante y una estrella) hasta el hipotético Planeta X. Aunque apenas emiten luz visible, brillan en el espectro infrarrojo de SPHEREx y delatan su presencia al desplazarse lentamente entre una captura temporal y otra. Con LOOK-EON, cualquier persona puede rastrear estas anomalías en movimiento."
                                image={planetXImage}
                                imageAlt="Campo estelar con un objeto tenue que brilla en infrarrojo"
                                overlay={<HiddenWorldTrail />}
                                caption="Ilustración: el objeto marcado representa un mundo hipotético; no es una observación real."
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
