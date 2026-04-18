import { Sparkles, ChevronLeft } from 'lucide-react';

/**
 * Gradient sidebar CTA card — click opens the pricing view.
 *
 * Props:
 *  onPricing – () => void
 */
export default function UpgradeNudge({ onPricing }) {
  return (
    <div
      onClick={onPricing}
      className="bg-gradient-to-br from-indigo-600 to-indigo-800 p-6 rounded-[2rem] text-white shadow-xl relative overflow-hidden cursor-pointer hover:-translate-y-0.5 transition-all"
    >
      <Sparkles className="absolute -right-2 -top-2 w-14 h-14 opacity-10" />
      <h3 className="text-lg font-black mb-1">שדרגו ל-PRO</h3>
      <p className="text-indigo-100 text-xs mb-4 leading-relaxed">
        פתחו את כל יכולות &quot;גשר הקיץ&quot; והכינו את הילד לחטיבה בצורה מקצועית.
      </p>
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-black uppercase tracking-widest">צפה בתפריט</span>
        <ChevronLeft size={18} />
      </div>
    </div>
  );
}
