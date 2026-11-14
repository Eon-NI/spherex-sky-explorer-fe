
import { BrowserRouter, Routes, Route } from 'react-router';
import TimeLapse from './pages/TimeLapse';
import Observatory from './pages/Observatory';
import Minigame from './pages/Minigame';

import LandingV2 from './pages/presentation/LandingV2';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* <Route path="/" element={<Landing />} /> */}
        <Route path="/" element={<LandingV2 />} />

        <Route path="/observatorio" element={<Observatory />} />
        <Route path="/exploracion" element={<Minigame />} />

        <Route path="/timelapse" element={<TimeLapse />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
