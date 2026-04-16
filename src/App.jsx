import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LandingPage from './components/screens/LandingPage';
import ParentDashboard from './components/screens/ParentDashboard';
import ChildEntry from './components/screens/ChildEntry';
import GameApp from './GameApp';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/parent" element={<ParentDashboard />} />
        <Route path="/play/:token" element={<ChildEntry />} />
        <Route path="/play" element={<GameApp />} />
      </Routes>
    </BrowserRouter>
  );
}
