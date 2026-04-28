import { useEffect, useState, useLayoutEffect, useCallback } from 'react';
import { vibe } from '../../utils/math';

// ─── InteractiveTour ─────────────────────────────────────────────────────────
// Interactive guided tour: spotlight + animated tooltip per step.
// Each step targets an element by `selector` (data-tour="..."). If the element
// isn't on screen the step auto-advances after `fallbackDelay` ms.
//
// Steps:
//   { selector: '[data-tour="key"]', emoji, title, text, position: 'top'|'bottom'|'left'|'right'|'center' }
//
// Usage:
//   <InteractiveTour steps={STEPS} onDone={() => {}} />

const PADDING = 8;        // around target hole
const TIP_GAP = 14;       // gap between hole and tooltip

function getRect(selector) {
  if (!selector) return null;
  try {
    const el = document.querySelector(selector);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) return null;
    return { top: r.top, left: r.left, width: r.width, height: r.height, el };
  } catch { return null; }
}

function clamp(val, min, max) { return Math.min(Math.max(val, min), max); }

function computeTipPos(rect, position, tipW = 280, tipH = 170) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  if (!rect || position === 'center') {
    return { left: clamp((vw - tipW) / 2, 12, vw - tipW - 12), top: clamp((vh - tipH) / 2, 12, vh - tipH - 12) };
  }
  let top, left;
  switch (position) {
    case 'top':
      top  = rect.top - tipH - TIP_GAP;
      left = rect.left + rect.width / 2 - tipW / 2;
      break;
    case 'bottom':
      top  = rect.top + rect.height + TIP_GAP;
      left = rect.left + rect.width / 2 - tipW / 2;
      break;
    case 'left':
      top  = rect.top + rect.height / 2 - tipH / 2;
      left = rect.left - tipW - TIP_GAP;
      break;
    case 'right':
      top  = rect.top + rect.height / 2 - tipH / 2;
      left = rect.left + rect.width + TIP_GAP;
      break;
    default: {
      // auto: prefer below, fall back above, then center
      if (rect.top + rect.height + tipH + TIP_GAP < vh) {
        top  = rect.top + rect.height + TIP_GAP;
        left = rect.left + rect.width / 2 - tipW / 2;
      } else if (rect.top - tipH - TIP_GAP > 0) {
        top  = rect.top - tipH - TIP_GAP;
        left = rect.left + rect.width / 2 - tipW / 2;
      } else {
        top  = (vh - tipH) / 2;
        left = (vw - tipW) / 2;
      }
    }
  }
  return {
    top:  clamp(top,  12, vh - tipH - 12),
    left: clamp(left, 12, vw - tipW - 12),
  };
}

export default function InteractiveTour({ steps, onDone, storageKey = 'seen_interactive_tour_v1' }) {
  const [idx, setIdx] = useState(0);
  const [rect, setRect] = useState(null);
  const [tipPos, setTipPos] = useState({ top: 0, left: 0 });
  const [ready, setReady] = useState(false);

  const step = steps[idx];
  const isLast = idx === steps.length - 1;

  // Resolve target rect (with retries — element may render after frame)
  useLayoutEffect(() => {
    let cancelled = false;
    let tries = 0;
    let timer;

    const tryResolve = () => {
      if (cancelled) return;
      const r = step?.selector ? getRect(step.selector) : null;
      if (r || !step?.selector || tries > 18) {
        setRect(r);
        setTipPos(computeTipPos(r, step?.position));
        setReady(true);
        // gentle scroll into view
        if (r?.el) {
          try { r.el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' }); } catch { /* no-op */ }
        }
        return;
      }
      tries += 1;
      timer = setTimeout(tryResolve, 80);
    };

    setReady(false);
    tryResolve();
    return () => { cancelled = true; clearTimeout(timer); };
  }, [idx, step]);

  // Recompute on resize / scroll
  useEffect(() => {
    const recompute = () => {
      const r = step?.selector ? getRect(step.selector) : null;
      setRect(r);
      setTipPos(computeTipPos(r, step?.position));
    };
    window.addEventListener('resize', recompute);
    window.addEventListener('scroll', recompute, true);
    return () => {
      window.removeEventListener('resize', recompute);
      window.removeEventListener('scroll', recompute, true);
    };
  }, [step]);

  const finish = useCallback(() => {
    try { sessionStorage.setItem(storageKey, '1'); } catch { /* storage blocked */ }
    onDone?.();
  }, [onDone, storageKey]);

  const next = () => {
    vibe(15);
    if (isLast) finish();
    else setIdx((i) => i + 1);
  };

  const skip = () => {
    vibe(8);
    finish();
  };

  if (!step) return null;

  // Hole geometry (for SVG mask)
  const holeX = rect ? rect.left - PADDING : 0;
  const holeY = rect ? rect.top  - PADDING : 0;
  const holeW = rect ? rect.width  + PADDING * 2 : 0;
  const holeH = rect ? rect.height + PADDING * 2 : 0;
  const hasHole = !!rect;

  return (
    <div dir="rtl" className="fixed inset-0 z-[9999] pointer-events-none">
      <style>{`
        @keyframes tourPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(99,102,241,0.55); }
          50%      { box-shadow: 0 0 0 14px rgba(99,102,241,0); }
        }
        @keyframes tourFloat {
          0%,100% { transform: translateY(0); }
          50%     { transform: translateY(-4px); }
        }
        @keyframes tourTipIn {
          from { opacity: 0; transform: translateY(8px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>

      {/* Dark overlay with hole (uses SVG mask for crisp edges + RTL-safe) */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-auto"
        style={{ opacity: ready ? 1 : 0, transition: 'opacity .18s ease-out' }}
        onClick={skip}
      >
        <defs>
          <mask id="tour-hole-mask">
            <rect width="100%" height="100%" fill="white" />
            {hasHole && (
              <rect
                x={holeX}
                y={holeY}
                width={holeW}
                height={holeH}
                rx="16"
                ry="16"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect width="100%" height="100%" fill="rgba(2,6,23,0.78)" mask="url(#tour-hole-mask)" />
      </svg>

      {/* Pulsing ring around hole */}
      {hasHole && ready && (
        <div
          className="absolute pointer-events-none rounded-2xl"
          style={{
            top: holeY,
            left: holeX,
            width: holeW,
            height: holeH,
            animation: 'tourPulse 1.6s ease-in-out infinite',
            border: '2px solid rgba(165,180,252,0.85)',
          }}
        />
      )}

      {/* Tooltip */}
      {ready && (
        <div
          className="absolute pointer-events-auto bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-indigo-100 dark:border-indigo-700/40 p-5 max-w-[280px]"
          style={{
            top: tipPos.top,
            left: tipPos.left,
            width: 280,
            animation: 'tourTipIn .22s ease-out',
          }}
        >
          {/* Step dots */}
          <div className="flex justify-center gap-1.5 mb-3">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all ${i === idx ? 'w-5 bg-indigo-500' : i < idx ? 'w-1.5 bg-indigo-300' : 'w-1.5 bg-slate-200 dark:bg-slate-600'}`}
              />
            ))}
          </div>

          <div className="text-center space-y-2">
            <div className="text-4xl" style={{ animation: 'tourFloat 2.2s ease-in-out infinite' }}>
              {step.emoji || '✨'}
            </div>
            <h3 className="font-black text-slate-800 dark:text-slate-100 text-base leading-tight">
              {step.title}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {step.text}
            </p>
          </div>

          <div className="flex items-center gap-2 mt-4">
            <button
              onClick={skip}
              className="flex-1 text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 py-2 transition-colors"
            >
              דלג
            </button>
            <button
              onClick={next}
              className="flex-[2] bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-black py-2.5 rounded-xl text-sm transition-all"
            >
              {isLast ? 'מתחילים! 🚀' : `הבא (${idx + 1}/${steps.length}) →`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tour helpers ────────────────────────────────────────────────────────────

export function shouldShowTour(storageKey = 'seen_interactive_tour_v1') {
  try { return !sessionStorage.getItem(storageKey); } catch { return false; }
}

export function resetTour(storageKey = 'seen_interactive_tour_v1') {
  try { sessionStorage.removeItem(storageKey); } catch { /* storage blocked */ }
}
