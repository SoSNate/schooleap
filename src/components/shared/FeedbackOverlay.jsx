import { useEffect } from 'react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import confetti from 'canvas-confetti';
import { anims } from '../../utils/math';
import useGameStore from '../../store/useGameStore';

export default function FeedbackOverlay({ visible, isLevelUp, unlocked, pts, isCapped, onDone }) {
  const finishAnimation = useGameStore((s) => s.finishAnimation);

  useEffect(() => {
    if (!visible) return;
    confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
    const timer = setTimeout(() => {
      finishAnimation();
      if (onDone) onDone();
    }, 2000);
    return () => clearTimeout(timer);
  }, [visible, finishAnimation, onDone]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 pointer-events-none flex flex-col items-center justify-center z-[100] bg-white/80 dark:bg-slate-900/90 backdrop-blur-sm transition-opacity">
      <div className="w-[300px] h-[300px]">
        <DotLottieReact
          src={isLevelUp ? anims.levelUp : anims.success}
          autoplay
          speed={1.5}
        />
      </div>
      <h2 className={`text-3xl md:text-4xl font-black mt-2 text-center ${isLevelUp ? 'text-amber-500' : isCapped ? 'text-violet-500' : 'text-emerald-500'}`}>
        {unlocked
          ? `שוחרר! הרמה נפתחה 🔓 (+${pts})`
          : isLevelUp
            ? `עלית דרגה! 🏆 (+${pts})`
            : isCapped
              ? `מעולה! הגעת לרמת המשימה 🎯 (+${pts})`
              : `נכון מאוד! ✨ (+${pts})`}
      </h2>
    </div>
  );
}
