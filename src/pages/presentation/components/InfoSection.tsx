type InfoSectionProps = {
    id: string;
    title: string;
    description: string;
    image: string;
    imageAlt: string;
    reverse?: boolean;
};

export default function InfoSection({
    id,
    title,
    description,
    image,
    imageAlt,
    reverse = false,
}: InfoSectionProps) {
    return (
        <article
            id={id}
            aria-labelledby={`${id}-title`}
            className="grid scroll-mt-24 items-center gap-8 lg:grid-cols-2 lg:gap-16"
        >

            {/* En móvil la imagen va primero; en escritorio, `reverse` la pasa a la derecha */}
            <figure
                className={`overflow-hidden rounded-3xl bg-night-soft ${reverse ? 'lg:order-2' : ''
                    }`}
            >
                <img
                    src={image}
                    alt={imageAlt}
                    className="aspect-4/3 w-full object-cover"
                />
            </figure>

            <div className="max-w-xl">

                {/* h3 porque la sección padre ya tiene un h2 */}
                <h3
                    id={`${id}-title`}
                    className="text-3xl font-extrabold tracking-tight text-balance lg:text-4xl"
                >
                    {title}
                </h3>

                <p className="mt-4 text-lg leading-relaxed text-mist">
                    {description}
                </p>

            </div>

        </article>
    );
}