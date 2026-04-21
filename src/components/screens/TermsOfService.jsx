import { Link } from 'react-router-dom';

export default function TermsOfService() {
  return (
    <div
      dir="rtl"
      className="min-h-[100dvh] p-6 py-10"
      style={{ background: 'radial-gradient(ellipse at 50% 60%, #0f172a 0%, #020617 100%)' }}
    >
      <div className="max-w-2xl mx-auto bg-white/5 border border-white/10 rounded-3xl p-6 md:p-8 text-slate-200 space-y-5 leading-relaxed">
        <h1 className="text-3xl font-black text-white text-center">תנאי שימוש</h1>
        <p className="text-xs text-slate-500 text-center">עדכון אחרון: אפריל 2026</p>

        <section className="space-y-2">
          <h2 className="text-xl font-black text-white">1. הסכמה</h2>
          <p>השימוש בחשבונאוטיקה מהווה הסכמה לתנאים אלה. אם אתה לא מסכים — אנא אל תשתמש באפליקציה.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-black text-white">2. מי רשאי להירשם</h2>
          <ul className="list-disc pr-5 space-y-1 text-sm">
            <li><b>הורים</b> מעל גיל 18.</li>
            <li><b>מורים</b> בעלי הסמכה פדגוגית (נדרש אישור אדמין).</li>
            <li><b>ילדים</b> — רק דרך קישור שההורה/המורה שולח. אין הרשמה ישירה של ילדים.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-black text-white">3. תשלום ומנוי</h2>
          <ul className="list-disc pr-5 space-y-1 text-sm">
            <li>תקופת ניסיון חינם לפי התוכנית הנוכחית באפליקציה.</li>
            <li>מנוי בתשלום מתחדש אוטומטית אלא אם מבוטל.</li>
            <li>ביטול אפשרי בכל עת בהגדרות ההורה — המנוי יישאר פעיל עד סוף התקופה ששולמה.</li>
            <li>אין החזרים על תקופות ששולמו.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-black text-white">4. שימוש ראוי</h2>
          <ul className="list-disc pr-5 space-y-1 text-sm">
            <li>אסור לשתף קישורי גישה ציבורית (WhatsApp ציבורי, רשתות חברתיות).</li>
            <li>אסור לנסות לחלץ נתונים של ילדים אחרים.</li>
            <li>אסור שימוש מסחרי ללא אישור.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-black text-white">5. קניין רוחני</h2>
          <p>כל התוכן (משחקים, גרפיקה, טקסטים) הוא רכוש חשבונאוטיקה. מותר לשימוש אישי/חינוכי במסגרת האפליקציה בלבד.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-black text-white">6. הגבלת אחריות</h2>
          <p>האפליקציה ניתנת "כפי שהיא" (AS-IS). לא מתחייבים לזמינות 100%. לא אחראים לנזקים עקיפים.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-black text-white">7. שינויים</h2>
          <p>רשאים לעדכן את התנאים. עדכון מהותי יישלח למייל ההורה/המורה לפחות 14 יום מראש.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-black text-white">8. דין</h2>
          <p>התנאים כפופים לדין הישראלי. סמכות שיפוט: בתי המשפט בישראל.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-black text-white">9. יצירת קשר</h2>
          <p>12natanel@gmail.com</p>
        </section>

        <div className="text-center pt-4">
          <Link to="/" className="text-indigo-400 hover:text-indigo-300 text-sm font-bold">← חזרה לדף הבית</Link>
        </div>
      </div>
    </div>
  );
}
