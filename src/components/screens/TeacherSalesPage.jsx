import { useState } from 'react';
import { supabase } from '../../lib/supabase';

const WHATSAPP_NUMBER  = '972535303607';
// קישור Morning ייחודי למורים — להחליף בקישור האמיתי
const TEACHER_PAY_URL  = import.meta.env.VITE_PAYMENT_URL_TEACHER || 'https://mrng.to/5MeNM9EHv5';

export default function TeacherSalesPage({ user, onLogout }) {
  const [sent,    setSent]    = useState(false);
  const [sending, setSending] = useState(false);
  const [err,     setErr]     = useState(null);

  // שמירת lead כדי שאדמין יקבל עדכון — לא חוסם את התשלום
  async function saveLead() {
    if (!user?.id || sending) return;
    setSending(true);
    try {
      await supabase.from('teacher_leads').insert({
        full_name: user.email?.split('@')[0] || 'מורה',
        email:     user.email || null,
        notes:     'לחץ על כפתור תשלום עצמי',
        handled:   false,
      });
      // סמן פרופיל כ-pending עד שהwebhook יאשר
      await supabase.from('profiles')
        .update({ teacher_status: 'pending' })
        .eq('id', user.id);
      setSent(true);
    } catch (e) {
      console.error('[TeacherSalesPage] saveLead:', e);
      // אל תחסום — המשך לפתוח קישור גם אם הlead נכשל
      setSent(true);
    } finally {
      setSending(false);
    }
  }

  async function handlePay() {
    await saveLead();
    window.open(TEACHER_PAY_URL, '_blank');
  }

  const whatsappMsg = encodeURIComponent(
    `שלום נתנאל, אני ${user?.email || ''} — רוצה להצטרף כמורה פרטי לחשבונאוטיקה`
  );

  return (
    <div
      dir="rtl"
      className="min-h-[100dvh] flex flex-col items-center justify-start p-6 py-12"
      style={{ background: 'radial-gradient(ellipse at 50% 60%, #0f172a 0%, #020617 100%)' }}
    >
      <div className="w-full max-w-lg space-y-6">

        {/* Header */}
        <div className="text-center space-y-3">
          <div className="text-5xl">🎓</div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/20 border border-emerald-400/30 rounded-full">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-emerald-300 text-[10px] font-black uppercase tracking-widest">Teacher Portal</span>
          </div>
          <h1 className="text-3xl font-black text-white">הצטרף כמורה לחשבונאוטיקה</h1>
          <p className="text-slate-400 text-sm">מורה פרטי — גישה מיידית אחרי תשלום</p>
        </div>

        {/* יתרונות */}
        <div className="grid grid-cols-1 gap-3">
          {[
            { emoji: '⚡', title: 'גישה מיידית', desc: 'אחרי תשלום — הדשבורד נפתח אוטומטית ללא אישור ידני' },
            { emoji: '👤', title: 'תלמידים פרטיים', desc: 'הוסף תלמידים עם קוד כניסה ייחודי לכל אחד' },
            { emoji: '📊', title: 'מעקב התקדמות', desc: 'ראה את ביצועי כל תלמיד בזמן אמת' },
            { emoji: '🎯', title: 'משימות ייעודיות', desc: 'הגדר שיעורי בית ומעקב השלמה אוטומטי' },
          ].map(f => (
            <div key={f.title} className="flex items-start gap-3 bg-white/5 border border-white/10 rounded-2xl p-4">
              <span className="text-2xl">{f.emoji}</span>
              <div>
                <p className="text-white font-black text-sm">{f.title}</p>
                <p className="text-slate-400 text-xs mt-0.5">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* תשלום */}
        <div className="bg-white/5 border border-white/10 rounded-[2rem] p-6 space-y-4">

          {sent ? (
            <div className="text-center space-y-4 py-2">
              <div className="text-5xl">✅</div>
              <p className="text-white font-black text-lg">נפתח עמוד התשלום</p>
              <p className="text-slate-400 text-sm leading-relaxed">
                אחרי השלמת התשלום, רענן את הדף — הדשבורד ייפתח אוטומטית.
              </p>
              <button
                onClick={() => window.open(TEACHER_PAY_URL, '_blank')}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black py-3.5 rounded-2xl transition-all active:scale-95"
              >
                פתח שוב את עמוד התשלום
              </button>
              <button
                onClick={() => window.location.reload()}
                className="w-full bg-white/10 hover:bg-white/15 border border-white/20 text-white font-bold py-3 rounded-2xl transition-all active:scale-95"
              >
                🔄 רענן — כבר שילמתי
              </button>
            </div>
          ) : (
            <>
              <div className="text-center space-y-1">
                <p className="text-white font-black text-xl">99 ₪ לחודש</p>
                <p className="text-slate-400 text-xs">ביטול בכל עת</p>
              </div>

              {err && <p className="text-red-400 text-sm text-center">{err}</p>}

              <button
                onClick={handlePay}
                disabled={sending}
                className="flex items-center justify-center gap-3 w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-black py-4 rounded-2xl transition-all active:scale-95 text-lg"
              >
                {sending ? '⏳ מכין...' : '💳 תשלום — גישה מיידית'}
              </button>

              <div className="relative flex items-center gap-3">
                <div className="flex-1 h-px bg-white/10" />
                <span className="text-slate-500 text-xs font-bold">או</span>
                <div className="flex-1 h-px bg-white/10" />
              </div>

              <a
                href={`https://wa.me/${WHATSAPP_NUMBER}?text=${whatsappMsg}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-3 w-full bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 text-green-300 font-black py-3.5 rounded-2xl transition-all active:scale-95"
              >
                <span className="text-xl">💬</span>
                דבר איתי ב-WhatsApp
              </a>
            </>
          )}
        </div>

        <div className="text-center">
          <button
            onClick={onLogout}
            className="text-slate-600 hover:text-slate-400 text-sm font-bold transition-colors"
          >
            יציאה מהחשבון
          </button>
        </div>
      </div>
    </div>
  );
}
