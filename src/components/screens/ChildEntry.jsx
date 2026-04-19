import { useEffect } from 'react';
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
      <div className="text-8xl" style={{ animation: 'float3 2.5s ease-in-out infinite' }}>🛸</div>
      <div className="space-y-3 max-w-xs">
        <h2 className="text-2xl font-black text-white leading-tight">
          בעיה במשיכת אישורים ממערכת ההורים
        </h2>
        <p className="text-slate-400 text-base leading-relaxed">
          לא הצלחנו לאמת את הגישה שלך.<br />
          בקש מאמא או אבא לבדוק את המערכת.
        </p>
      </div>
      <div className="bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm text-slate-400 max-w-xs">
        🔒 הגישה למשחקים תפתח בקרוב
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
  const { token }          = useParams();
  const navigate           = useNavigate();
  const loadProgress       = useGameStore((s) => s.loadProgress);
  const setSubscription    = useGameStore((s) => s.setSubscription);
  const setAssignments     = useGameStore((s) => s.setAssignments);
  const subscription       = useGameStore((s) => s.subscription);

  useEffect(() => {
    if (!token) { navigate('/'); return; }

    localStorage.setItem(TOKEN_KEY, token);
    let mounted = true;

    (async () => {
      try {
        // ── 1. בדוק סטטוס מנוי → שמור בstore ────────────────────────────
        const { data: subRows, error: subErr } = await supabase
          .rpc('get_child_subscription', { p_token: token });

        if (!mounted) return;

        if (!subErr && subRows?.length > 0) {
          const { subscription_status, subscription_expires_at } = subRows[0];
          // setSubscription מחשב blocked בעצמו ושומר בstore
          setSubscription({ status: subscription_status, expiresAt: subscription_expires_at });
          if (subscription_status === 'expired'  ||
              subscription_status === 'canceled' ||
              (subscription_status === 'trial' && subscription_expires_at &&
               new Date(subscription_expires_at) < new Date())) {
            // נשאר במסך PaywallScreen — GameApp יקרא subscription.blocked מהstore
            return;
          }
        } else {
          // שגיאה / אין נתונים — mark as checked+unblocked (fail-open)
          setSubscription({ status: 'trial', expiresAt: null });
        }

        // ── 2. טען היסטוריית משחקים + משימות פתוחות במקביל ───────────────
        const [{ data: events }, { data: openAssignments }] = await Promise.all([
          supabase.rpc('get_child_events',      { p_token: token }),
          supabase.rpc('get_child_assignments', { p_token: token }),
        ]);

        if (!mounted) return;
        if (events?.length > 0) loadProgress(events);
        setAssignments(openAssignments || []);

        // ── 3. כנס למשחק ─────────────────────────────────────────────────
        if (mounted) navigate('/play', { replace: true });
      } catch (e) {
        console.error('[ChildEntry]', e);
        // fail-open: שגיאת רשת לא חוסמת
        if (mounted) {
          setSubscription({ status: 'trial', expiresAt: null });
          navigate('/play', { replace: true });
        }
      }
    })();

    return () => { mounted = false; };
  }, [token]); // eslint-disable-line

  if (subscription.checked && subscription.blocked) return <PaywallScreen />;
  return <LoadingScreen />;
}
