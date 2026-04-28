import { useState } from 'react';
import useGameStore from '../../store/useGameStore';
import { GAME_COLORS } from '../../utils/math';
import Swal from 'sweetalert2';
import { clearAllTutorials } from '../shared/GameTutorial';
import InstallPrompt from '../shared/InstallPrompt';
import usePushNotifications from '../../hooks/usePushNotifications';
import { supabase } from '../../lib/supabase';

const ONBOARD_KEY = 'seen_onboarding_v1';

const GAME_LEGEND = [
  { key: 'eq',   color: GAME_COLORS.equations.bar,     label: 'כאן בונים' },
  { key: 'bal',  color: GAME_COLORS.balance.bar,       label: 'איזון' },
  { key: 'tank', color: GAME_COLORS.tank.bar,          label: 'חצי הכוס' },
  { key: 'dec',  color: GAME_COLORS.decimal.bar,       label: 'נקודה' },
  { key: 'flab', color: GAME_COLORS.fractionLab.bar,   label: 'שברים' },
  { key: 'mpat', color: GAME_COLORS.magicPatterns.bar, label: 'תבניות' },
  { key: 'grid', color: GAME_COLORS.grid.bar,          label: 'שטחים' },
  { key: 'word', color: GAME_COLORS.word.bar,          label: 'מילולי' },
  { key: 'mult', color: GAME_COLORS.multChamp.bar,     label: 'כפל' },
  { key: 'pct',  color: GAME_COLORS.percentages.bar,  label: 'אחוזים' },
];

const dayNames = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];

// Helper: get className for a game bar segment (maps short key to full class name)
const getGameBarClass = (shortKey) => {
  const map = {
    eq: GAME_COLORS.equations.bar,
    bal: GAME_COLORS.balance.bar,
    tank: GAME_COLORS.tank.bar,
    dec: GAME_COLORS.decimal.bar,
    flab: GAME_COLORS.fractionLab.bar,
    mpat: GAME_COLORS.magicPatterns.bar,
    grid: GAME_COLORS.grid.bar,
    word: GAME_COLORS.word.bar,
    mult: GAME_COLORS.multChamp.bar,
    pct:  GAME_COLORS.percentages.bar,
  };
  return map[shortKey] || 'bg-slate-300';
};

export default function Settings() {
  const weeklyStats = useGameStore((s) => s.weeklyStats);
  const resetProgress = useGameStore((s) => s.resetProgress);
  const setScreen = useGameStore((s) => s.setScreen);

  const [showInstall, setShowInstall] = useState(false);

  // Push notifications hook
  const { supported, permission, subscribed, loading, error, enable, disable } = usePushNotifications();
  const [testLoading, setTestLoading] = useState(false);

  const todayIdx = new Date().getDay();
  const maxPts = Math.max(...weeklyStats.days.map((d) => d.pts), 10);

  const handleReplayTutorials = () => {
    clearAllTutorials();
    try { localStorage.removeItem(ONBOARD_KEY); } catch { /* storage blocked */ }
    Swal.fire({
      title: '✅ ההסברים אופסו!',
      text: 'בפעם הבאה שתיכנס לכל משחק תראה שוב את ההסבר.',
      icon: 'success',
      confirmButtonText: 'הבנתי',
      timer: 2500,
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

  const handleEnablePush = async () => {
    const success = await enable();
    if (!success && error) {
      Swal.fire({
        title: '❌ שגיאה',
        text: error,
        icon: 'error',
        confirmButtonText: 'הבנתי',
      });
    }
  };

  const handleDisablePush = async () => {
    const success = await disable();
    if (!success && error) {
      Swal.fire({
        title: '❌ שגיאה',
        text: error,
        icon: 'error',
        confirmButtonText: 'הבנתי',
      });
    }
  };

  const handleSendTestPush = async () => {
    try {
      setTestLoading(true);
      const token = localStorage.getItem('hasbaonautica_child_token');

      if (!token) {
        throw new Error('משהו השתבש בהתחברות');
      }

      // Use shared Supabase client to avoid creating multiple instances
      const response = await supabase.functions.invoke('send-push', {
        body: {
          p_token: token,
          title: '🚀 חשבונאוטיקה',
          body: 'הבדיקה הצליחה! 🎉',
          url: '/',
          delay_ms: 5000,
        },
      });

      if (response.error) {
        throw response.error;
      }

      Swal.fire({
        title: '✅ בדיקה נשלחה',
        text: 'בדוק את הנוטיפיקציה תוך 5-6 שניות',
        icon: 'success',
        toast: true,
        position: 'top-start',
        timer: 2000,
        showConfirmButton: false,
      });
    } catch (err) {
      Swal.fire({
        title: '❌ שגיאה בשליחה',
        text: err.message || 'משהו השתבש',
        icon: 'error',
        confirmButtonText: 'הבנתי',
      });
    } finally {
      setTestLoading(false);
    }
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
                  <div className={`h-full ${getGameBarClass('eq')}`} style={{ width: `${((d.games.eq || 0) / maxPts) * 100}%` }} />
                  <div className={`h-full ${getGameBarClass('bal')}`} style={{ width: `${((d.games.bal || 0) / maxPts) * 100}%` }} />
                  <div className={`h-full ${getGameBarClass('tank')}`} style={{ width: `${((d.games.tank || 0) / maxPts) * 100}%` }} />
                  <div className={`h-full ${getGameBarClass('dec')}`} style={{ width: `${((d.games.dec || 0) / maxPts) * 100}%` }} />
                  <div className={`h-full ${getGameBarClass('flab')}`} style={{ width: `${((d.games.flab || 0) / maxPts) * 100}%` }} />
                  <div className={`h-full ${getGameBarClass('mpat')}`} style={{ width: `${((d.games.mpat || 0) / maxPts) * 100}%` }} />
                  <div className={`h-full ${getGameBarClass('grid')}`} style={{ width: `${((d.games.grid || 0) / maxPts) * 100}%` }} />
                  <div className={`h-full ${getGameBarClass('word')}`} style={{ width: `${((d.games.word || 0) / maxPts) * 100}%` }} />
                  <div className={`h-full ${getGameBarClass('mult')}`} style={{ width: `${((d.games.mult || 0) / maxPts) * 100}%` }} />
                </div>
                <div className={`w-10 text-left text-xs font-bold ${isToday ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500'}`}>
                  {d.pts}⭐
                </div>
              </div>
            );
          })}
        </div>

        {/* Color legend */}
        <div className="flex flex-wrap gap-x-3 gap-y-1.5 mt-4 pt-3 border-t border-slate-100 dark:border-slate-700">
          {GAME_LEGEND.map((g) => (
            <div key={g.key} className="flex items-center gap-1.5">
              <div className={`w-3 h-3 rounded-full flex-shrink-0 ${g.color}`} />
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">{g.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Push Notifications */}
      {supported && (
        <div className="w-full max-w-md bg-white dark:bg-slate-800 p-6 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-700">
          <h3 className="font-bold text-lg mb-4 text-slate-700 dark:text-slate-200 border-b border-slate-100 dark:border-slate-700 pb-2">
            התראות 🔔
          </h3>
          <div className="flex flex-col gap-3">
            {/* Status */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-600 dark:text-slate-300">מצב:</span>
              {loading ? (
                <span className="text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-3 py-1 rounded-full">
                  ⏳ טוען...
                </span>
              ) : permission === 'denied' ? (
                <span className="text-xs font-bold bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-3 py-1 rounded-full">
                  🚫 דחוי על ידי הדפדפן
                </span>
              ) : subscribed ? (
                <span className="text-xs font-bold bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 px-3 py-1 rounded-full">
                  ✅ מאופשר
                </span>
              ) : (
                <span className="text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-3 py-1 rounded-full">
                  ⚪ לא מאופשר
                </span>
              )}
            </div>

            {/* Enable/Disable button */}
            <button
              onClick={subscribed ? handleDisablePush : handleEnablePush}
              disabled={loading || permission === 'denied'}
              className={`w-full font-bold py-2 px-4 rounded-xl transition-colors active:scale-95 ${
                subscribed
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : permission === 'denied'
                  ? 'bg-slate-200 dark:bg-slate-600 text-slate-500 dark:text-slate-400 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white'
              }`}
            >
              {subscribed ? 'בטל התראות' : 'אשר התראות'}
            </button>

            {/* Test button */}
            {subscribed && !loading && (
              <button
                onClick={handleSendTestPush}
                disabled={testLoading}
                className="w-full font-bold py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition-colors active:scale-95 disabled:opacity-50"
              >
                {testLoading ? '⏳ שליחה...' : 'שלח לי בדיקה (5 שניות) 🚀'}
              </button>
            )}

            {/* Error message */}
            {error && (
              <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-2 rounded-lg">
                {error}
              </div>
            )}

            {/* Hint */}
            <p className="text-xs text-slate-500 dark:text-slate-400 text-center mt-2">
              סגור את האפליקציה אחרי הלחיצה כדי לוודא שזה עובד גם ברקע
            </p>
          </div>
        </div>
      )}

      {/* Install PWA */}
      <div className="w-full max-w-md">
        <button
          onClick={() => setShowInstall(true)}
          className="w-full text-sm font-bold text-violet-600 hover:text-violet-800 bg-violet-50 hover:bg-violet-100 dark:bg-violet-900/20 dark:hover:bg-violet-900/40 px-4 py-4 rounded-[2rem] border border-violet-100 dark:border-violet-900 transition-colors active:scale-95"
        >
          📲 הוסף לדף הבית כאפליקציה
        </button>
      </div>

      {/* Replay tutorials */}
      <div className="w-full max-w-md">
        <button
          onClick={handleReplayTutorials}
          className="w-full text-sm font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/20 dark:hover:bg-indigo-900/40 px-4 py-4 rounded-[2rem] border border-indigo-100 dark:border-indigo-900 transition-colors active:scale-95"
        >
          📖 חזור על ההסברים הראשוניים
        </button>
      </div>

      {showInstall && <InstallPrompt forceShow onClose={() => setShowInstall(false)} />}

      <div className="h-10" />
    </div>
  );
}
