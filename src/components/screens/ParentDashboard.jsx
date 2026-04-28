import { useEffect, useState, useCallback, useMemo, lazy, Suspense } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Info, Plus, Moon, Sun, ShieldAlert } from 'lucide-react';
import Swal from 'sweetalert2';
import { supabase } from '../../lib/supabase';
import useGameStore from '../../store/useGameStore';
import InstallPrompt, { captureInstallEvent } from '../shared/InstallPrompt';
import { useEdgeSwipe } from '../../hooks/useEdgeSwipe';
import { APP_URL, buildNotifications, buildRadarData } from '../dashboard/constants';
import DashboardNav       from '../dashboard/DashboardNav';
import MagicLinkCard      from '../dashboard/MagicLinkCard';
import TrialCard          from '../dashboard/TrialCard';
import NotificationsCard  from '../dashboard/NotificationsCard';
import PushSettingsCard   from '../dashboard/PushSettingsCard';
// SkillRadarCard נטען lazy — תלוי ב-recharts (~330kB). מנתק את ה-bundle הראשי.
const SkillRadarCard = lazy(() => import('../dashboard/SkillRadarCard'));
import GoalsSection       from '../dashboard/GoalsSection';
import GoalModal          from '../dashboard/GoalModal';
import PricingView           from '../dashboard/PricingView';
import UpgradeNudge          from '../dashboard/UpgradeNudge';
import SubscriptionPaywall   from '../dashboard/SubscriptionPaywall';
import useSubscriptionStatus from '../../hooks/useSubscriptionStatus';

// ─── EmptyState (shown before a child exists) ─────────────────────────────────

function EmptyState({ onAdd, loading }) {
  const [name,    setName]    = useState('');
  const [open,    setOpen]    = useState(false);
  const [nameErr, setNameErr] = useState('');
  const [agreed,  setAgreed]  = useState(false);

  // כוכבים decorative — מגריל פעם אחת בלבד, לא משפיע על הלוגיקה.
  const stars = useMemo(
    () => Array.from({ length: 80 }, () => ({
      top: Math.random() * 100,
      left: Math.random() * 100,
      size: Math.random() * 2 + 0.5,
      dur: Math.random() * 3 + 2,
      delay: Math.random() * 4,
    })),
    []
  );

  function submit(e) {
    e.preventDefault();
    if (!name.trim()) { setNameErr('נדרש שם לאסטרונאוט'); return; }
    if (!agreed)      { setNameErr('יש לאשר את תנאי השימוש ומדיניות הפרטיות'); return; }
    setNameErr('');
    onAdd(name.trim());
  }

  return (
    <div
      dir="rtl"
      className="min-h-[100dvh] flex flex-col items-center justify-center relative overflow-hidden px-6"
      style={{ background: 'radial-gradient(ellipse at 50% 60%, #0f172a 0%, #020617 100%)' }}
    >
      <style>{`
        @keyframes twinkle2 { 0%,100%{opacity:0} 50%{opacity:.9} }
        @keyframes float2   { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
        @keyframes pulse-ring { 0%{transform:scale(1);opacity:.6} 100%{transform:scale(1.6);opacity:0} }
      `}</style>
      {stars.map((s, i) => (
        <div key={i} className="absolute rounded-full bg-white" style={{
          top: `${s.top}%`, left: `${s.left}%`,
          width: s.size, height: s.size,
          animation: `twinkle2 ${s.dur}s ${s.delay}s ease-in-out infinite`,
        }} />
      ))}

      <div className="relative z-10 flex flex-col items-center text-center max-w-md w-full gap-8">
        <div className="relative" style={{ animation: 'float2 3s ease-in-out infinite' }}>
          <div className="text-7xl">🚀</div>
          <div className="absolute inset-0 rounded-full border border-indigo-500/40"
            style={{ animation: 'pulse-ring 2s ease-out infinite' }} />
        </div>

        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/20 border border-indigo-400/30 rounded-full">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-indigo-300 text-[10px] font-black uppercase tracking-widest">Mission Control — מוכן להמראה</span>
          </div>
          <h2 className="text-3xl font-black text-white leading-tight">הכן אסטרונאוט למשימה</h2>
          <p className="text-slate-400 text-sm leading-relaxed">
            צור פרופיל לילד שלך כדי לקבל קישור קסם,<br />
            לעקוב אחר התקדמותו ולהגדיר יעדים ופרסים.
          </p>
        </div>

        {!open ? (
          <button
            onClick={() => setOpen(true)}
            className="flex items-center gap-3 bg-indigo-600 hover:bg-indigo-500 text-white font-black py-4 px-8 rounded-2xl text-lg shadow-2xl shadow-indigo-900 transition-all active:scale-95"
            style={{ boxShadow: '0 0 30px 6px rgba(99,102,241,0.4)' }}
          >
            <Plus size={22} />
            הוסף אסטרונאוט (ילד)
          </button>
        ) : (
          <form onSubmit={submit} className="w-full bg-white/5 border border-white/10 backdrop-blur-sm rounded-[2rem] p-6 space-y-4">
            <h3 className="text-white font-black text-lg">שם האסטרונאוט</h3>
            <input
              autoFocus
              className="w-full bg-white/10 border border-white/20 text-white placeholder-slate-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              placeholder="שם הילד (חובה)"
              value={name}
              onChange={e => { setName(e.target.value); setNameErr(''); }}
              required
            />
            <label className="flex items-start gap-2 text-[11px] text-slate-300 cursor-pointer text-right">
              <input
                type="checkbox"
                checked={agreed}
                onChange={e => setAgreed(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-indigo-500 flex-shrink-0"
              />
              <span>
                אני מאשר/ת כהורה/אפוטרופוס את{' '}
                <a href="/terms" target="_blank" rel="noreferrer" className="text-indigo-400 underline">תנאי השימוש</a>
                {' '}ו-
                <a href="/privacy" target="_blank" rel="noreferrer" className="text-indigo-400 underline">מדיניות הפרטיות</a>
                , ומסכים/ה לאיסוף נתוני התקדמות הילד לצורך הלמידה.
              </span>
            </label>
            {nameErr && <p className="text-red-400 text-xs">{nameErr}</p>}
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-black text-sm transition-all active:scale-95 disabled:opacity-60"
              >
                {loading ? 'יוצר...' : '🚀 שגר אסטרונאוט'}
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="px-4 py-3 text-slate-400 font-bold text-sm hover:text-white"
              >ביטול</button>
            </div>
          </form>
        )}

        <div className="grid grid-cols-3 gap-3 text-center w-full">
          {[
            { emoji: '🔗', label: 'קישור קסם' },
            { emoji: '📊', label: 'דוחות חיים' },
            { emoji: '🏆', label: 'יעדים ופרסים' },
          ].map(f => (
            <div key={f.label} className="bg-white/5 border border-white/10 rounded-2xl p-3">
              <div className="text-2xl mb-1">{f.emoji}</div>
              <p className="text-slate-400 text-xs font-bold">{f.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── ParentDashboard ──────────────────────────────────────────────────────────

export default function ParentDashboard() {
  const navigate       = useNavigate();
  const initDarkMode   = useGameStore(s => s.initDarkMode);
  const toggleDarkMode = useGameStore(s => s.toggleDarkMode);
  const darkMode       = useGameStore(s => s.darkMode);

  useEffect(() => { initDarkMode(); }, []); // eslint-disable-line
  useEdgeSwipe({ onSwipeRight: () => navigate(-1) });

  // Single source of truth for subscription state across UI bits below.

  const [user,           setUser]           = useState(null);
  const [profile,        setProfile]        = useState(null);
  const [children,       setChildren]       = useState([]);
  const [selectedChildIdx, setSelectedChildIdx] = useState(0);
  const [childExists,    setChildExists]    = useState(null);
  const [events,         setEvents]         = useState([]);
  const [goals,          setGoals]          = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [addingChild,    setAddingChild]    = useState(false);
  const [copied,         setCopied]         = useState(false);
  const [error,          setError]          = useState(null);
  const [view,           setView]           = useState('dashboard');
  const [showGoalModal,  setShowGoalModal]  = useState(false);
  const [couponCode,     setCouponCode]     = useState('');
  const [couponMsg,      setCouponMsg]      = useState(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [goalForm,       setGoalForm]       = useState({ title: '', reward: '', target_hours: '' });
  const [goalSaving,     setGoalSaving]     = useState(false);
  const [goalError,      setGoalError]      = useState('');

  // ילד נבחר — derived מ-children + selectedChildIdx
  const child = children[selectedChildIdx] ?? null;

  // ─── Fetch events ────────────────────────────────────────────────────────
  const fetchEvents = useCallback(async (childToken) => {
    try {
      const { data, error: err } = await supabase
        .from('game_events')
        .select('*')
        .eq('child_token', childToken)
        .order('created_at', { ascending: false })
        .limit(100);
      if (err) throw err;
      setEvents(data ?? []);
    } catch (e) {
      console.error('[ParentDashboard] fetchEvents:', e);
    }
  }, []);

  // ─── Fetch goals ─────────────────────────────────────────────────────────
  const fetchGoals = useCallback(async (parentId) => {
    try {
      const { data, error: err } = await supabase
        .from('goals')
        .select('*')
        .eq('parent_id', parentId)
        .order('created_at', { ascending: true });
      if (err) throw err;
      setGoals(data ?? []);
    } catch (e) {
      console.error('[ParentDashboard] fetchGoals:', e);
    }
  }, []);

  // ─── Load children + profile ─────────────────────────────────────────────
  const loadChild = useCallback(async (u) => {
    try {
      // ── profile + all children במקביל (חוסך round-trip אחד) ──────────────
      const [{ data: prof }, { data, error: err }] = await Promise.all([
        supabase
          .from('profiles')
          .select('subscription_status, subscription_expires_at, applied_coupon, role, is_admin')
          .eq('id', u.id)
          .maybeSingle(),
        supabase
          .from('children')
          .select('*')
          .eq('parent_id', u.id)
          .order('created_at', { ascending: true }),
      ]);

      if (prof) setProfile(prof);
      if (err) throw err;

      const kids = data || [];
      if (kids.length === 0) { setChildExists(false); setChildren([]); return; }

      setChildExists(true);
      setChildren(kids);
      // events + goals עבור הילד הנבחר (ראשון) — fire-and-forget ברקע
      fetchEvents(kids[0].magic_token).catch((e) =>
        console.error('[ParentDashboard] fetchEvents:', e)
      );
      fetchGoals(u.id).catch((e) =>
        console.error('[ParentDashboard] fetchGoals:', e)
      );
    } catch (e) {
      setError('שגיאה בטעינת הנתונים. נסה לרענן את הדף.');
      console.error('[ParentDashboard] loadChild:', e);
      setChildExists(false);
    }
  }, [fetchEvents, fetchGoals]);

  // ─── Switch events when selected child changes ───────────────────────────
  useEffect(() => {
    if (!child?.magic_token) return;
    setEvents([]);
    fetchEvents(child.magic_token).catch(console.error);
  }, [child?.magic_token, fetchEvents]);

  // ─── Realtime: live event updates when child plays ───────────────────────
  useEffect(() => {
    if (!child?.magic_token) return;
    const channel = supabase
      .channel(`child-events-${child.magic_token}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'game_events',
        filter: `child_token=eq.${child.magic_token}`,
      }, (payload) => {
        setEvents((prev) => [payload.new, ...prev].slice(0, 100));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [child?.magic_token]);

  // ─── Realtime: subscription status (webhook activates instantly) ─────────
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`profile-sub-${user.id}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'profiles',
        filter: `id=eq.${user.id}`,
      }, (payload) => {
        const { subscription_status, subscription_expires_at } = payload.new;
        setProfile((prev) => prev
          ? { ...prev, subscription_status, subscription_expires_at }
          : prev
        );
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  // ─── Auth listener ───────────────────────────────────────────────────────
  useEffect(() => {
    captureInstallEvent();
    let mounted = true;

    // Dev mode: localhost bypass
    const isLocalhost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    if (isLocalhost) {
      // Skip auth on localhost, show dashboard immediately
      setUser({ id: 'dev-user', email: 'dev@localhost' });
      setLoading(false);
      return () => { mounted = false; };
    }

    // Fast path: getSession reads from localStorage — no network, near-instant.
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return;
      const u = session?.user ?? null;
      setUser(u);
      try { if (u) await loadChild(u); }
      catch (e) { console.error('[ParentDashboard] loadChild:', e); }
      finally { if (mounted) setLoading(false); }
    });

    // Handle auth events that happen AFTER init (login, logout).
    // Skip INITIAL_SESSION — already handled by getSession above.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted || event === 'INITIAL_SESSION') return;
        const u = session?.user ?? null;
        setUser(u);
        if (event === 'SIGNED_IN' && u) {
          setLoading(true);
          try { await loadChild(u); }
          catch (e) { console.error('[ParentDashboard] loadChild:', e); }
          finally { if (mounted) setLoading(false); }
        } else if (event === 'SIGNED_OUT') {
          setLoading(false);
        }
      }
    );
    return () => { mounted = false; subscription.unsubscribe(); };
  }, [loadChild]);

  // ─── Handlers ────────────────────────────────────────────────────────────
  async function handleLogin() {
    setError(null);
    try {
      const { error: authErr } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/parent` },
      });
      if (authErr) throw authErr;
    } catch (e) {
      setError('הכניסה נכשלה. נסה שוב.');
      console.error('[ParentDashboard] signInWithOAuth:', e);
    }
  }

  async function handleDeleteChildData() {
    if (!child?.id) return;
    const { isConfirmed, value: confirmName } = await Swal.fire({
      title: 'מחיקת נתוני הילד',
      html: `<div style="text-align:right;direction:rtl">
        פעולה זו תמחק לצמיתות את חשבון <b>${child.name}</b> וכל נתוני הלמידה שלו.<br/>
        <b>לא ניתן לשחזר.</b><br/><br/>
        להמשך — הקלד את שם הילד:
      </div>`,
      input: 'text',
      showCancelButton: true,
      confirmButtonText: 'מחק לצמיתות',
      cancelButtonText: 'ביטול',
      confirmButtonColor: '#dc2626',
      allowEscapeKey: true,
    });
    if (!isConfirmed) return;
    if ((confirmName || '').trim() !== child.name.trim()) {
      await Swal.fire({ icon: 'error', title: 'השם לא תואם', text: 'המחיקה בוטלה.' });
      return;
    }
    try {
      const { error: rpcErr } = await supabase.rpc('delete_child_data', { p_child_id: child.id });
      if (rpcErr) {
        await supabase.from('game_events').delete().eq('child_id', child.id);
        await supabase.from('children').delete().eq('id', child.id);
      }
      const remaining = children.filter(c => c.id !== child.id);
      setChildren(remaining);
      setSelectedChildIdx(0);
      if (remaining.length === 0) setChildExists(false);
      await Swal.fire({ icon: 'success', title: 'נמחק', text: 'כל נתוני הילד הוסרו.' });
    } catch (e) {
      console.error('[ParentDashboard] deleteChildData:', e);
      await Swal.fire({ icon: 'error', title: 'שגיאה', text: e?.message || 'נכשלה המחיקה.' });
    }
  }

  async function handleLogout() {
    try { await supabase.auth.signOut(); }
    catch (e) { console.error('[ParentDashboard] signOut:', e); }
  }

  async function handleCopy() {
    if (!child?.magic_token) return;
    const link = `${APP_URL}/play/${child.magic_token}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      setError(`העתק ידנית: ${link}`);
    }
  }

  function handleWhatsApp() {
    if (!child?.magic_token) return;
    const link = `${APP_URL}/play/${child.magic_token}`;
    const msg = encodeURIComponent(`היי! זה הקישור שלך לחשבונאוטיקה 🚀\n${link}`);
    window.open(`https://wa.me/?text=${msg}`, '_blank');
  }

  async function handleAddChild(name) {
    if (!user || !name) return;
    setAddingChild(true);
    try {
      const { data, error: err } = await supabase
        .from('children')
        .insert({ parent_id: user.id, name })
        .select()
        .single();
      if (err) throw err;
      const updated = [...children, data];
      setChildren(updated);
      setSelectedChildIdx(updated.length - 1);
      setChildExists(true);
      await fetchGoals(user.id);
    } catch (e) {
      setError('שגיאה ביצירת הילד. נסה שוב.');
      console.error('[ParentDashboard] addChild:', e);
    } finally {
      setAddingChild(false);
    }
  }

  async function handleApplyCoupon() {
    if (!couponCode.trim()) return;
    const { data, error: err } = await supabase.rpc('apply_coupon', { p_code: couponCode.trim().toUpperCase() });
    if (err || data !== 'success') {
      setCouponMsg({ ok: false, text: 'קוד לא תקף או לא פעיל' });
    } else {
      setCouponMsg({ ok: true, text: '✅ הקופון הופעל בהצלחה!' });
      setCouponCode('');
      const { data: prof } = await supabase
        .from('profiles').select('subscription_status, subscription_expires_at, applied_coupon, role')
        .eq('id', user.id).maybeSingle();
      if (prof) setProfile(prof);
    }
  }

  async function handleAddGoal(e) {
    e.preventDefault();
    setGoalError('');
    if (!goalForm.title.trim())  { setGoalError('חסר שם יעד — מה הילד צריך לעשות?'); return; }
    if (!goalForm.reward.trim()) { setGoalError('חסר פרס — מה יקבל בהגיעו ליעד?'); return; }
    if (!user)                   { setGoalError('שגיאת התחברות — רענן את הדף ונסה שוב'); return; }

    setGoalSaving(true);
    const targetHours = goalForm.target_hours ? Number(goalForm.target_hours) : null;
    try {
      const { data, error: err } = await supabase
        .from('goals')
        .insert({
          parent_id: user.id,
          title:     goalForm.title.trim(),
          reward:    goalForm.reward.trim(),
          ...(targetHours ? { target_hours: targetHours } : {}),
        })
        .select()
        .single();
      if (err) throw err;
      setGoals(prev => [...prev, data]);
      setGoalForm({ title: '', reward: '', target_hours: '' });
      setGoalError('');
      setShowGoalModal(false);
    } catch (err) {
      console.error('[ParentDashboard] addGoal:', err);
      setGoalError('שגיאה בשמירה: ' + (err?.message ?? 'נסה שוב'));
    } finally {
      setGoalSaving(false);
    }
  }

  async function handleDeleteGoal(id) {
    try {
      await supabase.from('goals').delete().eq('id', id);
      setGoals(prev => prev.filter(g => g.id !== id));
    } catch (e) {
      console.error('[ParentDashboard] deleteGoal:', e);
    }
  }

  function openGoalModal() {
    setGoalError('');
    setGoalForm({ title: '', reward: '', target_hours: '' });
    setShowGoalModal(true);
  }

  function closeGoalModal() {
    setShowGoalModal(false);
    setGoalForm({ title: '', reward: '', target_hours: '' });
  }

  // ─── Derived values ──────────────────────────────────────────────────────
  const magicLink     = child?.magic_token ? `${APP_URL}/play/${child.magic_token}` : null;
  const notifications = useMemo(() => buildNotifications(events), [events]);
  const radarData     = useMemo(() => buildRadarData(events), [events]);

  const trialActive = useMemo(() => {
    if (!profile) return true;
    const status = profile.subscription_status;
    if (status === 'active' || status === 'vip') return true;
    if (status === 'expired' || status === 'canceled') return false;
    if (!profile.subscription_expires_at) return true;
    return new Date(profile.subscription_expires_at) > new Date();
  }, [profile]);

  const trialDaysLeft = useMemo(() => {
    if (!profile?.subscription_expires_at) return 14;
    const diff = new Date(profile.subscription_expires_at) - new Date();
    return Math.max(0, Math.ceil(diff / (24 * 60 * 60 * 1000)));
  }, [profile]);

  const planTotalDays = useMemo(() => {
    const status = profile?.subscription_status;
    if (status === 'vip') return 36500;
    if (status === 'active') return 30;
    return 14;
  }, [profile]);

  const subStatus = useSubscriptionStatus(profile);

  // ─── Render: loading ─────────────────────────────────────────────────────
  if (loading) {
    return (
      <div dir="rtl" className="min-h-[100dvh] flex items-center justify-center"
        style={{ background: 'radial-gradient(ellipse at 50% 60%, #0f172a 0%, #020617 100%)' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="text-4xl animate-bounce">🚀</div>
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  // ─── Render: not logged in ───────────────────────────────────────────────
  if (!user) {
    return (
      <div dir="rtl" className="min-h-[100dvh] flex items-center justify-center p-8 relative overflow-hidden"
        style={{ background: 'radial-gradient(ellipse at 50% 60%, #0f172a 0%, #020617 100%)' }}>
        <div className="absolute w-[500px] h-[500px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(79,70,229,0.12) 0%, transparent 70%)', top: '-10%', right: '-10%' }} />
        <div className="relative z-10 bg-white/5 backdrop-blur-md border border-white/10 rounded-[2rem] p-8 max-w-sm w-full text-center space-y-6 shadow-2xl">
          <div className="text-5xl" style={{ animation: 'float2 3s ease-in-out infinite' }}>🚀</div>
          <style>{`@keyframes float2{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}`}</style>
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/20 border border-indigo-400/30 rounded-full mb-3">
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
              <span className="text-indigo-300 text-[10px] font-black uppercase tracking-widest">Mission Control</span>
            </div>
            <h1 className="text-2xl font-black text-white">חשבונאוטיקה</h1>
            <p className="text-slate-400 text-sm mt-1">כניסה להורים — בניהול המשימה</p>
          </div>
          {error && (
            <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2">{error}</p>
          )}
          <button
            onClick={handleLogin}
            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-50 text-slate-700 font-bold py-3 px-6 rounded-2xl transition-all hover:shadow-xl active:scale-95"
          >
            <img
              src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
              alt="Google"
              className="w-5 h-5"
            />
            כניסה עם Google
          </button>
          <p className="text-slate-600 text-xs">14 ימי ניסיון חינמיים • ללא כרטיס אשראי</p>
        </div>
      </div>
    );
  }

  // ─── Render: redirect by role ─────────────────────────────────────────
  // אדמין (is_admin=true) יכול להישאר בדף זה לצורך QA — ללא redirect.
  // מורה שאינו אדמין מועבר לדשבורד המורה.
  if (!profile?.is_admin && profile?.role === 'teacher') return <Navigate to="/teacher" replace />;

  // ─── Render: paywall (trial expired) ────────────────────────────────────
  // אדמין (is_admin=true) עוקף את ה-paywall — גישה מלאה ללא הגבלת מנוי
  if (!trialActive && !profile?.is_admin) {
    return (
      <SubscriptionPaywall
        onBack={() => {
          // Re-fetch profile to confirm subscription active
          supabase.from('profiles')
            .select('subscription_status, subscription_expires_at, applied_coupon, role')
            .eq('id', user.id).maybeSingle()
            .then(({ data }) => { if (data) setProfile(data); });
        }}
        onLogout={handleLogout}
        userId={user?.id}
        isActive={subStatus.isActive}
      />
    );
  }

  // ─── Render: empty state (no child yet) ─────────────────────────────────
  if (childExists === false) {
    return <EmptyState onAdd={handleAddChild} loading={addingChild} />;
  }

  // ─── Render: pricing view ────────────────────────────────────────────────
  if (view === 'pricing') {
    return <PricingView onBack={() => setView('dashboard')} />;
  }

  // ─── Render: add second child ────────────────────────────────────────────
  if (view === 'addChild') {
    return (
      <EmptyState
        onAdd={async (name) => {
          await handleAddChild(name);
          setView('dashboard');
        }}
        loading={addingChild}
      />
    );
  }

  // ─── Render: main dashboard ──────────────────────────────────────────────
  return (
    <div dir="rtl" className="min-h-[100dvh] bg-[#FDFDFF] dark:bg-slate-900 text-slate-900 dark:text-slate-100">

      <DashboardNav
        profile={profile}
        trialDaysLeft={trialDaysLeft}
        onLogout={handleLogout}
        onPricing={() => setView('pricing')}
      />

      <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-8 pb-16">

        {/* Greeting + child selector */}
        <div className="flex flex-col gap-3">
          <div>
            <h2 className="text-2xl font-black tracking-tight mb-1">
              שלום, <span className="text-indigo-600">{user.email?.split('@')[0]}</span>
            </h2>
            <p className="text-slate-400 text-sm">
              {child?.name ? `הנה תמונת המצב של ${child.name}` : 'הנה תמונת המצב של הילד שלך'}
            </p>
          </div>

          {/* Child tabs — מוצג רק אם יש יותר מילד אחד או אפשר להוסיף */}
          {(children.length > 1 || children.length < 2) && (
            <div className="flex items-center gap-2 flex-wrap">
              {children.map((c, i) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedChildIdx(i)}
                  className={`px-4 py-2 rounded-2xl text-sm font-black transition-all active:scale-95 ${
                    i === selectedChildIdx
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 dark:shadow-indigo-900'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-indigo-300'
                  }`}
                >
                  🚀 {c.name}
                </button>
              ))}
              {children.length < 2 && (
                <button
                  onClick={() => setView('addChild')}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-2xl text-sm font-black border-2 border-dashed border-indigo-300 dark:border-indigo-600 text-indigo-500 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all active:scale-95"
                >
                  <Plus size={15} />
                  הוסף אסטרונאוט
                </button>
              )}
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
            <p className="text-red-600 text-sm break-all">{error}</p>
          </div>
        )}

        {/* Coupon banner */}
        {profile && profile.subscription_status !== 'active' && profile.subscription_status !== 'vip' && (
          <div className="bg-gradient-to-l from-indigo-50 to-violet-50 border-2 border-indigo-200 rounded-[2rem] p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex-1">
              <p className="text-sm font-black text-indigo-800">🎟️ יש לך קוד קופון?</p>
              <p className="text-xs text-indigo-500 mt-0.5">הזן כאן לפעל מנוי מיידי</p>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <input
                className="flex-1 sm:w-44 bg-white border-2 border-indigo-200 rounded-xl px-3 py-2.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-400 text-right placeholder-slate-400"
                placeholder="הכנס קוד..."
                value={couponCode}
                onChange={e => { setCouponCode(e.target.value.toUpperCase()); setCouponMsg(null); }}
                onKeyDown={e => e.key === 'Enter' && handleApplyCoupon()}
              />
              <button
                onClick={handleApplyCoupon}
                className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-black text-sm hover:bg-indigo-700 transition-all active:scale-95 whitespace-nowrap"
              >
                החל
              </button>
            </div>
            {couponMsg && (
              <p className={`text-xs font-bold w-full sm:w-auto ${couponMsg.ok ? 'text-green-600' : 'text-red-500'}`}>
                {couponMsg.text}
              </p>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Left column */}
          <div className="lg:col-span-8 space-y-6">
            <MagicLinkCard
              magicLink={magicLink}
              onCopy={handleCopy}
              copied={copied}
              onWhatsApp={handleWhatsApp}
            />

            <NotificationsCard
              notifications={notifications}
              events={events}
              onRefresh={() => child && fetchEvents(child.magic_token)}
            />

            {/* Parent Push Settings */}
            {user && child && (
              <PushSettingsCard
                childToken={child.magic_token}
                parentToken={user.id}
                childName={child.name}
              />
            )}

            {/* PWA Install */}
            <div className="bg-white rounded-[2rem] p-5 border border-slate-100 shadow-sm">
              <button
                onClick={() => setShowInstallPrompt(true)}
                className="w-full flex items-center justify-center gap-2 text-sm font-black text-violet-600 hover:text-violet-800 bg-violet-50 hover:bg-violet-100 px-4 py-3.5 rounded-2xl border border-violet-100 transition-colors active:scale-95"
              >
                📲 צור אייקון במסך הבית
              </button>
              <p className="text-xs text-slate-400 text-center mt-2">גישה מהירה ללוח הבקרה מהמסך הראשי</p>
            </div>

            {events.length > 0 && (
              <Suspense fallback={<div className="h-64 bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 animate-pulse" />}>
                <SkillRadarCard radarData={radarData} />
              </Suspense>
            )}

            <GoalsSection
              goals={goals}
              onAdd={openGoalModal}
              onDelete={handleDeleteGoal}
            />
          </div>

          {/* Right sidebar */}
          <div className="lg:col-span-4 space-y-5">
            <div className={`rounded-2xl px-4 py-2 text-xs font-black flex items-center justify-between ${
              subStatus.isVIP ? 'bg-amber-100 text-amber-800' :
              subStatus.isActive ? 'bg-emerald-100 text-emerald-800' :
              subStatus.isTrial ? 'bg-indigo-100 text-indigo-800' :
              'bg-rose-100 text-rose-800'
            }`}>
              <span>סטטוס מנוי</span>
              <span>{subStatus.label}</span>
            </div>
            {subStatus.showUpgradeNudge && <UpgradeNudge onPricing={() => setView('pricing')} />}

            <TrialCard
              profile={profile}
              trialDaysLeft={trialDaysLeft}
              planTotalDays={planTotalDays}
              onPricing={() => setView('pricing')}
            />

            {/* Privacy & data controls */}
            <div className="bg-white rounded-[2rem] p-5 border border-slate-100 shadow-sm space-y-2">
              <h4 className="font-black text-[10px] text-slate-500 uppercase tracking-widest mb-2">פרטיות ונתונים</h4>
              <div className="flex flex-wrap gap-2">
                <a href="/privacy" target="_blank" rel="noreferrer" className="text-[11px] text-indigo-600 hover:underline font-bold">מדיניות פרטיות</a>
                <span className="text-slate-300">·</span>
                <a href="/terms" target="_blank" rel="noreferrer" className="text-[11px] text-indigo-600 hover:underline font-bold">תנאי שימוש</a>
              </div>
              {child?.id && (
                <button
                  onClick={handleDeleteChildData}
                  className="w-full mt-2 text-[11px] font-bold text-red-600 hover:text-white hover:bg-red-600 border border-red-200 rounded-xl py-2 transition-colors"
                >
                  🗑️ מחק את חשבון הילד וכל הנתונים
                </button>
              )}
            </div>

            {/* Pedagogical insight */}
            <div className="bg-indigo-50 p-5 rounded-[2rem] border border-indigo-100">
              <h4 className="font-black text-[10px] text-indigo-600 uppercase tracking-widest mb-2 flex items-center gap-2">
                <Info size={13} /> תובנה פדגוגית
              </h4>
              <p className="text-xs text-indigo-900/70 leading-relaxed italic">
                {events.length === 0
                  ? 'ברגע שהילד יתחיל לשחק, תקבלו כאן תובנות אישיות על ההתקדמות שלו.'
                  : `זיהינו ${events.filter(e => e.success).length} הצלחות מתוך ${events.length} ניסיונות. ${
                      events.filter(e => e.success).length / events.length >= 0.7
                        ? 'הילד מתקדם מצוין! שמרו על הקצב.'
                        : 'מומלץ להתמקד בשלבים הבסיסיים לפני המעבר לרמות גבוהות.'
                    }`
                }
              </p>
            </div>
          </div>
        </div>
      </div>

      {showInstallPrompt && (
        <InstallPrompt forceShow onClose={() => setShowInstallPrompt(false)} />
      )}

      <GoalModal
        open={showGoalModal}
        form={goalForm}
        onChange={(field, value) => setGoalForm(f => ({ ...f, [field]: value }))}
        onSubmit={handleAddGoal}
        onClose={closeGoalModal}
        saving={goalSaving}
        error={goalError}
      />
    </div>
  );
}
