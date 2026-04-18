import { Brain } from 'lucide-react';
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar,
  ResponsiveContainer, Tooltip,
} from 'recharts';

/**
 * Skill radar chart — only rendered when there are events.
 *
 * Props:
 *  radarData – array of { subject, value } built by buildRadarData()
 */
export default function SkillRadarCard({ radarData }) {
  return (
    <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm">
      <h3 className="text-sm font-black text-slate-700 mb-5 flex items-center gap-2">
        <Brain className="text-indigo-600" size={16} /> מפת מיומנויות
      </h3>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
            <PolarGrid stroke="#f1f5f9" />
            <PolarAngleAxis
              dataKey="subject"
              tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
            />
            <Radar
              name="רמה"
              dataKey="value"
              stroke="#4f46e5"
              fill="#6366f1"
              fillOpacity={0.25}
              strokeWidth={2}
            />
            <Tooltip
              formatter={(v) => [`${v}%`, 'רמת מיומנות']}
              contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
