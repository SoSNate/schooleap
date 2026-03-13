export default function Hearts({ lives, maxLives, justLost = false, unlimitedText = null }) {
  if (unlimitedText) {
    return (
      <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full border border-slate-200 dark:border-slate-700 shadow-sm">
        {unlimitedText}
      </span>
    );
  }

  return (
    <>
      {Array.from({ length: maxLives }, (_, i) => {
        if (i < lives) {
          return <div key={i} className="text-xl md:text-2xl drop-shadow-md">❤️</div>;
        }
        const isJustLost = justLost && i === lives;
        return (
          <div key={i} className={`text-xl md:text-2xl ${isJustLost ? 'heart-break' : 'opacity-30 grayscale transform scale-75'}`}>
            💔
          </div>
        );
      })}
    </>
  );
}
