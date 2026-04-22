import { useCallback, useEffect, useRef, useState } from 'react';
import { vibe } from '../utils/math';

// ─── useHint ────────────────────────────────────────────────────────────────
// Hook משותף לניהול מחזור חיים של רמז במשחקים אנליטיים.
//
// שימוש:
//   const { cooldown, bubble, usedThisRound, requestHint, resetRound } = useHint({
//     game: 'percentages',
//     level: gameState.lvl,
//     getHint,                       // fn(puzzle, level) → {kind, text, ...} | null
//     puzzle,                        // ה-puzzle הנוכחי
//     cooldownSec: 5,                // ברירת מחדל
//     bubbleMs: 2600,                // משך הצגת ה-bubble (ms)
//     onApplyHint: (hint) => { ... },// למשחקים שבהם הרמז גם מציב ערך (percentages)
//   });
//
// החזרה:
//   cooldown       — שניות שנותרו (0 = מוכן)
//   bubble         — string | null (טקסט להצגה ב-<HintBubble/>)
//   usedThisRound  — האם נעשה שימוש ברמז מאז resetRound האחרון (לטלמטריה)
//   requestHint()  — מפעיל רמז; no-op אם ב-cooldown או puzzle ריק
//   resetRound()   — מאפס usedThisRound בלבד (קוראים אחרי nextPuzzle)
// ─────────────────────────────────────────────────────────────────────────────
export default function useHint({
  level,
  getHint,
  puzzle,
  cooldownSec = 5,
  bubbleMs = 2600,
  onApplyHint,
  // halfHintEnabled=true: לחיצה שניה על hint באותו סיבוב מציגה חצי-תשובה
  // ומסמנת penalized=true — ה-consumer יכול לבטל כוכבים לסיבוב הזה.
  halfHintEnabled = false,
}) {
  const [cooldown,      setCooldown]      = useState(0);
  const [bubble,        setBubble]        = useState(null);
  const [usedThisRound, setUsedThisRound] = useState(false);
  const [hintsUsed,     setHintsUsed]     = useState(0); // 0/1/2 בסיבוב הנוכחי
  const [penalized,     setPenalized]     = useState(false); // true אם נפתח חצי-רמז
  const bubbleTimerRef = useRef(null);

  // Tick cooldown by 1s
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  // Cleanup bubble timer on unmount
  useEffect(() => {
    return () => {
      if (bubbleTimerRef.current) clearTimeout(bubbleTimerRef.current);
    };
  }, []);

  const requestHint = useCallback(() => {
    if (cooldown > 0 || !puzzle) return false;
    // מצב חצי-רמז: לחיצה שניה → hint.kind='half' (המארח יחזיר טקסט חושפני יותר).
    const isSecond = halfHintEnabled && hintsUsed >= 1;
    const hint = getHint?.(puzzle, level, { halfMode: isSecond });
    if (!hint) return false;

    setUsedThisRound(true);
    setHintsUsed((n) => n + 1);
    if (isSecond) setPenalized(true);
    setCooldown(cooldownSec);
    vibe?.(30);

    // If caller needs to react to hint content (e.g. snap controls + glow)
    onApplyHint?.(hint);

    // Show bubble
    if (hint.text) {
      setBubble(hint.text);
      if (bubbleTimerRef.current) clearTimeout(bubbleTimerRef.current);
      // Textual hints (example/text/half) get a bit more reading time
      const duration = (hint.kind === 'example' || hint.kind === 'text' || hint.kind === 'half') ? bubbleMs + 900 : bubbleMs;
      bubbleTimerRef.current = setTimeout(() => setBubble(null), duration);
    }
    return true;
  }, [cooldown, puzzle, level, getHint, cooldownSec, bubbleMs, onApplyHint, halfHintEnabled, hintsUsed]);

  const resetRound = useCallback(() => {
    setUsedThisRound(false);
    setHintsUsed(0);
    setPenalized(false);
    setBubble(null);
    if (bubbleTimerRef.current) clearTimeout(bubbleTimerRef.current);
  }, []);

  return { cooldown, bubble, usedThisRound, hintsUsed, penalized, requestHint, resetRound };
}
