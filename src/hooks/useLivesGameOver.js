import { useCallback } from 'react';
import Swal from 'sweetalert2';
import useGameStore from '../store/useGameStore';

// Shared "you ran out of lives" flow. All games show the same lock-screen
// Swal with a game-specific accent color, then return to menu.
//
// Usage:
//   const gameOver = useLivesGameOver('balance', '#10b981');
//   if (next <= 0) gameOver();
export default function useLivesGameOver(gameName, confirmColor = '#10b981', opts = {}) {
  const handleGameFail = useGameStore((s) => s.handleGameFail);
  const setScreen      = useGameStore((s) => s.setScreen);

  return useCallback(() => {
    handleGameFail(gameName);
    Swal.fire({
      title: opts.title ?? 'הרמה ננעלה 🔒',
      text:  opts.text  ?? 'השג 5 ניצחונות ברצף כדי להתקדם לרמה הבאה!',
      icon: 'warning',
      confirmButtonText: opts.confirmButtonText ?? 'הבנתי',
      confirmButtonColor: confirmColor,
      customClass: { popup: 'rounded-3xl' },
      allowEscapeKey: true,
    }).then(() => setScreen('menu'));
  }, [gameName, confirmColor, opts.title, opts.text, opts.confirmButtonText, handleGameFail, setScreen]);
}
