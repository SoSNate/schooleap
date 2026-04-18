import { useMemo } from 'react';
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar,
  ResponsiveContainer, Tooltip,
} from 'recharts';
import { Brain } from 'lucide-react';
import { buildRadarData } from '../dashboard/constants';

/**
 * Class-wide skill radar — aggregate of all students, NOT comparative.
 *
 * Props:
 *  allEvents – flat array of game_events across every student in the class
 */
export default function ClassSkillsCard({ allEvents }) {
  const radarData = useMemo(() => buildRadarData(allEvents || []), [allEvents]);
  const hasData = allEvents && allEvents.length > 0;

  return (
    <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm">
      <h3 className="text-sm font-black text-slate-700 mb-5 flex items-center gap-2">
        <Brain className="text-indigo-600" size={16} /> מיומנויות הכיתה (ממוצע)
      </h3>
      {!hasData ? (
        <div className="text-center py-12 space-y-2">
          <p className="text-4xl">📊</p>
          <p className="text-sm text-slate-400">אין מספיק נתונים להצגה.<br />גרף יתעדכן ברגע שתלמידים יתחילו לשחק.</p>
        </div>
      ) : (
        <>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                <PolarGrid stroke="#f1f5f9" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} />
                <Radar name="ממוצע" dataKey="value" stroke="#4f46e5" fill="#6366f1" fillOpacity={0.25} strokeWidth={2} />
                <Tooltip
                  formatter={(v) => [`${v}%`, 'ממוצע כיתה']}
                  contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-slate-400 text-center mt-2">
            ממוצע אחוז הצלחה של הכיתה בכל מיומנות. אינו משווה בין תלמידים.
          </p>
        </>
      )}
    </div>
  );
}
