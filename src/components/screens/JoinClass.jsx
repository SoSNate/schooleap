import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

/**
 * /join?code=ABC123
 * מסך הצטרפות עצמית לכיתה — ללא צורך בחשבון Google.
 * תלמיד מזין שם + קוד כיתה → מקבל access_code אישי.
 */
export default function JoinClass() {
  const [searchParams]  = useSearchParams();
  const navigate        = useNavigate();
  const [code, setCode] = useState((searchParams.get('code') || '').toUpperCase());
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  // Pre-fill code from URL
  useEffect(() => {
    const c = searchParams.get('code');
    if (c) setCode(c.toUpperCase());
  }, [searchParams]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!code.trim())  { setError('הזן קוד כיתה'); return; }
    if (!name.trim())  { setError('הזן את שמך'); return; }

    setLoading(true);
    try {
      const { data, error: rpcErr } = await supabase.rpc('join_classroom', {
        p_classroom_code: code.trim().toUpperCase(),
        p_child_name:     name.trim(),
      });
      if (rpcErr) throw rpcErr;

      // ── Kahoot Flow: שמור ב-localStorage ועבור ישירות למשחק ──────────────
      localStorage.setItem('hasbaonautica_child_token', data.magic_token);
      localStorage.setItem('hasbaonautica_child_name',  data.name);
      navigate(`/play/${data.magic_token}`, { replace: true });
    } catch (e) {
      const msg = e?.message ?? '';
      if (msg.includes('invalid_code'))
        setError('קוד הכיתה לא קיים — בדוק שוב עם המורה שלך');
      else if (msg.includes('class_full'))
        setError('הכיתה מלאה — פנה למורה לפתרון');
      else
        setError('שגיאה בהצטרפות — נסה שוב');
    } finally {
      setLoading(false);
    }
  }

  // ─── טופס הצטרפות ─────────────────────────────────────────────────────────
  return (
    <div
      dir="rtl"
      className="min-h-[100dvh] flex items-center justify-center px-6"
      style={{ background: 'radial-gradient(ellipse at 50% 60%, #0f172a 0%, #020617 100%)' }}
    >
      <style>{`@keyframes twinkle{0%,100%{opacity:0}50%{opacity:.9}}`}</style>

      <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-[2rem] p-8 max-w-sm w-full space-y-6 shadow-2xl">
        <div className="text-center space-y-2">
          <div className="text-5xl">🎓</div>
          <h1 className="text-2xl font-black text-white">הצטרף לכיתה</h1>
          <p className="text-slate-400 text-sm">המורה נתן לך קוד? הזן אותו כאן</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* קוד כיתה */}
          <div>
            <label className="block text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1.5">
              קוד כיתה
            </label>
            <input
              type="text"
              autoFocus={!code}
              maxLength={8}
              className="w-full bg-white/10 border border-white/20 text-white placeholder-slate-500 rounded-xl px-4 py-3 text-center text-xl font-black font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-indigo-400 uppercase"
              placeholder="ABC123"
              value={code}
              onChange={e => { setCode(e.target.value.toUpperCase()); setError(''); }}
            />
          </div>

          {/* שם */}
          <div>
            <label className="block text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1.5">
              איך קוראים לך?
            </label>
            <input
              type="text"
              autoFocus={!!code}
              className="w-full bg-white/10 border border-white/20 text-white placeholder-slate-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              placeholder="שמך הפרטי"
              value={name}
              onChange={e => { setName(e.target.value); setError(''); }}
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm font-bold bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2 text-center">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-black py-4 rounded-xl text-base transition-all active:scale-95"
          >
            {loading ? '⏳ מצטרף...' : 'הצטרף לכיתה →'}
          </button>
        </form>

        <p className="text-center text-slate-600 text-xs">
          כבר יש לך קוד אישי?{' '}
          <button
            onClick={() => navigate('/')}
            className="text-indigo-400 hover:text-indigo-300 font-bold"
          >
            כנס דרך הדף הראשי
          </button>
        </p>
      </div>
    </div>
  );
}
