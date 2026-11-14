import { Link } from 'react-router';
import logo from '../../../assets/EON.svg';

const footerLink = "font-semibold underline-offset-4 hover:underline";

export default function Footer() {
    return (
        <footer className="border-t border-paper/10 bg-night text-paper">

            <div className="mx-auto grid max-w-6xl gap-10 px-6 py-14 md:grid-cols-[1fr_auto]">

                <div>
                    <Link to="/" className="inline-block">
                        <img src={logo} alt="EON" className="h-12 w-auto" />
                    </Link>

                    <p className="mt-4 max-w-xs text-mist">
                        Explora el universo con LOOK-EON.
                    </p>
                </div>

                <nav
                    className="flex flex-col gap-3"
                    aria-label="Navegación del pie de página"
                >
                    <Link to="/observatorio" className={footerLink}>
                        Observatorio
                    </Link>

                    <a href="#caracteristicas" className={footerLink}>
                        Características
                    </a>

                    <a href="#about" className={footerLink}>
                        Acerca de EON
                    </a>
                </nav>

            </div>

            <div className="border-t border-paper/10">
                <p className="mx-auto max-w-6xl px-6 py-6 text-sm text-mist">
                    EON © {new Date().getFullYear()}.
                    Proyecto de exploración astronómica.
                </p>
            </div>

        </footer>
    );
}