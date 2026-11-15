import { Link } from 'react-router';
import { motion } from 'motion/react';
import { ArrowRight, ArrowUp } from 'lucide-react';
import logo from '../../../assets/EON.svg';
import { VIEWPORT, rise, stagger } from './motionPresets';

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
                className="absolute inset-x-0 -top-40 -z-10 mx-auto h-72 max-w-4xl rounded-full bg-[radial-gradient(ellipse_at_center,color-mix(in_oklab,var(--color-sky)_22%,transparent),transparent_70%)] blur-2xl"
            />

            {/* llamada a la acción */}
            <motion.div
                className="mx-auto max-w-6xl px-6 pt-16"
                variants={stagger(0.1)}
                initial="hidden"
                whileInView="show"
                viewport={VIEWPORT}
            >
                <div className="flex flex-col items-start justify-between gap-6 rounded-3xl border border-paper/10 bg-night-soft/70 p-8 md:flex-row md:items-center md:p-10">
                    <motion.div variants={rise}>
                        <p className="font-display text-2xl font-extrabold tracking-tight text-balance md:text-3xl">
                            El próximo hallazgo puede ser tuyo.
                        </p>
                        <p className="mt-2 text-mist">Explora el universo con LOOK-EON.</p>
                    </motion.div>
                    <motion.div variants={rise}>
                        <Link
                            to="/observatorio"
                            className="group inline-flex items-center gap-2 rounded-full bg-[color-mix(in_oklab,var(--color-star)_86%,black)] px-6 py-3 font-bold text-night transition-colors hover:bg-star"
                        >
                            Ir al Observatorio
                            <ArrowRight
                                aria-hidden="true"
                                className="size-4 transition-transform group-hover:translate-x-1 motion-reduce:transition-none"
                            />
                        </Link>
                    </motion.div>
                </div>
            </motion.div>

            {/* columnas */}
            <div className="mx-auto grid max-w-6xl gap-10 px-6 py-14 sm:grid-cols-2 md:grid-cols-[1.4fr_1fr_1fr]">
                <div>
                    <Link to="/" className="inline-block" aria-label="Ir al inicio de LOOK-EON">
                        <img src={logo} alt="EON" className="h-12 w-auto" />
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
