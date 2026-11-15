import { useLayoutEffect } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
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
      <main className="bg-night min-h-screen text-paper motion-safe:animate-screen-in">
        <TimelapseModule />
      </main>
      <Footer />
    </>
  );
}
