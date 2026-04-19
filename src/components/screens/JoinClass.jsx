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
  const [result,  setResult]  = useState(null); // { access_code, magic_token, name }
  const [copied,  setCopied]  = useState(false);

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
      setResult(data);
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

  async function copyCode() {
    if (!result?.access_code) return;
    try {
      await navigator.clipboard.writeText(result.access_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  }

  // ─── מסך הצלחה חגיגי ──────────────────────────────────────────────────────
  if (result) {
    return (
      <div
        dir="rtl"
        className="min-h-[100dvh] flex flex-col items-center justify-center px-6 relative overflow-hidden"
        style={{ background: 'radial-gradient(ellipse at 50% 40%, #0f172a 0%, #020617 100%)' }}
      >
        {/* כוכבים */}
        <style>{`
          @keyframes twinkle { 0%,100%{opacity:0} 50%{opacity:.9} }
          @keyframes pop     { 0%{transform:scale(0)} 60%{transform:scale(1.2)} 100%{transform:scale(1)} }
          @keyframes confetti-fall {
            0%   { transform: translateY(-20px) rotate(0deg);   opacity: 1; }
            100% { transform: translateY(80px)  rotate(360deg); opacity: 0; }
          }
        `}</style>

        {/* Confetti dots */}
        {['#6366f1','#22d3ee','#f59e0b','#10b981','#f43f5e'].map((color, i) => (
          Array.from({ length: 5 }, (_, j) => (
            <div key={`${i}-${j}`} className="absolute rounded-full pointer-events-none"
              style={{
                width: 8, height: 8, background: color,
                top: `${10 + j * 15}%`,
                left: `${10 + i * 18 + j * 3}%`,
                animation: `confetti-fall ${1.2 + j * 0.3}s ${i * 0.15}s ease-out forwards`,
              }}
            />
          ))
        ))}

        <div className="relative z-10 flex flex-col items-center text-center max-w-sm w-full gap-6"
          style={{ animation: 'pop 0.5s ease-out' }}>

          <div className="text-7xl">🎉</div>

          <div className="space-y-2">
            <h1 className="text-3xl font-black text-white">
              ברוך הבא, {result.name}!
            </h1>
            <p className="text-slate-400 text-sm">הצטרפת לכיתה בהצלחה</p>
          </div>

          {/* קוד גישה */}
          <div className="bg-white/5 border border-white/10 rounded-[2rem] p-6 w-full space-y-3">
            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">
              קוד הגישה האישי שלך
            </p>
            <p className="text-5xl font-black font-mono tracking-widest text-white select-all">
              {result.access_code}
            </p>
            <p className="text-slate-500 text-xs leading-relaxed">
              שמור את הקוד הזה — תזדקק לו בכל פעם שתכנס למשחק
            </p>
            <button
              onClick={copyCode}
              className="w-full bg-white/10 hover:bg-white/20 text-white font-bold py-2.5 rounded-xl text-sm transition-all active:scale-95 border border-white/20"
            >
              {copied ? '✅ הועתק!' : '📋 העתק קוד'}
            </button>
          </div>

          {/* כפתור משחק מיידי */}
          {result.magic_token && (
            <button
              onClick={() => navigate(`/play/${result.magic_token}`)}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black py-4 rounded-2xl text-base transition-all active:scale-95 shadow-lg shadow-indigo-500/30"
            >
              🚀 בואו נשחק!
            </button>
          )}

          <button
            onClick={() => navigate('/')}
            className="text-slate-600 hover:text-slate-400 text-sm font-medium transition-colors"
          >
            ← חזור לעמוד הראשי
          </button>
        </div>
      </div>
    );
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
