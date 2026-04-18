import { CreditCard } from 'lucide-react';

/**
 * Sidebar card showing subscription / trial days remaining.
 *
 * Props:
 *  profile        – { subscription_status, subscription_expires_at, applied_coupon }
 *  trialDaysLeft  – number
 *  planTotalDays  – number (denominator for the progress bar)
 *  onPricing      – () => void
 */
export default function TrialCard({ profile, trialDaysLeft, planTotalDays, onPricing }) {
  return (
    <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm space-y-3">
      <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest">
        {profile?.subscription_status === 'vip'
          ? 'סטטוס VIP'
          : profile?.subscription_status === 'active'
          ? 'מנוי פעיל'
          : 'סטטוס ניסיון'}
      </h4>
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-slate-700">
          {profile?.subscription_status === 'vip' ? 'גישה ללא הגבלה' : 'ימים שנותרו'}
        </span>
        <span className={`text-lg font-black ${
          profile?.subscription_status === 'vip'
            ? 'text-violet-500'
            : trialDaysLeft <= 3
            ? 'text-red-500'
            : 'text-indigo-600'
        }`}>
          {profile?.subscription_status === 'vip' ? '∞' : trialDaysLeft}
        </span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${trialDaysLeft <= 3 ? 'bg-red-400' : 'bg-indigo-500'}`}
          style={{ width: `${Math.min(100, (trialDaysLeft / planTotalDays) * 100)}%` }}
        />
      </div>
      <button
        onClick={onPricing}
        className="w-full py-2.5 bg-indigo-50 text-indigo-600 rounded-xl font-black text-xs hover:bg-indigo-100 transition-all"
      >
        <CreditCard size={12} className="inline ml-1" />
        בחר מסלול
      </button>

      {/* Applied coupon indicator */}
      {profile?.applied_coupon && (
        <p className="text-xs text-slate-400 pt-1">
          קופון פעיל: <span className="font-bold text-indigo-600">{profile.applied_coupon}</span>
        </p>
      )}
    </div>
  );
}
