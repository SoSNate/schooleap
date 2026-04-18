import { useState, useRef } from 'react';
import { Rocket, Bell, Gift, CheckCircle2, Send } from 'lucide-react';

// ─── Star field ───────────────────────────────────────────────────────────────
function Stars({ count = 100 }) {
  const [stars] = useState(() =>
    Array.from({ length: count }, (_, i) => ({
      id: i,
      top: `${Math.random() * 100}%`,
      left: `${Math.random() * 100}%`,
      size: Math.random() * 2 + 1,
      delay: Math.random() * 4,
      dur: Math.random() * 3 + 2,
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

// ─── Step indicator ───────────────────────────────────────────────────────────
function StepDots({ current, total }) {
  return (
    <div className="flex items-center gap-2 justify-center mt-2">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={`rounded-full transition-all duration-300 ${
            i === current
              ? 'w-5 h-2 bg-indigo-400'
              : i < current
              ? 'w-2 h-2 bg-indigo-600'
              : 'w-2 h-2 bg-white/20'
          }`}
        />
      ))}
    </div>
  );
}

// ─── Potential chart (SVG) ────────────────────────────────────────────────────
function PotentialChart({ minutes }) {
  const weeks = [1, 2, 3, 4, 5, 6, 7, 8];
  const growthRate = minutes / 60;
  const maxH = 80;
  const bars = weeks.map((w, i) => ({
    h: Math.min(maxH, 8 + i * (growthRate * 11)),
    week: w,
  }));

  const color = minutes <= 15 ? '#818cf8' : minutes <= 35 ? '#a78bfa' : '#c084fc';

  return (
    <svg viewBox="0 0 220 100" className="w-full max-w-xs mx-auto" aria-hidden>
      {/* baseline */}
      <line x1="10" y1="90" x2="210" y2="90" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
      {bars.map((b, i) => {
        const x = 15 + i * 26;
        const y = 90 - b.h;
        return (
          <g key={i}>
            <rect
              x={x} y={y} width="18" height={b.h}
              rx="3"
              fill={color}
              opacity="0.8"
              style={{ transition: 'all 0.4s ease' }}
            />
            <text x={x + 9} y="98" textAnchor="middle" fontSize="7" fill="rgba(255,255,255,0.4)">
              {`ש${b.week}`}
            </text>
          </g>
        );
      })}
      <text x="110" y="10" textAnchor="middle" fontSize="8" fill="rgba(255,255,255,0.5)">
        שיפור לאורך 8 שבועות
      </text>
    </svg>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

const LEVEL_LABELS = [
  { max: 15, label: 'טירון 🌱', color: 'text-emerald-300' },
  { max: 30, label: 'חוקר 🔭', color: 'text-sky-300' },
  { max: 45, label: 'גיבור 🦸', color: 'text-indigo-300' },
  { max: 60, label: 'אלוף 🏆', color: 'text-yellow-300' },
];

function getLevel(minutes) {
  return LEVEL_LABELS.find(l => minutes <= l.max) || LEVEL_LABELS[LEVEL_LABELS.length - 1];
}

export default function MarketingAd() {
  const [step, setStep] = useState(0);

  // Step 0 — drag puzzle
  // slotData[i] = { id, type, val } | null  (5 slots: num op num op num)
  const PUZZLE_CORRECT = ['12', '÷', '3', '+', '6'];
  const [slotData, setSlotData] = useState([null, null, null, null, null]);
  const [puzzleResult, setPuzzleResult] = useState(null); // null | 'correct' | 'wrong'

  function firstEmptySlot(type) {
    for (let i = 0; i < 5; i++) {
      const slotType = i % 2 === 0 ? 'num' : 'op';
      if (slotType === type && !slotData[i]) return i;
    }
    return -1;
  }

  function placeChip(chip) {
    const idx = firstEmptySlot(chip.type);
    if (idx < 0) return;
    setSlotData(prev => {
      const next = [...prev];
      next[idx] = chip;
      return next;
    });
    setPuzzleResult(null);
  }

  function removeFromSlot(i) {
    setSlotData(prev => { const n = [...prev]; n[i] = null; return n; });
    setPuzzleResult(null);
  }

  function checkPuzzle() {
    if (slotData.some(d => !d)) return;
    const ok = slotData.every((d, i) => d.val === PUZZLE_CORRECT[i]);
    setPuzzleResult(ok ? 'correct' : 'wrong');
  }

  // Step 2 — slider
  const [minutes, setMinutes] = useState(20);

  // Step 4 — lead form
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [suggestedName, setSuggestedName] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const scrollRef = useRef(null);

  function scrollTop() {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function goNext() {
    setStep(s => s + 1);
    setTimeout(scrollTop, 50);
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim() || !contact.trim()) return;
    setSending(true);
    setTimeout(() => {
      console.log('Lead captured:', { name, contact, suggestedName: suggestedName.trim() || '(לא הוצע שם)' });
      setSending(false);
      setSent(true);
    }, 1800);
  }

  const level = getLevel(minutes);

  return (
    <div
      dir="rtl"
      className="relative w-full h-[100dvh] overflow-hidden flex flex-col"
      style={{ background: 'radial-gradient(ellipse at 50% 60%, #0f172a 0%, #020617 100%)' }}
    >
      {/* CSS */}
      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0; }
          50% { opacity: 1; }
        }
        @keyframes float-up {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        @keyframes glow-pulse {
          0%, 100% { box-shadow: 0 0 18px 3px rgba(99,102,241,0.45); }
          50%       { box-shadow: 0 0 36px 7px rgba(99,102,241,0.75); }
        }
        @keyframes pop-in {
          from { opacity: 0; transform: scale(0.85) translateY(12px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes success-bounce {
          0%   { transform: scale(0.8) rotate(-5deg); opacity: 0; }
          60%  { transform: scale(1.08) rotate(2deg); opacity: 1; }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        .float-rocket { animation: float-up 3s ease-in-out infinite; }
        .glow-btn     { animation: glow-pulse 2s ease-in-out infinite; }
        .pop-in       { animation: pop-in 0.4s ease both; }
        .success-anim { animation: success-bounce 0.6s ease both; }
        input[type=range]::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 24px; height: 24px;
          border-radius: 50%;
          background: #6366f1;
          cursor: pointer;
          box-shadow: 0 0 0 4px rgba(99,102,241,0.25);
        }
        input[type=range] {
          -webkit-appearance: none;
          appearance: none;
          width: 100%;
          height: 6px;
          border-radius: 99px;
          background: rgba(255,255,255,0.12);
          outline: none;
        }
      `}</style>

      <Stars />

      {/* Nebula blobs */}
      <div className="absolute w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(79,70,229,0.13) 0%, transparent 70%)', top: '-15%', right: '-10%' }} />
      <div className="absolute w-[350px] h-[350px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(168,85,247,0.09) 0%, transparent 70%)', bottom: '-10%', left: '-5%' }} />

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between px-5 pt-5 pb-2 flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="float-rocket text-2xl">🚀</span>
          <span className="font-black text-white text-lg tracking-tight">חשבונאוטיקה שם זמני</span>
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-500/20 border border-indigo-400/30 rounded-full">
          <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          <span className="text-indigo-300 text-[10px] font-black uppercase tracking-widest">מבצע השקה</span>
        </div>
      </div>

      {/* Step dots */}
      <div className="relative z-10 flex-shrink-0 pt-1">
        <StepDots current={step} total={4} />
      </div>

      {/* Scrollable content area */}
      <div
        ref={scrollRef}
        className="relative z-10 flex-1 overflow-y-auto overscroll-contain px-5 pb-8 pt-4"
        style={{ maxHeight: '85dvh' }}
      >
        {/* ───────── STEP 0: Drag Puzzle ───────── */}
        {step === 0 && (
          <div className="pop-in flex flex-col gap-5 max-w-md mx-auto">
            <div className="text-center space-y-1">
              <p className="text-indigo-300 text-xs font-black uppercase tracking-widest">שלב 1 מתוך 4</p>
              <h2 className="text-2xl font-black text-white leading-tight">בנה את המשוואה 🧩</h2>
              <p className="text-slate-400 text-sm">לחץ על חלק כדי להניח אותו בחריץ</p>
            </div>

            <div className="bg-white/5 border border-white/10 backdrop-blur-sm rounded-3xl p-6 space-y-4">
              {/* Equation slots */}
              <div className="flex items-center justify-center gap-1.5 flex-wrap" dir="ltr">
                {slotData.map((d, i) => {
                  const isOp = i % 2 === 1;
                  return (
                    <button
                      key={i}
                      onClick={() => d && removeFromSlot(i)}
                      className={`flex items-center justify-center font-black text-lg rounded-2xl transition-all cursor-pointer
                        ${isOp ? 'w-11 h-11' : 'w-13 h-11 min-w-[52px]'}
                        ${d
                          ? isOp
                            ? 'bg-purple-500/20 border-2 border-purple-400 text-white hover:bg-purple-500/35'
                            : 'bg-indigo-500/20 border-2 border-indigo-400 text-white hover:bg-indigo-500/35'
                          : isOp
                            ? 'border-2 border-dashed border-purple-400/40 text-purple-400/40'
                            : 'border-2 border-dashed border-indigo-400/40 text-indigo-400/40'
                        }`}
                      style={{ width: isOp ? 44 : 56, height: 48 }}
                      disabled={!d}
                    >
                      {d ? d.val : '?'}
                    </button>
                  );
                })}
                <span className="text-slate-400 font-black text-xl mx-1">=</span>
                <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-600 text-white font-black text-xl shadow-lg shadow-indigo-500/30">
                  10
                </div>
              </div>

              {/* Pool */}
              <div className="flex flex-wrap gap-2.5 justify-center bg-white/[.04] border border-white/[.08] rounded-2xl p-3 min-h-[68px]" dir="ltr">
                {[
                  { id: 'c6',   type: 'num', val: '6'  },
                  { id: 'c3',   type: 'num', val: '3'  },
                  { id: 'cadd', type: 'op',  val: '+'  },
                  { id: 'c12',  type: 'num', val: '12' },
                  { id: 'cdiv', type: 'op',  val: '÷'  },
                ].map(chip => {
                  const used = slotData.some(d => d?.id === chip.id);
                  return (
                    <button
                      key={chip.id}
                      onClick={() => !used && placeChip(chip)}
                      disabled={used}
                      className={`min-w-[48px] h-12 px-4 rounded-2xl font-black text-lg transition-all active:scale-95
                        ${chip.type === 'op'
                          ? 'bg-purple-500/20 border-2 border-purple-400/50 text-purple-200'
                          : 'bg-indigo-500/20 border-2 border-indigo-400/50 text-indigo-200'}
                        ${used ? 'opacity-20 cursor-not-allowed' : 'hover:scale-105'}`}
                    >
                      {chip.val}
                    </button>
                  );
                })}
              </div>

              {/* Feedback */}
              {puzzleResult && (
                <div className={`pop-in rounded-2xl p-4 text-sm font-bold leading-relaxed text-center ${
                  puzzleResult === 'correct'
                    ? 'bg-emerald-500/15 border border-emerald-400/30 text-emerald-300'
                    : 'bg-red-500/15 border border-red-400/30 text-red-300'
                }`}>
                  {puzzleResult === 'correct'
                    ? 'כל הכבוד! 🙌 בשיעורים פרטיים היית משלם על זה 💰'
                    : 'המוח שלנו עובד ככה — בדיוק בשביל זה יש חשבונאוטיקה שם זמני 😊'}
                </div>
              )}

              <button
                onClick={checkPuzzle}
                disabled={slotData.some(d => !d)}
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-black py-3.5 rounded-2xl text-base transition-all active:scale-95"
              >
                בדוק ✨
              </button>
            </div>

            <button
              onClick={goNext}
              className="glow-btn w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black py-4 rounded-2xl text-lg transition-all active:scale-95"
            >
              המשך →
            </button>
          </div>
        )}

        {/* ───────── STEP 1: Potential Slider ───────── */}
        {step === 1 && (
          <div className="pop-in flex flex-col gap-5 max-w-md mx-auto">
            <div className="text-center space-y-1">
              <p className="text-indigo-300 text-xs font-black uppercase tracking-widest">שלב 2 מתוך 4</p>
              <h2 className="text-2xl font-black text-white leading-tight">סליידר הפוטנציאל ⚡</h2>
              <p className="text-slate-400 text-sm">כמה דקות ביום הילד יתרגל?</p>
            </div>

            <div className="bg-white/5 border border-white/10 backdrop-blur-sm rounded-3xl p-6 space-y-5">
              {/* Slider */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm text-slate-400">
                  <span>5 דק׳</span>
                  <div className="text-center">
                    <span className="text-3xl font-black text-white">{minutes}</span>
                    <span className="text-slate-400 text-sm mr-1">דקות/יום</span>
                  </div>
                  <span>60 דק׳</span>
                </div>
                <input
                  type="range"
                  min={5} max={60} step={1}
                  value={minutes}
                  onChange={e => setMinutes(Number(e.target.value))}
                />
              </div>

              {/* Level badge */}
              <div className={`text-center text-xl font-black ${level.color} transition-all duration-300`}>
                {level.label}
              </div>

              {/* Chart */}
              <PotentialChart minutes={minutes} />

              {/* Dynamic text */}
              <div className="bg-indigo-500/10 border border-indigo-400/20 rounded-2xl p-3 text-sm text-indigo-200 font-bold text-center leading-relaxed transition-all duration-300">
                {minutes <= 15
                  ? 'לפחות ₪80/חודש שתחסוך על שיעורים פרטיים'
                  : minutes <= 30
                  ? 'לפחות ₪150/חודש שתחסוך על שיעורים פרטיים'
                  : minutes <= 45
                  ? 'לפחות ₪250/חודש שתחסוך על שיעורים פרטיים'
                  : 'לפחות ₪350/חודש שתחסוך על שיעורים פרטיים 💰'}
              </div>
            </div>

            <button
              onClick={goNext}
              className="glow-btn w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black py-4 rounded-2xl text-lg transition-all active:scale-95"
            >
              המשך →
            </button>
          </div>
        )}

        {/* ───────── STEP 2: The Method ───────── */}
        {step === 2 && (
          <div className="pop-in flex flex-col gap-5 max-w-md mx-auto">
            <div className="text-center space-y-1">
              <p className="text-indigo-300 text-xs font-black uppercase tracking-widest">שלב 3 מתוך 4</p>
              <h2 className="text-2xl font-black text-white leading-tight">הסכם הלמידה 🤝</h2>
              <p className="text-slate-400 text-sm">שלושה צעדים פשוטים</p>
            </div>

            <div className="bg-white/5 border border-white/10 backdrop-blur-sm rounded-3xl p-6 space-y-4">
              {[
                {
                  icon: <Rocket size={22} className="text-indigo-400" />,
                  title: 'הילד מתרגל',
                  desc: 'משחקי מתמטיקה חווייתיים, כל יום, בקצב שלו',
                },
                {
                  icon: <Bell size={22} className="text-purple-400" />,
                  title: 'המערכת מעדכנת אותך',
                  desc: 'דוח הורים בזמן אמת — מה תרגל, איפה נתקע, כמה זמן',
                },
                {
                  icon: <Gift size={22} className="text-pink-400" />,
                  title: 'הילד מקבל פרס מוסכם',
                  desc: 'אתם קובעים את הפרס מראש — מוטיבציה פנימית אמיתית',
                },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center">
                    {item.icon}
                  </div>
                  <div>
                    <p className="text-white font-black text-sm">{item.title}</p>
                    <p className="text-slate-400 text-sm leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-indigo-500/10 border border-indigo-400/20 rounded-2xl p-4 text-center">
              <p className="text-indigo-200 text-sm font-bold leading-relaxed">
                הפלטפורמה פותחה על ידי נתנאל, מורה פרטי למתמטיקה
                מראשון לציון, מתוך ניסיון אמיתי בשטח.
              </p>
            </div>

            <button
              onClick={goNext}
              className="glow-btn w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black py-4 rounded-2xl text-lg transition-all active:scale-95"
            >
              אני רוצה לנסות! →
            </button>
          </div>
        )}

        {/* ───────── STEP 3: Lead Form ───────── */}
        {step === 3 && !sent && (
          <div className="pop-in flex flex-col gap-5 max-w-md mx-auto">
            <div className="text-center space-y-1">
              <p className="text-indigo-300 text-xs font-black uppercase tracking-widest">שלב 4 מתוך 4</p>
              <h2 className="text-2xl font-black text-white leading-tight">השאר פרטים 📬</h2>
              <p className="text-slate-400 text-sm">ניצור איתך קשר תוך 24 שעות</p>
            </div>

            <div className="bg-white/5 border border-white/10 backdrop-blur-sm rounded-3xl p-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-slate-300 text-sm font-bold">שם הורה</label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="למשל: רחל כהן"
                    required
                    className="w-full bg-white/10 border border-white/20 text-white placeholder-white/30 rounded-xl px-4 py-3 font-bold outline-none focus:border-indigo-400 transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-slate-300 text-sm font-bold">טלפון או מייל</label>
                  <input
                    type="text"
                    value={contact}
                    onChange={e => setContact(e.target.value)}
                    placeholder="050-0000000 / name@mail.com"
                    required
                    className="w-full bg-white/10 border border-white/20 text-white placeholder-white/30 rounded-xl px-4 py-3 font-bold outline-none focus:border-indigo-400 transition-colors"
                    dir="ltr"
                  />
                </div>

                {/* Name suggestion */}
                <div className="space-y-1.5">
                  <label className="text-slate-300 text-sm font-bold">
                    איך היית קורא/ת לפלטפורמה? 💡
                    <span className="text-slate-500 font-normal mr-1">(אופציונלי)</span>
                  </label>
                  <input
                    type="text"
                    value={suggestedName}
                    onChange={e => setSuggestedName(e.target.value)}
                    placeholder="הצע/י שם — הטוב ביותר ייבחר!"
                    maxLength={40}
                    className="w-full bg-purple-500/10 border border-purple-400/25 text-white placeholder-white/25 rounded-xl px-4 py-3 font-bold outline-none focus:border-purple-400 transition-colors"
                  />
                  {suggestedName.trim() && (
                    <p className="text-purple-300 text-xs font-bold text-left">
                      ✨ "{suggestedName.trim()}" — נשמע מבטיח!
                    </p>
                  )}
                </div>

                <div className="bg-emerald-500/10 border border-emerald-400/20 rounded-2xl p-3 text-center space-y-0.5">
                  <p className="text-emerald-300 text-xs font-black uppercase tracking-wider">מחיר השקה סמלי</p>
                  <p className="text-white text-sm font-bold">ניסיון חינם + גישה מלאה בהנחה מיוחדת</p>
                </div>

                <button
                  type="submit"
                  disabled={sending}
                  className="glow-btn w-full flex items-center justify-center gap-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-black py-4 rounded-2xl text-lg transition-all active:scale-95"
                >
                  {sending ? (
                    <>שולח<span className="animate-pulse">...</span></>
                  ) : (
                    <>
                      <Send size={18} />
                      <span>אני רוצה להירשם (מחיר השקה סמלי)</span>
                    </>
                  )}
                </button>

                <p className="text-center text-slate-600 text-xs">ללא התחייבות • הפרטים שלך מאובטחים</p>
              </form>
            </div>
          </div>
        )}

        {/* ───────── SUCCESS ───────── */}
        {step === 3 && sent && (
          <div className="success-anim flex flex-col items-center justify-center gap-6 max-w-md mx-auto text-center min-h-[60dvh]">
            <div className="text-8xl">🚀</div>
            <div className="space-y-2">
              <h2 className="text-3xl font-black text-white">תודה רבה, {name}!</h2>
              <p className="text-slate-300 text-base leading-relaxed">
                קיבלנו את פרטיך.<br />
                ניצור איתך קשר תוך 24 שעות עם כל הפרטים על מחיר ההשקה.
              </p>
            </div>
            <div className="flex items-center gap-2 bg-emerald-500/15 border border-emerald-400/30 rounded-2xl px-5 py-3">
              <CheckCircle2 size={18} className="text-emerald-400 flex-shrink-0" />
              <span className="text-emerald-300 font-bold text-sm">הרישום הצליח! נדבר בקרוב 🙌</span>
            </div>
            {suggestedName.trim() && (
              <div className="bg-purple-500/15 border border-purple-400/30 rounded-2xl px-5 py-3 text-center">
                <p className="text-purple-300 text-sm font-bold">
                  🗳️ הצעת השם שלך <span className="text-white">"{suggestedName.trim()}"</span> נרשמה — תודה!
                </p>
              </div>
            )}
            <p className="text-slate-600 text-xs">חשבונאוטיקה שם זמני — 10 דקות ביום, שינוי לכל השנה</p>
          </div>
        )}
      </div>
    </div>
  );
}
