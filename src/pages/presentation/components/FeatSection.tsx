import FeatCard from './FeatCard';
import type { FeatCardProps } from './FeatCard';

const features: FeatCardProps[] = [
    {
        title: 'Timelapse del cielo',
        description:
            'Observa cómo cambia el cielo a través de imágenes capturadas en diferentes fechas.',
        to: '/timelapse',
        linkText: 'Explorar timelapse',
        tone: 'star',
        art: 'rings',
    },
    {
        title: 'Recopilación de fotografías satelitales',
        description:
            'Explora una colección de imágenes y descubre diferentes regiones del cosmos.',
        to: '/observatorio',
        linkText: 'Ver galería',
        tone: 'sky',
        art: 'frames',
    },
    {
        title: 'Encuentra las diferencias',
        description:
            'Pon a prueba tu capacidad de observación mediante un desafío astronómico.',
        to: '/exploracion',
        linkText: 'Comenzar desafío',
        tone: 'mint',
        art: 'split',
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

                <div className="mx-auto max-w-2xl text-center">
                    <h2
                        id="feat-title"
                        className="text-3xl font-extrabold tracking-tight text-balance lg:text-5xl"
                    >
                        Mucho más que una galería
                    </h2>

                    <p className="mt-4 text-lg text-dim">
                        Descubre diferentes formas de explorar el universo con LOOK-EON.
                    </p>
                </div>

                {/* group/list: permite atenuar las cards vecinas cuando una tiene el mouse encima */}
                <div className="group/list mt-12 grid gap-8 md:grid-cols-3 lg:mt-16">

                    {features.map((feature) => (
                        <FeatCard
                            key={feature.title}
                            {...feature}
                        />
                    ))}

                </div>

            </div>
        </section>
    );
}