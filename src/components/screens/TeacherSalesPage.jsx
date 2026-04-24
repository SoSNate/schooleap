import { useState } from 'react';
import { supabase } from '../../lib/supabase';

const WHATSAPP_NUMBER = '972535303607';
const CONTACT_EMAIL   = '12natanel@gmail.com';

export default function TeacherSalesPage({ user, onLogout }) {
  const [tab, setTab]         = useState('info'); // 'info' | 'form' | 'sent'
  const [form, setForm]       = useState({ full_name: '', school: '', phone: '', notes: '' });
  const [agreed, setAgreed]   = useState(false);
  const [sending, setSending] = useState(false);
  const [err, setErr]         = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.full_name || !form.phone) { setErr('שם וטלפון הם שדות חובה'); return; }
    if (!agreed) { setErr('יש לאשר את תנאי השימוש ומדיניות הפרטיות'); return; }
    setSending(true);
    setErr(null);
    try {
      const { error } = await supabase.from('teacher_leads').insert({
        full_name: form.full_name.trim(),
        school:    form.school.trim() || null,
        phone:     form.phone.trim(),
        notes:     form.notes.trim() || null,
        email:     user?.email || null,
      });
      if (error) throw error;
      // Mark profile as pending so TeacherDashboard shows the waiting screen on next load.
      if (user?.id) {
        await supabase.from('profiles').update({ teacher_status: 'pending' }).eq('id', user.id);
      }
      setTab('sent');
    } catch (e) {
      setErr('שגיאה בשליחה — נסה שוב');
      console.error(e);
    } finally {
      setSending(false);
    }
  }

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
          <p className="text-slate-400 text-sm">פלטפורמת תרגול מתמטיקה לתלמידי יסודי — עם כלים ייעודיים לניהול כיתה</p>
        </div>

        {/* יתרונות */}
        <div className="grid grid-cols-1 gap-3">
          {[
            { emoji: '📋', title: 'ניהול כיתה מלא', desc: 'קוד הזמנה ייחודי — תלמידים מצטרפים בעצמם' },
            { emoji: '📊', title: 'מעקב התקדמות', desc: 'ראה את ביצועי כל תלמיד בזמן אמת' },
            { emoji: '🎯', title: 'משימות ייעודיות', desc: 'הגדר שיעורי בית ומעקב השלמה אוטומטי' },
            { emoji: '🚀', title: '10 משחקים אינטראקטיביים', desc: 'חיזוק מיומנויות מתמטיקה בצורה משחקית' },
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

        {/* CTA */}
        <div className="bg-white/5 border border-white/10 rounded-[2rem] p-6 space-y-4">
          {tab === 'info' && (
            <>
              <p className="text-white font-black text-center text-lg">מעוניין? בואו נדבר</p>
              <p className="text-slate-400 text-xs text-center">בחר את הדרך הנוחה לך ליצירת קשר</p>

              <a
                href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent('שלום נתנאל, אני מעוניין להצטרף כמורה לחשבונאוטיקה')}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-3 w-full bg-green-600 hover:bg-green-500 text-white font-black py-3.5 rounded-2xl transition-all active:scale-95"
              >
                <span className="text-xl">💬</span>
                שלח הודעת WhatsApp
              </a>

              <a
                href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('הצטרפות כמורה לחשבונאוטיקה')}`}
                className="flex items-center justify-center gap-3 w-full bg-white/10 hover:bg-white/15 border border-white/20 text-white font-black py-3.5 rounded-2xl transition-all active:scale-95"
              >
                <span className="text-xl">✉️</span>
                שלח מייל
              </a>

              <button
                onClick={() => setTab('form')}
                className="flex items-center justify-center gap-3 w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black py-3.5 rounded-2xl transition-all active:scale-95"
              >
                <span className="text-xl">📝</span>
                השאר פרטים ואחזור אליך
              </button>
            </>
          )}

          {tab === 'form' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-white font-black text-center">השאר פרטים</p>

              <div className="space-y-3">
                <input
                  required
                  placeholder="שם מלא *"
                  value={form.full_name}
                  onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-400"
                />
                <input
                  placeholder="בית ספר / מוסד"
                  value={form.school}
                  onChange={e => setForm(f => ({ ...f, school: e.target.value }))}
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-400"
                />
                <input
                  required
                  placeholder="טלפון *"
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-400"
                />
                <textarea
                  placeholder="הערות / שאלות (אופציונלי)"
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  rows={3}
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-400 resize-none"
                />
              </div>

              <label className="flex items-start gap-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={e => setAgreed(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-indigo-500"
                />
                <span>
                  אני מאשר/ת את{' '}
                  <a href="/terms" target="_blank" rel="noreferrer" className="text-indigo-400 underline">תנאי השימוש</a>
                  {' '}ואת{' '}
                  <a href="/privacy" target="_blank" rel="noreferrer" className="text-indigo-400 underline">מדיניות הפרטיות</a>
                </span>
              </label>

              {err && <p className="text-red-400 text-sm text-center">{err}</p>}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setTab('info')}
                  className="flex-1 bg-white/10 hover:bg-white/15 text-white font-bold py-3 rounded-xl transition-all"
                >
                  חזור
                </button>
                <button
                  type="submit"
                  disabled={sending}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-black py-3 rounded-xl transition-all"
                >
                  {sending ? 'שולח...' : 'שלח בקשה'}
                </button>
              </div>
            </form>
          )}

          {tab === 'sent' && (
            <div className="text-center space-y-3 py-2">
              <div className="text-5xl">✅</div>
              <p className="text-white font-black text-lg">פרטיך התקבלו!</p>
              <p className="text-slate-400 text-sm">ניצור קשר בהקדם האפשרי</p>
            </div>
          )}
        </div>

        {/* יציאה */}
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
