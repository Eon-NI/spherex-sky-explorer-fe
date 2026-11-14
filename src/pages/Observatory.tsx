import Header from './presentation/components/Header';
import Footer from './presentation/components/Footer';
import ObservatoryTour from '../components/tour/ObservatoryTour';

export default function Observatory() {
  return (
    <>
      <Header />
      <main className="bg-[#05070f] text-white">
        <ObservatoryTour
          onSurprise={() =>
            document.getElementById('sorpresa')?.scrollIntoView({ behavior: 'smooth' })
          }
        />

        {/* Aquí van tus módulos reales: Timelapse, Search, Spectral... */}
        <section id="sorpresa" className="min-h-screen px-6 py-24">
          Módulo sorpresa
        </section>
      </main>
      <Footer />
    </>
  );
}