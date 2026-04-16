import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

// ─── Star field ───────────────────────────────────────────────────────────────

function Stars({ count = 120 }) {
  const [stars] = useState(() =>
    Array.from({ length: count }, (_, i) => ({
      id: i,
      top:    `${Math.random() * 100}%`,
      left:   `${Math.random() * 100}%`,
      size:   Math.random() * 2 + 1,
      delay:  Math.random() * 4,
      dur:    Math.random() * 3 + 2,
    }))
  );
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      {stars.map(s => (
        <div
          key={s.id}
          className="absolute rounded-full bg-white"
          style={{
            top: s.top, left: s.left,
            width: s.size, height: s.size,
            opacity: 0,
            animation: `twinkle ${s.dur}s ${s.delay}s ease-in-out infinite`,
          }}
        />
      ))}
    </div>
  );
}

// ─── Feature pill ─────────────────────────────────────────────────────────────

function Pill({ emoji, text }) {
  return (
    <div className="flex items-center gap-2 bg-white/5 border border-white/10 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-bold text-white/80">
      <span>{emoji}</span>
      <span>{text}</span>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

const CONTACT_EMAIL = '12natanel@gmail.com';

export default function LandingPage() {
  const navigate = useNavigate();
  const [launched, setLaunched] = useState(false);

  // תיקון באג גלילה — תמיד נוחתים בראש הדף
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  function handleEnter() {
    setLaunched(true);
    setTimeout(() => navigate('/parent'), 600);
  }

  function scrollToAbout() {
    document.getElementById('about-section')?.scrollIntoView({ behavior: 'smooth' });
  }

  return (
    <div
      dir="rtl"
      className="min-h-[100dvh] flex flex-col relative overflow-hidden select-none"
      style={{ background: 'radial-gradient(ellipse at 50% 60%, #0f172a 0%, #020617 100%)' }}
    >
      {/* CSS for animations */}
      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0; }
          50% { opacity: 1; }
        }
        @keyframes float-up {
          0%   { transform: translateY(0px); }
          50%  { transform: translateY(-12px); }
          100% { transform: translateY(0px); }
        }
        @keyframes launch {
          from { transform: translateY(0) scale(1); opacity: 1; }
          to   { transform: translateY(-120px) scale(0.5); opacity: 0; }
        }
        @keyframes glow-pulse {
          0%, 100% { box-shadow: 0 0 20px 4px rgba(99,102,241,0.4); }
          50%       { box-shadow: 0 0 40px 8px rgba(99,102,241,0.8); }
        }
        @keyframes orbit-dot-h {
          from { transform: rotate(0deg) translateX(64px) rotate(0deg); top: 50%; left: 50%; }
          to   { transform: rotate(360deg) translateX(64px) rotate(-360deg); top: 50%; left: 50%; }
        }
        @keyframes orbit-dot-v {
          from { transform: rotate(0deg) translateX(40px) rotate(0deg); top: 50%; left: 50%; }
          to   { transform: rotate(360deg) translateX(40px) rotate(-360deg); top: 50%; left: 50%; }
        }
        .rocket-idle   { animation: float-up 3s ease-in-out infinite; }
        .rocket-launch { animation: launch 0.6s ease-in forwards; }
        .glow-btn      { animation: glow-pulse 2s ease-in-out infinite; }
      `}</style>

      <Stars />

      {/* Nebula blobs */}
      <div className="absolute w-[600px] h-[600px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(79,70,229,0.12) 0%, transparent 70%)', top: '-10%', right: '-10%' }} />
      <div className="absolute w-[400px] h-[400px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(168,85,247,0.08) 0%, transparent 70%)', bottom: '-5%', left: '-5%' }} />

      {/* ── Hero section ── */}
      <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-lg w-full mx-auto gap-7 pt-16 pb-12">

        {/* Rocket + orbit */}
        <div className="relative flex items-center justify-center w-40 h-40">
          <div className="absolute w-32 h-32 rounded-full border border-white/10" />
          <div className="absolute w-20 h-20 rounded-full border border-indigo-500/30" />
          <div className="absolute inset-0">
            <div className="absolute w-2 h-2 rounded-full bg-indigo-400"
              style={{ top: '50%', left: 0, transform: 'translate(-50%, -50%)',
                boxShadow: '0 0 6px #818cf8',
                animation: 'orbit-dot-h 10s linear infinite',
              }}
            />
          </div>
          <div className="absolute inset-0">
            <div className="absolute w-1.5 h-1.5 rounded-full bg-purple-400"
              style={{ top: 0, left: '50%', transform: 'translate(-50%, -50%)',
                boxShadow: '0 0 4px #a78bfa',
                animation: 'orbit-dot-v 7s linear infinite reverse',
              }}
            />
          </div>
          <div className={`text-6xl z-10 ${launched ? 'rocket-launch' : 'rocket-idle'}`}>
            🚀
          </div>
        </div>

        {/* Title */}
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/20 border border-indigo-400/30 rounded-full">
            <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
            <span className="text-indigo-300 text-[10px] font-black uppercase tracking-widest">Mission Control</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white leading-tight tracking-tight">
            חשבונאוטיקה
          </h1>
          <p className="text-slate-300 text-base leading-relaxed">
            פלטפורמת תרגול וחיזוק היכולות שנלמדו ביסודי<br />
            לקראת חטיבת הביניים
          </p>
          {/* סלוגן בולט */}
          <p className="text-2xl md:text-3xl font-black text-indigo-300 leading-snug">
            10 דקות ביום –<br className="md:hidden" /> שינוי לכל השנה!
          </p>
        </div>

        {/* Feature pills */}
        <div className="flex flex-wrap justify-center gap-2">
          <Pill emoji="🎮" text="9 משחקים אינטראקטיביים (ויגיעו עוד בהמשך!)" />
          <Pill emoji="📊" text="דוחות הורים בזמן אמת" />
          <Pill emoji="🔗" text="קישור קסם ייעודי לילד" />
        </div>

        {/* CTA — כניסת הורים */}
        <div className="w-full max-w-xs flex flex-col items-center gap-3">
          <button
            onClick={handleEnter}
            className="glow-btn w-full flex items-center justify-center gap-3 bg-indigo-600 hover:bg-indigo-500 text-white font-black py-4 px-8 rounded-2xl text-lg transition-all active:scale-95"
          >
            <span>כניסת הורים</span>
            <span className="text-xl">→</span>
          </button>

          {/* Trust signals */}
          <div className="flex flex-wrap justify-center gap-x-3 gap-y-1">
            <span className="flex items-center gap-1 text-xs font-bold text-green-400">
              <span>✓</span> 14 יום ניסיון חינם
            </span>
            <span className="flex items-center gap-1 text-xs font-bold text-slate-400">
              <span>✓</span> ללא כרטיס אשראי
            </span>
            <span className="flex items-center gap-1 text-xs font-bold text-slate-400">
              <span>✓</span> ללא התחייבות
            </span>
          </div>

          <p className="text-slate-600 text-xs">
            כניסה עם Google בלחיצה אחת • ללא סיסמה
          </p>
        </div>

        {/* ── חץ קפיצה לסקשן "קצת עליי" ── */}
        <button
          onClick={scrollToAbout}
          className="flex flex-col items-center gap-1 text-slate-500 hover:text-indigo-300 transition-colors mt-2 group"
          aria-label="גלול לקצת עליי"
        >
          <span className="text-xs font-bold group-hover:text-indigo-300 transition-colors">קצת עליי</span>
          <span className="text-xl animate-bounce">↓</span>
        </button>
      </div>

      {/* Bottom planet decoration */}
      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-[600px] h-[300px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(79,70,229,0.15) 0%, transparent 60%)' }}
      />

      {/* ── סקשן "קצת עליי" ── */}
      <section id="about-section" className="relative z-10 w-full">
        {/* מפריד עדין */}
        <div className="w-full h-px bg-gradient-to-l from-transparent via-indigo-500/30 to-transparent" />

        <div className="max-w-2xl mx-auto px-5 py-16" dir="rtl">
          {/* כותרת */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-1 h-8 bg-indigo-500 rounded-full" />
            <h2 className="text-2xl font-black text-white">קצת עליי</h2>
          </div>

          {/* כרטיסייה ראשית */}
          <div className="bg-white/5 border border-white/10 backdrop-blur-sm rounded-3xl p-7 space-y-5">
            <p className="text-slate-300 text-base leading-relaxed">
              אני נתנאל, מורה פרטי למתמטיקה מראשון לציון. מתוך היכרות עמוקה עם התלמידים
              והאתגרים בשטח, זיהיתי פער משמעותי במעבר בין בית הספר היסודי לחטיבת הביניים.
            </p>
            <p className="text-slate-300 text-base leading-relaxed">
              לכן פיתחתי את <span className="text-indigo-300 font-bold">חשבונאוטיקה</span> –
              כדי להעניק לילדים סביבה בטוחה, חווייתית ומעצימה. כאן הם יכולים לקחת את
              הכלים שרכשו ביסודי, לתרגל אותם בצורה משחקית, ולבנות ביטחון עצמי חזק
              לקראת האתגרים הבאים.
            </p>

            {/* כרטיסיית קשר */}
            <div className="bg-indigo-500/10 border border-indigo-400/20 rounded-2xl p-4 space-y-1">
              <p className="text-sm font-bold text-indigo-200">
                יש לכם רעיון, פידבק או שאלה? אשמח לשמוע מכם אישית.
              </p>
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="inline-flex items-center gap-2 text-indigo-300 hover:text-white font-black text-sm transition-colors"
              >
                ✉️ {CONTACT_EMAIL}
              </a>
            </div>
          </div>

          {/* Back to top */}
          <div className="text-center mt-10">
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="text-slate-600 hover:text-indigo-400 font-bold text-sm transition-colors"
            >
              ↑ חזור למעלה
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
