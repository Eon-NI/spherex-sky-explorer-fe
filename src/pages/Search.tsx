import { useLayoutEffect } from 'react';
import Header from './presentation/components/Header';
import Footer from './presentation/components/Footer';
import SearchModule from '../components/search_components/SearchModule';

export default function Search() {
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <>
      <Header />
      <main className="bg-nasa min-h-screen text-white motion-safe:animate-screen-in">
        <SearchModule />
      </main>
      <Footer />
    </>
  );
}
