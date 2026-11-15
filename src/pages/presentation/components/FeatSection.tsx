import { motion } from 'motion/react';
import FeatCard from './FeatCard';
import type { FeatCardProps } from './FeatCard';
import { VIEWPORT, rise, stagger } from './motionPresets';

const features: FeatCardProps[] = [
    {
        label: 'Vista por Tiempo',
        title: '1. Evolución Temporal (Timelapse)',
        description:
            'Visualiza secuencias de imágenes capturadas cada 6 meses a modo de video o resta capturas entre distintas fechas. Identifica al instante asteroides, cometas y objetos cercanos por su desplazamiento en el cielo.',
        to: '/timelapse',
        linkText: 'Abrir Timelapse',
        tone: 'star',
        art: 'timeline',
    },
    {
        label: 'Vista por Búsqueda (Coordenadas)',
        title: '2. Exploración por Coordenadas',
        description:
            'Navega por cualquier región del cosmos ingresando su Ascensión Recta (RA) y Declinación (Dec). Ajusta el campo de visión para rastrear fuentes rápidas y comparte hallazgos mediante enlaces directos.',
        to: '/search',
        linkText: 'Buscar por coordenadas',
        tone: 'sky',
        art: 'coords',
    },
    {
        label: 'Vista por Espectro',
        title: '3. Análisis Espectral Infrarrojo',
        description:
            'Explora las 102 bandas de luz infrarroja de SPHEREx y los 6 conjuntos de detectores. Filtra longitudes de onda para distinguir la composición química de estrellas, enanas marrones y galaxias.',
        to: '/spectral',
        linkText: 'Analizar el espectro',
        tone: 'blue',
        art: 'spectrum',
    },
];

export default function FeatSection() {
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
                        className="font-display text-3xl font-extrabold tracking-tight text-balance lg:text-5xl"
                    >
                        Mucho más que una galería
                    </motion.h2>

                    <motion.p variants={rise} className="mt-4 text-lg text-dim">
                        Descubre diferentes formas de explorar el universo con LOOK-EON.
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
                    {features.map((feature) => (
                        <FeatCard key={feature.title} {...feature} />
                    ))}
                </motion.div>
            </div>
        </section>
    );
}
