import { useState } from 'react';
import { Copy, Check, Link } from 'lucide-react';

const APP_URL = import.meta.env.VITE_APP_URL || 'https://schooleap.vercel.app';

/**
 * מציג את קוד הכיתה של המורה + כפתור העתקת קישור הזמנה.
 *
 * Props:
 *  classroomCode – string (6 תווים, מ-profiles.classroom_code)
 */
export default function ClassroomCodeCard({ classroomCode }) {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const inviteLink = `${APP_URL}/join?code=${classroomCode}`;

  async function handleCopyCode() {
    try {
      await navigator.clipboard.writeText(classroomCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2500);
    } catch {}
  }

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {}
  }

  if (!classroomCode) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-center">
        <p className="text-sm font-bold text-amber-700">
          קוד כיתה לא נמצא — יש לרענן את הדף
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm">
      <h3 className="text-sm font-black text-slate-700 mb-4 flex items-center gap-2">
        <Link size={15} className="text-indigo-600" />
        הזמנת תלמידים לכיתה
      </h3>

      {/* קוד הכיתה */}
      <div className="bg-indigo-50 rounded-2xl p-5 text-center border border-indigo-100 mb-4">
        <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-2">
          קוד הכיתה שלך
        </p>
        <p className="text-4xl font-black font-mono tracking-[0.3em] text-indigo-700 select-all">
          {classroomCode}
        </p>
        <p className="text-xs text-slate-400 mt-2">
          התלמיד מזין קוד זה ב-<span className="font-bold">/join</span> ומצטרף בלחיצה אחת
        </p>
      </div>

      {/* כפתורים */}
      <div className="flex gap-2">
        <button
          onClick={handleCopyCode}
          className="flex-1 flex items-center justify-center gap-2 bg-white border-2 border-slate-200 hover:border-indigo-300 text-slate-600 hover:text-indigo-700 font-bold text-sm py-2.5 rounded-xl transition-all active:scale-95"
        >
          {copiedCode ? <Check size={15} className="text-green-500" /> : <Copy size={15} />}
          {copiedCode ? 'הועתק!' : 'העתק קוד'}
        </button>
        <button
          onClick={handleCopyLink}
          className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm py-2.5 rounded-xl transition-all active:scale-95"
        >
          {copiedLink ? <Check size={15} /> : <Link size={15} />}
          {copiedLink ? 'הועתק!' : 'העתק קישור הזמנה'}
        </button>
      </div>

      <p className="text-[10px] text-slate-400 text-center mt-3 leading-relaxed">
        שלח את הקישור לתלמידים — הם יזינו את שמם ויקבלו קוד גישה אישי מיידית
      </p>
    </div>
  );
}
