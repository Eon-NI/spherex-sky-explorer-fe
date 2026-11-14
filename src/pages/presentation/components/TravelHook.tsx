import { Link } from 'react-router';
import { PlanetArt, SatelliteArt } from './HookArt';

export default function TravelHook() {
    return (
        <section
            aria-labelledby="travel-hook-title"
            className="relative isolate overflow-hidden bg-paper py-28 text-night [--focus:var(--color-night)] lg:py-40"
        >

            {/* Gráficos decorativos: planeta arriba a la derecha, satélite abajo a la izquierda */}
            <PlanetArt className="pointer-events-none absolute -top-10 -right-10 -z-10 w-40 sm:-top-14 sm:-right-12 sm:w-56 md:w-64 lg:-right-10 lg:w-80 xl:right-6 xl:w-96" />
            <SatelliteArt className="pointer-events-none absolute -bottom-10 -left-10 -z-10 w-40 sm:-bottom-14 sm:-left-12 sm:w-52 md:w-60 lg:-left-8 lg:w-72 xl:left-8 xl:w-80" />

            <div className="mx-auto flex max-w-2xl flex-col items-center px-6 text-center">

                <h2
                    id="travel-hook-title"
                    className="text-3xl font-extrabold tracking-tight text-balance sm:text-4xl lg:text-5xl"
                >
                    ¿Quieres saber cómo se veía
                    nuestro cielo hace unos años?
                </h2>

                <p className="mt-6 max-w-xl text-lg text-dim">
                    Viaja a través del tiempo y descubre
                    cómo ha cambiado el cielo.
                </p>

                <Link
                    to="/observatorio"
                    className="mt-10 inline-flex items-center justify-center rounded-full bg-night px-8 py-4 text-lg font-bold text-paper transition-colors hover:bg-night-soft"
                >
                    Descúbrelo en el observatorio
                </Link>

            </div>

        </section>
    );
}