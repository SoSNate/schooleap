import { useState, useEffect } from 'react';
import { ExternalLink, CheckCircle2, Sparkles, Clock } from 'lucide-react';
import { PLANS, PLAN_URLS } from './constants';

/**
 * SubscriptionPaywall
 * Shown to parent when trial expired. Lets them choose a plan and pay.
 *
 * Props:
 *   onBack      – () => void  — go back to dashboard (if already paid / admin override)
 *   onLogout    – () => void
 *   userId      – string      — Supabase user UUID (to build payment metadata URL)
 *   isActive    – boolean     — if true, show "payment received" state and call onBack after delay
 */
export default function SubscriptionPaywall({ onBack, onLogout, userId, isActive = false }) {
  const [selectedPlan, setSelectedPlan] = useState('3m');

  // When Realtime detects payment → isActive flips to true → auto-return to dashboard
  useEffect(() => {
    if (!isActive) return;
    const t = setTimeout(onBack, 2200);
    return () => clearTimeout(t);
  }, [isActive, onBack]);

  if (isActive) {
    return (
      <div dir="rtl" className="min-h-[100dvh] flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 p-6">
        <div className="bg-white rounded-3xl shadow-2xl p-10 max-w-sm w-full text-center space-y-5 border-2 border-emerald-200">
          <div className="text-7xl animate-bounce">🎉</div>
          <h2 className="text-2xl font-black text-emerald-800">התשלום התקבל!</h2>
          <p className="text-emerald-600 text-sm">הגישה נפתחת עכשיו...</p>
          <div className="w-full bg-emerald-100 rounded-full h-2 overflow-hidden">
            <div className="h-full bg-emerald-500 animate-[grow_2s_ease-in-out_forwards]" style={{ width: '100%', transition: 'width 2s' }} />
          </div>
        </div>
      </div>
    );
  }

  const selected = PLANS.find(p => p.id === selectedPlan) ?? PLANS[1];
  const payUrl   = PLAN_URLS[selectedPlan];

  return (
    <div dir="rtl" className="min-h-[100dvh] bg-[#FDFDFF] text-slate-900">

      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100 px-4 py-3">
        <div className="max-w-lg mx-auto flex justify-between items-center">
          <span className="font-black text-lg">חשבונאוטיקה 🚀</span>
          <button
            onClick={onLogout}
            className="text-xs font-bold text-slate-400 hover:text-slate-700 transition-colors"
          >
            יציאה
          </button>
        </div>
      </nav>

      <div className="max-w-lg mx-auto px-4 py-10 space-y-8">

        {/* Header */}
        <div className="text-center space-y-3">
          <div className="text-6xl">⏰</div>
          <h1 className="text-3xl font-black tracking-tight">תקופת הניסיון הסתיימה</h1>
          <p className="text-slate-500 text-sm leading-relaxed max-w-sm mx-auto">
            הילד שלך לא יכול לשחק עד שתחדשו את המנוי.<br />
            הבחירה שלכם — ללא חיוב אוטומטי לעולם.
          </p>
        </div>

        {/* Plan cards */}
        <div className="space-y-3">
          {PLANS.filter(p => p.type === 'payment').map(plan => (
            <button
              key={plan.id}
              onClick={() => setSelectedPlan(plan.id)}
              className={`w-full text-right rounded-2xl border-2 p-5 transition-all ${
                selectedPlan === plan.id
                  ? 'border-indigo-500 bg-indigo-50 shadow-md'
                  : 'border-slate-200 bg-white hover:border-indigo-300'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className={`w-5 h-5 rounded-full border-2 mt-0.5 flex items-center justify-center shrink-0 ${
                    selectedPlan === plan.id ? 'border-indigo-500 bg-indigo-500' : 'border-slate-300'
                  }`}>
                    {selectedPlan === plan.id && <div className="w-2 h-2 bg-white rounded-full" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-slate-900">{plan.title}</span>
                      {plan.popular && (
                        <span className="text-[10px] font-black bg-indigo-600 text-white px-2 py-0.5 rounded-full">
                          פופולרי ✨
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{plan.desc}</p>
                    <ul className="mt-2 space-y-1">
                      {plan.features.map((f, i) => (
                        <li key={i} className="flex items-center gap-1.5 text-xs text-slate-600">
                          <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-2xl font-black text-indigo-700">₪{plan.price}</p>
                  <p className="text-[10px] text-slate-400">{plan.period}</p>
                </div>
              </div>
            </button>
          ))}

          {/* VIP contact card */}
          <a
            href={PLAN_URLS['vip']}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-between rounded-2xl border-2 border-amber-200 bg-amber-50 hover:bg-amber-100 p-5 transition-all"
          >
            <div className="flex items-center gap-3">
              <Sparkles size={20} className="text-amber-500 shrink-0" />
              <div>
                <p className="font-black text-amber-900">{PLANS.find(p => p.id === 'vip')?.title}</p>
                <p className="text-xs text-amber-700">{PLANS.find(p => p.id === 'vip')?.desc}</p>
              </div>
            </div>
            <ExternalLink size={16} className="text-amber-500 shrink-0" />
          </a>
        </div>

        {/* CTA */}
        {selected && (
          <div className="space-y-3">
            <a
              href={payUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white font-black text-base py-4 rounded-2xl shadow-lg transition-all"
            >
              <ExternalLink size={16} />
              תשלום מאובטח — ₪{selected.price} ({selected.period})
            </a>
            <p className="text-center text-xs text-slate-400 flex items-center justify-center gap-1">
              <Clock size={11} />
              לאחר התשלום, הגישה תיפתח אוטומטית תוך שניות
            </p>
            <p className="text-center text-[11px] text-slate-400">
              ללא חיוב אוטומטי • ללא הוראת קבע • תשלום חד-פעמי
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
