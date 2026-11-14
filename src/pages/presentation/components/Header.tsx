import { Link } from "react-router";
import logo from "../../../assets/EON.svg";

const navLink =
  "rounded-full px-3 py-2 transition-colors hover:bg-paper/10 sm:px-4";

export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-paper/10 bg-night">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
        <div className="shrink-0">
          <Link to="/" aria-label="Ir al inicio de LOOK-EON">
            <img src={logo} alt="EON" className="h-10 w-auto" />
          </Link>
        </div>

        <nav
          className="flex items-center gap-0 text-sm font-semibold sm:gap-1 sm:text-base"
          aria-label="Navegación principal"
        >
          <Link to="/observatorio" className={navLink}>
            Observatorio
          </Link>

          <a href="#caracteristicas" className={navLink}>
            Características
          </a>

          <a href="#about" className={navLink}>
            Acerca de
          </a>
        </nav>
      </div>
    </header>
  );
}