import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import useGameStore from './store/useGameStore';
import { useEdgeSwipe } from './hooks/useEdgeSwipe';
import Header from './components/layout/Header';
import Menu from './components/screens/Menu';
import Settings from './components/screens/Settings';
import Equations from './components/games/Equations';
import Balance from './components/games/Balance';
import Tank from './components/games/Tank';
import Decimal from './components/games/Decimal';
import FractionLab from './components/games/FractionLab';
import MagicPatterns from './components/games/MagicPatterns';
import DecimalAreaLab from './components/games/DecimalAreaLab';
import WordProblemPuzzle from './components/games/WordProblemPuzzle';
import MultiplicationChamp from './components/games/MultiplicationChamp';
import PercentsLab from './components/games/PercentsLab';
import { supabase } from './lib/supabase';
import InstallPrompt, { captureInstallEvent, shouldAutoShowInstallPrompt } from './components/shared/InstallPrompt';

const screens = {
  menu: Menu,
  settings: Settings,
  equations: Equations,
  balance: Balance,
  tank: Tank,
  decimal: Decimal,
  fractionLab: FractionLab,
  magicPatterns: MagicPatterns,
  grid: DecimalAreaLab,
  word: WordProblemPuzzle,
  multChamp: MultiplicationChamp,
  percentages: PercentsLab,
};

const TOKEN_KEY    = 'hasbaonautica_child_token';
const ONBOARD_KEY  = 'seen_onboarding_v1';

// ─── Onboarding screen (first time ever) ─────────────────────────────────────

function OnboardingScreen({ onDone }) {
  const [step, setStep] = useState(0);
  const steps = [
    {
      emoji: '🚀',
      title: 'ברוכ/ה הב/אה לחשבונאוטיקה!',
      text: 'כאן תלמד/י מתמטיקה דרך משחקים מהנים. כל ניצחון מביא אותך קרוב/ה יותר לכוכבים!',
    },
    {
      emoji: '🎮',
      title: '9 משחקים מחכים לך',
      text: 'שברים, משוואות, כפל, שטחים ועוד — כל משחק עוזר לך לתרגל נושא אחר.',
    },
    {
      emoji: '⭐',
      title: 'אסוף/י כוכבים ועלה/י רמה',
      text: 'כל 3 הצלחות = עלייה לרמה הבאה. יש 5 רמות לכל משחק — האם תצליח/י לכולן?',
    },
    {
      emoji: '🏆',
      title: 'בהצלחה, אסטרונאוט!',
      text: 'ההורים שלך רואים את ההתקדמות שלך. תן/י להם סיבה להיות גאים! 😊',
    },
  ];

  const current = steps[step];
  const isLast  = step === steps.length - 1;

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{ background: 'radial-gradient(ellipse at 50% 60%, #0f172a 0%, #020617 100%)' }}
    >
      <div className="max-w-sm w-full text-center space-y-6">
        {/* Step dots */}
        <div className="flex justify-center gap-2">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-2 rounded-full transition-all ${i === step ? 'w-6 bg-indigo-400' : 'w-2 bg-white/20'}`}
            />
          ))}
        </div>

        <div className="text-7xl" style={{ animation: 'float3 2.5s ease-in-out infinite' }}>
          {current.emoji}
        </div>
        <style>{`@keyframes float3{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}`}</style>

        <div className="space-y-3">
          <h2 className="text-2xl font-black text-white">{current.title}</h2>
          <p className="text-slate-400 leading-relaxed">{current.text}</p>
        </div>

        <button
          onClick={() => {
            if (isLast) {
              try { localStorage.setItem(ONBOARD_KEY, '1'); } catch { /* storage blocked */ }
              onDone();
            } else {
              setStep((s) => s + 1);
            }
          }}
          className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black py-4 rounded-2xl text-lg transition-all active:scale-95"
        >
          {isLast ? 'יאללה, מתחילים! 🚀' : 'הבא →'}
        </button>
      </div>
    </div>
  );
}

// ─── GoalProgressBanner ───────────────────────────────────────────────────────
// Shown only when a parent has set a goal with a target_hours value.
// Learning time is measured by solved attempts (game_events), not open time.

function GoalProgressBanner({ goal }) {
  const TOKEN_KEY = 'hasbaonautica_child_token';
  const [eventCount, setEventCount] = useState(0);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token || !goal?.created_at) return;
    let mounted = true;

    supabase
      .rpc('get_child_events', { p_token: token })
      .then(({ data }) => {
        if (!mounted || !data) return;
        const since = new Date(goal.created_at);
        setEventCount(data.filter((e) => new Date(e.created_at) >= since).length);
      })
      .catch(() => {});

    return () => { mounted = false; };
  }, [goal]);

  // 1 event ≈ 2 minutes of active problem-solving
  const achievedMinutes = eventCount * 2;
  const achievedHours   = achievedMinutes / 60;
  const targetHours     = goal.target_hours;
  const pct             = Math.min(100, (achievedHours / targetHours) * 100);
  const done            = achievedHours >= targetHours;

  return (
    <div dir="rtl" className="mx-3 mt-2 mb-1 bg-gradient-to-l from-amber-900/80 to-yellow-900/80 backdrop-blur-sm border border-amber-500/30 rounded-2xl px-4 py-3 space-y-1.5">
      <div className="flex justify-between items-center">
        <p className="text-xs font-black text-amber-200 truncate max-w-[60%]">
          🏆 {goal.title}
        </p>
        <p className="text-xs font-bold text-amber-300 shrink-0">
          {achievedHours.toFixed(1)}/{targetHours} שע׳
        </p>
      </div>
      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${done ? 'bg-green-400' : 'bg-gradient-to-l from-amber-400 to-yellow-300'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-[10px] text-amber-400/70 text-center">
        {done ? '🎉 הגעת ליעד! תזכיר להורים את הפרס' : `הפרס: ${goal.reward} 🎁`}
      </p>
    </div>
  );
}

// ─── GameApp ──────────────────────────────────────────────────────────────────

export default function GameApp() {
  const navigate       = useNavigate();
  const currentScreen  = useGameStore((s) => s.currentScreen);
  const setScreen      = useGameStore((s) => s.setScreen);
  const initDarkMode   = useGameStore((s) => s.initDarkMode);
  const subscription   = useGameStore((s) => s.subscription);
  const setSubscription = useGameStore((s) => s.setSubscription);
  const loadProgress   = useGameStore((s) => s.loadProgress);
  const setAssignments = useGameStore((s) => s.setAssignments);

  // Edge swipe: swipe right from left edge → go back to menu (if not already on menu)
  const goToMenu = useCallback(() => setScreen('menu'), [setScreen]);
  useEdgeSwipe({
    disabled:     currentScreen === 'menu' || currentScreen === 'settings',
    onSwipeRight: goToMenu,
  });

  const [showOnboarding,    setShowOnboarding]    = useState(false);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [goals,             setGoals]             = useState([]);

  // ── UI setup (dark mode, install prompt, onboarding) — runs once ──────────
  useEffect(() => {
    initDarkMode();
    captureInstallEvent();
    let mounted = true;

    try {
      if (!localStorage.getItem(ONBOARD_KEY)) setShowOnboarding(true);
    } catch { /* storage blocked */ }

    const installTimer = setTimeout(() => {
      if (shouldAutoShowInstallPrompt() && mounted) setShowInstallPrompt(true);
    }, 3500);

    return () => { mounted = false; clearTimeout(installTimer); };
  }, []); // eslint-disable-line

  // ── Bootstrap: runs when subscription hasn't been checked yet ────────────
  // Covers two cases:
  //   1. Normal entry via ChildEntry → subscription.checked = true already → skip
  //   2. Refresh at /play → subscription.checked = false → run full bootstrap here
  useEffect(() => {
    if (subscription.checked) return;          // ChildEntry already did this
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return;                         // no token → "ask parent" screen shown

    let mounted = true;

    // Hard timeout: never leave child stuck on spinner longer than 5s
    const failOpenTimer = setTimeout(() => {
      if (mounted && !useGameStore.getState().subscription.checked) {
        setSubscription({ status: 'trial', expiresAt: null }); // fail-open
      }
    }, 5000);

    (async () => {
      try {
        // Run subscription + events + assignments in parallel
        const [subRes, eventsRes, assignmentsRes, goalsRes] = await Promise.all([
          supabase.rpc('get_child_subscription', { p_token: token }),
          supabase.rpc('get_child_events',       { p_token: token }),
          supabase.rpc('get_child_assignments',  { p_token: token }),
          supabase.rpc('get_child_goals',        { p_token: token }),
        ]);

        if (!mounted) return;
        clearTimeout(failOpenTimer);

        // Subscription
        const subRows = subRes.data;
        if (!subRes.error && subRows?.length > 0) {
          const { subscription_status, subscription_expires_at } = subRows[0];
          setSubscription({ status: subscription_status, expiresAt: subscription_expires_at });
        } else {
          setSubscription({ status: 'trial', expiresAt: null }); // fail-open
        }

        // Progress + assignments + goals
        if (eventsRes.data?.length > 0) loadProgress(eventsRes.data);
        setAssignments(assignmentsRes.data || []); // independent of eventsRes
        if (goalsRes.data) setGoals(goalsRes.data);

      } catch (e) {
        console.error('[GameApp bootstrap]', e);
        if (mounted) {
          clearTimeout(failOpenTimer);
          setSubscription({ status: 'trial', expiresAt: null }); // fail-open
        }
      }
    })();

    return () => { mounted = false; clearTimeout(failOpenTimer); };
  }, [subscription.checked]); // eslint-disable-line

  // ── No token: accessed /play directly without a magic link ──────────────
  if (!localStorage.getItem(TOKEN_KEY)) {
    return (
      <div dir="rtl" className="min-h-[100dvh] flex items-center justify-center bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-8 text-center">
        <div className="max-w-sm space-y-4">
          <div className="text-6xl">🔗</div>
          <h2 className="text-2xl font-black">אנא בקש מההורה את הקישור המיוחד שלך!</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">ההורה שלך יקבל קישור ייחודי שדרכו תיכנס למשחק</p>
          <button
            onClick={() => navigate('/')}
            className="text-sm text-slate-500 dark:text-slate-400 underline underline-offset-2 mt-2"
          >
            ← חזור לעמוד הכניסה
          </button>
        </div>
      </div>
    );
  }

  // ── Waiting for ChildEntry to finish the subscription check ──────────────
  if (!subscription.checked) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center"
        style={{ background: 'radial-gradient(ellipse at 50% 60%, #0f172a 0%, #020617 100%)' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="text-4xl animate-bounce">🚀</div>
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  // ── Blocked by subscription check (paywall) ───────────────────────────────
  if (subscription.blocked) {
    return (
      <div dir="rtl" className="min-h-[100dvh] flex flex-col items-center justify-center p-6 text-center gap-6"
        style={{ background: 'radial-gradient(ellipse at 50% 60%, #0f172a 0%, #020617 100%)' }}>
        <style>{`@keyframes float3{0%,100%{transform:translateY(0)}50%{transform:translateY(-14px)}}`}</style>
        <div className="text-8xl" style={{ animation: 'float3 2.5s ease-in-out infinite' }}>🛸</div>
        <div className="space-y-3 max-w-xs">
          <h2 className="text-2xl font-black text-white leading-tight">בעיה במשיכת אישורים ממערכת ההורים</h2>
          <p className="text-slate-400 text-base leading-relaxed">
            לא הצלחנו לאמת את הגישה שלך.<br />בקש מאמא או אבא לבדוק את המערכת.
          </p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm text-slate-400 max-w-xs">
          🔒 הגישה למשחקים תפתח בקרוב
        </div>
      </div>
    );
  }

  const ScreenComponent = screens[currentScreen] || Menu;

  // ── Goal progress banner (only when parent set a goal with target_hours) ──
  // Achieved learning time = number of events × 2 minutes (each event = 1 solved attempt)
  // This counts actual problem-solving activity, not time-the-app-was-open.
  const activeGoal = goals.find((g) => g.target_hours && g.target_hours > 0) ?? null;

  return (
    <div className="bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-100 transition-colors duration-300 flex flex-col min-h-[100dvh]">
      {showOnboarding && (
        <OnboardingScreen onDone={() => setShowOnboarding(false)} />
      )}
      {showInstallPrompt && !showOnboarding && (
        <InstallPrompt onClose={() => setShowInstallPrompt(false)} />
      )}
      <Header />

      {/* ── Reward agreement progress banner ── */}
      {activeGoal && <GoalProgressBanner goal={activeGoal} />}

      <main className="flex-1 flex flex-col overflow-y-auto">
        <ScreenComponent key={currentScreen} goals={goals} />
      </main>
    </div>
  );
}
