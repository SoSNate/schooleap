import { useState, useEffect } from 'react';
import { Bell, BellOff, Moon, AlertCircle } from 'lucide-react';
import useParentPushSettings from '../../hooks/useParentPushSettings';

/**
 * Parent Push Settings Card
 * Allows parents to control notification frequency, quiet hours, etc.
 */
export default function PushSettingsCard({ childToken, parentToken, childName }) {
  const { settings, loading, error, toggleNotifications, setMaxPerDay, setQuietHours, toggleQuietHours } =
    useParentPushSettings(childToken, parentToken);

  const [localMax, setLocalMax] = useState('10');
  const [quietStart, setQuietStart] = useState('22:00');
  const [quietEnd, setQuietEnd] = useState('08:00');
  const [saving, setSaving] = useState(false);

  // ─── Sync local state with settings ───────────────────────────
  useEffect(() => {
    if (settings) {
      setLocalMax(settings.max_notifications_per_day?.toString() || '10');
      setQuietStart(settings.quiet_hour_start || '22:00');
      setQuietEnd(settings.quiet_hour_end || '08:00');
    }
  }, [settings]);

  // ─── Handlers ────────────────────────────────────────────────
  const handleToggleNotifications = async () => {
    setSaving(true);
    const success = await toggleNotifications(!settings?.notifications_enabled);
    setSaving(false);
    if (!success) alert('שגיאה בשמירה');
  };

  const handleMaxChange = async (e) => {
    const value = parseInt(e.target.value) || 10;
    setLocalMax(value.toString());
    setSaving(true);
    const success = await setMaxPerDay(value);
    setSaving(false);
    if (!success) alert('שגיאה בשמירה');
  };

  const handleQuietHoursToggle = async () => {
    setSaving(true);
    const success = await toggleQuietHours(!settings?.quiet_hours_enabled);
    setSaving(false);
    if (!success) alert('שגיאה בשמירה');
  };

  const handleQuietTimesChange = async () => {
    setSaving(true);
    const success = await setQuietHours(quietStart, quietEnd, true);
    setSaving(false);
    if (!success) alert('שגיאה בשמירה');
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-[2rem] p-6 border border-slate-100 dark:border-slate-700 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Bell size={18} className="text-indigo-600" />
          <h3 className="font-bold text-lg text-slate-700 dark:text-slate-200">הגדרות התראות 🔔</h3>
        </div>
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 border-3 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-[2rem] p-6 border border-slate-100 dark:border-slate-700 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <AlertCircle size={18} className="text-red-500" />
          <h3 className="font-bold text-lg text-slate-700 dark:text-slate-200">שגיאה</h3>
        </div>
        <p className="text-sm text-red-600 dark:text-red-400">{error || 'לא ניתן לטעון את ההגדרות'}</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-[2rem] p-6 border border-slate-100 dark:border-slate-700 shadow-sm space-y-5">
      <div className="flex items-center gap-2 mb-4">
        <Bell size={18} className="text-indigo-600" />
        <h3 className="font-bold text-lg text-slate-700 dark:text-slate-200">הגדרות התראות 🔔</h3>
      </div>

      {/* Enable/Disable Notifications */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
            {settings.notifications_enabled ? <Bell size={16} /> : <BellOff size={16} />}
            {settings.notifications_enabled ? 'התראות מופעלות' : 'התראות מושבתות'}
          </label>
          <button
            onClick={handleToggleNotifications}
            disabled={saving}
            className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
              settings.notifications_enabled
                ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50'
                : 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50'
            } disabled:opacity-60`}
          >
            {settings.notifications_enabled ? 'כבה' : 'הדלק'}
          </button>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {settings.notifications_enabled
            ? `${childName} יקבל התראות לפי ההגדרות למטה`
            : `${childName} לא יקבל כלל התראות`}
        </p>
      </div>

      {/* Max notifications per day */}
      {settings.notifications_enabled && (
        <div className="space-y-2 border-t border-slate-100 dark:border-slate-700 pt-4">
          <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
            מס' התראות מקסימום ביום
          </label>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min="1"
              max="20"
              value={localMax}
              onChange={handleMaxChange}
              disabled={saving}
              className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
            <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400 w-12 text-right">
              {localMax}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {localMax === '0' ? 'ללא הגבלה' : `עד ${localMax} התראות ביום`}
          </p>
        </div>
      )}

      {/* Quiet Hours */}
      {settings.notifications_enabled && (
        <div className="space-y-3 border-t border-slate-100 dark:border-slate-700 pt-4">
          <div className="flex items-center justify-between">
            <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <Moon size={16} />
              שעות שקט (בלי התראות)
            </label>
            <button
              onClick={handleQuietHoursToggle}
              disabled={saving}
              className={`px-3 py-1 rounded-lg font-bold text-xs transition-all ${
                settings.quiet_hours_enabled
                  ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
              } disabled:opacity-60`}
            >
              {settings.quiet_hours_enabled ? 'פעיל ✓' : 'כבוי'}
            </button>
          </div>

          {settings.quiet_hours_enabled && (
            <div className="space-y-3 bg-slate-50 dark:bg-slate-700/30 p-3 rounded-xl">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1">
                    מתחיל בשעה:
                  </label>
                  <input
                    type="time"
                    value={quietStart}
                    onChange={(e) => setQuietStart(e.target.value)}
                    onBlur={handleQuietTimesChange}
                    disabled={saving}
                    className="w-full bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1.5 text-sm font-bold text-right"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1">
                    מסתיים בשעה:
                  </label>
                  <input
                    type="time"
                    value={quietEnd}
                    onChange={(e) => setQuietEnd(e.target.value)}
                    onBlur={handleQuietTimesChange}
                    disabled={saving}
                    className="w-full bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1.5 text-sm font-bold text-right"
                  />
                </div>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                📵 {childName} לא יקבל התראות בין {quietStart} ו-{quietEnd}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Status summary */}
      <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl p-3">
        <p className="text-xs text-indigo-900 dark:text-indigo-200">
          <strong>סטטוס:</strong> {settings.notifications_enabled ? '✅ מופעל' : '🔇 מושבת'}
          {settings.notifications_enabled && settings.quiet_hours_enabled && (
            <>
              {' • 🌙 שעות שקט מ-'}
              {settings.quiet_hour_start} {'ל-'}{settings.quiet_hour_end}
            </>
          )}
        </p>
      </div>
    </div>
  );
}
