import Header from '../components/Header';
import Footer from '../components/Footer';
import ObservatoryTour from '../components/tour/ObservatoryTour';

export default function Observatory() {
    return (
        <>
            <Header />
            <main className="bg-night text-paper">
                <ObservatoryTour />
            </main>
            <Footer />
        </>
    );
}
