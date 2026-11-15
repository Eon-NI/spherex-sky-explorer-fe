import { Link } from 'react-router';
import { Home } from 'lucide-react';
import logo from '../assets/EON.svg';
import CtaBanner from './CtaBanner';

const MODULES = [
    { label: 'Observatorio', to: '/observatorio' },
    { label: 'Timelapse', to: '/timelapse' },
    { label: 'Búsqueda por coordenadas', to: '/search' },
    { label: 'Análisis espectral', to: '/spectral' },
];

/** Footer del Observatorio y sus módulos */
export default function Footer() {
    return (
        <footer className="relative isolate overflow-hidden border-t border-paper/10 bg-night text-paper">
            <div className="mx-auto max-w-7xl px-5 pt-16 md:px-8 md:pt-20">
                <CtaBanner
                    
                    title={
                        <>
                            Gracias por explorar el cielo con <span className="text-star">LOOK-EON</span>.
                        </>
                    }
                    text="Vuelve al inicio para conocer más sobre la misión SPHEREx, el Planeta X y el equipo detrás del proyecto."
                    to="/"
                    label="Regresar al inicio"
                    icon={Home}
                    iconFirst
                />
            </div>

            <div className="mx-auto flex max-w-7xl flex-col gap-8 px-5 py-12 md:flex-row md:items-center md:justify-between md:px-8">
                <Link to="/" aria-label="Ir al inicio de LOOK-EON" className="inline-block">
                    <img src={logo} alt="Aetheris" className="h-11 w-auto" />
                </Link>

                <nav aria-label="Módulos del Observatorio">
                    <ul className="flex flex-wrap gap-x-6 gap-y-3">
                        {MODULES.map((m) => (
                            <li key={m.to}>
                                <Link
                                    to={m.to}
                                    className="text-mist underline-offset-4 transition-colors hover:text-paper hover:underline"
                                >
                                    {m.label}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </nav>
            </div>

            <div className="border-t border-paper/10">
                <p className="mx-auto max-w-7xl px-5 py-6 text-sm text-mist md:px-8">
                    EON © {new Date().getFullYear()}. Proyecto de exploración astronómica.
                </p>
            </div>
        </footer>
    );
}