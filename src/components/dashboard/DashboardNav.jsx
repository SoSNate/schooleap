import { GraduationCap, Moon, Sun, ShieldAlert } from 'lucide-react';
import useGameStore from '../../store/useGameStore';

/**
 * Sticky top navigation bar for the parent dashboard.
 *
 * Props:
 *  profile      – { subscription_status, subscription_expires_at, applied_coupon, is_admin }
 *  trialDaysLeft – number of days remaining
 *  onLogout     – () => void
 *  onPricing    – () => void
 */
export default function DashboardNav({ profile, trialDaysLeft, onLogout, onPricing }) {
  const toggleDarkMode = useGameStore(s => s.toggleDarkMode);
  const darkMode       = useGameStore(s => s.darkMode);

  return (
    <nav className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-100 dark:border-slate-700 px-4 py-3">
      <div className="max-w-5xl mx-auto flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="bg-indigo-600 p-1.5 rounded-lg text-white">
            <GraduationCap size={18} />
          </div>
          <span className="font-black text-lg text-slate-900 dark:text-slate-100">חשבונאוטיקה</span>
        </div>
        <div className="flex items-center gap-2">
          {profile?.subscription_status === 'vip' ? (
            <span className="text-xs font-bold text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/30 px-3 py-1 rounded-full border border-violet-100 dark:border-violet-800">
              ✨ VIP
            </span>
          ) : profile?.subscription_status === 'active' ? (
            <span className="text-xs font-bold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-3 py-1 rounded-full border border-green-100 dark:border-green-800">
              ✅ מנוי פעיל — {trialDaysLeft} ימים
            </span>
          ) : trialDaysLeft > 0 ? (
            <span className="text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-3 py-1 rounded-full border border-amber-100 dark:border-amber-800">
              ניסיון — {trialDaysLeft} ימים נותרו
            </span>
          ) : null}

          {/* Admin back button — only visible to admins */}
          {profile?.is_admin && (
            <a
              href="/admin"
              title="דשבורד מנהל"
              className="flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 px-2.5 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors"
            >
              <ShieldAlert size={13} />
              <span className="hidden sm:inline">מנהל</span>
            </a>
          )}

          {/* Dark mode toggle */}
          <button
            onClick={toggleDarkMode}
            title="מצב לילה"
            className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-300 transition-colors"
          >
            {darkMode ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          <button
            onClick={onPricing}
            className="bg-indigo-600 text-white px-4 py-1.5 rounded-xl font-bold text-xs shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all"
          >
            שדרג
          </button>
          <button
            onClick={onLogout}
            className="text-xs text-slate-400 dark:text-slate-500 hover:text-red-500 transition-colors"
          >
            יציאה
          </button>
        </div>
      </div>
    </nav>
  );
}
