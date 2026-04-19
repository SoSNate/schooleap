import { GraduationCap } from 'lucide-react';

/**
 * Sticky top navigation bar for the parent dashboard.
 *
 * Props:
 *  user         – Supabase user object
 *  profile      – { subscription_status, subscription_expires_at, applied_coupon }
 *  trialDaysLeft – number of days remaining
 *  onLogout     – () => void
 *  onPricing    – () => void
 */
export default function DashboardNav({ profile, trialDaysLeft, onLogout, onPricing }) {
  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100 px-4 py-3">
      <div className="max-w-5xl mx-auto flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="bg-indigo-600 p-1.5 rounded-lg text-white">
            <GraduationCap size={18} />
          </div>
          <span className="font-black text-lg">חשבונאוטיקה</span>
        </div>
        <div className="flex items-center gap-3">
          {profile?.subscription_status === 'vip' ? (
            <span className="text-xs font-bold text-violet-600 bg-violet-50 px-3 py-1 rounded-full border border-violet-100">
              ✨ VIP
            </span>
          ) : profile?.subscription_status === 'active' ? (
            <span className="text-xs font-bold text-green-600 bg-green-50 px-3 py-1 rounded-full border border-green-100">
              ✅ מנוי פעיל — {trialDaysLeft} ימים
            </span>
          ) : trialDaysLeft > 0 ? (
            <span className="text-xs font-bold text-amber-600 bg-amber-50 px-3 py-1 rounded-full border border-amber-100">
              ניסיון — {trialDaysLeft} ימים נותרו
            </span>
          ) : null}
          <button
            onClick={onPricing}
            className="bg-indigo-600 text-white px-4 py-1.5 rounded-xl font-bold text-xs shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all"
          >
            שדרג
          </button>
          <button
            onClick={onLogout}
            className="text-xs text-slate-400 hover:text-red-500 transition-colors"
          >
            יציאה
          </button>
        </div>
      </div>
    </nav>
  );
}
