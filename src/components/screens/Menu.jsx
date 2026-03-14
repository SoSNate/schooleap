import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import useGameStore from '../../store/useGameStore';
import { ranks, vibe, anims } from '../../utils/math';
import Swal from 'sweetalert2';

const games = [
  { id: 'equations', label: 'כאן בונים בכיף', emoji: '🧩', color: 'purple' },
  { id: 'balance', label: 'שומרים על איזון', emoji: '⚖️', color: 'emerald' },
  { id: 'tank', label: 'חצי הכוס המלאה', emoji: '🧪', color: 'blue' },
  { id: 'decimal', label: 'תפוס את הנקודה', emoji: '🎯', color: 'cyan' },
  { id: 'fractionLab', label: 'מעבדת השברים', emoji: '🍕', color: 'orange' },
  { id: 'magicPatterns', label: 'תבניות הקסם', emoji: '🪄', color: 'violet' },
  { id: 'grid', label: 'מעבדת השטחים', emoji: '📐', color: 'teal' },
  { id: 'word', label: 'המעבדה המילולית', emoji: '🧠', color: 'indigo' },
];

export default function Menu() {
  const setScreen = useGameStore((s) => s.setScreen);
  const locks = useGameStore((s) => s.locks);
  const cheatLevel = useGameStore((s) => s.cheatLevel);
  const equations = useGameStore((s) => s.equations);
  const balance = useGameStore((s) => s.balance);
  const tank = useGameStore((s) => s.tank);
  const decimal = useGameStore((s) => s.decimal);
  const fractionLab = useGameStore((s) => s.fractionLab);
  const magicPatterns = useGameStore((s) => s.magicPatterns);
  const grid = useGameStore((s) => s.grid);
  const word = useGameStore((s) => s.word);

  const gameStates = { equations, balance, tank, decimal, fractionLab, magicPatterns, grid, word };

  const startGame = (gameId) => {
    vibe(10);
    setScreen(gameId);
  };

  const handleCheatLevel = (e, gameId) => {
    e.stopPropagation();
    if (locks[gameId] > 0) {
      Swal.fire({
        title: 'המשחק נעול 🔒',
        text: 'הרמה ננעלה! ניתן לשחרר אותה במסך ההגדרות.',
        icon: 'info',
        confirmButtonText: 'הבנתי',
        confirmButtonColor: '#4f46e5',
        customClass: { popup: 'rounded-3xl' },
      });
      return;
    }
    vibe(30);
    cheatLevel(gameId);
  };

  const getBadgeText = (gameId) => {
    const locked = locks[gameId] > 0;
    return (locked ? '🔒 ' : '') + ranks[gameStates[gameId].lvl];
  };

  return (
    <div className="screen-enter flex flex-col items-center p-6 flex-1 min-h-[calc(100dvh-80px)]">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-black tracking-tight">מרכז הלמידה</h2>
        <p className="text-xs text-slate-400 dark:text-slate-400 font-bold mb-2">
          התקדמות כל 3 הצלחות (לחיצה על הדרגה לדילוג)
        </p>
        <div className="w-full max-w-[320px] h-32 md:h-40 opacity-90 mx-auto pointer-events-none">
          <DotLottieReact src={anims.menuHero} autoplay loop />
        </div>
      </div>

      {games.map((g) => (
        <button
          key={g.id}
          onClick={() => startGame(g.id)}
          className={`menu-btn bg-white dark:bg-slate-800 border-${g.color}-400 dark:border-${g.color}-600 border-e-slate-200 border-s-slate-200 border-t-slate-200 dark:border-e-slate-700 dark:border-s-slate-700 dark:border-t-slate-700 group`}
        >
          <span className="text-3xl drop-shadow-sm">{g.emoji}</span>
          <div className="text-right flex-1 px-4">
            <h3 className="font-black">{g.label}</h3>
            <div className="flex items-center gap-2 mt-1">
              <p
                className="text-[10px] text-slate-500 dark:text-slate-400 font-bold bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full inline-block lvl-badge whitespace-nowrap"
                onClick={(e) => handleCheatLevel(e, g.id)}
              >
                {getBadgeText(g.id)}
              </p>
              <p className={`text-[10px] text-${g.color}-600 dark:text-${g.color}-400 font-bold bg-${g.color}-50 dark:bg-${g.color}-900/30 px-2 py-0.5 rounded-full inline-block`}>
                ⭐ {gameStates[g.id].stars}
              </p>
            </div>
          </div>
          <span className="text-slate-300 dark:text-slate-600 group-hover:-translate-x-1 transition-transform">◀</span>
        </button>
      ))}
    </div>
  );
}
