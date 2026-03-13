import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import useGameStore from '../../store/useGameStore';
import { anims, vibe } from '../../utils/math';

export default function Header() {
  const totalStars = useGameStore((s) => s.totalStars);
  const currentScreen = useGameStore((s) => s.currentScreen);
  const setScreen = useGameStore((s) => s.setScreen);
  const toggleDarkMode = useGameStore((s) => s.toggleDarkMode);

  const navigate = (screen) => {
    vibe(10);
    setScreen(screen);
  };

  return (
    <header className="h-16 px-4 md:px-6 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center shrink-0 z-50 shadow-sm transition-colors">
      <div className="flex items-center gap-2">
        <div className="w-10 h-10 flex-shrink-0">
          <DotLottieReact src={anims.logo} autoplay loop speed={1.2} />
        </div>
        <h1 className="font-black text-lg md:text-xl tracking-tight">כיתת החירום</h1>
      </div>
      <div className="flex items-center gap-2 md:gap-3">
        <div className="bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 px-3 py-1 rounded-full text-xs font-bold border border-amber-100 dark:border-amber-800/50 whitespace-nowrap flex items-center gap-1 transition-colors">
          ⭐ <span>{totalStars}</span>
        </div>
        <button
          onClick={() => navigate('settings')}
          className="bg-slate-100 dark:bg-slate-700 p-2 rounded-xl text-lg transition-transform hover:scale-110 active:scale-95"
          title="מאחורי הקלעים"
        >
          ⚙️
        </button>
        <button
          onClick={() => { vibe(10); toggleDarkMode(); }}
          className="bg-slate-100 dark:bg-slate-700 p-2 rounded-xl text-lg transition-transform hover:scale-110 active:scale-95"
          title="מצב לילה"
        >
          🌗
        </button>
        {currentScreen !== 'menu' && (
          <button
            onClick={() => navigate('menu')}
            className="bg-slate-100 dark:bg-slate-700 p-2 rounded-xl text-lg transition-transform hover:scale-110 active:scale-95"
          >
            🏠
          </button>
        )}
      </div>
    </header>
  );
}
