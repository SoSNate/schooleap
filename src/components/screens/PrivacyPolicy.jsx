import { Link } from 'react-router-dom';

export default function PrivacyPolicy() {
  return (
    <div
      dir="rtl"
      className="min-h-[100dvh] p-6 py-10"
      style={{ background: 'radial-gradient(ellipse at 50% 60%, #0f172a 0%, #020617 100%)' }}
    >
      <div className="max-w-2xl mx-auto bg-white/5 border border-white/10 rounded-3xl p-6 md:p-8 text-slate-200 space-y-5 leading-relaxed">
        <h1 className="text-3xl font-black text-white text-center">מדיניות פרטיות</h1>
        <p className="text-xs text-slate-500 text-center">עדכון אחרון: אפריל 2026</p>

        <section className="space-y-2">
          <h2 className="text-xl font-black text-white">1. מי אנחנו</h2>
          <p>חשבונאוטיקה ("האפליקציה") היא פלטפורמת לימוד מתמטיקה לתלמידי בית ספר יסודי. איש הקשר: 12natanel@gmail.com.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-black text-white">2. אילו נתונים אנו אוספים</h2>
          <ul className="list-disc pr-5 space-y-1 text-sm">
            <li><b>הורה/מורה:</b> מייל (דרך Google OAuth), שם, טלפון (אם נמסר), בית ספר (אופציונלי).</li>
            <li><b>ילד:</b> שם פרטי בלבד (ללא שם משפחה, ללא מייל, ללא טלפון), גיל/כיתה אם נמסרו, התקדמות במשחקים.</li>
            <li><b>טכני:</b> אירועי משחק (רמה, הצלחה/כישלון, זמן משחק) לצורכי שיפור הלמידה.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-black text-white">3. ילדים מתחת לגיל 13</h2>
          <p>האפליקציה מיועדת לילדי בית ספר יסודי. <b>לא אוספים נתונים מזהים מילדים ללא הסכמת הורה מפורשת</b>. הגישה של הילד למשחק מתאפשרת רק דרך קישור אישי שההורה/המורה מייצר. לא נעשה שיווק ישיר לילדים, אין פרסומות.</p>
          <p>זה מתיישב עם חוק הגנת הפרטיות הישראלי, עם COPPA (ארה"ב) ועם GDPR (אירופה).</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-black text-white">4. למה אנחנו משתמשים בנתונים</h2>
          <ul className="list-disc pr-5 space-y-1 text-sm">
            <li>הצגת התקדמות הילד להורה/מורה.</li>
            <li>התאמת רמת הקושי בזמן משחק.</li>
            <li>ניהול מנוי (חיוב, חידוש, ביטול).</li>
            <li>שיפור האפליקציה (בצורה מצטברת, ללא זיהוי אישי).</li>
          </ul>
          <p className="text-sm"><b>לא מוכרים נתונים לצד שלישי. לא משתמשים ב-AI להחלטות אוטומטיות שמשפיעות על הילד.</b></p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-black text-white">5. איפה שומרים</h2>
          <p>הנתונים מאוחסנים ב-Supabase (ספק ענן אמין עם הצפנה). מאובטחים עם הצפנת TLS בתעבורה והגנות RLS בגישה.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-black text-white">6. הזכויות שלך</h2>
          <ul className="list-disc pr-5 space-y-1 text-sm">
            <li><b>זכות עיון:</b> תוכל לראות את כל הנתונים של הילד שלך בכל רגע מתוך דשבורד ההורה.</li>
            <li><b>זכות מחיקה:</b> כפתור "מחק את חשבון הילד וכל הנתונים" זמין בהגדרות ההורה.</li>
            <li><b>זכות ייצוא:</b> תוכל להוריד את כל הנתונים של הילד בפורמט JSON (בהגדרות).</li>
            <li><b>זכות ביטול הסכמה:</b> פנה אלינו במייל.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-black text-white">7. Cookies ו-localStorage</h2>
          <p>אנחנו משתמשים ב-localStorage בדפדפן לשמירת סשן ההתחברות והעדפות משחק. לא משתמשים ב-cookies של צד שלישי למעקב פרסומי.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-black text-white">8. יצירת קשר</h2>
          <p>לכל שאלה או בקשה: 12natanel@gmail.com</p>
        </section>

        <div className="text-center pt-4">
          <Link to="/" className="text-indigo-400 hover:text-indigo-300 text-sm font-bold">← חזרה לדף הבית</Link>
        </div>
      </div>
    </div>
  );
}
