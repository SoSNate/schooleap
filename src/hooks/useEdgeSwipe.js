import { useEffect } from 'react';

/**
 * useEdgeSwipe — detects horizontal swipe gestures that start near the screen edge.
 *
 * Works safely alongside internal game gestures (SwipeRoller, grid drawing) because:
 *  - Only activates when the touch starts within EDGE_START..EDGE_END px from left/right edge
 *  - Requires MIN_X horizontal travel and limits MAX_Y vertical travel
 *  - EDGE_START=15 avoids iOS Safari's native "swipe back" zone (0–15px)
 *
 * Usage:
 *   useEdgeSwipe({ onSwipeRight: () => setScreen('menu') }); // in GameApp
 *   useEdgeSwipe({ onSwipeRight: () => navigate(-1) });       // in dashboards
 */

const EDGE_START = 15;   // px — below this iOS intercepts
const EDGE_END   = 65;   // px — our detection zone width from each edge
const MIN_X      = 70;   // px — minimum horizontal travel to count as swipe
const MAX_Y      = 50;   // px — maximum vertical travel (filters out scrolling)

export function useEdgeSwipe({
  onSwipeLeft,
  onSwipeRight,
  disabled = false,
} = {}) {
  useEffect(() => {
    if (disabled) return;

    let startX = null;
    let startY = null;
    let isEdge = false;

    function onTouchStart(e) {
      const t = e.touches[0];
      startX = t.clientX;
      startY = t.clientY;
      const W = window.innerWidth;
      isEdge =
        (startX >= EDGE_START && startX <= EDGE_END) ||
        (startX >= W - EDGE_END && startX <= W - EDGE_START);
    }

    function onTouchEnd(e) {
      if (!isEdge || startX === null) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - startX;
      const dy = Math.abs(t.clientY - startY);
      startX = null;
      isEdge = false;
      if (dy > MAX_Y) return;                          // too much vertical → scroll, not swipe
      if (dx >  MIN_X && onSwipeRight) onSwipeRight(); // finger moved right → swipe right
      if (dx < -MIN_X && onSwipeLeft)  onSwipeLeft();  // finger moved left  → swipe left
    }

    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchend',   onTouchEnd,   { passive: true });

    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchend',   onTouchEnd);
    };
  }, [disabled, onSwipeLeft, onSwipeRight]);
}
