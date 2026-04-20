import { useEffect, useState, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import { LogOut, GraduationCap, ShieldAlert } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import TeacherSalesPage from './TeacherSalesPage';
import ClassEngagementTable from '../teacher/ClassEngagementTable';
import ClassSkillsCard      from '../teacher/ClassSkillsCard';
import StudentDetailDrawer  from '../teacher/StudentDetailDrawer';
import ClassroomCodeCard    from '../teacher/ClassroomCodeCard';

/**
 * /teacher — Teacher-only dashboard.
 * Guarded by DB-backed role check (profiles.role === 'teacher' | 'admin').
 * Students join the class themselves via /join?code=CLASSROOM_CODE.
 */
export default function TeacherDashboard() {
  const [user,      setUser]      = useState(null);
  const [profile,   setProfile]   = useState(null);
  const [loginErr,  setLoginErr]  = useState(null);
  const [students,  setStudents]  = useState([]);
  const [allEvents, setAllEvents] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [selected,  setSelected]  = useState(null);

  const loadData = useCallback(async (u) => {
    try {
      // ── 1. profile + overview במקביל (חוסך round-trip אחד) ──────────────
      const [{ data: prof }, { data: list, error: rpcErr }] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, email, role, is_admin, max_children_allowed, classroom_code, teacher_status')
          .eq('id', u.id)
          .maybeSingle(),
        supabase.rpc('get_teacher_class_overview'),
      ]);

      setProfile(prof || null);
      if (!prof || (!prof.is_admin && prof.role !== 'teacher' && prof.role !== 'admin')) return;
      if (rpcErr) throw rpcErr;

      // ── 2. הצג תלמידים מיד — ללא המתנה ל-events ────────────────────────
      setStudents(list || []);

      // ── 3. events נטען ברקע אחרי הרינדר הראשון (non-blocking) ──────────
      const tokens = (list || []).map(s => s.magic_token).filter(Boolean);
      if (tokens.length) {
        supabase
          .from('game_events')
          .select('game_name, success, level, created_at, child_token')
          .in('child_token', tokens)
          .order('created_at', { ascending: false })
          .limit(2000)
          .then(({ data: ev }) => setAllEvents(ev || []))
          .catch(e => { console.error('[TeacherDashboard] fetchEvents:', e); setAllEvents([]); });
      } else {
        setAllEvents([]);
      }
    } catch (e) {
      console.error('[TeacherDashboard] load:', e);
      setError('שגיאה בטעינת הנתונים');
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    // Fast path: getSession reads from localStorage — no network, near-instant.
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return;
      const u = session?.user ?? null;
      setUser(u);
      try { if (u) await loadData(u); }
      catch (e) { console.error('[TeacherDashboard] loadData:', e); }
      finally { if (mounted) setLoading(false); }
    });

    // Handle auth events AFTER init (login, logout). Skip INITIAL_SESSION.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted || event === 'INITIAL_SESSION') return;
        const u = session?.user ?? null;
        setUser(u);
        if (event === 'SIGNED_IN' && u) {
          setLoading(true);
          try { await loadData(u); }
          catch (e) { console.error('[TeacherDashboard] loadData:', e); }
          finally { if (mounted) setLoading(false); }
        } else if (event === 'SIGNED_OUT') {
          setLoading(false);
        }
      }
    );
    return () => { mounted = false; subscription.unsubscribe(); };
  }, [loadData]);

  async function handleLogin() {
    setLoginErr(null);
    try {
      const { error: authErr } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/teacher` },
      });
      if (authErr) throw authErr;
    } catch (e) {
      setLoginErr('הכניסה נכשלה — נסה שוב');
      console.error('[TeacherDashboard] login:', e);
    }
  }

  async function handleLogout() {
    try { await supabase.auth.signOut(); } catch (e) { console.error(e); }
  }

  // ─── Render states ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <div dir="rtl" className="min-h-[100dvh] flex items-center justify-center bg-slate-50">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // לא מחובר — מסך כניסה ייעודי למורים
  if (!user) {
    return (
      <div dir="rtl" className="min-h-[100dvh] flex items-center justify-center p-6"
        style={{ background: 'radial-gradient(ellipse at 50% 60%, #0f172a 0%, #020617 100%)' }}>
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-[2rem] p-8 max-w-sm w-full text-center space-y-6 shadow-2xl">
          <div className="text-5xl">🎓</div>
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/20 border border-indigo-400/30 rounded-full mb-3">
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
              <span className="text-indigo-300 text-[10px] font-black uppercase tracking-widest">Teacher Portal</span>
            </div>
            <h1 className="text-2xl font-black text-white">כניסת מורים</h1>
            <p className="text-slate-400 text-sm mt-1">ניהול כיתה ומעקב התקדמות תלמידים</p>
          </div>
          {loginErr && (
            <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2">{loginErr}</p>
          )}
          <button
            onClick={handleLogin}
            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-50 text-slate-700 font-bold py-3 px-6 rounded-2xl transition-all hover:shadow-xl active:scale-95"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
            כניסה עם Google
          </button>
          <p className="text-slate-600 text-xs">גישה למורים מורשים בלבד</p>
        </div>
      </div>
    );
  }

  // מחובר אבל לא מורה/אדמין → דף מכירה
  // אדמין (is_admin=true) עובר ישירות לדשבורד — ללא redirect
  if (profile && !profile.is_admin && profile.role !== 'teacher' && profile.role !== 'admin') {
    return <TeacherSalesPage user={user} onLogout={handleLogout} />;
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

        {/* Header */}
        <div>
          <h2 className="text-2xl font-black tracking-tight">
            שלום, <span className="text-indigo-600">{user.email?.split('@')[0]}</span>
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            {students.length > 0
              ? `${students.length} תלמידים רשומים בכיתה`
              : 'עוד אין תלמידים — שתף את קישור ההצטרפות'}
          </p>
        </div>

        {students.length === 0 ? (
          /* ─── Empty state ─────────────────────────────────────────── */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8">
              <div className="bg-white border border-slate-100 rounded-3xl p-10 flex flex-col items-center text-center gap-5 shadow-sm">
                <div className="text-6xl">🏫</div>
                <div className="space-y-2">
                  <h3 className="text-xl font-black text-slate-800">הכיתה שלך עדיין ריקה</h3>
                  <p className="text-slate-400 text-sm leading-relaxed max-w-xs">
                    שלח לתלמידים את קוד הכיתה שלך — הם יצטרפו בעצמם דרך הקישור
                  </p>
                </div>
                {profile?.classroom_code && (
                  <div className="bg-indigo-50 border border-indigo-100 rounded-2xl px-6 py-4 w-full max-w-xs">
                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">קוד הכיתה שלך</p>
                    <p className="text-3xl font-black font-mono tracking-widest text-indigo-700 select-all">
                      {profile.classroom_code}
                    </p>
                  </div>
                )}
                <p className="text-slate-400 text-xs">
                  קישור הצטרפות:{' '}
                  <span className="font-mono text-indigo-500">
                    {window.location.origin}/join?code={profile?.classroom_code}
                  </span>
                </p>
              </div>
            </div>
            <div className="lg:col-span-4 space-y-6">
              <ClassroomCodeCard classroomCode={profile?.classroom_code} />
            </div>
          </div>
        ) : (
          /* ─── Normal state with students ─────────────────────────── */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 space-y-6">
              <ClassEngagementTable students={students} onSelect={setSelected} />
            </div>
            <div className="lg:col-span-4 space-y-6">
              <ClassroomCodeCard classroomCode={profile?.classroom_code} />
              <ClassSkillsCard allEvents={allEvents} />
            </div>
          </div>
        )}
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
