import { GAME_LABELS, formatDate } from './constants';

/**
 * Shows derived notifications + collapsible raw game-event log.
 *
 * Props:
 *  notifications – array built by buildNotifications()
 *  events        – raw game_events array (for the expandable log)
 *  onRefresh     – () => void
 */
export default function NotificationsCard({ notifications, events, onRefresh }) {
  return (
    <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-black text-slate-700">🔔 עדכונים ופעילות</p>
        <button
          onClick={onRefresh}
          className="text-xs text-indigo-500 hover:text-indigo-700 font-bold"
        >
          רענן
        </button>
      </div>

      {notifications.length === 0 ? (
        <div className="text-center py-6 space-y-2">
          <p className="text-3xl">🎮</p>
          <p className="text-sm text-slate-400">
            עדיין אין פעילות.<br />שלח את הקישור לילד שיתחיל לשחק!
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map(n => (
            <div key={n.id} className={`rounded-2xl px-4 py-3 text-sm font-bold ${n.color}`}>
              <span>{n.icon} {n.text}</span>
              {n.time && <p className="text-xs font-normal opacity-70 mt-0.5">{n.time}</p>}
            </div>
          ))}
        </div>
      )}

      {events.length > 0 && (
        <details className="mt-1">
          <summary className="text-xs text-slate-400 cursor-pointer hover:text-slate-600 font-bold">
            יומן משחקים ({events.length} פעילויות אחרונות)
          </summary>
          <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
            {events.map(e => (
              <div
                key={e.id}
                className="flex items-center justify-between text-xs text-slate-500 bg-slate-50 rounded-xl px-3 py-1.5"
              >
                <span>{e.success ? '✅' : '❌'} {GAME_LABELS[e.game_name] || e.game_name} רמה {e.level}</span>
                <span className="text-slate-400 text-[10px]">{formatDate(e.created_at)}</span>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
