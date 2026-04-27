import { useState } from 'react';
import { Users, GraduationCap, Clock, BarChart3, Zap } from 'lucide-react';
import Swal from 'sweetalert2';

/**
 * Role selection for teachers after signup
 * Choose between private tutoring (1:1) or institutional classroom teaching
 */
export default function RoleSelection({ onRoleSelected, loading = false }) {
  const [selected, setSelected] = useState(null);

  async function handleSelect(role) {
    setSelected(role);

    const message = role === 'private'
      ? '💪 כמורה פרטי תוכל להתחיל מיד עם 48 שעות חינם. אחרי זה תצטרך לרכוש סלוטים לתלמידים.'
      : '🏫 כמורה מוסדי תצטרך אישור ניהול לפני שתוכל ליצור כיתות.';

    await Swal.fire({
      title: role === 'private' ? '👤 מורה פרטי' : '🏫 מורה מוסדי',
      text: message,
      icon: 'info',
      showCancelButton: true,
      confirmButtonText: 'כן, בחרתי',
      cancelButtonText: 'חזור',
      confirmButtonColor: '#4f46e5',
    }).then((result) => {
      if (result.isConfirmed) {
        onRoleSelected(role);
      } else {
        setSelected(null);
      }
    });
  }

  return (
    <div dir="rtl" className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="text-6xl mb-4">🎓</div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-2">
            בחר את דרך ההוראה שלך
          </h1>
          <p className="text-slate-600 dark:text-slate-300">
            כל דרך מעוצבת עבור צרכים שונים. אתה תוכל להחליף בהמשך.
          </p>
        </div>

        {/* Role Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Private Tutor Card */}
          <button
            onClick={() => handleSelect('private')}
            disabled={loading}
            className={`group relative p-8 rounded-3xl border-2 transition-all duration-300 ${
              selected === 'private'
                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 shadow-xl'
                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-indigo-400 hover:shadow-lg hover:-translate-y-1'
            }`}
          >
            <div className="text-5xl mb-4">👤</div>
            <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-3 text-right">
              מורה פרטי
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 text-right mb-6 leading-relaxed">
              עבודה 1:1 עם תלמידים פרטיים. מעקב עמוק אחרי התקדמות כל תלמיד.
            </p>

            {/* Features */}
            <div className="space-y-2 mb-6">
              <div className="flex items-center gap-3 text-sm text-right">
                <div className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center flex-shrink-0">
                  <Zap size={14} className="text-indigo-600 dark:text-indigo-400" />
                </div>
                <span className="text-slate-700 dark:text-slate-300">48 שעות ניסיון חינם</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-right">
                <div className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center flex-shrink-0">
                  <BarChart3 size={14} className="text-indigo-600 dark:text-indigo-400" />
                </div>
                <span className="text-slate-700 dark:text-slate-300">טלמטריה מעמיקה</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-right">
                <div className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center flex-shrink-0">
                  <Users size={14} className="text-indigo-600 dark:text-indigo-400" />
                </div>
                <span className="text-slate-700 dark:text-slate-300">קנה סלוטים לתלמידים</span>
              </div>
            </div>

            {/* Trial Badge */}
            <div className="bg-indigo-100 dark:bg-indigo-900/30 border border-indigo-300 dark:border-indigo-700 rounded-xl px-4 py-2 text-center">
              <p className="text-xs font-bold text-indigo-700 dark:text-indigo-300">
                ⏰ 48 שעות חינם - לאחר מכן רכישה נדרשת
              </p>
            </div>
          </button>

          {/* School Teacher Card */}
          <button
            onClick={() => handleSelect('institutional')}
            disabled={loading}
            className={`group relative p-8 rounded-3xl border-2 transition-all duration-300 ${
              selected === 'institutional'
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 shadow-xl'
                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-blue-400 hover:shadow-lg hover:-translate-y-1'
            }`}
          >
            <div className="text-5xl mb-4">🏫</div>
            <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-3 text-right">
              מורה מוסדי
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 text-right mb-6 leading-relaxed">
              ניהול כיתות בבית ספר או מוסד. משימות ודיווחים קבוצתיים.
            </p>

            {/* Features */}
            <div className="space-y-2 mb-6">
              <div className="flex items-center gap-3 text-sm text-right">
                <div className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center flex-shrink-0">
                  <GraduationCap size={14} className="text-blue-600 dark:text-blue-400" />
                </div>
                <span className="text-slate-700 dark:text-slate-300">ניהול מרובה כיתות</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-right">
                <div className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center flex-shrink-0">
                  <BarChart3 size={14} className="text-blue-600 dark:text-blue-400" />
                </div>
                <span className="text-slate-700 dark:text-slate-300">דיווחים קבוצתיים</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-right">
                <div className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center flex-shrink-0">
                  <Clock size={14} className="text-blue-600 dark:text-blue-400" />
                </div>
                <span className="text-slate-700 dark:text-slate-300">אישור אדמין נדרש</span>
              </div>
            </div>

            {/* Approval Badge */}
            <div className="bg-blue-100 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700 rounded-xl px-4 py-2 text-center">
              <p className="text-xs font-bold text-blue-700 dark:text-blue-300">
                ⏳ דורש אישור - עד 48 שעות
              </p>
            </div>
          </button>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-6 text-center">
          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
            💡 <span className="font-bold">עצה:</span> אתה תוכל לשנות את הבחירה שלך בהמשך דרך הגדרות המשתמש.
          </p>
        </div>
      </div>
    </div>
  );
}
