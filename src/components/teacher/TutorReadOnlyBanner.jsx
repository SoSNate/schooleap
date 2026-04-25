import { Lock, ExternalLink } from 'lucide-react';
import { PLAN_URLS } from '../dashboard/constants';

/**
 * Banner shown at the top of TeacherDashboard when private tutor trial expired.
 * Does NOT block the dashboard — teacher can read everything but cannot create/edit.
 * Upgrade links open the external Morning/PayPal payment pages.
 */
export default function TutorReadOnlyBanner({ hoursRemaining = 0 }) {
  const trialJustExpired = hoursRemaining <= 0;

  return (
    <div
      dir="rtl"
      className="w-full bg-gradient-to-l from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4 shadow-sm"
    >
      {/* Icon + text */}
      <div className="flex items-start gap-3 flex-1">
        <div className="bg-amber-100 text-amber-600 p-2 rounded-xl mt-0.5 shrink-0">
          <Lock size={18} />
        </div>
        <div>
          <p className="font-bold text-amber-900 text-sm leading-snug">
            {trialJustExpired
              ? 'תקופת הניסיון הסתיימה — מצב תצוגה בלבד'
              : `נותרו ${Math.ceil(hoursRemaining)} שעות לניסיון החינמי`}
          </p>
          <p className="text-amber-700 text-xs mt-0.5 leading-relaxed">
            {trialJustExpired
              ? 'אתה יכול לראות את כל הנתונים, אך לא ניתן לערוך או ליצור עד לרכישת מנוי. התלמידים שלך רואים מסך עצירה.'
              : 'לאחר תום הניסיון, הדשבורד יעבור למצב קריאה בלבד.'}
          </p>
        </div>
      </div>

      {/* CTA buttons */}
      <div className="flex gap-2 shrink-0 w-full sm:w-auto">
        <a
          href={PLAN_URLS['1m']}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all whitespace-nowrap"
        >
          <ExternalLink size={13} />
          פתיחת מנוי
        </a>
        <a
          href={PLAN_URLS['vip']}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 bg-white hover:bg-amber-50 active:scale-95 text-amber-700 border border-amber-300 text-xs font-bold px-4 py-2.5 rounded-xl transition-all whitespace-nowrap"
        >
          WhatsApp ✨
        </a>
      </div>
    </div>
  );
}
