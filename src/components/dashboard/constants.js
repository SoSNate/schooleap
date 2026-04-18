// ─── Shared constants and helpers for ParentDashboard sub-components ──────────

export const APP_URL = 'https://schooleap.vercel.app';

export const PLAN_URLS = {
  '1m':  'https://mrng.to/5MeNM9EHv5',
  '3m':  'https://mrng.to/JbLqveBkPU',
  'vip': 'https://wa.me/972535303607?text=' +
         encodeURIComponent('שלום, אני מעוניין בפרטים על מסלול ה-VIP של חשבונאוטיקה'),
};

export const PLANS = [
  {
    id: '1m',
    title: 'מנוי חודשי',
    price: 100,
    period: 'חודש אחד',
    type: 'payment',
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
    type: 'payment',
    popular: true,
    desc: 'המסלול האופטימלי להכנה מלאה לחטיבת הביניים.',
    features: [
      'כל יכולות המנוי החודשי',
      'זיהוי קשיים — AI מנתח דפוסי שגיאות',
      'התראות חכמות על נושאים שדורשים תשומת לב',
    ],
  },
  {
    id: 'vip',
    title: 'VIP — מורה פרטי',
    price: 1500,
    period: 'חבילה אחת',
    type: 'contact',
    desc: '10 שיעורים אישיים של שעה + בניית מערכת למידה ייעודית לילד.',
    features: [
      '10 מפגשים בני שעה עם המורה (וידאו/פגישה)',
      'בניית תכנית למידה אישית לילד',
      'גישה מלאה לחשבונאוטיקה לכל תקופת החבילה',
      'הערכה פדגוגית כתובה + מעקב רציף',
    ],
  },
];

export const GAME_LABELS = {
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

export const SKILL_MAP = {
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

export function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('he-IL', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

export function buildRadarData(events) {
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

export function buildNotifications(events) {
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
