import { Link } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import logo from '../assets/Aetheris.svg';
import { useI18n } from '../i18n/useI18n';
import LanguageSwitcher from '../i18n/LanguageSwitcher';

/* Mismo estilo que los enlaces del header de la landing (presentation/components/Header.tsx) */
const navLink =
  'inline-flex items-center gap-2 rounded-full px-3 py-2 transition-colors hover:bg-paper/10 sm:px-4';

/**
 * Header del Observatorio y sus módulos (Timelapse, Search, Spectral).
 * Misma medida y apariencia que el de la landing; como las anclas
 * Características / Acerca de no existen aquí, el único enlace es volver al inicio.
 */
export default function Header() {
  const { m } = useI18n();

  return (
    <header className="sticky top-0 z-50 border-b border-paper/10 bg-night">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <div className="shrink-0">
          <Link to="/" aria-label={m.common.homeAria}>
            <img src={logo} alt={m.common.logoAlt} className="h-9 w-auto sm:h-10" />
          </Link>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <nav className="flex items-center text-base font-semibold" aria-label={m.common.mainNav}>
            <Link to="/" className={`group ${navLink}`}>
              <ArrowLeft
                aria-hidden="true"
                className="size-4 transition-transform group-hover:-translate-x-0.5 motion-reduce:transition-none"
              />
              {m.observatory.header.back}
            </Link>
          </nav>
          <LanguageSwitcher />
        </div>
      </div>
    </header>
  );
}
