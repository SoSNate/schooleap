import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { anims } from '../../utils/math';

// One plane per game, colored to match its theme via CSS hue-rotate+saturate.
// The Lottie source is warm orange — hue-rotate shifts it to the target color.
// purple≈270°, emerald≈150°, blue≈200°, yellow≈-10°(0°), orange≈null(native),
// rose≈330°, teal≈170°, red≈-30°(340°), lime≈90°, sky≈185°
const PLANES = [
  {
    // equations — purple
    key: 'p1', size: 130, opacity: 0.28, mirror: false, speed: 0.9,
    color: 'hue-rotate(270deg) saturate(1.6)',
    keyframes: `@keyframes fly-p1{0%{transform:translate(-22vw,22vh) rotate(6deg)}100%{transform:translate(122vw,40vh) rotate(6deg)}}`,
    animation: 'fly-p1 16s linear infinite', delay: '0s',
  },
  {
    // balance — emerald
    key: 'p2', size: 80, opacity: 0.26, mirror: true, speed: 1.1,
    color: 'hue-rotate(150deg) saturate(1.5)',
    keyframes: `@keyframes fly-p2{0%{transform:translate(122vw,65vh) rotate(-10deg)}100%{transform:translate(-22vw,45vh) rotate(-10deg)}}`,
    animation: 'fly-p2 19s linear infinite', delay: '3s',
  },
  {
    // tank — blue
    key: 'p3', size: 110, opacity: 0.27, mirror: false, speed: 1.0,
    color: 'hue-rotate(200deg) saturate(1.6)',
    keyframes: `@keyframes fly-p3{0%{transform:translate(-22vw,80vh) rotate(-28deg)}100%{transform:translate(122vw,-5vh) rotate(-28deg)}}`,
    animation: 'fly-p3 21s linear infinite', delay: '7s',
  },
  {
    // decimal — yellow
    key: 'p4', size: 65, opacity: 0.30, mirror: true, speed: 1.3,
    color: 'hue-rotate(20deg) saturate(2.0) brightness(1.2)',
    keyframes: `@keyframes fly-p4{0%{transform:translate(122vw,15vh) rotate(3deg)}100%{transform:translate(-22vw,30vh) rotate(3deg)}}`,
    animation: 'fly-p4 13s linear infinite', delay: '5s',
  },
  {
    // fractionLab — orange (native color)
    key: 'p5', size: 160, opacity: 0.24, mirror: false, speed: 0.8,
    color: null,
    keyframes: `@keyframes fly-p5{0%{transform:translate(-22vw,50vh) rotate(-8deg)}100%{transform:translate(122vw,70vh) rotate(-8deg)}}`,
    animation: 'fly-p5 14s linear infinite', delay: '10s',
  },
  {
    // magicPatterns — rose/pink
    key: 'p6', size: 90, opacity: 0.28, mirror: true, speed: 1.2,
    color: 'hue-rotate(330deg) saturate(1.8)',
    keyframes: `@keyframes fly-p6{0%{transform:translate(122vw,85vh) rotate(-42deg)}100%{transform:translate(-22vw,10vh) rotate(-42deg)}}`,
    animation: 'fly-p6 18s linear infinite', delay: '1s',
  },
  {
    // grid — teal
    key: 'p7', size: 75, opacity: 0.26, mirror: false, speed: 1.4,
    color: 'hue-rotate(170deg) saturate(1.5)',
    keyframes: `@keyframes fly-p7{0%{transform:translate(-22vw,35vh) rotate(-18deg)}100%{transform:translate(122vw,5vh) rotate(-18deg)}}`,
    animation: 'fly-p7 12s linear infinite', delay: '13s',
  },
  {
    // word — red
    key: 'p8', size: 120, opacity: 0.25, mirror: true, speed: 0.9,
    color: 'hue-rotate(340deg) saturate(1.9) brightness(0.9)',
    keyframes: `@keyframes fly-p8{0%{transform:translate(122vw,55vh) rotate(14deg)}100%{transform:translate(-22vw,35vh) rotate(14deg)}}`,
    animation: 'fly-p8 20s linear infinite', delay: '8s',
  },
  {
    // multChamp — lime
    key: 'p9', size: 95, opacity: 0.27, mirror: false, speed: 1.1,
    color: 'hue-rotate(90deg) saturate(1.7)',
    keyframes: `@keyframes fly-p9{0%{transform:translate(-22vw,92vh) rotate(-35deg)}100%{transform:translate(122vw,20vh) rotate(-35deg)}}`,
    animation: 'fly-p9 17s linear infinite', delay: '4s',
  },
  {
    // percentages — sky
    key: 'p10', size: 145, opacity: 0.25, mirror: true, speed: 0.85,
    color: 'hue-rotate(185deg) saturate(1.5) brightness(1.1)',
    keyframes: `@keyframes fly-p10{0%{transform:translate(122vw,8vh) rotate(5deg)}100%{transform:translate(-22vw,25vh) rotate(5deg)}}`,
    animation: 'fly-p10 22s linear infinite', delay: '15s',
  },
];

export default function FlyingPlanesBackground() {
  return (
    <>
      <style>{PLANES.map((p) => p.keyframes).join('\n')}</style>

      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        {PLANES.map((plane) => (
          <div
            key={plane.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: plane.size,
              height: plane.size,
              opacity: plane.opacity,
              animation: plane.animation,
              animationDelay: plane.delay,
            }}
          >
            <div style={{
              width: '100%',
              height: '100%',
              transform: plane.mirror ? 'scaleX(-1)' : undefined,
              filter: plane.color || undefined,
            }}>
              <DotLottieReact
                src={anims.menuHero}
                autoplay
                loop
                speed={plane.speed}
              />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
