import { Check, ChevronLeft, Sparkles, Clock, Rocket, Brain, ShieldCheck, GraduationCap, MessageCircle, Mail, Users, BookOpen, BarChart2, Lock } from 'lucide-react';
import { PLANS, PLAN_URLS } from './constants';

const WHATSAPP_NUMBER = '972523456789'; // ← עדכן למספר האמיתי
const CONTACT_EMAIL   = '12natanel@gmail.com';

// ─── Reason sub-component (used only inside PricingView) ─────────────────────

function Reason({ icon, title, text }) {
  return (
    <div className="flex gap-3 group">
      <div className="bg-white/10 p-2.5 rounded-xl text-indigo-400 h-fit group-hover:bg-indigo-500 group-hover:text-white transition-all">
        {icon}
      </div>
      <div>
        <h5 className="font-bold text-sm mb-0.5">{title}</h5>
        <p className="text-indigo-100/60 text-xs leading-relaxed">{text}</p>
      </div>
    </div>
  );
}

// ─── PricingView ─────────────────────────────────────────────────────────────

/**
 * Full-page pricing / plan selection view.
 *
 * Props:
 *  onBack – () => void   (returns to dashboard view)
 */
export default function PricingView({ onBack }) {
  return (
    <div dir="rtl" className="min-h-[100dvh] bg-[#FDFDFF] text-slate-900">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100 px-4 py-3">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-1.5 rounded-lg text-white">
              <GraduationCap size={18} />
            </div>
            <span className="font-black text-lg">חשבונאוטיקה</span>
          </div>
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-sm font-bold text-slate-500 hover:text-indigo-600 transition-colors"
          >
            <ChevronLeft size={16} /> חזור לדשבורד
          </button>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto p-4 md:p-10">
        {/* Hero */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-widest mb-5">
            <Sparkles size={12} /> הקיץ הזה הופך למקפצה
          </div>
          <h2 className="text-3xl md:text-4xl font-black mb-4 leading-tight">גשר פדגוגי לכיתה ז&apos;</h2>
          <p className="text-slate-500 leading-relaxed text-sm">
            המעבר לחטיבה הוא צומת מרגש אך מאתגר. חשבונאוטיקה מאפשרת לילדך לרענן את כל הידע
            המתמטי שנצבר מכיתה א&apos; ועד ו&apos; — בדרך חווייתית, כדי להגיע לכיתה ז&apos; בטוח ומלא ביטחון.
          </p>
        </div>

        {/* Plans grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-16">
          {PLANS.map(plan => (
            <div
              key={plan.id}
              className={`bg-white rounded-[2rem] p-6 border-2 transition-all relative overflow-hidden hover:-translate-y-1 ${
                plan.popular ? 'border-indigo-600 shadow-xl shadow-indigo-100' : 'border-slate-100 shadow-sm'
              }`}
            >
              {plan.popular && (
                <div className="absolute top-0 right-0 bg-indigo-600 text-white text-[9px] font-black px-4 py-1.5 rounded-bl-xl">
                  הבחירה הפופולרית
                </div>
              )}
              <h3 className="text-lg font-black mb-1 mt-2">{plan.title}</h3>
              <p className="text-xs text-slate-400 mb-5 leading-snug">{plan.desc}</p>
              <div className="mb-5">
                <span className="text-3xl font-black">₪{plan.price}</span>
                <span className="text-slate-400 text-xs mr-1">/ {plan.period}</span>
              </div>
              <ul className="space-y-3 mb-6">
                {plan.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs font-bold text-slate-600 leading-snug">
                    <div className="p-0.5 bg-green-100 text-green-600 rounded-full shrink-0 mt-0.5">
                      <Check size={10} />
                    </div>
                    {f}
                  </li>
                ))}
              </ul>
              <a
                href={PLAN_URLS[plan.id]}
                target="_blank"
                rel="noopener noreferrer"
                className={`block w-full py-3 rounded-xl font-black text-center text-sm transition-all active:scale-95 ${
                  plan.id === 'vip'
                    ? 'bg-violet-600 hover:bg-violet-700 text-white shadow-lg shadow-violet-100'
                    : plan.popular
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100'
                      : 'bg-slate-900 text-white'
                }`}
              >
                {plan.id === 'vip' ? '📞 צור קשר — WhatsApp' : 'בחר במסלול זה'}
              </a>
            </div>
          ))}
        </div>

        {/* ─── מסלול מורים ובתי ספר (B2B) ─── */}
        <div className="mb-12">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-widest mb-3">
              <GraduationCap size={12} /> מסלול מוסדי
            </div>
            <h3 className="text-2xl font-black text-slate-800">מורים ובתי ספר</h3>
            <p className="text-slate-500 text-sm mt-2">
              פלטפורמת LMS מלאה — המורה שולט, התלמידים מתרגלים, ההורים רואים תוצאות
            </p>
          </div>

          <div className="bg-gradient-to-br from-slate-900 to-indigo-950 rounded-[2rem] p-8 md:p-10 text-white overflow-hidden relative">
            <div className="absolute left-0 top-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -translate-x-16 -translate-y-16 pointer-events-none" />
            <div className="absolute right-0 bottom-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl translate-x-12 translate-y-12 pointer-events-none" />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center relative z-10">
              {/* Features */}
              <div className="space-y-4">
                {[
                  { icon: <Users size={16} />,     text: 'עד 40 תלמידים בכיתה' },
                  { icon: <Lock size={16} />,      text: 'Assignment Wall — שיעורי בית דיגיטליים עם נעילת משחקים חופשיים' },
                  { icon: <BarChart2 size={16} />, text: 'דשבורד מעורבות — מי פעיל, מי לא, מי הצליח' },
                  { icon: <BookOpen size={16} />,  text: 'הצטרפות עצמית (Classroom Code) — ללא רישום ידני' },
                  { icon: <Check size={16} />,     text: 'אנונימיות מוחלטת — ללא תחרות בין תלמידים' },
                  { icon: <Check size={16} />,     text: 'מפת מיומנויות לכל תלמיד ולכיתה כולה' },
                ].map((f, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
                      {f.icon}
                    </div>
                    <p className="text-sm text-indigo-100/80 leading-snug">{f.text}</p>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <div className="bg-white/5 border border-white/10 rounded-[2rem] p-7 text-center space-y-5">
                <div className="text-4xl">🤝</div>
                <div>
                  <h4 className="text-xl font-black mb-2">מחיר מותאם אישית</h4>
                  <p className="text-indigo-200/70 text-sm leading-relaxed">
                    המחיר נקבע לפי מספר כיתות, בית הספר ומשך הרישיון.
                    נשמח לתת הצעת מחיר — צרו קשר ישירות:
                  </p>
                </div>
                <div className="space-y-3">
                  <a
                    href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent('היי נתנאל, אני מעוניין/ת במסלול מורים לחשבונאוטיקה 🎓')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full bg-green-500 hover:bg-green-400 text-white font-black py-3.5 rounded-xl transition-all active:scale-95"
                  >
                    <MessageCircle size={18} /> שלח הודעה ב-WhatsApp
                  </a>
                  <a
                    href={`mailto:${CONTACT_EMAIL}?subject=מסלול מורים - חשבונאוטיקה`}
                    className="flex items-center justify-center gap-2 w-full bg-white/10 hover:bg-white/20 text-white font-bold py-3 rounded-xl transition-all active:scale-95 text-sm"
                  >
                    <Mail size={16} /> {CONTACT_EMAIL}
                  </a>
                </div>
                <p className="text-indigo-300/50 text-[10px]">
                  מענה תוך 24 שעות בימי עבודה
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Why us */}
        <div className="bg-slate-900 rounded-[2.5rem] p-8 md:p-10 text-white relative overflow-hidden">
          <div className="absolute right-0 bottom-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl translate-x-24 translate-y-24" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center relative z-10">
            <div>
              <h3 className="text-2xl font-black mb-6">למה הורים בוחרים בנו?</h3>
              <div className="space-y-5">
                <Reason
                  icon={<Rocket />}
                  title="סגירת פערי יסודי"
                  text="עוברים על כל הנושאים הקריטיים מכיתה א' ועד ו' ומוודאים שאין חורים לפני המעבר לחטיבה."
                />
                <Reason
                  icon={<Brain />}
                  title="שיפור שטף חשיבה"
                  text="המערכת עובדת על אוטומציה של פתרון בעיות, מה שמאפשר לילד להתפנות לנושאים המורכבים בחטיבה."
                />
                <Reason
                  icon={<ShieldCheck />}
                  title="שקט נפשי להורה"
                  text="דוחות מפורטים בזמן אמת — תדעו בדיוק איפה הילד עומד ואיך הוא מתקדם."
                />
              </div>
            </div>
            <div className="bg-white/5 backdrop-blur-md rounded-[2rem] p-7 border border-white/10 text-center">
              <div className="w-16 h-16 bg-indigo-500/20 rounded-full flex items-center justify-center mx-auto mb-5 text-indigo-400">
                <Clock size={32} />
              </div>
              <h4 className="text-xl font-black mb-3">10 דקות ביום</h4>
              <p className="text-indigo-100/70 text-sm leading-relaxed mb-6">
                זה כל מה שצריך. תרגול קצר, ממוקד וחווייתי בכל יום בחופש הגדול יוצר
                שינוי אדיר בביטחון העצמי של הילד מול המספרים.
              </p>
              <button
                onClick={onBack}
                className="bg-white text-slate-900 px-6 py-3 rounded-xl font-black text-sm hover:bg-indigo-50 transition-all"
              >
                חזור לדשבורד
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
