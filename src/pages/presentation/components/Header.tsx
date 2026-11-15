import { useEffect, useState } from "react";
import { Link } from "react-router";
import { Menu, X } from "lucide-react";
import logo from "../../../assets/Aetheris.svg";
import { useI18n } from "../../../i18n/useI18n";
import LanguageSwitcher from "../../../i18n/LanguageSwitcher";

const navLink =
  "rounded-full px-3 py-2 transition-colors hover:bg-paper/10 sm:px-4";

type NavItem = { key: "observatory" | "features" | "about"; to?: string; href?: string };

const links: NavItem[] = [
  { key: "observatory", to: "/observatorio" },
  { key: "features", href: "#caracteristicas" },
  { key: "about", href: "#about" },
];

export default function Header() {
  const { m } = useI18n();
  const [open, setOpen] = useState(false);

  // cierra el menú móvil con Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const item = (l: NavItem, className: string) => {
    const label = m.landing.nav[l.key];
    return l.to ? (
      <Link key={l.key} to={l.to} className={className} onClick={() => setOpen(false)}>
        {label}
      </Link>
    ) : (
      <a key={l.key} href={l.href} className={className} onClick={() => setOpen(false)}>
        {label}
      </a>
    );
  };

  return (
    <header className="sticky top-0 z-50 border-b border-paper/10 bg-night">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <div className="shrink-0">
          <Link to="/" aria-label={m.common.homeAria}>
            <img src={logo} alt={m.common.logoAlt} className="h-9 w-auto sm:h-10" />
          </Link>
        </div>

        {/* Escritorio / tablet */}
        <div className="hidden items-center gap-3 sm:flex">
          <nav className="flex items-center gap-1 text-base font-semibold" aria-label={m.common.mainNav}>
            {links.map((l) => item(l, navLink))}
          </nav>
          <LanguageSwitcher />
        </div>

        {/* Móvil: idioma + menú desplegable, así la barra nunca provoca scroll horizontal */}
        <div className="flex items-center gap-2 sm:hidden">
          <LanguageSwitcher />
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? m.landing.nav.closeMenu : m.landing.nav.openMenu}
            className="flex size-10 items-center justify-center rounded-full transition-colors hover:bg-paper/10"
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {open && (
        <nav
          id="mobile-nav"
          aria-label={m.common.mainNav}
          className="flex flex-col gap-1 border-t border-paper/10 px-4 py-3 text-base font-semibold sm:hidden"
        >
          {links.map((l) => item(l, "rounded-xl px-3 py-3 transition-colors hover:bg-paper/10"))}
        </nav>
      )}
    </header>
  );
}
