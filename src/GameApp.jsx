import { useEffect, useState } from 'react';
import useGameStore from './store/useGameStore';
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
              try { localStorage.setItem(ONBOARD_KEY, '1'); } catch {}
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

// ─── GameApp ──────────────────────────────────────────────────────────────────

export default function GameApp() {
  const currentScreen = useGameStore((s) => s.currentScreen);
  const initDarkMode  = useGameStore((s) => s.initDarkMode);
  const [showOnboarding, setShowOnboarding]   = useState(false);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [goals, setGoals] = useState([]);
  const [subChecked, setSubChecked] = useState(false);  // האם בדיקת מנוי הסתיימה
  const [subBlocked, setSubBlocked] = useState(false);  // האם חסום

  useEffect(() => {
    initDarkMode();
    captureInstallEvent();

    try {
      if (!localStorage.getItem(ONBOARD_KEY)) setShowOnboarding(true);
    } catch {}

    const installTimer = setTimeout(() => {
      if (shouldAutoShowInstallPrompt()) setShowInstallPrompt(true);
    }, 3500);

    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      // בדוק מנוי בכל כניסה ל-/play — סוגר את פירצת ה-localStorage
      supabase.rpc('get_child_subscription', { p_token: token })
        .then(({ data }) => {
          if (data && data.length > 0) {
            const { subscription_status, subscription_expires_at } = data[0];
            const expired = subscription_expires_at
              ? new Date(subscription_expires_at) < new Date()
              : false;
            const blocked =
              subscription_status === 'expired'  ||
              subscription_status === 'canceled' ||
              (subscription_status === 'trial' && expired);
            setSubBlocked(blocked);
          }
          setSubChecked(true);
        })
        .catch(() => setSubChecked(true)); // fail-open — Supabase לא זמין

      supabase.rpc('get_child_goals', { p_token: token })
        .then(({ data }) => { if (data) setGoals(data); })
        .catch(() => {});
    } else {
      setSubChecked(true);
    }

    return () => clearTimeout(installTimer);
  }, []); // eslint-disable-line

  if (!localStorage.getItem(TOKEN_KEY)) {
    return (
      <div dir="rtl" className="min-h-[100dvh] flex items-center justify-center bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-8 text-center">
        <div className="max-w-sm space-y-4">
          <div className="text-6xl">🔗</div>
          <h2 className="text-2xl font-black">אנא בקש מההורה את הקישור המיוחד שלך!</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">ההורה שלך יקבל קישור ייחודי שדרכו תיכנס למשחק</p>
        </div>
      </div>
    );
  }

  // מחכה לתשובה מסופאבייס לפני שמציג תוכן
  if (!subChecked) {
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

  if (subBlocked) {
    return (
      <div dir="rtl" className="min-h-[100dvh] flex flex-col items-center justify-center p-6 text-center gap-6"
        style={{ background: 'radial-gradient(ellipse at 50% 60%, #0f172a 0%, #020617 100%)' }}>
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

  const ScreenComponent = screens[currentScreen] || Menu;

  return (
    <div className="bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-100 transition-colors duration-300 flex flex-col min-h-[100dvh]">
      {showOnboarding && (
        <OnboardingScreen onDone={() => setShowOnboarding(false)} />
      )}
      {showInstallPrompt && !showOnboarding && (
        <InstallPrompt onClose={() => setShowInstallPrompt(false)} />
      )}
      <Header />
      <main className="flex-1 flex flex-col overflow-y-auto">
        <ScreenComponent key={currentScreen} goals={goals} />
      </main>
    </div>
  );
}
