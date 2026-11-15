import { Link } from 'react-router';
import { ArrowRight, ArrowUp } from 'lucide-react';
import logo from '../../../assets/EON.svg';
import CtaBanner from '../../../components/CtaBanner';

const footerLink =
    'inline-flex w-fit text-mist transition-colors hover:text-paper focus-visible:text-paper underline-offset-4 hover:underline';

const EXPLORE = [
    { label: 'Observatorio', to: '/observatorio' },
    { label: 'Timelapse', to: '/timelapse' },
    { label: 'Búsqueda por coordenadas', to: '/search' },
    { label: 'Análisis espectral', to: '/spectral' },
];

const PROJECT = [
    { label: 'Características', href: '#caracteristicas' },
    { label: 'Funcionalidades', href: '#servicios' },
    { label: 'Acerca de EON', href: '#about' },
];

export default function Footer() {
    return (
        <footer className="relative isolate overflow-hidden border-t border-paper/10 bg-night text-paper">
            {/* horizonte luminoso */}
            <div
                aria-hidden="true"
                className="absolute inset-x-0 -top-40 -z-10 mx-auto h-72 max-w-4xl rounded-full bg-[radial-gradient(ellipse_at_center,color-mix(in_oklab,var(--color-star)_12%,transparent),transparent_70%)] blur-2xl"
            />

            {/* llamada a la acción */}
            <div className="mx-auto max-w-6xl px-6 pt-16 md:pt-20">
                <CtaBanner
                    
                    title={
                        <>
                            El próximo hallazgo puede ser <span className="text-star">tuyo</span>.
                        </>
                    }
                    text="Compara épocas, busca por coordenadas y analiza 102 bandas infrarrojas. Explora el universo con LOOK-EON."
                    to="/observatorio"
                    label="Iniciar exploración en el Observatorio"
                    icon={ArrowRight}
                />
            </div>

            {/* columnas */}
            <div className="mx-auto grid max-w-6xl gap-10 px-6 py-14 sm:grid-cols-2 md:grid-cols-[1.4fr_1fr_1fr]">
                <div>
                    <Link to="/" className="inline-block" aria-label="Ir al inicio de LOOK-EON">
                        <img src={logo} alt="Aetheris" className="h-12 w-auto" />
                    </Link>
                    <p className="mt-4 max-w-xs text-mist">
                        Proyecto de exploración astronómica con datos de la misión SPHEREx de la NASA.
                    </p>
                </div>

                <nav aria-label="Explorar">
                    <p className="text-xs font-bold tracking-wider text-paper/60 uppercase">Explorar</p>
                    <ul className="mt-4 flex flex-col gap-3">
                        {EXPLORE.map((l) => (
                            <li key={l.to}>
                                <Link to={l.to} className={footerLink}>
                                    {l.label}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </nav>

                <nav aria-label="Navegación del pie de página">
                    <p className="text-xs font-bold tracking-wider text-paper/60 uppercase">Proyecto</p>
                    <ul className="mt-4 flex flex-col gap-3">
                        {PROJECT.map((l) => (
                            <li key={l.href}>
                                <a href={l.href} className={footerLink}>
                                    {l.label}
                                </a>
                            </li>
                        ))}
                    </ul>
                </nav>
            </div>

            {/* barra inferior */}
            <div className="border-t border-paper/10">
                <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-6 text-sm text-mist sm:flex-row sm:items-center sm:justify-between">
                    <p>EON © {new Date().getFullYear()}. Proyecto de exploración astronómica.</p>
                    <a
                        href="#top"
                        onClick={(e) => {
                            e.preventDefault();
                            window.scrollTo({
                                top: 0,
                                behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
                                    ? 'auto'
                                    : 'smooth',
                            });
                        }}
                        className="group inline-flex w-fit items-center gap-2 rounded-full border border-paper/15 px-4 py-2 font-semibold text-paper transition-colors hover:border-paper/40"
                    >
                        Volver arriba
                        <ArrowUp
                            aria-hidden="true"
                            className="size-4 transition-transform group-hover:-translate-y-0.5 motion-reduce:transition-none"
                        />
                    </a>
                </div>
            </div>
        </footer>
    );
}