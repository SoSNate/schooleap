import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

const ADMIN_EMAIL = '12natanel@gmail.com';

const TABS = [
  { id: 'leads',    label: '📬 פניות מורים' },
  { id: 'teachers', label: '🎓 מורים פעילים' },
  { id: 'parents',  label: '👨‍👩‍👧 הורים' },
  { id: 'students', label: '👦 תלמידים' },
  { id: 'activity', label: '📊 פעילות' },
  { id: 'links',    label: '🔗 קישורים מהירים' },
];

// ─── helpers ──────────────────────────────────────────────────────────────────

function fmt(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

function Badge({ text, color = 'slate' }) {
  const cls = {
    green:  'bg-green-100 text-green-700',
    amber:  'bg-amber-100 text-amber-700',
    red:    'bg-red-100 text-red-700',
    slate:  'bg-slate-100 text-slate-600',
    indigo: 'bg-indigo-100 text-indigo-700',
  }[color] || 'bg-slate-100 text-slate-600';
  return <span className={`text-[11px] font-black px-2 py-0.5 rounded-full ${cls}`}>{text}</span>;
}

function subColor(s) {
  if (s === 'active')   return 'green';
  if (s === 'trial')    return 'amber';
  if (s === 'expired' || s === 'canceled') return 'red';
  return 'slate';
}

// ─── Tab: Leads ───────────────────────────────────────────────────────────────

function LeadsTab() {
  const [leads, setLeads]   = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('teacher_leads')
      .select('*')
      .order('created_at', { ascending: false });
    setLeads(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function markHandled(id) {
    await supabase.from('teacher_leads').update({ handled: true }).eq('id', id);
    setLeads(l => l.map(x => x.id === id ? { ...x, handled: true } : x));
  }

  async function approveTeacher(email) {
    if (!email) { alert('אין מייל לפניה זו — אשר ידנית ב-Supabase'); return; }
    const code = Math.random().toString(36).slice(2, 8).toUpperCase();
    const { error } = await supabase
      .from('profiles')
      .update({ role: 'teacher', teacher_status: 'approved', classroom_code: code })
      .eq('email', email.toLowerCase());
    if (error) { alert('שגיאה: ' + error.message); return; }
    alert(`✅ ${email} אושר כמורה!\nקוד כיתה: ${code}`);
  }

  if (loading) return <Spinner />;
  if (!leads.length) return <Empty text="אין פניות עדיין" />;

  const pending = leads.filter(l => !l.handled);
  const done    = leads.filter(l => l.handled);

  return (
    <div className="space-y-6">
      {pending.length > 0 && (
        <Section title={`ממתינות לטיפול (${pending.length})`}>
          {pending.map(l => <LeadRow key={l.id} lead={l} onHandled={markHandled} onApprove={approveTeacher} />)}
        </Section>
      )}
      {done.length > 0 && (
        <Section title="טופלו">
          {done.map(l => <LeadRow key={l.id} lead={l} onHandled={markHandled} onApprove={approveTeacher} />)}
        </Section>
      )}
    </div>
  );
}

function LeadRow({ lead, onHandled, onApprove }) {
  return (
    <div className={`bg-white rounded-2xl border p-4 space-y-2 ${lead.handled ? 'border-slate-100 opacity-60' : 'border-indigo-100 shadow-sm'}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-black text-slate-800">{lead.full_name}</p>
          {lead.school && <p className="text-xs text-slate-500">{lead.school}</p>}
        </div>
        <Badge text={lead.handled ? 'טופל' : 'ממתין'} color={lead.handled ? 'slate' : 'amber'} />
      </div>
      <div className="flex flex-wrap gap-3 text-xs text-slate-600">
        {lead.phone && <span>📞 {lead.phone}</span>}
        {lead.email && <span>✉️ {lead.email}</span>}
        <span>📅 {fmt(lead.created_at)}</span>
      </div>
      {lead.notes && <p className="text-xs text-slate-500 bg-slate-50 rounded-xl px-3 py-2">{lead.notes}</p>}
      {!lead.handled && (
        <div className="flex gap-2 pt-1">
          <button
            onClick={() => onHandled(lead.id)}
            className="flex-1 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 rounded-xl transition-all"
          >סמן כטופל</button>
          <button
            onClick={() => onApprove(lead.email)}
            className="flex-1 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-xl transition-all"
          >✅ אשר כמורה</button>
        </div>
      )}
    </div>
  );
}

// ─── Tab: Teachers ────────────────────────────────────────────────────────────

function TeachersTab() {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    supabase.from('profiles').select('id, email, classroom_code, teacher_status, created_at')
      .eq('role', 'teacher').order('created_at', { ascending: false })
      .then(({ data }) => { setTeachers(data || []); setLoading(false); });
  }, []);

  async function revoke(id) {
    if (!confirm('לבטל הרשאת מורה?')) return;
    await supabase.from('profiles').update({ role: 'parent', teacher_status: null, classroom_code: null }).eq('id', id);
    setTeachers(t => t.filter(x => x.id !== id));
  }

  if (loading) return <Spinner />;
  if (!teachers.length) return <Empty text="אין מורים פעילים" />;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-right text-xs font-black text-slate-500 border-b border-slate-100">
            <th className="pb-2 pr-2">מייל</th>
            <th className="pb-2">קוד כיתה</th>
            <th className="pb-2">תאריך</th>
            <th className="pb-2"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {teachers.map(t => (
            <tr key={t.id}>
              <td className="py-2.5 pr-2 font-medium text-slate-800">{t.email}</td>
              <td className="py-2.5 font-mono font-black text-indigo-600">{t.classroom_code || '—'}</td>
              <td className="py-2.5 text-slate-400 text-xs">{fmt(t.created_at)}</td>
              <td className="py-2.5">
                <button onClick={() => revoke(t.id)} className="text-xs text-red-500 hover:text-red-700 font-bold">בטל</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Tab: Parents ─────────────────────────────────────────────────────────────

function ParentsTab() {
  const [parents, setParents] = useState([]);
  const [filter, setFilter]   = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('profiles')
      .select('id, email, subscription_status, subscription_expires_at, applied_coupon, created_at')
      .neq('role', 'teacher').order('created_at', { ascending: false })
      .then(({ data }) => { setParents(data || []); setLoading(false); });
  }, []);

  const filtered = filter === 'all' ? parents : parents.filter(p => p.subscription_status === filter);

  if (loading) return <Spinner />;

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {['all','trial','active','expired','canceled'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`text-xs font-bold px-3 py-1.5 rounded-full transition-all ${filter === f ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
            {f === 'all' ? 'הכל' : f}
          </button>
        ))}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-right text-xs font-black text-slate-500 border-b border-slate-100">
              <th className="pb-2 pr-2">מייל</th>
              <th className="pb-2">סטטוס</th>
              <th className="pb-2">פג תוקף</th>
              <th className="pb-2">קופון</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filtered.map(p => (
              <tr key={p.id}>
                <td className="py-2.5 pr-2 text-slate-800">{p.email}</td>
                <td className="py-2.5"><Badge text={p.subscription_status || '—'} color={subColor(p.subscription_status)} /></td>
                <td className="py-2.5 text-slate-400 text-xs">{fmt(p.subscription_expires_at)}</td>
                <td className="py-2.5 text-slate-500 text-xs">{p.applied_coupon || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!filtered.length && <Empty text="אין תוצאות" />}
      </div>
    </div>
  );
}

// ─── Tab: Students ────────────────────────────────────────────────────────────

function StudentsTab() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    supabase.from('children').select('id, name, magic_token, parent_id, created_at')
      .order('created_at', { ascending: false }).limit(200)
      .then(({ data }) => { setStudents(data || []); setLoading(false); });
  }, []);

  if (loading) return <Spinner />;
  if (!students.length) return <Empty text="אין תלמידים עדיין" />;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-right text-xs font-black text-slate-500 border-b border-slate-100">
            <th className="pb-2 pr-2">שם</th>
            <th className="pb-2">טוקן גישה</th>
            <th className="pb-2">תאריך הצטרפות</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {students.map(s => (
            <tr key={s.id}>
              <td className="py-2.5 pr-2 font-medium text-slate-800">{s.name}</td>
              <td className="py-2.5 font-mono text-xs text-slate-500">{s.magic_token || s.id.slice(0, 8)}</td>
              <td className="py-2.5 text-slate-400 text-xs">{fmt(s.created_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Tab: Activity ────────────────────────────────────────────────────────────

function ActivityTab() {
  const [events, setEvents]   = useState([]);
  const [stats, setStats]     = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('game_events')
      .select('game_name, success, level, created_at')
      .order('created_at', { ascending: false }).limit(200)
      .then(({ data }) => {
        const ev = data || [];
        setEvents(ev);
        setStats({
          total:   ev.length,
          success: ev.filter(e => e.success).length,
          avgLevel: ev.length ? (ev.reduce((a, e) => a + (e.level || 0), 0) / ev.length).toFixed(1) : 0,
        });
        setLoading(false);
      });
  }, []);

  if (loading) return <Spinner />;

  return (
    <div className="space-y-5">
      {stats && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'סך משחקים', value: stats.total },
            { label: 'הצלחות', value: stats.success },
            { label: 'רמה ממוצעת', value: stats.avgLevel },
          ].map(s => (
            <div key={s.label} className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 text-center">
              <p className="text-2xl font-black text-indigo-700">{s.value}</p>
              <p className="text-xs text-indigo-500 font-bold mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-right text-xs font-black text-slate-500 border-b border-slate-100">
              <th className="pb-2 pr-2">תאריך</th>
              <th className="pb-2">משחק</th>
              <th className="pb-2">רמה</th>
              <th className="pb-2">הצלחה</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {events.map((e, i) => (
              <tr key={i}>
                <td className="py-2 pr-2 text-slate-400 text-xs">{fmt(e.created_at)}</td>
                <td className="py-2 text-slate-700">{e.game_name}</td>
                <td className="py-2 text-slate-500">{e.level || '—'}</td>
                <td className="py-2">{e.success ? '✅' : '❌'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Tab: Links ───────────────────────────────────────────────────────────────

function LinksTab() {
  const navigate = useNavigate();
  return (
    <div className="space-y-3">
      <button onClick={() => navigate('/teacher')}
        className="w-full flex items-center gap-3 bg-emerald-50 border border-emerald-200 hover:border-emerald-400 text-emerald-800 font-black py-4 px-5 rounded-2xl transition-all text-right">
        <span className="text-2xl">🎓</span>
        <div>
          <p className="font-black">דשבורד מורה</p>
          <p className="text-xs font-normal text-emerald-600">ניהול כיתה ומעקב תלמידים</p>
        </div>
      </button>
      <button onClick={() => navigate('/parent')}
        className="w-full flex items-center gap-3 bg-indigo-50 border border-indigo-200 hover:border-indigo-400 text-indigo-800 font-black py-4 px-5 rounded-2xl transition-all text-right">
        <span className="text-2xl">👨‍👩‍👧</span>
        <div>
          <p className="font-black">דשבורד הורה</p>
          <p className="text-xs font-normal text-indigo-600">מעקב ילדים ומנוי</p>
        </div>
      </button>
    </div>
  );
}

// ─── Shared UI ────────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div className="flex justify-center py-12">
      <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function Empty({ text }) {
  return <p className="text-center text-slate-400 text-sm py-10">{text}</p>;
}

function Section({ title, children }) {
  return (
    <div>
      <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">{title}</p>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab,     setTab]     = useState('leads');
  const [loginErr, setLoginErr] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  async function handleLogin() {
    setLoginErr(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/admin` },
    });
    if (error) setLoginErr('הכניסה נכשלה');
  }

  async function handleLogout() {
    await supabase.auth.signOut();
  }

  // ── loading ──
  if (loading) return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-slate-50">
      <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  // ── לא מחובר ──
  if (!user) return (
    <div dir="rtl" className="min-h-[100dvh] flex items-center justify-center p-6"
      style={{ background: 'radial-gradient(ellipse at 50% 60%, #0f172a 0%, #020617 100%)' }}>
      <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-[2rem] p-8 max-w-sm w-full text-center space-y-6">
        <div className="text-5xl">🛸</div>
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/20 border border-indigo-400/30 rounded-full mb-3">
            <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
            <span className="text-indigo-300 text-[10px] font-black uppercase tracking-widest">Admin Portal</span>
          </div>
          <h1 className="text-2xl font-black text-white">כניסת מנהל</h1>
        </div>
        {loginErr && <p className="text-red-400 text-sm">{loginErr}</p>}
        <button onClick={handleLogin}
          className="w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-50 text-slate-700 font-bold py-3 px-6 rounded-2xl transition-all hover:shadow-xl active:scale-95">
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
          כניסה עם Google
        </button>
      </div>
    </div>
  );

  // ── לא אדמין ──
  if (user.email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) return (
    <div dir="rtl" className="min-h-[100dvh] flex items-center justify-center p-6 bg-slate-50">
      <div className="bg-white rounded-3xl shadow-lg p-8 max-w-sm w-full text-center space-y-4 border border-slate-200">
        <div className="text-5xl">🚫</div>
        <h2 className="text-xl font-black text-slate-800">אין גישה</h2>
        <p className="text-slate-500 text-sm">{user.email}</p>
        <button onClick={handleLogout} className="text-sm font-bold text-indigo-600 hover:text-indigo-800">יציאה</button>
      </div>
    </div>
  );

  // ── דשבורד ──
  return (
    <div dir="rtl" className="min-h-[100dvh] bg-slate-50 text-slate-900">
      {/* Top bar */}
      <div className="bg-white border-b border-slate-100 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🛸</span>
            <span className="font-black text-slate-800">Admin — חשבונאוטיקה</span>
          </div>
          <button onClick={handleLogout} className="text-xs font-bold text-slate-400 hover:text-slate-700">יציאה</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-slate-100 overflow-x-auto">
        <div className="max-w-5xl mx-auto px-4 flex gap-1 py-2">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`whitespace-nowrap text-sm font-bold px-4 py-2 rounded-xl transition-all ${tab === t.id ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 py-6">
        {tab === 'leads'    && <LeadsTab />}
        {tab === 'teachers' && <TeachersTab />}
        {tab === 'parents'  && <ParentsTab />}
        {tab === 'students' && <StudentsTab />}
        {tab === 'activity' && <ActivityTab />}
        {tab === 'links'    && <LinksTab />}
      </div>
    </div>
  );
}
