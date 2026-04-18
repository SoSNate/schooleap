import { useEffect, useState, useCallback, useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import { LogOut, GraduationCap } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import ClassEngagementTable from '../teacher/ClassEngagementTable';
import ClassSkillsCard      from '../teacher/ClassSkillsCard';
import StudentDetailDrawer  from '../teacher/StudentDetailDrawer';
import AddStudentForm       from '../teacher/AddStudentForm';

/**
 * /teacher — Teacher-only dashboard.
 * Guarded by DB-backed role check (profiles.role === 'teacher' | 'admin').
 * Shows class-wide engagement + per-student detail drawer.
 */
export default function TeacherDashboard() {
  const [user,     setUser]     = useState(null);
  const [profile,  setProfile]  = useState(null);
  const [students, setStudents] = useState([]);
  const [allEvents,setAllEvents]= useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [selected, setSelected] = useState(null);

  const loadData = useCallback(async (u) => {
    try {
      const { data: prof } = await supabase
        .from('profiles')
        .select('id, email, role, max_children_allowed')
        .eq('id', u.id)
        .maybeSingle();
      setProfile(prof || null);
      if (!prof || (prof.role !== 'teacher' && prof.role !== 'admin')) return;

      const { data: list, error: rpcErr } = await supabase
        .rpc('get_teacher_class_overview', { p_teacher_id: u.id });
      if (rpcErr) throw rpcErr;
      setStudents(list || []);

      const tokens = (list || []).map(s => s.magic_token).filter(Boolean);
      if (tokens.length) {
        const { data: ev } = await supabase
          .from('game_events')
          .select('game_name, success, level, created_at, child_token')
          .in('child_token', tokens)
          .order('created_at', { ascending: false })
          .limit(2000);
        setAllEvents(ev || []);
      } else {
        setAllEvents([]);
      }
    } catch (e) {
      console.error('[TeacherDashboard] load:', e);
      setError('שגיאה בטעינת הנתונים');
    }
  }, []);

  useEffect(() => {
    let settled = false;
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (settled) return;
      const u = session?.user ?? null;
      setUser(u);
      try { if (u) await loadData(u); }
      finally { setLoading(false); settled = true; }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_e, session) => {
        settled = true;
        const u = session?.user ?? null;
        setUser(u);
        try { if (u) await loadData(u); }
        finally { setLoading(false); }
      }
    );
    return () => subscription.unsubscribe();
  }, [loadData]);

  async function handleLogout() {
    try { await supabase.auth.signOut(); } catch (e) { console.error(e); }
  }

  async function handleAddStudent(name) {
    if (!user) return null;
    const { data, error: err } = await supabase
      .from('children')
      .insert({ parent_id: user.id, name })
      .select()
      .single();
    if (err) throw err;
    await loadData(user);
    return data;
  }

  const atLimit = useMemo(() => {
    if (!profile) return false;
    const max = profile.max_children_allowed ?? 1;
    return students.length >= max;
  }, [profile, students]);

  // ─── Render states ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div dir="rtl" className="min-h-[100dvh] flex items-center justify-center bg-slate-50">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/parent" replace />;

  if (profile && profile.role !== 'teacher' && profile.role !== 'admin') {
    return <Navigate to="/parent" replace />;
  }

  return (
    <div dir="rtl" className="min-h-[100dvh] bg-slate-50 text-slate-900">
      {/* Top bar */}
      <div className="bg-white border-b border-slate-100 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center">
              <GraduationCap size={20} />
            </div>
            <div>
              <h1 className="text-lg font-black text-slate-800">לוח המורה</h1>
              <p className="text-[11px] text-slate-400">{user.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 px-3 py-2 rounded-xl hover:bg-slate-100"
          >
            <LogOut size={16} /> יציאה
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-6 pb-16">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {/* Header row */}
        <div>
          <h2 className="text-2xl font-black tracking-tight">
            שלום, <span className="text-indigo-600">{user.email?.split('@')[0]}</span>
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            {students.length > 0
              ? `${students.length} תלמידים רשומים בכיתה`
              : 'עוד לא נוספו תלמידים לכיתה'}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 space-y-6">
            <AddStudentForm onAdd={handleAddStudent} disabled={atLimit} />
            <ClassEngagementTable students={students} onSelect={setSelected} />
          </div>
          <div className="lg:col-span-4 space-y-6">
            <ClassSkillsCard allEvents={allEvents} />
          </div>
        </div>
      </div>

      {selected && (
        <StudentDetailDrawer
          student={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
