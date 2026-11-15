import { useEffect, useState } from "react";
import { Link } from "react-router";
import { Menu, X } from "lucide-react";
import logo from "../../../assets/EON.svg";

const navLink =
  "rounded-full px-3 py-2 transition-colors hover:bg-paper/10 sm:px-4";

const links = [
  { label: "Observatorio", to: "/observatorio" },
  { label: "Características", href: "#caracteristicas" },
  { label: "Acerca de", href: "#about" },
];

export default function Header() {
  const [open, setOpen] = useState(false);

  // cierra el menú móvil con Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const item = (l: (typeof links)[number], className: string) =>
    l.to ? (
      <Link key={l.label} to={l.to} className={className} onClick={() => setOpen(false)}>
        {l.label}
      </Link>
    ) : (
      <a key={l.label} href={l.href} className={className} onClick={() => setOpen(false)}>
        {l.label}
      </a>
    );

  return (
    <header className="sticky top-0 z-50 border-b border-paper/10 bg-night">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <div className="shrink-0">
          <Link to="/" aria-label="Ir al inicio de LOOK-EON">
            <img src={logo} alt="EON" className="h-9 w-auto sm:h-10" />
          </Link>
        </div>

        {/* Escritorio / tablet */}
        <nav
          className="hidden items-center gap-1 text-base font-semibold sm:flex"
          aria-label="Navegación principal"
        >
          {links.map((l) => item(l, navLink))}
        </nav>

        {/* Móvil: menú desplegable, así la barra nunca provoca scroll horizontal */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? "Cerrar menú" : "Abrir menú"}
          className="flex size-10 items-center justify-center rounded-full transition-colors hover:bg-paper/10 sm:hidden"
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {open && (
        <nav
          id="mobile-nav"
          aria-label="Navegación principal"
          className="flex flex-col gap-1 border-t border-paper/10 px-4 py-3 text-base font-semibold sm:hidden"
        >
          {links.map((l) => item(l, "rounded-xl px-3 py-3 transition-colors hover:bg-paper/10"))}
        </nav>
      )}
    </header>
  );
}
