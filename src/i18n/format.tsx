import { Fragment, type ReactNode } from 'react';

/** Sustituye {{variable}} en un texto: fmt('Canal {{n}}', { n: 3 }) */
export function fmt(text: string, vars: Record<string, string | number>) {
    return text.replace(/\{\{(\w+)\}\}/g, (_, k: string) => String(vars[k] ?? `{{${k}}}`));
}

/**
 * Convierte etiquetas simples del JSON en elementos de React:
 * rich('Puede ser <hl>tuyo</hl>.', { hl: (t) => <span className="text-star">{t}</span> })
 */
export function rich(text: string, tags: Record<string, (chunk: string) => ReactNode>): ReactNode {
    const parts: ReactNode[] = [];
    const re = /<(\w+)>(.*?)<\/\1>/g;
    let last = 0;
    let match: RegExpExecArray | null;
    let i = 0;
    while ((match = re.exec(text))) {
        if (match.index > last) parts.push(text.slice(last, match.index));
        const render = tags[match[1]];
        parts.push(<Fragment key={i++}>{render ? render(match[2]) : match[2]}</Fragment>);
        last = match.index + match[0].length;
    }
    if (last < text.length) parts.push(text.slice(last));
    return parts;
}
