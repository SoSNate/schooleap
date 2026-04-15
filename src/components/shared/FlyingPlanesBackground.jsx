import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { useState, useEffect } from 'react';
import { anims } from '../../utils/math';

export default function FlyingPlanesBackground() {
  const [showPlanes, setShowPlanes] = useState(false);
  const [animationKey, setAnimationKey] = useState(0);

  useEffect(() => {
    // Randomly show planes animation
    // ~30% chance to show planes, with delays
    const randomDelay = Math.random() * 15000 + 8000; // 8-23 seconds
    const timer = setTimeout(() => {
      setShowPlanes(true);
      setAnimationKey(prev => prev + 1);

      // Hide after animation completes (~5 seconds)
      const hideTimer = setTimeout(() => {
        setShowPlanes(false);
      }, 5000);

      return () => clearTimeout(hideTimer);
    }, randomDelay);

    return () => clearTimeout(timer);
  }, [showPlanes]);

  if (!showPlanes) return null;

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 opacity-20 dark:opacity-15">
      <div className="w-full h-full flex items-center justify-center">
        <div className="w-[300px] h-[200px]">
          <DotLottieReact
            key={animationKey}
            src={anims.menuHero}
            autoplay
            loop={false}
          />
        </div>
      </div>
    </div>
  );
}
