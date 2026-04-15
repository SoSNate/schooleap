import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import useGameStore from '../../store/useGameStore';
import { ranks, vibe, anims, GAME_COLORS } from '../../utils/math';
import Swal from 'sweetalert2';

const games = [
  { id: 'equations',     label: 'כאן בונים בכיף',    emoji: '🧩', colorToken: 'purple'  },
  { id: 'balance',       label: 'שומרים על איזון',    emoji: '⚖️', colorToken: 'emerald' },
  { id: 'tank',          label: 'חצי הכוס המלאה',    emoji: '🧪', colorToken: 'blue'    },
  { id: 'decimal',       label: 'תפוס את הנקודה',    emoji: '🎯', colorToken: 'yellow'  },
  { id: 'fractionLab',   label: 'מעבדת השברים',      emoji: '🍕', colorToken: 'orange'  },
  { id: 'magicPatterns', label: 'תבניות הקסם',       emoji: '🪄', colorToken: 'rose'    },
  { id: 'grid',          label: 'מעבדת השטחים',      emoji: '📐', colorToken: 'teal'    },
  { id: 'word',          label: 'שאלות מילוליות',    emoji: '🧠', colorToken: 'red'     },
];

// Helper: return full Tailwind classes for a color token (avoids dynamic class names)
const getColorClasses = (colorToken) => {
  const classMap = {
    purple:  { border: 'border-purple-400 dark:border-purple-600', text: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-900/30' },
    emerald: { border: 'border-emerald-400 dark:border-emerald-600', text: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/30' },
    blue:    { border: 'border-blue-400 dark:border-blue-600', text: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/30' },
    cyan:    { border: 'border-cyan-400 dark:border-cyan-600', text: 'text-cyan-600 dark:text-cyan-400', bg: 'bg-cyan-50 dark:bg-cyan-900/30' },
    yellow:  { border: 'border-yellow-400 dark:border-yellow-600', text: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-50 dark:bg-yellow-900/30' },
    orange:  { border: 'border-orange-400 dark:border-orange-600', text: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-900/30' },
    violet:  { border: 'border-violet-400 dark:border-violet-600', text: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-50 dark:bg-violet-900/30' },
    teal:    { border: 'border-teal-400 dark:border-teal-600', text: 'text-teal-600 dark:text-teal-400', bg: 'bg-teal-50 dark:bg-teal-900/30' },
    rose:    { border: 'border-rose-400 dark:border-rose-200', text: 'text-rose-600 dark:text-rose-100', bg: 'bg-rose-50 dark:bg-rose-900/30' },
    red:     { border: 'border-red-800 dark:border-red-950', text: 'text-red-800 dark:text-red-700', bg: 'bg-red-50 dark:bg-red-950/40' },
  };
  return classMap[colorToken] || classMap.purple;
};

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

      {games.map((g) => {
        const colors = getColorClasses(g.colorToken);
        return (
          <button
            key={g.id}
            onClick={() => startGame(g.id)}
            className={`menu-btn ${colors.bg} ${colors.border} border-e-slate-200 border-s-slate-200 border-t-slate-200 dark:border-e-slate-700 dark:border-s-slate-700 dark:border-t-slate-700 group`}
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
                <p className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block ${colors.text} ${colors.bg}`}>
                  ⭐ {gameStates[g.id].stars}
                </p>
              </div>
            </div>
            <span className="text-slate-300 dark:text-slate-600 group-hover:-translate-x-1 transition-transform">◀</span>
          </button>
        );
      })}
    </div>
  );
}
