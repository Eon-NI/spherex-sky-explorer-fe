import type { Variants } from 'motion/react';

/**
 * Lenguaje de movimiento de la landing.
 * Curva de salida larga y suave: los elementos "emergen" desde la profundidad
 * (desenfoque + desplazamiento corto) en lugar de rebotar.
 */
export const EASE_OUT = [0.22, 1, 0.36, 1] as const;

/** Sección visible al ~25 %: se anima una sola vez y luego queda fija */
export const VIEWPORT = { once: true, amount: 0.25 } as const;

/** Aparición desde la profundidad: sube, se enfoca y gana opacidad */
export const rise: Variants = {
    hidden: { opacity: 0, y: 32, filter: 'blur(10px)' },
    show: {
        opacity: 1,
        y: 0,
        filter: 'blur(0px)',
        transition: { duration: 0.9, ease: EASE_OUT },
    },
};

/** Contenedor que escalona a sus hijos */
export const stagger = (each = 0.12, delay = 0): Variants => ({
    hidden: {},
    show: { transition: { staggerChildren: each, delayChildren: delay } },
});

/** Imagen que se revela de abajo arriba mientras se "aleja" */
export const revealFrame: Variants = {
    hidden: { clipPath: 'inset(100% 0% 0% 0%)' },
    show: {
        clipPath: 'inset(0% 0% 0% 0%)',
        transition: { duration: 1.1, ease: EASE_OUT },
    },
};

export const revealImage: Variants = {
    hidden: { scale: 1.18 },
    show: { scale: 1, transition: { duration: 1.6, ease: EASE_OUT } },
};
