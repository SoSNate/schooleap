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
      title: 'ברוך הבא לחשבונאוטיקה!',
      text: 'כאן תלמד מתמטיקה דרך משחקים מהנים. כל ניצחון מביא אותך קרוב יותר לכוכבים!',
    },
    {
      emoji: '🎮',
      title: '9 משחקים מחכים לך',
      text: 'שברים, משוואות, כפל, שטחים ועוד — כל משחק עוזר לך לתרגל נושא אחר.',
    },
    {
      emoji: '⭐',
      title: 'אסוף כוכבים ועלה רמה',
      text: 'כל 3 הצלחות = עלייה לרמה הבאה. יש 5 רמות לכל משחק — האם תגיע לכולן?',
    },
    {
      emoji: '🏆',
      title: 'בהצלחה!',
      text: 'ההורים שלך רואים את ההתקדמות שלך. תן להם סיבה להיות גאים! 😊',
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
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [goals, setGoals]   = useState([]);

  useEffect(() => {
    initDarkMode();

    // הצג onboarding רק בפעם הראשונה
    try {
      if (!localStorage.getItem(ONBOARD_KEY)) setShowOnboarding(true);
    } catch {}

    // טען יעדי הורה (אם קיימים)
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      supabase.rpc('get_child_goals', { p_token: token })
        .then(({ data }) => { if (data) setGoals(data); })
        .catch(() => {});
    }
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

  const ScreenComponent = screens[currentScreen] || Menu;

  return (
    <div className="bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-100 transition-colors duration-300 flex flex-col min-h-[100dvh]">
      {showOnboarding && (
        <OnboardingScreen onDone={() => setShowOnboarding(false)} />
      )}
      <Header />
      <main className="flex-1 flex flex-col overflow-y-auto">
        <ScreenComponent key={currentScreen} goals={goals} />
      </main>
    </div>
  );
}
