import { useMemo } from 'react';

/**
 * Colored engagement indicator based on last_login.
 *
 * Props:
 *  lastLogin – ISO string or null
 */
export default function EngagementBadge({ lastLogin }) {
  // Date.now() הוא לא-טהור; useMemo מזיז את הקריאה מתוך ה-render body.
  const daysAgo = useMemo(() => {
    if (!lastLogin) return null;
    const now = Date.now(); // eslint-disable-line react-hooks/purity
    return Math.floor((now - new Date(lastLogin).getTime()) / (24 * 60 * 60 * 1000));
  }, [lastLogin]);

  if (daysAgo === null) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-100 text-slate-500">
        ⚪ טרם נכנס
      </span>
    );
  }

  if (daysAgo <= 3) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-green-100 text-green-700">
        🟢 פעיל
      </span>
    );
  }
  if (daysAgo <= 7) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-700">
        🟡 {daysAgo} ימים
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-red-100 text-red-700">
      🔴 {daysAgo} ימים
    </span>
  );
}
