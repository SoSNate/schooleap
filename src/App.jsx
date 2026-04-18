import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage      from './components/screens/LandingPage';
import ParentDashboard  from './components/screens/ParentDashboard';
import TeacherDashboard from './components/screens/TeacherDashboard';
import ChildEntry       from './components/screens/ChildEntry';
import GameApp          from './GameApp';
import { captureInstallEvent } from './components/shared/InstallPrompt';
import useGameStore     from './store/useGameStore';

const TOKEN_KEY = 'hasbaonautica_child_token';

// ─── SubscriptionGuard ────────────────────────────────────────────────────────
// Wraps /play — ensures the child came through ChildEntry (token exists) and that
// the subscription check has run.  If the user hits /play directly (no token),
// redirect them to the landing page.  If blocked, GameApp itself shows the paywall.
function SubscriptionGuard({ children }) {
  const subscription = useGameStore((s) => s.subscription);
  const hasToken     = !!localStorage.getItem(TOKEN_KEY);

  // No token → not a valid child session, send to landing
  if (!hasToken) return <Navigate to="/" replace />;

  // Token exists but subscription not yet checked → ChildEntry is still loading.
  // GameApp handles this spinner internally, so just render it.
  return children;
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  useEffect(() => {
    captureInstallEvent();
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"            element={<LandingPage />} />
        <Route path="/parent"      element={<ParentDashboard />} />
        <Route path="/teacher"     element={<TeacherDashboard />} />
        <Route path="/play/:token" element={<ChildEntry />} />
        <Route path="/play"        element={
          <SubscriptionGuard>
            <GameApp />
          </SubscriptionGuard>
        } />
      </Routes>
    </BrowserRouter>
  );
}
