import { useLayoutEffect } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import SpectralModule from '../components/spectral_components/SpectralModule';

export default function Spectral() {
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <>
      <Header />
      <main className="bg-night min-h-screen text-paper motion-safe:animate-screen-in">
        <SpectralModule />
      </main>
      <Footer />
    </>
  );
}
