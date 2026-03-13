import { useState } from 'react';
import useGameStore from '../../store/useGameStore';
import Swal from 'sweetalert2';

const gameOptions = [
  { value: 'equations', label: 'כאן בונים בכיף' },
  { value: 'balance', label: 'שומרים על איזון' },
  { value: 'tank', label: 'חצי הכוס המלאה' },
  { value: 'decimal', label: 'המשקל הדיגיטלי' },
  { value: 'fractionLab', label: 'מעבדת השברים' },
];

const dayNames = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];

export default function Settings() {
  const weeklyStats = useGameStore((s) => s.weeklyStats);
  const applyLock = useGameStore((s) => s.applyLock);
  const removeLock = useGameStore((s) => s.removeLock);
  const resetProgress = useGameStore((s) => s.resetProgress);
  const setScreen = useGameStore((s) => s.setScreen);

  const [lockGame, setLockGame] = useState('equations');
  const [lockLvl, setLockLvl] = useState(1);

  const todayIdx = new Date().getDay();
  const maxPts = Math.max(...weeklyStats.days.map((d) => d.pts), 10);

  const handleApplyLock = () => {
    applyLock(lockGame, lockLvl);
    Swal.fire({
      title: 'ננעל 🔒',
      text: 'המשחק ננעל ברמה ' + lockLvl,
      icon: 'success',
      toast: true,
      position: 'top-start',
      timer: 2000,
      showConfirmButton: false,
    });
  };

  const handleRemoveLock = () => {
    removeLock(lockGame);
    Swal.fire({
      title: 'שוחרר 🔓',
      text: 'הנעילה שוחררה בהצלחה',
      icon: 'success',
      toast: true,
      position: 'top-start',
      timer: 2000,
      showConfirmButton: false,
    });
  };

  const handleReset = () => {
    Swal.fire({
      title: 'לאפס?',
      text: 'הכל יימחק.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'כן, לאפס',
    }).then((r) => {
      if (r.isConfirmed) {
        resetProgress();
        setScreen('menu');
      }
    });
  };

  return (
    <div className="screen-enter flex flex-col items-center p-4 md:p-6 gap-6 flex-1 min-h-[calc(100dvh-80px)]">
      <div className="text-center w-full max-w-md">
        <h2 className="text-2xl font-black tracking-tight text-slate-800 dark:text-slate-100 mb-1">
          מאחורי הקלעים 🛠️
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">אזור ניהול, מעקב והגדרות</p>
      </div>

      {/* Weekly Chart */}
      <div className="w-full max-w-md bg-white dark:bg-slate-800 p-6 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-700">
        <h3 className="font-bold text-lg mb-4 text-slate-700 dark:text-slate-200 border-b border-slate-100 dark:border-slate-700 pb-2">
          התקדמות שבועית 📅
        </h3>
        <p className="text-xs text-slate-500 mb-4">מעקב חכם אחרי סוגי המשחקים בהם תרגלת בכל יום</p>
        <div className="flex flex-col gap-4">
          {weeklyStats.days.map((d, i) => {
            const isToday = i === todayIdx;
            return (
              <div key={i} className="flex items-center gap-3">
                <div className={`w-6 text-sm ${isToday ? 'font-black text-indigo-600 dark:text-indigo-400' : 'font-bold text-slate-400'}`}>
                  {dayNames[i]}'
                </div>
                <div className="flex-1 h-4 bg-slate-100 dark:bg-slate-700/50 rounded-full overflow-hidden flex shadow-inner">
                  <div className="h-full bg-purple-500" style={{ width: `${((d.games.eq || 0) / maxPts) * 100}%` }} />
                  <div className="h-full bg-emerald-500" style={{ width: `${((d.games.bal || 0) / maxPts) * 100}%` }} />
                  <div className="h-full bg-blue-500" style={{ width: `${((d.games.tank || 0) / maxPts) * 100}%` }} />
                  <div className="h-full bg-cyan-500" style={{ width: `${((d.games.dec || 0) / maxPts) * 100}%` }} />
                  <div className="h-full bg-orange-400" style={{ width: `${((d.games.flab || 0) / maxPts) * 100}%` }} />
                </div>
                <div className={`w-10 text-left text-xs font-bold ${isToday ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500'}`}>
                  {d.pts}⭐
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Lock Controls */}
      <div className="w-full max-w-md bg-white dark:bg-slate-800 p-6 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-700">
        <h3 className="font-bold text-lg mb-4 text-slate-700 dark:text-slate-200 border-b border-slate-100 dark:border-slate-700 pb-2">
          נעילת שלבים 🔒
        </h3>
        <div className="flex flex-col gap-3">
          <div className="flex gap-2">
            <select
              value={lockGame}
              onChange={(e) => setLockGame(e.target.value)}
              className="flex-1 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm outline-none"
            >
              {gameOptions.map((g) => (
                <option key={g.value} value={g.value}>{g.label}</option>
              ))}
            </select>
            <select
              value={lockLvl}
              onChange={(e) => setLockLvl(parseInt(e.target.value))}
              className="w-24 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm outline-none"
            >
              {[1, 2, 3, 4, 5].map((l) => (
                <option key={l} value={l}>רמה {l}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2 mt-2">
            <button
              onClick={handleApplyLock}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 rounded-xl transition-colors active:scale-95"
            >
              הפעל נעילה 🔒
            </button>
            <button
              onClick={handleRemoveLock}
              className="flex-1 bg-slate-200 hover:bg-slate-300 dark:bg-slate-600 dark:hover:bg-slate-500 text-slate-700 dark:text-slate-200 font-bold py-2 rounded-xl transition-colors active:scale-95"
            >
              שחרר 🔓
            </button>
          </div>
        </div>
      </div>

      {/* Reset */}
      <div className="w-full max-w-md mt-4">
        <button
          onClick={handleReset}
          className="w-full text-sm font-bold text-rose-500 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 dark:bg-rose-900/20 dark:hover:bg-rose-900/40 px-4 py-4 rounded-[2rem] border border-rose-100 dark:border-rose-900 transition-colors active:scale-95"
        >
          🔄 איפוס התקדמות, כוכבים ושבוע
        </button>
      </div>
      <div className="h-10" />
    </div>
  );
}
