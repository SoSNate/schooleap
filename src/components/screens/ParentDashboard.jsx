import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar,
  ResponsiveContainer, Tooltip,
} from 'recharts';
import {
  LayoutDashboard, Trophy, Brain, Gift, Plus, Check,
  Rocket, ShieldCheck, Clock, Sparkles, ChevronLeft,
  GraduationCap, Info, Share2, Mail, CreditCard, Trash2,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

// ─── Config ─────────────────────────────────────────────────────────────────

const APP_URL      = 'https://schooleap.vercel.app';
const MORNING_URL  = 'https://mrng.to/BSq146MiEt';

const PLANS = [
  {
    id: '1m',
    title: 'מנוי חודשי',
    price: 100,
    period: 'חודש אחד',
    desc: 'תרגול ממוקד לריענון נושאים ספציפיים.',
    features: [
      'גישה מלאה לכל השלבים והמשחקים',
      'דוח התקדמות בדשבורד ההורים',
      'תמיכה במייל',
    ],
  },
  {
    id: '3m',
    title: 'גשר הקיץ',
    price: 200,
    period: '3 חודשים',
    desc: 'המסלול האופטימלי להכנה מלאה לחטיבת הביניים.',
    features: [
      'כל יכולות המנוי החודשי',
      'זיהוי קשיים מתקדם — AI מנתח דפוסי שגיאות',
      'התראות חכמות על נושאים שדורשים תשומת לב',
    ],
    popular: true,
  },
  {
    id: '6m',
    title: 'מנוי סמסטריאלי',
    price: 500,
    period: 'חצי שנה',
    desc: 'ליווי פדגוגי אישי לאורך כל תקופת המעבר.',
    features: [
      'כל יכולות גשר הקיץ',
      'שיחות ייעוץ אישיות עם המורה',
      'הערכה פדגוגית חצי שנתית כתובה',
      'גישת המורה לדוח המלא של הילד',
    ],
  },
  {
    id: '12m',
    title: 'מנוי שנתי VIP',
    price: 800,
    period: 'שנה שלמה',
    desc: 'השקעה אסטרטגית בשליטה מתמטית לאורך כל השנה.',
    features: [
      'כל התכונות פתוחות לתמיד',
      'ליווי אישי שוטף עם המורה',
      'הערכות רבעוניות + דוחות מפורטים',
      'עדכונים עתידיים ותכנים חדשים חינם',
    ],
  },
];

const GAME_LABELS = {
  equations:     'כאן בונים בכיף',
  balance:       'שומרים על איזון',
  tank:          'חצי הכוס המלאה',
  decimal:       'תפוס את הנקודה',
  fractionLab:   'מעבדת השברים',
  magicPatterns: 'תבניות הקסם',
  grid:          'מעבדת השטחים',
  word:          'שאלות מילוליות',
  multChamp:     'אלוף הכפל',
};

const SKILL_MAP = {
  equations:     'אריתמטיקה',
  balance:       'לוגיקה',
  tank:          'שברים',
  decimal:       'עשרוניים',
  fractionLab:   'שברים',
  magicPatterns: 'לוגיקה',
  grid:          'שטחים',
  word:          'הבנת הנקרא',
  multChamp:     'כפל/חילוק',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('he-IL', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

function buildRadarData(events) {
  const skillTotals = {};
  const skillCounts = {};
  events.forEach(e => {
    const skill = SKILL_MAP[e.game_name];
    if (!skill) return;
    if (!skillTotals[skill]) { skillTotals[skill] = 0; skillCounts[skill] = 0; }
    skillTotals[skill] += e.success ? 100 : 30;
    skillCounts[skill]++;
  });
  const skills = ['אריתמטיקה', 'לוגיקה', 'שברים', 'עשרוניים', 'כפל/חילוק', 'שטחים', 'הבנת הנקרא'];
  return skills.map(s => ({
    subject: s,
    value: skillCounts[s] ? Math.round(skillTotals[s] / skillCounts[s]) : 20,
  }));
}

function buildNotifications(events) {
  if (!events || events.length === 0) return [];
  const notes = [];
  const last = events[0];
  const gameLabel = GAME_LABELS[last.game_name] || last.game_name;
  notes.push({
    id: 'last',
    icon: '🕹️',
    text: `פעילות אחרונה: ${gameLabel} רמה ${last.level} — ${last.success ? '✅ הצליח' : '❌ נכשל'}`,
    time: formatDate(last.created_at),
    color: last.success ? 'text-green-700 bg-green-50' : 'text-red-700 bg-red-50',
  });
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const thisWeek = events.filter(e => new Date(e.created_at) > weekAgo);
  if (thisWeek.length > 0) {
    const wins = thisWeek.filter(e => e.success).length;
    notes.push({
      id: 'week',
      icon: '📊',
      text: `השבוע: ${thisWeek.length} משחקים, ${wins} הצלחות (${Math.round(wins / thisWeek.length * 100)}%)`,
      time: '',
      color: 'text-indigo-700 bg-indigo-50',
    });
  }
  const threeDaysAgo = Date.now() - 3 * 24 * 60 * 60 * 1000;
  if (new Date(last.created_at) < threeDaysAgo) {
    notes.push({
      id: 'inactive',
      icon: '💤',
      text: 'הילד לא שיחק ב-3 הימים האחרונים. שלח לו שוב את הקישור!',
      time: '',
      color: 'text-amber-700 bg-amber-50',
    });
  }
  const maxLevel = Math.max(...events.map(e => e.level));
  if (maxLevel >= 3) {
    notes.push({
      id: 'maxlvl',
      icon: '🏆',
      text: `הילד הגיע לרמה ${maxLevel}! כל הכבוד!`,
      time: '',
      color: 'text-yellow-700 bg-yellow-50',
    });
  }
  return notes;
}

// ─── Empty State ─────────────────────────────────────────────────────────────

function EmptyState({ onAdd, loading }) {
  const [name, setName] = useState('');
  const [open, setOpen] = useState(false);

  function submit(e) {
    e.preventDefault();
    onAdd(name.trim() || null);
  }

  return (
    <div
      dir="rtl"
      className="min-h-[100dvh] flex flex-col items-center justify-center relative overflow-hidden px-6"
      style={{ background: 'radial-gradient(ellipse at 50% 60%, #0f172a 0%, #020617 100%)' }}
    >
      {/* Stars */}
      <style>{`
        @keyframes twinkle2 { 0%,100%{opacity:0} 50%{opacity:.9} }
        @keyframes float2   { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
        @keyframes pulse-ring { 0%{transform:scale(1);opacity:.6} 100%{transform:scale(1.6);opacity:0} }
      `}</style>
      {Array.from({ length: 80 }, (_, i) => (
        <div key={i} className="absolute rounded-full bg-white" style={{
          top: `${Math.random() * 100}%`, left: `${Math.random() * 100}%`,
          width: Math.random() * 2 + 0.5, height: Math.random() * 2 + 0.5,
          animation: `twinkle2 ${Math.random() * 3 + 2}s ${Math.random() * 4}s ease-in-out infinite`,
        }} />
      ))}

      <div className="relative z-10 flex flex-col items-center text-center max-w-md w-full gap-8">
        {/* Rocket */}
        <div className="relative" style={{ animation: 'float2 3s ease-in-out infinite' }}>
          <div className="text-7xl">🚀</div>
          <div className="absolute inset-0 rounded-full border border-indigo-500/40"
            style={{ animation: 'pulse-ring 2s ease-out infinite' }} />
        </div>

        {/* Text */}
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/20 border border-indigo-400/30 rounded-full">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-indigo-300 text-[10px] font-black uppercase tracking-widest">Mission Control — מוכן להמראה</span>
          </div>
          <h2 className="text-3xl font-black text-white leading-tight">
            הכן אסטרונאוט למשימה
          </h2>
          <p className="text-slate-400 text-sm leading-relaxed">
            צור פרופיל לילד שלך כדי לקבל קישור קסם,<br />
            לעקוב אחר התקדמותו ולהגדיר יעדים ופרסים.
          </p>
        </div>

        {/* Add child button / form */}
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
              placeholder="שם הילד (אופציונלי)"
              value={name}
              onChange={e => setName(e.target.value)}
            />
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

        {/* Features */}
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

// ─── Component ───────────────────────────────────────────────────────────────

export default function ParentDashboard() {
  const [user, setUser]           = useState(null);
  const [child, setChild]         = useState(null);
  const [childExists, setChildExists] = useState(null); // null=unknown, false=none, true=has child
  const [events, setEvents]       = useState([]);
  const [goals, setGoals]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [addingChild, setAddingChild] = useState(false);
  const [copied, setCopied]       = useState(false);
  const [error, setError]         = useState(null);
  const [view, setView]           = useState('dashboard'); // 'dashboard' | 'pricing'
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [goalForm, setGoalForm]   = useState({ title: '', reward: '' });

  // ─── Fetch events ──────────────────────────────────────────────────────
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

  // ─── Fetch goals ───────────────────────────────────────────────────────
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

  // ─── Load child (without auto-creating) ───────────────────────────────
  const loadChild = useCallback(async (u) => {
    try {
      const { data, error: err } = await supabase
        .from('children')
        .select('*')
        .eq('parent_id', u.id)
        .maybeSingle();
      if (err) throw err;

      if (!data) {
        setChildExists(false);
        setChild(null);
        return;
      }

      setChildExists(true);
      setChild(data);
      await Promise.all([
        fetchEvents(data.magic_token),
        fetchGoals(u.id),
      ]);
    } catch (e) {
      setError('שגיאה בטעינת הנתונים. נסה לרענן את הדף.');
      console.error('[ParentDashboard] loadChild:', e);
    }
  }, [fetchEvents, fetchGoals]);

  // ─── Add child (called from EmptyState) ───────────────────────────────
  async function handleAddChild(name) {
    if (!user) return;
    setAddingChild(true);
    try {
      const token = crypto.randomUUID();
      const { data, error: err } = await supabase
        .from('children')
        .insert({ parent_id: user.id, magic_token: token, name: name || null })
        .select()
        .single();
      if (err) throw err;
      setChild(data);
      setChildExists(true);
      await fetchGoals(user.id);
    } catch (e) {
      setError('שגיאה ביצירת הילד. נסה שוב.');
      console.error('[ParentDashboard] addChild:', e);
    } finally {
      setAddingChild(false);
    }
  }

  // ─── Auth listener ─────────────────────────────────────────────────────
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const u = session?.user ?? null;
        setUser(u);
        if (u) await loadChild(u);
        setLoading(false);
      }
    );
    return () => subscription.unsubscribe();
  }, [loadChild]);

  // ─── Google login ──────────────────────────────────────────────────────
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

  // ─── Copy magic link ───────────────────────────────────────────────────
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

  // ─── WhatsApp share ────────────────────────────────────────────────────
  function handleWhatsApp() {
    if (!child?.magic_token) return;
    const link = `${APP_URL}/play/${child.magic_token}`;
    const msg = encodeURIComponent(`היי! זה הקישור שלך לחשבונאוטיקה 🚀\n${link}`);
    window.open(`https://wa.me/?text=${msg}`, '_blank');
  }

  // ─── Logout ────────────────────────────────────────────────────────────
  async function handleLogout() {
    try { await supabase.auth.signOut(); }
    catch (e) { console.error('[ParentDashboard] signOut:', e); }
  }

  // ─── Add goal ──────────────────────────────────────────────────────────
  async function handleAddGoal(e) {
    e.preventDefault();
    if (!goalForm.title || !goalForm.reward || !user) return;
    try {
      const { data, error: err } = await supabase
        .from('goals')
        .insert({ parent_id: user.id, title: goalForm.title, reward: goalForm.reward })
        .select()
        .single();
      if (err) throw err;
      setGoals(prev => [...prev, data]);
      setGoalForm({ title: '', reward: '' });
      setShowGoalModal(false);
    } catch (e) {
      console.error('[ParentDashboard] addGoal:', e);
    }
  }

  // ─── Delete goal ───────────────────────────────────────────────────────
  async function handleDeleteGoal(id) {
    try {
      await supabase.from('goals').delete().eq('id', id);
      setGoals(prev => prev.filter(g => g.id !== id));
    } catch (e) {
      console.error('[ParentDashboard] deleteGoal:', e);
    }
  }

  // ─── Derived ───────────────────────────────────────────────────────────
  const magicLink     = child?.magic_token ? `${APP_URL}/play/${child.magic_token}` : null;
  const notifications = buildNotifications(events);
  const radarData     = useMemo(() => buildRadarData(events), [events]);

  // Trial check — 14 days from created_at in children table
  const trialActive = useMemo(() => {
    if (!child?.created_at) return true;
    const trialEnd = new Date(child.created_at).getTime() + 14 * 24 * 60 * 60 * 1000;
    return Date.now() < trialEnd;
  }, [child]);

  const trialDaysLeft = useMemo(() => {
    if (!child?.created_at) return 14;
    const trialEnd = new Date(child.created_at).getTime() + 14 * 24 * 60 * 60 * 1000;
    return Math.max(0, Math.ceil((trialEnd - Date.now()) / (24 * 60 * 60 * 1000)));
  }, [child]);

  // ─── Loading ───────────────────────────────────────────────────────────
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

  // ─── Not logged in ─────────────────────────────────────────────────────
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

  // ─── Paywall (trial expired) ────────────────────────────────────────────
  if (!trialActive) {
    return (
      <div dir="rtl" className="min-h-[100dvh] bg-slate-50 p-4 flex flex-col items-center justify-center gap-6">
        <div className="bg-white rounded-3xl shadow-lg p-8 max-w-sm w-full text-center space-y-4">
          <div className="text-5xl">⏰</div>
          <h2 className="text-2xl font-black text-slate-800">תקופת הניסיון הסתיימה</h2>
          <p className="text-slate-500 text-sm leading-relaxed">
            14 ימי הניסיון החינמיים הסתיימו.<br />בחרו מסלול להמשיך ליהנות מהאפליקציה.
          </p>
          <button
            onClick={() => setView('pricing')}
            className="w-full bg-indigo-600 text-white py-3 rounded-2xl font-black text-sm shadow-lg shadow-indigo-100 active:scale-95 transition-all"
          >
            צפה במסלולים
          </button>
          <button onClick={handleLogout} className="text-xs text-slate-400 hover:text-red-500">
            יציאה
          </button>
        </div>
      </div>
    );
  }

  // ─── Empty state (no child yet) ────────────────────────────────────────
  if (childExists === false) {
    return <EmptyState onAdd={handleAddChild} loading={addingChild} />;
  }

  // ─── Pricing view ──────────────────────────────────────────────────────
  if (view === 'pricing') {
    return (
      <div dir="rtl" className="min-h-[100dvh] bg-[#FDFDFF] text-slate-900">
        {/* Nav */}
        <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100 px-4 py-3">
          <div className="max-w-5xl mx-auto flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="bg-indigo-600 p-1.5 rounded-lg text-white">
                <GraduationCap size={18} />
              </div>
              <span className="font-black text-lg">חשבונאוטיקה</span>
            </div>
            <button
              onClick={() => setView('dashboard')}
              className="flex items-center gap-1 text-sm font-bold text-slate-500 hover:text-indigo-600 transition-colors"
            >
              <ChevronLeft size={16} /> חזור לדשבורד
            </button>
          </div>
        </nav>

        <div className="max-w-5xl mx-auto p-4 md:p-10">
          {/* Hero */}
          <div className="text-center max-w-2xl mx-auto mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-widest mb-5">
              <Sparkles size={12} /> הקיץ הזה הופך למקפצה
            </div>
            <h2 className="text-3xl md:text-4xl font-black mb-4 leading-tight">גשר פדגוגי לכיתה ז'</h2>
            <p className="text-slate-500 leading-relaxed text-sm">
              המעבר לחטיבה הוא צומת מרגש אך מאתגר. חשבונאוטיקה מאפשרת לילדך לרענן את כל הידע
              המתמטי שנצבר מכיתה א' ועד ו' — בדרך חווייתית, כדי להגיע לכיתה ז' בטוח ומלא ביטחון.
            </p>
          </div>

          {/* Plans grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-16">
            {PLANS.map(plan => (
              <div
                key={plan.id}
                className={`bg-white rounded-[2rem] p-6 border-2 transition-all relative overflow-hidden hover:-translate-y-1 ${
                  plan.popular ? 'border-indigo-600 shadow-xl shadow-indigo-100' : 'border-slate-100 shadow-sm'
                }`}
              >
                {plan.popular && (
                  <div className="absolute top-0 right-0 bg-indigo-600 text-white text-[9px] font-black px-4 py-1.5 rounded-bl-xl">
                    הבחירה הפופולרית
                  </div>
                )}
                <h3 className="text-lg font-black mb-1 mt-2">{plan.title}</h3>
                <p className="text-xs text-slate-400 mb-5 leading-snug">{plan.desc}</p>
                <div className="mb-5">
                  <span className="text-3xl font-black">₪{plan.price}</span>
                  <span className="text-slate-400 text-xs mr-1">/ {plan.period}</span>
                </div>
                <ul className="space-y-3 mb-6">
                  {plan.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs font-bold text-slate-600 leading-snug">
                      <div className="p-0.5 bg-green-100 text-green-600 rounded-full shrink-0 mt-0.5">
                        <Check size={10} />
                      </div>
                      {f}
                    </li>
                  ))}
                </ul>
                <a
                  href={MORNING_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`block w-full py-3 rounded-xl font-black text-center text-sm transition-all active:scale-95 ${
                    plan.popular
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100'
                      : 'bg-slate-900 text-white'
                  }`}
                >
                  בחר במסלול זה
                </a>
              </div>
            ))}
          </div>

          {/* Why us */}
          <div className="bg-slate-900 rounded-[2.5rem] p-8 md:p-10 text-white relative overflow-hidden">
            <div className="absolute right-0 bottom-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl translate-x-24 translate-y-24" />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center relative z-10">
              <div>
                <h3 className="text-2xl font-black mb-6">למה הורים בוחרים בנו?</h3>
                <div className="space-y-5">
                  <Reason icon={<Rocket />} title="סגירת פערי יסודי" text="עוברים על כל הנושאים הקריטיים מכיתה א' ועד ו' ומוודאים שאין חורים לפני המעבר לחטיבה." />
                  <Reason icon={<Brain />} title="שיפור שטף חשיבה" text="המערכת עובדת על אוטומציה של פתרון בעיות, מה שמאפשר לילד להתפנות לנושאים המורכבים בחטיבה." />
                  <Reason icon={<ShieldCheck />} title="שקט נפשי להורה" text="דוחות מפורטים בזמן אמת — תדעו בדיוק איפה הילד עומד ואיך הוא מתקדם." />
                </div>
              </div>
              <div className="bg-white/5 backdrop-blur-md rounded-[2rem] p-7 border border-white/10 text-center">
                <div className="w-16 h-16 bg-indigo-500/20 rounded-full flex items-center justify-center mx-auto mb-5 text-indigo-400">
                  <Clock size={32} />
                </div>
                <h4 className="text-xl font-black mb-3">10 דקות ביום</h4>
                <p className="text-indigo-100/70 text-sm leading-relaxed mb-6">
                  זה כל מה שצריך. תרגול קצר, ממוקד וחווייתי בכל יום בחופש הגדול יוצר
                  שינוי אדיר בביטחון העצמי של הילד מול המספרים.
                </p>
                <button
                  onClick={() => setView('dashboard')}
                  className="bg-white text-slate-900 px-6 py-3 rounded-xl font-black text-sm hover:bg-indigo-50 transition-all"
                >
                  חזור לדשבורד
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Dashboard view ────────────────────────────────────────────────────
  return (
    <div dir="rtl" className="min-h-[100dvh] bg-[#FDFDFF] text-slate-900">

      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100 px-4 py-3">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-1.5 rounded-lg text-white">
              <GraduationCap size={18} />
            </div>
            <span className="font-black text-lg">חשבונאוטיקה</span>
          </div>
          <div className="flex items-center gap-3">
            {trialDaysLeft > 0 && (
              <span className="text-xs font-bold text-amber-600 bg-amber-50 px-3 py-1 rounded-full border border-amber-100">
                {trialDaysLeft} ימים נותרו בניסיון
              </span>
            )}
            <button
              onClick={() => setView('pricing')}
              className="bg-indigo-600 text-white px-4 py-1.5 rounded-xl font-bold text-xs shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all"
            >
              שדרג
            </button>
            <button
              onClick={handleLogout}
              className="text-xs text-slate-400 hover:text-red-500 transition-colors"
            >
              יציאה
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-8 pb-16">

        {/* Greeting */}
        <div>
          <h2 className="text-2xl font-black tracking-tight mb-1">
            שלום, <span className="text-indigo-600">{user.email?.split('@')[0]}</span>
          </h2>
          <p className="text-slate-400 text-sm">
            {child?.name ? `הנה תמונת המצב של ${child.name}` : 'הנה תמונת המצב של הילד שלך'}
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
            <p className="text-red-600 text-sm break-all">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Left column */}
          <div className="lg:col-span-8 space-y-6">

            {/* Magic link card */}
            <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm space-y-3">
              <p className="text-sm font-black text-slate-700">🔗 קישור קסם לילד</p>
              {magicLink ? (
                <>
                  <p className="text-xs text-slate-400 break-all font-mono bg-slate-50 rounded-xl px-3 py-2 border border-slate-100 select-all">
                    {magicLink}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleCopy}
                      className={`flex-1 py-2.5 rounded-xl font-black text-white text-sm transition-all active:scale-95 ${
                        copied ? 'bg-green-500' : 'bg-indigo-500 hover:bg-indigo-600'
                      }`}
                    >
                      {copied ? '✅ הועתק!' : '📋 העתק קישור'}
                    </button>
                    <button
                      onClick={handleWhatsApp}
                      className="flex items-center gap-1.5 bg-green-500 hover:bg-green-600 text-white px-4 py-2.5 rounded-xl font-black text-sm transition-all active:scale-95"
                    >
                      <Share2 size={14} /> וואטסאפ
                    </button>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    שלח את הקישור לילד דרך וואטסאפ — הוא יכנס ישירות למשחקים ללא סיסמה.
                  </p>
                </>
              ) : (
                <p className="text-xs text-slate-400 animate-pulse">יוצר קישור...</p>
              )}
            </div>

            {/* Notifications */}
            <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-black text-slate-700">🔔 עדכונים ופעילות</p>
                <button
                  onClick={() => child && fetchEvents(child.magic_token)}
                  className="text-xs text-indigo-500 hover:text-indigo-700 font-bold"
                >
                  רענן
                </button>
              </div>
              {notifications.length === 0 ? (
                <div className="text-center py-6 space-y-2">
                  <p className="text-3xl">🎮</p>
                  <p className="text-sm text-slate-400">עדיין אין פעילות.<br />שלח את הקישור לילד שיתחיל לשחק!</p>
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
                      <div key={e.id} className="flex items-center justify-between text-xs text-slate-500 bg-slate-50 rounded-xl px-3 py-1.5">
                        <span>{e.success ? '✅' : '❌'} {GAME_LABELS[e.game_name] || e.game_name} רמה {e.level}</span>
                        <span className="text-slate-400 text-[10px]">{formatDate(e.created_at)}</span>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>

            {/* Radar chart */}
            {events.length > 0 && (
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
            )}

            {/* Goals / rewards */}
            <div className="space-y-3">
              <h3 className="text-sm font-black text-slate-700 flex items-center gap-2 px-1">
                <Trophy className="text-amber-500" size={16} /> הסכם הפרסים
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {goals.map(g => (
                  <div key={g.id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm relative group">
                    <button
                      onClick={() => handleDeleteGoal(g.id)}
                      className="absolute top-3 left-3 opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-400 transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                    <h4 className="font-bold text-sm mb-1">{g.title}</h4>
                    <p className="text-xs text-pink-600 font-bold flex items-center gap-1.5">
                      <Gift size={12} /> {g.reward}
                    </p>
                  </div>
                ))}
                <button
                  onClick={() => setShowGoalModal(true)}
                  className="border-2 border-dashed border-slate-200 rounded-2xl p-5 text-slate-400 hover:border-indigo-400 hover:text-indigo-500 transition-all flex flex-col items-center justify-center gap-2 min-h-[80px]"
                >
                  <Plus size={20} />
                  <span className="font-bold text-xs">הוסף הסכם חדש</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right sidebar */}
          <div className="lg:col-span-4 space-y-5">

            {/* Upgrade nudge */}
            <div
              onClick={() => setView('pricing')}
              className="bg-gradient-to-br from-indigo-600 to-indigo-800 p-6 rounded-[2rem] text-white shadow-xl relative overflow-hidden cursor-pointer hover:-translate-y-0.5 transition-all"
            >
              <Sparkles className="absolute -right-2 -top-2 w-14 h-14 opacity-10" />
              <h3 className="text-lg font-black mb-1">שדרגו ל-PRO</h3>
              <p className="text-indigo-100 text-xs mb-4 leading-relaxed">
                פתחו את כל יכולות "גשר הקיץ" והכינו את הילד לחטיבה בצורה מקצועית.
              </p>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest">צפה בתפריט</span>
                <ChevronLeft size={18} />
              </div>
            </div>

            {/* Trial status */}
            <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm space-y-3">
              <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest">סטטוס ניסיון</h4>
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-slate-700">ימים שנותרו</span>
                <span className={`text-lg font-black ${trialDaysLeft <= 3 ? 'text-red-500' : 'text-indigo-600'}`}>
                  {trialDaysLeft}
                </span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${trialDaysLeft <= 3 ? 'bg-red-400' : 'bg-indigo-500'}`}
                  style={{ width: `${(trialDaysLeft / 14) * 100}%` }}
                />
              </div>
              <button
                onClick={() => setView('pricing')}
                className="w-full py-2.5 bg-indigo-50 text-indigo-600 rounded-xl font-black text-xs hover:bg-indigo-100 transition-all"
              >
                <CreditCard size={12} className="inline ml-1" />
                בחר מסלול
              </button>
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

      {/* Goal modal */}
      {showGoalModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-[2rem] p-8 w-full max-w-sm shadow-2xl">
            <h3 className="text-xl font-black mb-5">יצירת הסכם פרס</h3>
            <form onSubmit={handleAddGoal} className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 block mb-1 uppercase tracking-widest">מה היעד?</label>
                <input
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  placeholder="סיים 10 משחקים ברמה 3"
                  value={goalForm.title}
                  onChange={e => setGoalForm(f => ({ ...f, title: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 block mb-1 uppercase tracking-widest">מה הפרס?</label>
                <input
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  placeholder="גלידה בערב 🍦"
                  value={goalForm.reward}
                  onChange={e => setGoalForm(f => ({ ...f, reward: e.target.value }))}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-black text-sm shadow-lg shadow-indigo-100 active:scale-95 transition-all"
                >
                  אשר חוזה
                </button>
                <button
                  type="button"
                  onClick={() => { setShowGoalModal(false); setGoalForm({ title: '', reward: '' }); }}
                  className="px-5 py-3 text-slate-400 font-bold text-sm hover:text-slate-600"
                >
                  ביטול
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sub-component ────────────────────────────────────────────────────────────

function Reason({ icon, title, text }) {
  return (
    <div className="flex gap-3 group">
      <div className="bg-white/10 p-2.5 rounded-xl text-indigo-400 h-fit group-hover:bg-indigo-500 group-hover:text-white transition-all">
        {icon}
      </div>
      <div>
        <h5 className="font-bold text-sm mb-0.5">{title}</h5>
        <p className="text-indigo-100/60 text-xs leading-relaxed">{text}</p>
      </div>
    </div>
  );
}
