import { Share2 } from 'lucide-react';

/**
 * Displays the child's magic link with copy + WhatsApp share buttons.
 *
 * Props:
 *  magicLink  – string | null
 *  onCopy     – () => void
 *  copied     – boolean
 *  onWhatsApp – () => void
 */
export default function MagicLinkCard({ magicLink, onCopy, copied, onWhatsApp }) {
  return (
    <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm space-y-3">
      <p className="text-sm font-black text-slate-700">🔗 קישור קסם לילד</p>
      {magicLink ? (
        <>
          <p className="text-xs text-slate-400 break-all font-mono bg-slate-50 rounded-xl px-3 py-2 border border-slate-100 select-all">
            {magicLink}
          </p>
          <div className="flex gap-2">
            <button
              onClick={onCopy}
              className={`flex-1 py-2.5 rounded-xl font-black text-white text-sm transition-all active:scale-95 ${
                copied ? 'bg-green-500' : 'bg-indigo-500 hover:bg-indigo-600'
              }`}
            >
              {copied ? '✅ הועתק!' : '📋 העתק קישור'}
            </button>
            <button
              onClick={onWhatsApp}
              className="flex items-center gap-1.5 bg-green-500 hover:bg-green-600 text-white px-4 py-2.5 rounded-xl font-black text-sm transition-all active:scale-95"
            >
              <Share2 size={14} /> וואטסאפ
            </button>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            שלח את הקישור לילד דרך וואטסאפ — הוא יכנס ישירות למשחקים ללא סיסמה.
          </p>
        </>
      ) : (
        <p className="text-xs text-slate-400 animate-pulse">יוצר קישור...</p>
      )}
    </div>
  );
}
