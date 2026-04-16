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

// ─── Orbit ring animation ─────────────────────────────────────────────────────

function OrbitDot({ size = 6, color = '#818cf8', radius = 120, angleDeg = 0, speed = '8s' }) {
  const rad = (angleDeg * Math.PI) / 180;
  const cx = Math.cos(rad) * radius;
  const cy = Math.sin(rad) * radius;
  return (
    <div
      className="absolute rounded-full"
      style={{
        width: size, height: size,
        background: color,
        top: '50%', left: '50%',
        transform: `translate(calc(-50% + ${cx}px), calc(-50% + ${cy}px))`,
        animation: `orbit ${speed} linear infinite`,
        '--orbit-radius': `${radius}px`,
        boxShadow: `0 0 ${size * 2}px ${color}`,
      }}
    />
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const navigate = useNavigate();
  const [launched, setLaunched] = useState(false);

  function handleEnter() {
    setLaunched(true);
    setTimeout(() => navigate('/parent'), 600);
  }

  return (
    <div
      dir="rtl"
      className="min-h-[100dvh] flex flex-col items-center justify-center relative overflow-hidden select-none"
      style={{ background: 'radial-gradient(ellipse at 50% 60%, #0f172a 0%, #020617 100%)' }}
    >
      {/* CSS for animations */}
      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0; }
          50% { opacity: 1; }
        }
        @keyframes orbit {
          from { transform: translate(calc(-50% + var(--orbit-radius)), -50%); }
          to   { transform: translate(calc(-50% + var(--orbit-radius)), -50%)
                             rotate(360deg) translateX(calc(-1 * var(--orbit-radius)));
          }
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

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-lg w-full gap-8">

        {/* Rocket + orbit */}
        <div className="relative flex items-center justify-center w-40 h-40">
          <div className="absolute w-32 h-32 rounded-full border border-white/10" />
          <div className="absolute w-20 h-20 rounded-full border border-indigo-500/30" />
          {/* Orbit dots */}
          <div className="absolute inset-0" style={{ animation: 'orbit-container 10s linear infinite' }}>
            <div className="absolute w-2 h-2 rounded-full bg-indigo-400"
              style={{ top: '50%', left: 0, transform: 'translate(-50%, -50%)',
                boxShadow: '0 0 6px #818cf8',
                animation: 'orbit-dot-h 10s linear infinite',
              }}
            />
          </div>
          <div className="absolute inset-0" style={{ animation: 'orbit-container 7s linear infinite reverse' }}>
            <div className="absolute w-1.5 h-1.5 rounded-full bg-purple-400"
              style={{ top: 0, left: '50%', transform: 'translate(-50%, -50%)',
                boxShadow: '0 0 4px #a78bfa',
                animation: 'orbit-dot-v 7s linear infinite reverse',
              }}
            />
          </div>
          <style>{`
            @keyframes orbit-dot-h {
              from { transform: rotate(0deg) translateX(64px) rotate(0deg); top: 50%; left: 50%; }
              to   { transform: rotate(360deg) translateX(64px) rotate(-360deg); top: 50%; left: 50%; }
            }
            @keyframes orbit-dot-v {
              from { transform: rotate(0deg) translateX(40px) rotate(0deg); top: 50%; left: 50%; }
              to   { transform: rotate(360deg) translateX(40px) rotate(-360deg); top: 50%; left: 50%; }
            }
          `}</style>
          <div className={`text-6xl z-10 ${launched ? 'rocket-launch' : 'rocket-idle'}`}>
            🚀
          </div>
        </div>

        {/* Logo */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/20 border border-indigo-400/30 rounded-full mb-1">
            <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
            <span className="text-indigo-300 text-[10px] font-black uppercase tracking-widest">Mission Control</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white leading-tight tracking-tight">
            חשבונאוטיקה
          </h1>
          <p className="text-slate-400 text-base leading-relaxed">
            פלטפורמת הכנה מתמטית לכיתה ז'<br />
            <span className="text-indigo-300 font-bold">10 דקות ביום. שינוי לכל השנה.</span>
          </p>
        </div>

        {/* Features */}
        <div className="flex flex-wrap justify-center gap-2">
          <Pill emoji="🎮" text="9 משחקים אינטראקטיביים" />
          <Pill emoji="📊" text="דוחות הורים בזמן אמת" />
          <Pill emoji="🔗" text="קישור קסם לילד" />
          <Pill emoji="🆓" text="14 ימי ניסיון חינם" />
        </div>

        {/* CTA */}
        <button
          onClick={handleEnter}
          className="glow-btn w-full max-w-xs flex items-center justify-center gap-3 bg-indigo-600 hover:bg-indigo-500 text-white font-black py-4 px-8 rounded-2xl text-lg transition-all active:scale-95"
        >
          <span>כניסה להורים</span>
          <span className="text-xl">→</span>
        </button>

        <p className="text-slate-600 text-xs">
          כניסה עם Google • ללא סיסמה • ללא התחייבות
        </p>
      </div>

      {/* Bottom planet decoration */}
      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-[600px] h-[300px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(79,70,229,0.15) 0%, transparent 60%)' }}
      />
    </div>
  );
}
