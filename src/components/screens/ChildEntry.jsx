import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import useGameStore from '../../store/useGameStore';

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
      <div className="text-8xl" style={{ animation: 'float3 2.5s ease-in-out infinite' }}>⛽</div>
      <div className="space-y-3 max-w-xs">
        <h2 className="text-2xl font-black text-white leading-tight">
          אופס! הדלק בחללית נגמר 🚀
        </h2>
        <p className="text-slate-400 text-base leading-relaxed">
          בקש מאמא או אבא להטעין אותה<br />
          (לחדש מנוי) כדי להמשיך במסע!
        </p>
      </div>
      <div className="text-6xl animate-bounce">🛸</div>
      <div className="bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm text-slate-400">
        מנוי פעיל = ⭐ כוכבים, 🎮 משחקים, 🏆 הישגים
      </div>
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

export default function ChildEntry() {
  const { token } = useParams();
  const navigate  = useNavigate();
  const loadProgress = useGameStore((s) => s.loadProgress);
  const [paywalled, setPaywalled] = useState(false);

  useEffect(() => {
    if (!token) { navigate('/'); return; }

    // שמור טוקן מקומית (cache)
    localStorage.setItem(TOKEN_KEY, token);

    (async () => {
      try {
        // ── 1. בדוק סטטוס מנוי ────────────────────────────────────────────
        const { data: subRows, error: subErr } = await supabase
          .rpc('get_child_subscription', { p_token: token });

        if (!subErr && subRows && subRows.length > 0) {
          const { subscription_status, subscription_expires_at } = subRows[0];
          const expired = subscription_expires_at
            ? new Date(subscription_expires_at) < new Date()
            : false;

          const blocked =
            subscription_status === 'expired'  ||
            subscription_status === 'canceled' ||
            (subscription_status === 'trial' && expired);

          if (blocked) {
            setPaywalled(true);
            return;
          }
        }

        // ── 2. טען היסטוריית משחקים מ-DB ─────────────────────────────────
        const { data: events } = await supabase
          .rpc('get_child_events', { p_token: token });

        if (events && events.length > 0) {
          loadProgress(events); // מחשב מחדש רמות וכוכבים
        }

        // ── 3. כנס למשחק ─────────────────────────────────────────────────
        navigate('/play', { replace: true });
      } catch (e) {
        console.error('[ChildEntry]', e);
        navigate('/play', { replace: true }); // fail-open — עדיף לתת לשחק
      }
    })();
  }, [token]); // eslint-disable-line

  if (paywalled) return <PaywallScreen />;
  return <LoadingScreen />;
}
