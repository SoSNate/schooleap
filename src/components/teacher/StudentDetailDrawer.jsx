import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import { supabase } from '../../lib/supabase';
import { GAME_LABELS, buildRadarData } from '../dashboard/constants';

function formatDateTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('he-IL', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

/**
 * Per-student detail drawer — shows radar (skills), weekly activity bar,
 * overall success rate, and full event history. Data only — no recommendations.
 *
 * Props:
 *  student  – { child_id, name, magic_token, access_code, last_login, ... }
 *  onClose  – () => void
 */
export default function StudentDetailDrawer({ student, onClose }) {
  const [events,  setEvents]  = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!student?.magic_token) return;
    let mounted = true;
    setLoading(true);
    supabase
      .from('game_events')
      .select('*')
      .eq('child_token', student.magic_token)
      .order('created_at', { ascending: false })
      .limit(200)
      .then(({ data }) => {
        if (!mounted) return;
        setEvents(data || []);
        setLoading(false);
      });
    return () => { mounted = false; };
  }, [student?.magic_token]);

  const radarData = useMemo(() => buildRadarData(events), [events]);

  const weeklyActivity = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().slice(0, 10);
      days.push({
        date: key,
        label: d.toLocaleDateString('he-IL', { weekday: 'short' }),
        count: 0,
      });
    }
    const byDay = Object.fromEntries(days.map(d => [d.date, d]));
    events.forEach(e => {
      const key = new Date(e.created_at).toISOString().slice(0, 10);
      if (byDay[key]) byDay[key].count++;
    });
    return days;
  }, [events]);

  const successRate = useMemo(() => {
    if (events.length === 0) return null;
    return Math.round(events.filter(e => e.success).length / events.length * 100);
  }, [events]);

  if (!student) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />

      {/* Drawer */}
      <div className="relative mr-auto w-full max-w-2xl bg-white overflow-y-auto shadow-2xl" dir="rtl">
        <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-xl font-black text-slate-800">{student.name}</h2>
            <p className="text-xs text-slate-400">
              קוד: <span className="font-mono font-bold text-indigo-600 tracking-wider">{student.access_code}</span>
              {' · '}כניסה אחרונה: {formatDateTime(student.last_login)}
            </p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <p className="text-5xl">🎮</p>
              <p className="text-slate-500 font-bold">טרם התחיל לשחק</p>
              <p className="text-xs text-slate-400">שלח לתלמיד את קוד הכניסה כדי להתחיל.</p>
            </div>
          ) : (
            <>
              {/* Summary stats */}
              <div className="grid grid-cols-3 gap-3">
                <StatCard label="סה״כ משחקים" value={events.length} />
                <StatCard label="אחוז הצלחה" value={successRate !== null ? `${successRate}%` : '—'} />
                <StatCard label="רמה גבוהה" value={events.length ? Math.max(...events.map(e => e.level)) : '—'} />
              </div>

              {/* Weekly activity */}
              <div className="bg-white rounded-[2rem] p-5 border border-slate-100 shadow-sm">
                <h3 className="text-sm font-black text-slate-700 mb-4">פעילות שבועית (7 ימים אחרונים)</h3>
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={weeklyActivity}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                      <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} allowDecimals={false} />
                      <Tooltip
                        formatter={(v) => [v, 'משחקים']}
                        contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
                      />
                      <Bar dataKey="count" fill="#6366f1" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Radar */}
              <div className="bg-white rounded-[2rem] p-5 border border-slate-100 shadow-sm">
                <h3 className="text-sm font-black text-slate-700 mb-4">מפת מיומנויות</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                      <PolarGrid stroke="#f1f5f9" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} />
                      <Radar name="רמה" dataKey="value" stroke="#4f46e5" fill="#6366f1" fillOpacity={0.25} strokeWidth={2} />
                      <Tooltip formatter={(v) => [`${v}%`, 'רמת מיומנות']} contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Event history */}
              <div className="bg-white rounded-[2rem] p-5 border border-slate-100 shadow-sm">
                <h3 className="text-sm font-black text-slate-700 mb-4">היסטוריית משחקים ({events.length})</h3>
                <div className="space-y-1 max-h-80 overflow-y-auto">
                  {events.slice(0, 50).map(e => (
                    <div key={e.id} className="flex items-center justify-between text-xs text-slate-600 bg-slate-50 rounded-xl px-3 py-2">
                      <span className="font-bold">
                        {e.success ? '✅' : '❌'} {GAME_LABELS[e.game_name] || e.game_name}
                        <span className="text-slate-400 font-normal"> · רמה {e.level}</span>
                      </span>
                      <span className="text-slate-400 text-[10px]">{formatDateTime(e.created_at)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="bg-indigo-50 rounded-2xl p-4 text-center border border-indigo-100">
      <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">{label}</p>
      <p className="text-2xl font-black text-indigo-700 mt-1">{value}</p>
    </div>
  );
}
