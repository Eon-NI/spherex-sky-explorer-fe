import { Link, useLocation } from 'react-router';
import { ArrowLeft, Home } from 'lucide-react';
import logo from '../assets/Aetheris.svg';
import { useI18n } from '../i18n/useI18n';
import LanguageSwitcher from '../i18n/LanguageSwitcher';

/* Mismo estilo que los enlaces del header de la landing (presentation/components/Header.tsx) */
const navLink =
  'inline-flex items-center gap-2 rounded-full px-3 py-2 transition-colors hover:bg-paper/10 sm:px-4';

/* Botón amarillo, igual que los botones star del resto del sitio */
const starButton =
  'group inline-flex items-center gap-2 rounded-full bg-star px-3 py-2 text-night shadow-[0_8px_24px_-12px_color-mix(in_oklab,var(--color-star)_70%,transparent)] transition-colors hover:bg-star-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-star sm:px-4';

/**
 * Header del Observatorio y sus módulos (Timelapse, Search, Spectral).
 * Misma medida y apariencia que el de la landing.
 * - En /observatorio: solo "Volver a Inicio".
 * - En los módulos: además, un botón amarillo "Volver al Observatorio";
 *   el enlace a Inicio se reduce al icono en tablet y se oculta en móvil (el logo ya lleva al inicio).
 */
export default function Header() {
  const { m } = useI18n();
  const { pathname } = useLocation();
  const h = m.observatory.header;
  const inModule = pathname !== '/observatorio';

  return (
    <header className="sticky top-0 z-50 border-b border-paper/10 bg-night">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:gap-4 sm:px-6">
        <div className="shrink-0">
          <Link to="/" aria-label={m.common.homeAria}>
            <img src={logo} alt={m.common.logoAlt} className="h-9 w-auto sm:h-10" />
          </Link>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <nav className="flex items-center gap-1 text-base font-semibold sm:gap-2" aria-label={m.common.mainNav}>
            {inModule ? (
              <>
                {/* en móvil se oculta: el logo ya lleva al inicio */}
                <Link to="/" className={`${navLink.replace('inline-flex', 'hidden sm:inline-flex')}`} aria-label={h.back}>
                  
                  <span className="hidden md:inline">{h.back}</span>
                </Link>
                <Link to="/observatorio" className={starButton}>
                  <ArrowLeft
                    aria-hidden="true"
                    className="size-4 transition-transform group-hover:-translate-x-0.5 motion-reduce:transition-none"
                  />
                  <span className="sm:hidden">{h.backObservatoryShort}</span>
                  <span className="hidden sm:inline">{h.backObservatory}</span>
                </Link>
              </>
            ) : (
              <Link to="/" className={`group ${navLink}`}>
                <ArrowLeft
                  aria-hidden="true"
                  className="size-4 transition-transform group-hover:-translate-x-0.5 motion-reduce:transition-none"
                />
                {h.back}
              </Link>
            )}
          </nav>
          <LanguageSwitcher />
        </div>
      </div>
    </header>
  );
}
