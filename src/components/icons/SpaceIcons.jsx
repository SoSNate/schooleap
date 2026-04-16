import React from 'react';

/**
 * סט אייקוני חלל מותאמים אישית עבור חשבונאוטיקה
 * ניתן להשתמש בהם כרכיבי React רגילים.
 */

// --- אייקונים לצד ההורה (מרכז הבקרה) ---

export const ParentDashboardIcon = ({ size = 24, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <line x1="3" y1="9" x2="21" y2="9" />
    <line x1="9" y1="21" x2="9" y2="9" />
  </svg>
);

export const CouponKeyIcon = ({ size = 24, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3m-3-3l-2.5-2.5" />
  </svg>
);

export const ControlCenterIcon = ({ size = 24, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

// --- אייקונים לצד הילד (המסע בחלל) ---

export const AstronautIcon = ({ size = 24, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 2a5 5 0 0 1 5 5v3a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V7a5 5 0 0 1 5-5z" />
    <rect x="6" y="11" width="12" height="10" rx="2" />
    <path d="M9 11v-1" />
    <path d="M15 11v-1" />
  </svg>
);

export const RocketIcon = ({ size = 24, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
    <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
    <path d="M9 12H4s.55-3.03 2-5c1.62-2.2 5-3 5-3" />
    <path d="M12 15v5s3.03-.55 5-2c2.2-1.62 3-5 3-5" />
  </svg>
);

export const StarAwardIcon = ({ size = 24, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

// --- Icon Library Gallery (for preview/testing) ---
export const IconsLibrary = () => (
  <div className="p-8 grid grid-cols-2 gap-8 bg-slate-900 text-white rounded-xl rtl" dir="rtl">
    <div className="space-y-4">
      <h3 className="text-xl font-bold text-blue-400">צד ההורה</h3>
      <div className="flex items-center gap-3 bg-slate-800 p-3 rounded-lg">
        <ParentDashboardIcon className="text-blue-400" />
        <span>לוח בקרה</span>
      </div>
      <div className="flex items-center gap-3 bg-slate-800 p-3 rounded-lg">
        <CouponKeyIcon className="text-yellow-400" />
        <span>קופונים ומפתחות</span>
      </div>
      <div className="flex items-center gap-3 bg-slate-800 p-3 rounded-lg">
        <ControlCenterIcon className="text-purple-400" />
        <span>מרכז בקרה</span>
      </div>
    </div>
    <div className="space-y-4">
      <h3 className="text-xl font-bold text-purple-400">צד הילד</h3>
      <div className="flex items-center gap-3 bg-slate-800 p-3 rounded-lg">
        <AstronautIcon className="text-purple-400" />
        <span>אזור אישי (האסטרונאוט)</span>
      </div>
      <div className="flex items-center gap-3 bg-slate-800 p-3 rounded-lg">
        <RocketIcon className="text-orange-400" />
        <span>שיגור למשחק</span>
      </div>
      <div className="flex items-center gap-3 bg-slate-800 p-3 rounded-lg">
        <StarAwardIcon className="text-yellow-400" />
        <span>הישגים וכוכבים</span>
      </div>
    </div>
  </div>
);

export default IconsLibrary;
