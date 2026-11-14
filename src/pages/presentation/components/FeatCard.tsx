import { Link } from 'react-router';

export type FeatTone = 'star' | 'sky' | 'mint';
export type FeatArt = 'rings' | 'frames' | 'split';

export type FeatCardProps = {
    title: string;
    description: string;
    to: string;
    image?: string;
    imageAlt?: string;
    linkText: string;
    tone?: FeatTone;
    art?: FeatArt;
};

const TONES: Record<FeatTone, string> = {
    star: 'bg-star',
    sky: 'bg-sky',
    mint: 'bg-mint',
};


function CardArt({ variant }: { variant: FeatArt }) {
    const svg = 'mx-auto mt-auto w-full max-w-72 pt-8';
    const move = 'transition-transform duration-500 motion-reduce:transition-none';

    if (variant === 'frames') {
        return (
            <svg viewBox="0 0 240 180" aria-hidden="true" focusable="false" className={svg}>
                <g className="fill-paper/70 stroke-night" strokeWidth={3}>
                    <rect x="70" y="30" width="100" height="140" rx="12"
                        className={`origin-bottom [transform-box:fill-box] -rotate-8 group-hover/card:-rotate-16 ${move}`} />
                    <rect x="70" y="30" width="100" height="140" rx="12"
                        className={`origin-bottom [transform-box:fill-box] rotate-8 group-hover/card:rotate-16 ${move}`} />
                    <rect x="70" y="30" width="100" height="140" rx="12" />
                </g>
            </svg>
        );
    }

    if (variant === 'split') {
        return (
            <svg viewBox="0 0 240 180" aria-hidden="true" focusable="false" className={svg}>
                <circle cx="92" cy="110" r="62" strokeWidth={3}
                    className={`fill-none stroke-night group-hover/card:-translate-x-3 ${move}`} />
                <circle cx="148" cy="110" r="62"
                    className={`fill-night/90 group-hover/card:translate-x-3 ${move}`} />
            </svg>
        );
    }

    return (
        <svg viewBox="0 0 240 150" aria-hidden="true" focusable="false" className={svg}>
            <g className="fill-none stroke-night" strokeWidth={3}>
                {[36, 68, 100, 132].map((r, i) => (
                    <circle
                        key={r}
                        cx="120"
                        cy="150"
                        r={r}
                        style={{ transitionDelay: `${i * 60}ms` }}
                        className={`origin-center [transform-box:fill-box] group-hover/card:scale-110 ${move}`}
                    />
                ))}
            </g>
        </svg>
    );
}

export default function FeatCard({
    title,
    description,
    to,
    image,
    imageAlt,
    linkText,
    tone = 'star',
    art = 'rings',
}: FeatCardProps) {
    return (
       
        <article className="group/card relative flex flex-col gap-5 transition-opacity duration-300 motion-reduce:transition-none group-hover/list:[&:not(:hover)]:opacity-40 group-focus-within/list:[&:not(:focus-within)]:opacity-40">

            <div
                className={`flex min-h-[30rem] flex-1 flex-col overflow-hidden rounded-3xl px-6 pt-8 lg:min-h-[38rem] ${TONES[tone]}`}
            >

                <h3 className="text-center text-2xl font-extrabold tracking-tight text-balance text-night lg:text-3xl">
                    {title}
                </h3>

                <p className="mt-3 text-center text-night/80">{description}</p>

                {image ? (
                    <figure className="mt-auto pt-8">
                        <img
                            src={image}
                            alt={imageAlt ?? title}
                            className="h-72 w-full translate-y-6 rounded-t-2xl object-cover object-top transition-transform duration-500 group-hover/card:translate-y-0 motion-reduce:transition-none"
                        />
                    </figure>
                ) : (
                    <CardArt variant={art} />
                )}

            </div>

           
            <Link
                to={to}
                className="mx-auto inline-flex items-center justify-center rounded-full bg-night px-6 py-3 font-bold text-paper transition duration-300 after:absolute after:inset-0 motion-reduce:transition-none [@media(hover:hover)]:translate-y-2 [@media(hover:hover)]:opacity-0 group-hover/card:translate-y-0 group-hover/card:opacity-100 group-focus-within/card:translate-y-0 group-focus-within/card:opacity-100"
            >
                {linkText}
            </Link>

        </article>
    );
}