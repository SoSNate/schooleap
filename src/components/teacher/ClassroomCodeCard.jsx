import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

const APP_URL = import.meta.env.VITE_APP_URL || 'https://schooleap.vercel.app';

export default function ClassroomCodeCard({ classroomCode, classroomName }) {
  const [copied, setCopied] = useState(false);

  const displayName = classroomName || 'הכיתה שלך';
  const inviteLink = `${APP_URL}/join?code=${classroomCode}`;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch { /* clipboard blocked */ }
  }

  if (!classroomCode) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-center">
        <p className="text-sm font-bold text-amber-700">קוד כיתה לא נמצא — יש לרענן את הדף</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-[2rem] p-5 border border-slate-100 dark:border-slate-700 shadow-sm space-y-3">
      <div>
        <p className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">קישור הזמנה לכיתה</p>
        <p className="text-sm font-bold text-slate-700 dark:text-slate-200 mt-1">{displayName}</p>
      </div>

      {/* קישור — ניתן לסלקציה ולהעתקה ידנית */}
      <div
        onClick={handleCopy}
        className="cursor-pointer bg-indigo-50 border border-indigo-100 rounded-xl px-3 py-2 text-xs font-mono text-indigo-600 break-all hover:bg-indigo-100 transition-colors select-all"
        title="לחץ להעתקה"
      >
        {inviteLink}
      </div>

      <button
        onClick={handleCopy}
        className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm py-2.5 rounded-xl transition-all active:scale-95"
      >
        {copied ? <Check size={15} /> : <Copy size={15} />}
        {copied ? 'הועתק!' : 'העתק קישור הזמנה'}
      </button>

      <p className="text-[10px] text-slate-400 text-center leading-relaxed">
        שלח את הקישור לתלמידים — הם יזינו שם ויקבלו קוד גישה מיידית
      </p>
    </div>
  );
}
