import { useLayoutEffect } from 'react';
import Header from './presentation/components/Header';
import Footer from './presentation/components/Footer';
import SpectralModule from '../components/spectral_components/SpectralModule';

export default function Spectral() {
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <>
      <Header />
      <main className="bg-nasa min-h-screen text-white motion-safe:animate-screen-in">
        <SpectralModule />
      </main>
      <Footer />
    </>
  );
}
