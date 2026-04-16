import { useEffect } from 'react';
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

const TOKEN_KEY = 'hasbaonautica_child_token';

export default function GameApp() {
  const currentScreen = useGameStore((s) => s.currentScreen);
  const initDarkMode  = useGameStore((s) => s.initDarkMode);

  useEffect(() => {
    initDarkMode();
  }, []);

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
      <Header />
      <main className="flex-1 flex flex-col overflow-y-auto">
        <ScreenComponent key={currentScreen} />
      </main>
    </div>
  );
}
