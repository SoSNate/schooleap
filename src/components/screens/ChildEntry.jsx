import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const TOKEN_KEY = 'hasbaonautica_child_token';

// ─── Paywall Screen ───────────────────────────────────────────────────────────

function PaywallScreen() {
  return (
    <div
      dir="rtl"
      className="min-h-[100dvh] flex flex-col items-center justify-center p-6 text-center gap-6"
      style={{ background: 'radial-gradient(ellipse at 50% 60%, #0f172a 0%, #020617 100%)' }}
    >
      <style>{`@keyframes float3{0%,100%{transform:translateY(0)}50%{transform:translateY(-14px)}}`}</style>
      <div className="text-8xl" style={{ animation: 'float3 2.5s ease-in-out infinite' }}>🛸</div>
      <div className="space-y-3 max-w-xs">
        <h2 className="text-2xl font-black text-white leading-tight">
          אוי! הקישור שלך הסתיים 🔗
        </h2>
        <p className="text-slate-400 text-base leading-relaxed">
          תבקש מאמא או אבא לשלוח לך את הקישור שוב — עוד דקה ותחזור למשחק 💙
        </p>
      </div>
      <button
        onClick={() => window.location.reload()}
        className="bg-indigo-600 hover:bg-indigo-500 text-white font-black py-3 px-8 rounded-2xl text-sm shadow-lg active:scale-95 transition-all"
      >
        🔄 נסה שוב
      </button>
    </div>
  );
}

// ─── Loading Screen ───────────────────────────────────────────────────────────

function LoadingScreen() {
  return (
    <div
      className="min-h-[100dvh] flex flex-col items-center justify-center gap-4"
      style={{ background: 'radial-gradient(ellipse at 50% 60%, #0f172a 0%, #020617 100%)' }}
    >
      <div className="text-5xl animate-bounce">🚀</div>
      <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      <p className="text-slate-500 text-sm">מכין את הספינה...</p>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

// ChildEntry — lightweight redirect only.
// Saves the token to localStorage and immediately navigates to /play.
// GameApp handles all data loading (subscription + events + assignments + goals)
// in parallel, covering both first-entry and refresh with the same code path.
export default function ChildEntry() {
  const { token } = useParams();
  const navigate  = useNavigate();

  useEffect(() => {
    if (!token) { navigate('/'); return; }
    localStorage.setItem(TOKEN_KEY, token);
    // Strip the token from the URL bar/history immediately — referrer headers
    // sent on outbound requests must not leak the magic token.
    try { window.history.replaceState(null, '', '/play'); } catch { /* ignore */ }
    navigate('/play', { replace: true });
  }, [token]); // eslint-disable-line

  return <LoadingScreen />;
}
