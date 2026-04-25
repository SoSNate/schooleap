import { useState } from 'react';
import { Users, GraduationCap } from 'lucide-react';
import Swal from 'sweetalert2';
import InstitutionalEnrollmentCard from './InstitutionalEnrollmentCard';

/**
 * Mode switcher for teachers with dual-mode capabilities
 * Shows current mode and allows switching or requesting new modes
 */
export default function TeacherModeSwitcher({
  modes = ['private'],
  primaryMode = 'private',
  onSwitchMode,
  onRequestMode,
  onSubmitEnrollment,
  loading = false,
  canRequestInstitutional = false,
  canRequestPrivate = false,
  hasMultipleModes = false,
}) {
  const [showEnrollmentForm, setShowEnrollmentForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const modeConfig = {
    private: {
      label: 'מצב פרטי 👤',
      description: 'למידה אישית עם תלמידים פרטיים',
      icon: Users,
      color: 'indigo',
      textColor: 'text-indigo-700 dark:text-indigo-300',
      bgColor: 'bg-indigo-50 dark:bg-indigo-900/20',
      borderColor: 'border-indigo-200 dark:border-indigo-800',
    },
    institutional: {
      label: 'מצב מוסדי 🏫',
      description: 'ניהול כיתות בבית ספר או מוסד',
      icon: GraduationCap,
      color: 'blue',
      textColor: 'text-blue-700 dark:text-blue-300',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      borderColor: 'border-blue-200 dark:border-blue-800',
    },
  };

  const currentConfig = modeConfig[primaryMode];
  const CurrentIcon = currentConfig.icon;

  async function handleSwitchMode(newMode) {
    const config = modeConfig[newMode];
    const result = await Swal.fire({
      title: `החלף ל${config.label}?`,
      text: config.description,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'כן, החלף',
      cancelButtonText: 'ביטול',
      confirmButtonColor: '#4f46e5',
    });

    if (result.isConfirmed) {
      const success = await onSwitchMode(newMode);
      if (success) {
        Swal.fire({
          title: '✅ בהצלחה',
          text: `עברת ל${config.label}`,
          icon: 'success',
          toast: true,
          position: 'top-start',
          timer: 2000,
          showConfirmButton: false,
        });
      }
    }
  }

  async function handleRequestMode(requestedMode) {
    setShowEnrollmentForm(true);
  }

  async function handleEnrollmentSubmit(enrollmentData) {
    setIsSubmitting(true);
    try {
      const success = await onSubmitEnrollment(enrollmentData);
      if (success) {
        setShowEnrollmentForm(false);
        // Also request the mode change
        await onRequestMode('institutional', 'בקשה הרישום למצב מוסדי');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  // If showing enrollment form, just show that
  if (showEnrollmentForm && canRequestInstitutional) {
    return (
      <InstitutionalEnrollmentCard
        onSubmit={handleEnrollmentSubmit}
        loading={isSubmitting}
        onCancel={() => setShowEnrollmentForm(false)}
      />
    );
  }

  return (
    <div className="space-y-3">
      {/* Current Mode Card */}
      <div className={`${currentConfig.bgColor} border ${currentConfig.borderColor} rounded-[2rem] p-5`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl bg-${currentConfig.color}-500/20 flex items-center justify-center flex-shrink-0`}>
              <CurrentIcon size={20} className={currentConfig.textColor} />
            </div>
            <div>
              <p className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-0.5">
                מצב נוכחי
              </p>
              <p className={`text-sm font-black ${currentConfig.textColor}`}>{currentConfig.label}</p>
            </div>
          </div>
          {hasMultipleModes && (
            <div className="text-xs font-bold bg-white/50 dark:bg-slate-700/50 px-3 py-1.5 rounded-lg">
              {modes.length} מצבים
            </div>
          )}
        </div>
      </div>

      {/* Available Modes to Switch To */}
      {hasMultipleModes && (
        <div className="grid grid-cols-1 gap-2">
          {modes.map((mode) => {
            if (mode === primaryMode) return null;
            const config = modeConfig[mode];
            const Icon = config.icon;
            return (
              <button
                key={mode}
                onClick={() => handleSwitchMode(mode)}
                disabled={loading}
                className={`w-full ${config.bgColor} border ${config.borderColor} rounded-xl p-3 transition-all hover:shadow-md disabled:opacity-60`}
              >
                <div className="flex items-center gap-2">
                  <Icon size={18} className={config.textColor} />
                  <div className="text-left">
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{config.label}</p>
                    <p className="text-xs text-slate-600 dark:text-slate-400">{config.description}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Request Institutional Mode */}
      {canRequestInstitutional && !hasMultipleModes && (
        <button
          onClick={() => handleRequestMode('institutional')}
          disabled={loading}
          className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white font-bold py-3 px-4 rounded-xl transition-all disabled:opacity-60"
        >
          <div className="flex items-center justify-center gap-2">
            <GraduationCap size={18} />
            <span>בקש גישה למצב מוסדי 🏫</span>
          </div>
          <p className="text-xs mt-1 opacity-90">לכיתות ובית ספר</p>
        </button>
      )}

      {/* Request Private Mode */}
      {canRequestPrivate && !hasMultipleModes && (
        <button
          onClick={() => onRequestMode('private', 'בקשה להחלפה למצב פרטי')}
          disabled={loading}
          className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white font-bold py-3 px-4 rounded-xl transition-all disabled:opacity-60"
        >
          <div className="flex items-center justify-center gap-2">
            <Users size={18} />
            <span>בקש גישה למצב פרטי 👤</span>
          </div>
          <p className="text-xs mt-1 opacity-90">לתלמידים אישיים</p>
        </button>
      )}

      {/* Help Text */}
      <p className="text-xs text-slate-500 dark:text-slate-400 text-center leading-relaxed">
        {hasMultipleModes
          ? 'בחר את המצב שלך כדי לראות את הנתונים המתאימים'
          : 'בקשה לגישה למצב נוסף דורשת אישור מנהל. אנחנו נחזור אליך תוך 24 שעות.'}
      </p>
    </div>
  );
}
