import Header from './components/Header';
import Hero from '../presentation/components/Hero';
import TravelHook from '../presentation/components/TravelHook';
import InfoSection from '../presentation/components/InfoSection';
import FeatSection from '../presentation/components/FeatSection';
import About from '../presentation/components/About';
import Footer from './components/Footer';

import spherexImage from '../../assets/Spherex.webp';
import planetXImage from '../../assets/Plantex.webp';

export default function LandingV2() {
    return (
        <>
            <Header />

            <main>

                {/* Presentación principal */}
                <Hero />

                {/* Invitación a explorar el cielo */}
                <TravelHook />

                {/* Información astronómica */}
                <section
                    id="caracteristicas"
                    aria-labelledby="astronomy-title"
                    className="scroll-mt-20 bg-night py-20 lg:py-28"
                >
                    <div className="mx-auto max-w-6xl px-6">

                        <h2
                            id="astronomy-title"
                            className="mx-auto max-w-3xl text-center text-3xl font-extrabold tracking-tight text-balance lg:text-5xl"
                        >
                            Conoce el universo detrás de LOOK-EON
                        </h2>

                        <div className="mt-16 flex flex-col gap-20 lg:mt-24 lg:gap-32">

                            <InfoSection
                                id="spherex"
                                title="¿Qué es SPHEREx?"
                                description="SPHEREx es una misión espacial de la NASA que observa el cielo en luz infrarroja. Su objetivo es estudiar millones de galaxias y obtener información sobre el origen y la evolución del universo."
                                image={spherexImage}
                                imageAlt="Imagen astronómica de SPHEREx"
                            />

                            <InfoSection
                                id="planet-x"
                                title="¿Qué es Planet X?"
                                description="Aquí presentaremos la información relacionada con Planet X y su conexión con nuestra propuesta de exploración astronómica."
                                image={planetXImage}
                                imageAlt="Imagen astronómica de Planet X"
                                reverse
                            />

                        </div>

                    </div>
                </section>

                {/* Funcionalidades */}
                <FeatSection />

                {/* Acerca del equipo */}
                <About />

            </main>

            <Footer />
        </>
    );
}