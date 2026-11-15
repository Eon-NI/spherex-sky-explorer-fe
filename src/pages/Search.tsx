import { useLayoutEffect } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import SearchModule from '../components/search_components/SearchModule';

export default function Search() {
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <>
      <Header />
      <main className="bg-night min-h-screen text-paper motion-safe:animate-screen-in">
        <SearchModule />
      </main>
      <Footer />
    </>
  );
}
