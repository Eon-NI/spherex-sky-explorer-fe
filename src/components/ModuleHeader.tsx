import type { ReactNode } from 'react';
import { USE_MOCK } from '../api/spherex';

/**
 * Encabezado compacto de los módulos del Observatorio:
 * una sola franja para que la herramienta quede visible al entrar.
 */
export default function ModuleHeader({
    eyebrow,
    title,
    text,
}: {
    eyebrow: string;
    title: ReactNode;
    text: string;
}) {
    return (
        <div className="mb-4 flex flex-wrap items-end justify-between gap-x-8 gap-y-2">
            <div>
                <p className="font-hud text-xs font-medium tracking-[0.25em] text-star uppercase">{eyebrow}</p>
                <h1 className="mt-1 text-2xl font-extrabold text-paper md:text-3xl">{title}</h1>
            </div>
            <div className="flex items-center gap-3">
                <p className="hidden max-w-md text-sm leading-snug text-mist lg:block">{text}</p>
                {USE_MOCK && (
                    <span className="font-hud shrink-0 rounded-full border border-star/30 bg-star/10 px-3 py-1 text-xs text-star">
                        Datos simulados
                    </span>
                )}
            </div>
        </div>
    );
}