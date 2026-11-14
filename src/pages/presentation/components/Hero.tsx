import { Link } from 'react-router';

export default function Hero() {
  return (
    <section className="bg-night py-24 sm:py-32 lg:py-40">
      <div className="mx-auto flex max-w-6xl flex-col items-center px-6 text-center">

        <h1 className="max-w-5xl text-5xl leading-[1.02] font-extrabold tracking-tight text-balance sm:text-6xl lg:text-7xl xl:text-8xl">
          EXPLORA Y DESCUBRE EL CIELO
          VISUALIZANDO A TRAVES DEL TIEMPO
        </h1>

        <p className="mt-8 text-xl font-semibold text-paper sm:text-2xl">
          Recorre el cosmos con <i>LOOK-EON</i>.
        </p>

        <Link
          to="/observatorio"
          className="mt-10 inline-flex items-center justify-center rounded-full bg-star px-8 py-4 text-lg font-bold text-night transition-colors hover:bg-star-hover"
        >
          Comenzar exploración
        </Link>

        <p className="mt-10 max-w-xl text-base text-mist">
          Una herramienta para descubrir y explorar
          imágenes astronómicas a través del tiempo.
        </p>

      </div>
    </section>
  );
}