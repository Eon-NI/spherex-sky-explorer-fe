import logo from '../../../assets/EON.svg';

export default function AboutSection() {
    return (
        <section
            id="about"
            aria-labelledby="about-title"
            className="scroll-mt-20 bg-night-soft py-20 lg:py-28"
        >

            <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 md:grid-cols-[auto_1fr] md:gap-20">

                <div className="mx-auto md:mx-0">
                    <img src={logo} alt="Logo EON" className="w-44 md:w-64" />
                </div>

                <div className="max-w-2xl">

                    <h2
                        id="about-title"
                        className="text-3xl font-extrabold tracking-tight text-balance lg:text-5xl"
                    >
                        Somos EON
                    </h2>

                    {/* Primer párrafo más destacado: marca la jerarquía del bloque */}
                    <p className="mt-6 text-xl leading-relaxed text-paper">
                        Somos un equipo de estudiantes apasionados
                        por la tecnología y la astronomía.
                    </p>

                    <p className="mt-4 text-lg leading-relaxed text-mist">
                        A través de LOOK-EON buscamos acercar la
                        exploración astronómica a los usuarios,
                        permitiéndoles descubrir el cielo y explorar
                        sus cambios a través del tiempo.
                    </p>

                </div>

            </div>

        </section>
    );
}