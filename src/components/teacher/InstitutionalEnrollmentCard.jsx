import { useState } from 'react';
import { Building2, Mail, Phone } from 'lucide-react';
import Swal from 'sweetalert2';

/**
 * Form for teacher to request institutional mode access
 * Collects organization details and contact information
 */
export default function InstitutionalEnrollmentCard({
  onSubmit,
  loading = false,
  onCancel,
}) {
  const [organizationName, setOrganizationName] = useState('');
  const [organizationId, setOrganizationId] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState({});

  function validateForm() {
    const newErrors = {};

    if (!organizationName.trim()) {
      newErrors.organizationName = 'שם המוסד הוא חובה';
    }
    if (!contactEmail.trim()) {
      newErrors.contactEmail = 'דוא"ל הוא חובה';
    } else if (!contactEmail.includes('@')) {
      newErrors.contactEmail = 'דוא"ל לא תקין';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!validateForm()) {
      Swal.fire({
        title: '❌ שגיאה בנתונים',
        text: 'אנא בדוק את כל השדות',
        icon: 'error',
        toast: true,
        position: 'top-start',
        timer: 2000,
        showConfirmButton: false,
      });
      return;
    }

    const success = await onSubmit({
      organizationName: organizationName.trim(),
      organizationId: organizationId.trim() || null,
      contactEmail: contactEmail.trim(),
      contactPhone: contactPhone.trim() || null,
      notes: notes.trim() || null,
    });

    if (success) {
      Swal.fire({
        title: '✅ בקשה נשלחה',
        text: 'פרטי הרישום שלך נשלחו בהצלחה. אנחנו נבדוק ונחזור אליך תוך 24 שעות.',
        icon: 'success',
        toast: true,
        position: 'top-start',
        timer: 3000,
        showConfirmButton: false,
      });
      setOrganizationName('');
      setOrganizationId('');
      setContactEmail('');
      setContactPhone('');
      setNotes('');
      setErrors({});
    }
  }

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-[2rem] p-6 space-y-4">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0">
          <Building2 size={20} className="text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h3 className="font-black text-slate-800 dark:text-slate-100">בקשה למצב מוסדי</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            מלא את פרטי מוסדך כדי לבקש הרשמה למצב מוסדי
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Organization Name */}
        <div>
          <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5 uppercase tracking-widest">
            שם המוסד *
          </label>
          <input
            type="text"
            value={organizationName}
            onChange={(e) => {
              setOrganizationName(e.target.value);
              if (errors.organizationName) setErrors({ ...errors, organizationName: '' });
            }}
            placeholder="לדוגמה: בית ספר דוד"
            className={`w-full px-4 py-2.5 text-sm border rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 transition-colors focus:outline-none focus:ring-2 ${
              errors.organizationName
                ? 'border-red-400 focus:ring-red-400'
                : 'border-slate-200 dark:border-slate-600 focus:ring-blue-400'
            }`}
          />
          {errors.organizationName && (
            <p className="text-xs text-red-500 mt-1">{errors.organizationName}</p>
          )}
        </div>

        {/* Organization ID */}
        <div>
          <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5 uppercase tracking-widest">
            מספר תיקיה / קוד מוסד (אופציונלי)
          </label>
          <input
            type="text"
            value={organizationId}
            onChange={(e) => setOrganizationId(e.target.value)}
            placeholder="לדוגמה: 502890456"
            className="w-full px-4 py-2.5 text-sm border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-colors"
          />
        </div>

        {/* Contact Email */}
        <div>
          <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5 uppercase tracking-widest">
            דוא"ל איש קשר *
          </label>
          <div className="flex items-center gap-2 px-4 py-2.5 border rounded-xl bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600">
            <Mail size={16} className="text-slate-400 flex-shrink-0" />
            <input
              type="email"
              value={contactEmail}
              onChange={(e) => {
                setContactEmail(e.target.value);
                if (errors.contactEmail) setErrors({ ...errors, contactEmail: '' });
              }}
              placeholder="example@school.edu"
              className={`flex-1 bg-transparent text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none ${
                errors.contactEmail ? 'border-red-400' : ''
              }`}
            />
          </div>
          {errors.contactEmail && (
            <p className="text-xs text-red-500 mt-1">{errors.contactEmail}</p>
          )}
        </div>

        {/* Contact Phone */}
        <div>
          <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5 uppercase tracking-widest">
            טלפון איש קשר (אופציונלי)
          </label>
          <div className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700">
            <Phone size={16} className="text-slate-400 flex-shrink-0" />
            <input
              type="tel"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              placeholder="0501234567"
              className="flex-1 bg-transparent text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5 uppercase tracking-widest">
            הערות נוספות
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="ספר לנו על המוסד ופעילויותיך (אופציונלי)"
            rows={3}
            className="w-full px-4 py-2.5 text-sm border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-colors resize-none"
          />
        </div>

        {/* Buttons */}
        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="flex-1 px-4 py-2.5 text-sm font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors disabled:opacity-60"
          >
            ביטול
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-4 py-2.5 text-sm font-bold bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white rounded-xl transition-colors disabled:opacity-60"
          >
            {loading ? 'שולח...' : 'שלח בקשה'}
          </button>
        </div>

        {/* Info */}
        <p className="text-xs text-slate-500 dark:text-slate-400 text-center pt-2">
          הבקשה שלך תישמר בבטחה. אנחנו נבדוק את הפרטים ונחזור אליך תוך 24-48 שעות.
        </p>
      </form>
    </div>
  );
}
