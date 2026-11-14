import { useLayoutEffect } from 'react';
import Header from './presentation/components/Header';
import Footer from './presentation/components/Footer';
import TimelapseModule from '../components/timelapse_components/TimelapseModule';

export default function TimeLapse() {
  // al llegar desde el tour (que está muy abajo en su página) empezamos arriba
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <>
      <Header />
      {/* animate-screen-in: continúa el zoom de la pantalla del satélite */}
      <main className="bg-nasa min-h-screen text-white motion-safe:animate-screen-in">
        <TimelapseModule />
      </main>
      <Footer />
    </>
  );
}
