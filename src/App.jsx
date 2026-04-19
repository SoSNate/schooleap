import { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { captureInstallEvent } from './components/shared/InstallPrompt';

// ─── Lazy imports — כל route נטען רק כשמגיעים אליו ──────────────────────────
const LandingPage      = lazy(() => import('./components/screens/LandingPage'));
const ParentDashboard  = lazy(() => import('./components/screens/ParentDashboard'));
const TeacherDashboard = lazy(() => import('./components/screens/TeacherDashboard'));
const AdminDashboard   = lazy(() => import('./components/screens/AdminDashboard'));
const JoinClass        = lazy(() => import('./components/screens/JoinClass'));
const ChildEntry       = lazy(() => import('./components/screens/ChildEntry'));
const GameApp          = lazy(() => import('./GameApp'));

// ─── Spinner — מוצג בזמן טעינת chunk ────────────────────────────────────────
function PageSpinner() {
  return (
    <div className="min-h-[100dvh] flex items-center justify-center"
      style={{ background: 'radial-gradient(ellipse at 50% 60%, #0f172a 0%, #020617 100%)' }}>
      <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

const TOKEN_KEY = 'hasbaonautica_child_token';

// ─── SubscriptionGuard ────────────────────────────────────────────────────────
// Wraps /play — ensures the child came through ChildEntry (token exists) and that
// the subscription check has run.  If the user hits /play directly (no token),
// redirect them to the landing page.  If blocked, GameApp itself shows the paywall.
function SubscriptionGuard({ children }) {
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
      <Suspense fallback={<PageSpinner />}>
        <Routes>
          <Route path="/"            element={<LandingPage />} />
          <Route path="/parent"      element={<ParentDashboard />} />
          <Route path="/teacher"     element={<TeacherDashboard />} />
          <Route path="/admin"       element={<AdminDashboard />} />
          <Route path="/join"        element={<JoinClass />} />
          <Route path="/play/:token" element={<ChildEntry />} />
          <Route path="/play"        element={
            <SubscriptionGuard>
              <GameApp />
            </SubscriptionGuard>
          } />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
