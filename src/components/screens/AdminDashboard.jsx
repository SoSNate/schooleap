import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Moon, Sun } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import useAdminStore from '../../store/useAdminStore';
import useGameStore from '../../store/useGameStore';
import InstallPrompt, { shouldAutoShowInstallPrompt } from '../shared/InstallPrompt';
import { useEdgeSwipe } from '../../hooks/useEdgeSwipe';

// Fallback לבדיקת אדמין במקרה שהעמודה is_admin טרם אוכלסה (bootstrap).
// הגנה עיקרית נעשית דרך profiles.is_admin ו-RLS ב-DB.
const ADMIN_EMAIL_FALLBACK = '12natanel@gmail.com';

const TABS = [
  { id: 'leads',    label: '📬 פניות מורים' },
  { id: 'teachers', label: '🎓 מורים פעילים' },
  { id: 'parents',  label: '👨‍👩‍👧 הורים' },
  { id: 'students', label: '👦 תלמידים' },
  { id: 'activity', label: '📊 פעילות' },
  { id: 'payments', label: '💳 תשלומים' },
  { id: 'links',    label: '🔗 קישורים מהירים' },
  { id: 'devtools', label: '🛠 כלי פיתוח' },
];

// ─── helpers ──────────────────────────────────────────────────────────────────

function fmt(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

/** Returns label + Tailwind color class for subscription expiry */
function daysLeft(iso) {
  if (!iso) return null;
  const d = Math.ceil((new Date(iso) - Date.now()) / 86_400_000);
  if (d < 0)   return { label: 'פג',       cls: 'text-red-500 dark:text-red-400 font-black' };
  if (d <= 7)  return { label: `${d}י׳`,   cls: 'text-amber-500 dark:text-amber-400 font-bold' };
  if (d <= 30) return { label: `${d}י׳`,   cls: 'text-blue-500 dark:text-blue-400 font-bold' };
  return       { label: `${Math.floor(d/30)}ח׳`, cls: 'text-green-600 dark:text-green-400 font-bold' };
}

function Badge({ text, color = 'slate' }) {
  const cls = {
    green:  'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    amber:  'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    red:    'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    slate:  'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
    indigo: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  }[color] || 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300';
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
  const editMode = useAdminStore(s => s.editMode);

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
    if (!editMode) { alert('הפעל מצב עריכה כדי לבצע שינויים'); return; }
    const { error } = await supabase.from('teacher_leads').update({ handled: true }).eq('id', id);
    if (error) { alert('שגיאה: ' + error.message); return; }
    setLeads(l => l.map(x => x.id === id ? { ...x, handled: true } : x));
  }

  async function approveTeacher(email) {
    if (!editMode) { alert('הפעל מצב עריכה כדי לאשר מורה'); return; }
    if (!email) { alert('אין מייל לפניה זו'); return; }
    const normalizedEmail = String(email).trim().toLowerCase();

    const { data, error } = await supabase.rpc('admin_approve_teacher', { p_email: normalizedEmail });
    if (error) {
      console.error('[admin_approve_teacher] RPC failed:', { email: normalizedEmail, code: error.code, message: error.message, details: error.details, hint: error.hint });
      const retry = confirm(
        `⚠️ אישור מורה נכשל\n\n` +
        `מייל: ${normalizedEmail}\n` +
        `קוד שגיאה: ${error.code || 'N/A'}\n` +
        `הודעה: ${error.message}\n` +
        `${error.hint ? `רמז: ${error.hint}\n` : ''}` +
        `\nלחץ OK כדי לנסות אישור ידני (ללא RPC) — רק אם אתה בטוח.`
      );
      if (retry) await manualApproveTeacher(normalizedEmail);
      return;
    }
    const row = Array.isArray(data) ? data[0] : data;
    const code = row?.classroom_code || '—';
    alert(`✅ ${normalizedEmail} אושר כמורה!\nקוד כיתה: ${code}`);
    await load();
  }

  // Manual fallback: direct UPDATE on profiles if the RPC is broken/missing.
  // Requires RLS policy allowing admins to update profiles.
  async function manualApproveTeacher(email) {
    const { data: profile, error: pErr } = await supabase
      .from('profiles')
      .select('id, email, role, classroom_code')
      .ilike('email', email)
      .maybeSingle();
    if (pErr || !profile) {
      alert(`לא נמצא פרופיל למייל ${email}. המשתמש צריך להתחבר פעם אחת דרך Google לפני אישור.`);
      return;
    }
    const code = profile.classroom_code || ('T-' + Math.random().toString(36).slice(2, 7).toUpperCase());
    const oneYear = new Date(); oneYear.setFullYear(oneYear.getFullYear() + 1);
    const { error: uErr } = await supabase.from('profiles').update({
      role: 'teacher',
      teacher_status: 'approved',
      classroom_code: code,
      subscription_status: 'active',
      subscription_expires_at: oneYear.toISOString(),
    }).eq('id', profile.id);
    if (uErr) { alert('עדכון ידני נכשל: ' + uErr.message); return; }
    await supabase.from('teacher_leads').update({ handled: true }).eq('email', email);
    alert(`✅ אישור ידני בוצע\nמורה: ${email}\nקוד: ${code}`);
    await load();
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
  const editMode = useAdminStore(s => s.editMode);
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
            disabled={!editMode}
            className="flex-1 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-slate-100"
          >סמן כטופל</button>
          <button
            onClick={() => onApprove(lead.email)}
            disabled={!editMode}
            className="flex-1 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-indigo-600"
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
  const editMode = useAdminStore(s => s.editMode);

  useEffect(() => {
    supabase.from('profiles').select('id, email, classroom_code, teacher_status, created_at')
      .eq('role', 'teacher').order('created_at', { ascending: false })
      .then(({ data }) => { setTeachers(data || []); setLoading(false); });
  }, []);

  async function revoke(id) {
    if (!editMode) { alert('הפעל מצב עריכה כדי לבטל הרשאה'); return; }
    if (!confirm('לבטל הרשאת מורה?')) return;
    // RPC admin_revoke_teacher: מחזיר ל-role=parent, מנקה classroom_code ורושם audit_log.
    const { error } = await supabase.rpc('admin_revoke_teacher', { p_user_id: id });
    if (error) { alert('שגיאה: ' + error.message); return; }
    setTeachers(t => t.filter(x => x.id !== id));
  }

  if (loading) return <Spinner />;
  if (!teachers.length) return <Empty text="אין מורים פעילים" />;

  function teacherStatusColor(s) {
    if (s === 'approved') return 'green';
    if (s === 'pending')  return 'amber';
    if (s === 'revoked')  return 'red';
    return 'slate';
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-right text-xs font-black text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-700">
            <th className="pb-2 pr-2">מייל</th>
            <th className="pb-2">קוד כיתה</th>
            <th className="pb-2">סטטוס</th>
            <th className="pb-2">תאריך</th>
            <th className="pb-2"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
          {teachers.map(t => (
            <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/40">
              <td className="py-2.5 pr-2 font-medium text-slate-800 dark:text-slate-200 text-xs">{t.email}</td>
              <td className="py-2.5 font-mono font-black text-indigo-600 dark:text-indigo-400">{t.classroom_code || '—'}</td>
              <td className="py-2.5"><Badge text={t.teacher_status || 'approved'} color={teacherStatusColor(t.teacher_status)} /></td>
              <td className="py-2.5 text-slate-400 dark:text-slate-500 text-xs">{fmt(t.created_at)}</td>
              <td className="py-2.5">
                <button
                  onClick={() => revoke(t.id)}
                  disabled={!editMode}
                  className="text-xs text-red-500 hover:text-red-700 font-bold disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-red-500"
                >בטל</button>
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
    Promise.all([
      supabase.from('profiles')
        .select('id, email, subscription_status, subscription_expires_at, applied_coupon, created_at')
        .neq('role', 'teacher').order('created_at', { ascending: false }),
      supabase.from('children').select('parent_id'),
    ]).then(([parentsRes, childrenRes]) => {
      // Build child-count map per parent
      const childCount = {};
      (childrenRes.data || []).forEach(c => {
        childCount[c.parent_id] = (childCount[c.parent_id] || 0) + 1;
      });
      const merged = (parentsRes.data || []).map(p => ({ ...p, linkCount: childCount[p.id] || 0 }));
      setParents(merged);
      setLoading(false);
    });
  }, []);

  const filtered = filter === 'all' ? parents : parents.filter(p => p.subscription_status === filter);

  // Coupon usage summary
  const couponSummary = Object.entries(
    parents.reduce((acc, p) => {
      if (p.applied_coupon) acc[p.applied_coupon] = (acc[p.applied_coupon] || 0) + 1;
      return acc;
    }, {})
  ).sort((a, b) => b[1] - a[1]);

  if (loading) return <Spinner />;

  return (
    <div className="space-y-4">
      {/* Coupon summary */}
      {couponSummary.length > 0 && (
        <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-2xl px-4 py-3">
          <p className="text-[11px] font-black text-indigo-500 dark:text-indigo-400 uppercase tracking-widest mb-2">שוברים בשימוש</p>
          <div className="flex flex-wrap gap-2">
            {couponSummary.map(([code, count]) => (
              <span key={code} className="text-xs font-bold bg-indigo-100 dark:bg-indigo-800 text-indigo-700 dark:text-indigo-300 px-3 py-1 rounded-full">
                {code} × {count}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        {['all','trial','active','expired','canceled'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`text-xs font-bold px-3 py-1.5 rounded-full transition-all ${filter === f ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'}`}>
            {f === 'all' ? 'הכל' : f}
          </button>
        ))}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-right text-xs font-black text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-700">
              <th className="pb-2 pr-2">מייל</th>
              <th className="pb-2">סטטוס</th>
              <th className="pb-2">נותר</th>
              <th className="pb-2">קישורים</th>
              <th className="pb-2">קופון</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
            {filtered.map(p => {
              const dl = daysLeft(p.subscription_expires_at);
              return (
                <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/40">
                  <td className="py-2.5 pr-2 text-slate-800 dark:text-slate-200 text-xs">{p.email}</td>
                  <td className="py-2.5"><Badge text={p.subscription_status || '—'} color={subColor(p.subscription_status)} /></td>
                  <td className="py-2.5 text-xs">
                    {dl ? <span className={dl.cls}>{dl.label}</span> : <span className="text-slate-400">—</span>}
                  </td>
                  <td className="py-2.5 text-center">
                    <span className={`text-xs font-black ${p.linkCount > 0 ? 'text-slate-700 dark:text-slate-200' : 'text-slate-300 dark:text-slate-600'}`}>
                      {p.linkCount || '—'}
                    </span>
                  </td>
                  <td className="py-2.5 text-slate-500 dark:text-slate-400 text-xs">{p.applied_coupon || '—'}</td>
                </tr>
              );
            })}
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

// ─── Tab: Payments ────────────────────────────────────────────────────────────

function PaymentsTab() {
  const [payments, setPayments] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [filter,   setFilter]   = useState('all'); // 'all' | 'paypal' | 'morning'

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data } = await supabase
          .from('subscription_payments')
          .select(`
            id,
            amount_shekel,
            payment_provider,
            payment_reference,
            webhook_id,
            status,
            activated_at,
            created_at,
            profiles!subscription_payments_user_id_fkey(email),
            subscription_tiers!subscription_payments_tier_id_fkey(name, duration_days)
          `)
          .order('created_at', { ascending: false })
          .limit(100);
        setPayments(data || []);
      } catch (e) {
        console.error('[PaymentsTab]', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const visible = filter === 'all'
    ? payments
    : payments.filter(p => p.payment_provider === filter);

  const totalRevenue = payments
    .filter(p => p.status === 'success')
    .reduce((sum, p) => sum + Number(p.amount_shekel), 0);

  if (loading) return (
    <div className="py-16 flex justify-center">
      <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5 text-center">
          <p className="text-3xl font-black text-emerald-600">₪{totalRevenue.toLocaleString()}</p>
          <p className="text-xs text-slate-500 mt-1">סה"כ הכנסות</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5 text-center">
          <p className="text-3xl font-black text-indigo-600">{payments.filter(p => p.status === 'success').length}</p>
          <p className="text-xs text-slate-500 mt-1">תשלומים מוצלחים</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5 text-center">
          <p className="text-3xl font-black text-amber-600">{payments.filter(p => p.status === 'pending_webhook').length}</p>
          <p className="text-xs text-slate-500 mt-1">ממתינים ל-Webhook</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {['all', 'paypal', 'morning'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-xs font-black px-3 py-1.5 rounded-full transition-all ${
              filter === f
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
            }`}
          >
            {f === 'all' ? 'הכל' : f === 'paypal' ? 'PayPal' : 'Morning'}
          </button>
        ))}
      </div>

      {/* Table */}
      {visible.length === 0 ? (
        <div className="py-16 text-center text-slate-400 text-sm">אין תשלומים עדיין</div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-700 text-xs text-slate-500 font-black uppercase tracking-widest">
                  <th className="px-4 py-3 text-right">מייל</th>
                  <th className="px-4 py-3 text-right">מסלול</th>
                  <th className="px-4 py-3 text-right">סכום</th>
                  <th className="px-4 py-3 text-right">ספק</th>
                  <th className="px-4 py-3 text-right">סטטוס</th>
                  <th className="px-4 py-3 text-right">תאריך</th>
                  <th className="px-4 py-3 text-right">אסמכתא</th>
                </tr>
              </thead>
              <tbody>
                {visible.map(p => (
                  <tr key={p.id} className="border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30">
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300 text-xs">
                      {p.profiles?.email ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        text={p.subscription_tiers?.name ?? '—'}
                        color="indigo"
                      />
                    </td>
                    <td className="px-4 py-3 font-black text-emerald-600">₪{p.amount_shekel}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{p.payment_provider}</td>
                    <td className="px-4 py-3">
                      <Badge
                        text={p.status === 'success' ? '✅ הצליח' : p.status === 'pending_webhook' ? '⏳ ממתין' : '❌ נכשל'}
                        color={p.status === 'success' ? 'green' : p.status === 'pending_webhook' ? 'amber' : 'red'}
                      />
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">{fmt(p.activated_at || p.created_at)}</td>
                    <td className="px-4 py-3 text-xs text-slate-400 font-mono truncate max-w-[120px]" title={p.payment_reference}>
                      {p.payment_reference ?? p.webhook_id?.slice(0, 12) ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="text-xs text-slate-400 text-center">
        תשלומים מופעלים אוטומטית דרך Webhook — אין צורך באישור ידני
      </p>
    </div>
  );
}

// ─── Tab: Links ───────────────────────────────────────────────────────────────

function LinksTab() {
  // פותח בטאב חדש — כך האדמין לא ינותב חזרה ל-/admin מ-ParentDashboard
  const open = (path) => window.open(window.location.origin + path, '_blank');

  const playAsAdmin = () => {
    try {
      localStorage.setItem('hasbaonautica_child_token', 'admin-play-bypass');
      localStorage.setItem('hasbaonautica_admin_play', '1');
      localStorage.removeItem('seen_onboarding_v1');
      sessionStorage.removeItem('seen_interactive_tour_v1');
    } catch { /* storage blocked */ }
    // ניווט באותו טאב — localStorage מובטח לפני הניווט
    window.location.href = window.location.origin + '/play';
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-400 font-bold">
        נפתחים בטאב חדש — כדי למנוע ניתוב חזרה לאדמין
      </p>
      <button onClick={playAsAdmin}
        className="w-full flex items-center gap-3 bg-gradient-to-l from-fuchsia-50 to-pink-50 dark:from-fuchsia-900/20 dark:to-pink-900/20 border border-fuchsia-200 dark:border-fuchsia-700 hover:border-fuchsia-400 text-fuchsia-800 dark:text-fuchsia-200 font-black py-4 px-5 rounded-2xl transition-all text-right shadow-sm hover:shadow-md">
        <span className="text-2xl">🛸</span>
        <div className="flex-1">
          <p className="font-black">משחק אדמין ↗</p>
          <p className="text-xs font-normal text-fuchsia-600 dark:text-fuchsia-400">כניסה ישירה למשחקים — ללא קישור קסם או קוד כיתה</p>
        </div>
        <span className="text-[10px] font-black bg-fuchsia-500 text-white px-2 py-0.5 rounded-full">BYPASS</span>
      </button>
      <button onClick={() => open('/teacher')}
        className="w-full flex items-center gap-3 bg-emerald-50 border border-emerald-200 hover:border-emerald-400 text-emerald-800 font-black py-4 px-5 rounded-2xl transition-all text-right">
        <span className="text-2xl">🎓</span>
        <div>
          <p className="font-black">דשבורד מורה ↗</p>
          <p className="text-xs font-normal text-emerald-600">ניהול כיתה ומעקב תלמידים</p>
        </div>
      </button>
      <button onClick={() => open('/parent')}
        className="w-full flex items-center gap-3 bg-indigo-50 border border-indigo-200 hover:border-indigo-400 text-indigo-800 font-black py-4 px-5 rounded-2xl transition-all text-right">
        <span className="text-2xl">👨‍👩‍👧</span>
        <div>
          <p className="font-black">דשבורד הורה ↗</p>
          <p className="text-xs font-normal text-indigo-600">מעקב ילדים ומנוי</p>
        </div>
      </button>
      <button onClick={() => open('/join')}
        className="w-full flex items-center gap-3 bg-slate-50 border border-slate-200 hover:border-slate-400 text-slate-700 font-black py-4 px-5 rounded-2xl transition-all text-right">
        <span className="text-2xl">🎮</span>
        <div>
          <p className="font-black">דף הצטרפות תלמיד ↗</p>
          <p className="text-xs font-normal text-slate-500">בדיקת זרימת self-join</p>
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
  return <p className="text-center text-slate-400 dark:text-slate-500 text-sm py-10">{text}</p>;
}

function Section({ title, children }) {
  return (
    <div>
      <p className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3">{title}</p>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

// ─── Dev Tools Tab ────────────────────────────────────────────────────────────

const GAME_STEP_CONFIG = {
  balance:9, fractionLab:8, tank:7, decimal:7, equations:7,
  percentages:7, magicPatterns:9, grid:6, word:10, multChamp:9,
};

function DevToolsTab() {
  const resetProgress   = useGameStore(s => s.resetProgress);
  const balance         = useGameStore(s => s.balance);
  const fractionLab     = useGameStore(s => s.fractionLab);
  const tank            = useGameStore(s => s.tank);
  const decimal         = useGameStore(s => s.decimal);
  const equations       = useGameStore(s => s.equations);
  const percentages     = useGameStore(s => s.percentages);
  const magicPatterns   = useGameStore(s => s.magicPatterns);
  const grid            = useGameStore(s => s.grid);
  const word            = useGameStore(s => s.word);
  const multChamp       = useGameStore(s => s.multChamp);

  const gameStates = { balance, fractionLab, tank, decimal, equations, percentages, magicPatterns, grid, word, multChamp };

  const [confirmed, setConfirmed] = useState(false);

  const GAME_NAMES = {
    balance: 'מאזן', fractionLab: 'שברים', tank: 'כוס', decimal: 'עשרוני',
    equations: 'משוואות', percentages: 'אחוזים', magicPatterns: 'דפוסים',
    grid: 'שטחים', word: 'בעיות', multChamp: 'כפל',
  };

  const handleReset = () => {
    if (!confirmed) { setConfirmed(true); return; }
    resetProgress();
    setConfirmed(false);
    alert('✅ ההתקדמות אופסה — שלב 1 בכל המשחקים');
  };

  // DevTools קורא מ-localStorage של token הילד — רלוונטי רק אחרי "משחק אדמין".
  const hasAdminPlay = typeof window !== 'undefined' &&
    localStorage.getItem('hasbaonautica_admin_play') === '1';

  return (
    <div className="space-y-6 max-w-lg">

      {!hasAdminPlay && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-2xl p-4 flex items-start gap-3">
          <span className="text-2xl">⚠️</span>
          <div>
            <p className="font-black text-amber-800 dark:text-amber-300 text-sm">כלי הפיתוח פעילים רק אחרי "משחק אדמין"</p>
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
              עבור ל-<strong>קישורים מהירים</strong> → לחץ <strong>משחק אדמין</strong> → שחק כמה שלבים → חזור לכאן
            </p>
          </div>
        </div>
      )}

      <Section title="התקדמות ילד">
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-700/50">
              <tr>
                <th className="text-right px-4 py-2 font-bold text-slate-500 dark:text-slate-400 text-xs">משחק</th>
                <th className="text-center px-4 py-2 font-bold text-slate-500 dark:text-slate-400 text-xs">שלב</th>
                <th className="px-4 py-2 font-bold text-slate-500 dark:text-slate-400 text-xs">התקדמות</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(GAME_NAMES).map(([id, name]) => {
                const gs = gameStates[id];
                const step = gs?.step || gs?.lvl || 1;
                const total = GAME_STEP_CONFIG[id] || 5;
                const pct = Math.round((step / total) * 100);
                return (
                  <tr key={id} className="border-t border-slate-100 dark:border-slate-700/50">
                    <td className="px-4 py-2 font-bold text-slate-700 dark:text-slate-200">{name}</td>
                    <td className="px-4 py-2 text-center font-black text-indigo-600 dark:text-indigo-400">{step}/{total}</td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs text-slate-400 w-8 text-right">{pct}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="איפוס התקדמות">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-4 space-y-3">
          <p className="text-sm text-red-700 dark:text-red-300 font-bold">
            ⚠️ איפוס יחזיר את כל המשחקים לשלב 1 ויאפס כוכבים ולבבות. פעולה זו לא ניתנת לביטול.
          </p>
          <button
            onClick={handleReset}
            className={`w-full py-3 rounded-xl font-black text-sm transition-all active:scale-95 ${
              confirmed
                ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse'
                : 'bg-red-100 dark:bg-red-800/40 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-800/60'
            }`}
          >
            {confirmed ? '⚠️ לחץ שוב לאישור סופי' : '🔄 איפוס כל ההתקדמות'}
          </button>
          {confirmed && (
            <button
              onClick={() => setConfirmed(false)}
              className="w-full py-2 rounded-xl text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
            >
              ביטול
            </button>
          )}
        </div>
      </Section>

      <Section title="טיול ראשון (Onboarding)">
        <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-2xl p-4 space-y-3">
          <p className="text-xs text-indigo-700 dark:text-indigo-300 leading-relaxed">
            כפתורים אלו מאפסים את סימוני "ראיתי" של מסכי ה-onboarding והטיול האינטראקטיבי במשחק כדי לבדוק אותם מחדש.
          </p>
          <button
            onClick={() => {
              try {
                localStorage.removeItem('seen_onboarding_v1');
                sessionStorage.removeItem('seen_interactive_tour_v1');
                Object.keys(sessionStorage).forEach((k) => {
                  if (k.startsWith('seen_tutorial_')) sessionStorage.removeItem(k);
                });
              } catch { /* storage blocked */ }
              alert('✅ אופס — הטיול הראשון יופיע שוב בכניסה הבאה למשחק');
            }}
            className="w-full py-2.5 rounded-xl font-bold text-sm bg-indigo-100 dark:bg-indigo-800/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-800/60 transition-all active:scale-95"
          >
            🔄 איפוס טיול ראשון + טיוטוריאלים של משחקים
          </button>
        </div>
      </Section>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const navigate       = useNavigate();
  const [user,    setUser]    = useState(null);
  const [isAdmin, setIsAdmin] = useState(null); // null = עדיין בודק
  const [loading, setLoading] = useState(true);
  const [tab,     setTab]     = useState('leads');
  const [loginErr, setLoginErr] = useState(null);
  const [showInstall, setShowInstall] = useState(false);
  const editMode       = useAdminStore(s => s.editMode);
  const toggleEditMode = useAdminStore(s => s.toggleEditMode);
  const initDarkMode   = useGameStore(s => s.initDarkMode);
  const toggleDarkMode = useGameStore(s => s.toggleDarkMode);
  const darkMode       = useGameStore(s => s.darkMode);

  // Apply dark mode class immediately (backup to index.html script)
  useEffect(() => { initDarkMode(); }, []); // eslint-disable-line

  // PWA install prompt — auto show after delay
  useEffect(() => {
    const t = setTimeout(() => {
      if (shouldAutoShowInstallPrompt()) setShowInstall(true);
    }, 3000);
    return () => clearTimeout(t);
  }, []);

  // Swipe right (from left edge) → navigate back
  useEdgeSwipe({ onSwipeRight: () => navigate(-1) });

  useEffect(() => {
    let mounted = true;

    // Dev mode: localhost bypass
    const isLocalhost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    if (isLocalhost) {
      setUser({ id: 'dev-admin', email: 'admin@localhost' });
      setIsAdmin(true);
      setLoading(false);
      return () => { mounted = false; };
    }

    async function resolve(session) {
      const u = session?.user ?? null;
      setUser(u);
      if (!u) { setIsAdmin(null); setLoading(false); return; }
      // מקור אמת: profiles.is_admin. ה-RLS מאפשר ל-user לקרוא את השורה שלו.
      const { data } = await supabase
        .from('profiles')
        .select('is_admin, email')
        .eq('id', u.id)
        .maybeSingle();
      if (!mounted) return;
      const fromDb = Boolean(data?.is_admin);
      // Bootstrap fallback — מייל קשיח, למקרה שהטריגר טרם רץ.
      const fromFallback = (u.email || '').toLowerCase() === ADMIN_EMAIL_FALLBACK.toLowerCase();
      setIsAdmin(fromDb || fromFallback);
      setLoading(false);
    }

    // Fast path: reads from localStorage (no network)
    supabase.auth.getSession().then(({ data: { session } }) => { if (mounted) resolve(session); });

    // Only handle actual auth events — skip INITIAL_SESSION (already handled above)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted || event === 'INITIAL_SESSION') return;
      resolve(session);
    });
    return () => { mounted = false; subscription.unsubscribe(); };
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
    <div className="min-h-[100dvh] flex items-center justify-center bg-slate-50 dark:bg-slate-900">
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
  if (!isAdmin) return (
    <div dir="rtl" className="min-h-[100dvh] flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-900">
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-lg p-8 max-w-sm w-full text-center space-y-4 border border-slate-200 dark:border-slate-700">
        <div className="text-5xl">🚫</div>
        <h2 className="text-xl font-black text-slate-800 dark:text-slate-100">אין גישה</h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm">{user.email}</p>
        <button onClick={handleLogout} className="text-sm font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800">יציאה</button>
      </div>
    </div>
  );

  // ── דשבורד ──
  return (
    <div dir="rtl" className="min-h-[100dvh] bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100">
      {showInstall && <InstallPrompt onClose={() => setShowInstall(false)} />}

      {/* Top bar */}
      <div className={`border-b sticky top-0 z-20 transition-colors ${
        editMode
          ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
          : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-700'
      }`}>
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">🛸</span>
            <span className="font-black text-slate-800 dark:text-slate-100">Admin — חשבונאוטיקה</span>
            {editMode && (
              <span className="text-[10px] font-black uppercase tracking-widest bg-amber-500 text-white px-2 py-0.5 rounded-full">Edit</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* PWA install button */}
            <button
              onClick={() => setShowInstall(true)}
              title="התקן כאפליקציה"
              className="hidden sm:flex p-2 rounded-xl text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-xs font-bold"
            >
              📲
            </button>
            {/* Dark mode toggle */}
            <button
              onClick={toggleDarkMode}
              title="מצב לילה"
              className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-300 transition-colors"
            >
              {darkMode ? <Sun size={17} /> : <Moon size={17} />}
            </button>
            <button
              onClick={toggleEditMode}
              title={editMode ? 'חזרה למצב קריאה' : 'הפעלת מצב עריכה'}
              className={`text-xs font-black px-3 py-1.5 rounded-full transition-all ${
                editMode
                  ? 'bg-amber-500 text-white hover:bg-amber-600'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
              }`}
            >
              {editMode ? '🔓 עריכה פעילה' : '🔒 קריאה בלבד'}
            </button>
            <button onClick={handleLogout} className="text-xs font-bold text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">יציאה</button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-700 overflow-x-auto">
        <div className="max-w-5xl mx-auto px-4 flex gap-1 py-2 min-w-max sm:min-w-0">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`whitespace-nowrap text-sm font-bold px-4 py-2 rounded-xl transition-all ${
                tab === t.id
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}>
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
        {tab === 'payments' && <PaymentsTab />}
        {tab === 'links'    && <LinksTab />}
        {tab === 'devtools' && <DevToolsTab />}
      </div>
    </div>
  );
}
