import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getWeekId, emptyWeek, getGameShort } from '../utils/math';
import { supabase } from '../lib/supabase';

const CHILD_TOKEN_KEY = 'hasbaonautica_child_token';

// maxSteps per game (used for migration lvl→step and RankBadge calculation)
export const STEP_CONFIG = {
  balance:      9,
  fractionLab:  8,
  tank:         7,
  decimal:      7,
  equations:    7,
  percentages:  7,
  magicPatterns:9,
  grid:         6,
  word:         10,
  multChamp:    9,  // arcade: effectiveStep 1-9
};

// Returns the RankBadge tier for a given step in a game
export function getRankTier(game, step) {
  const n = STEP_CONFIG[game] || 5;
  if (step <= Math.floor(n / 3))      return 'green';
  if (step <= Math.floor((2 * n) / 3)) return 'yellow';
  return 'red';
}

const useGameStore = create(
  persist(
    (set, get) => ({
      // Global
      totalStars: 0,
      isAnimating: false,
      darkMode: false,
      currentScreen: 'menu',

      // Subscription — NOT persisted (rechecked fresh on each child session)
      subscription: {
        status: null,      // 'trial'|'active'|'vip'|'expired'|'canceled'|null
        expiresAt: null,   // ISO string or null
        checked: false,    // true once the RPC has returned
        blocked: false,    // true if the child should see the paywall
      },

      // Assignments — משימות פתוחות של התלמיד. Assignment Wall ב-Menu קורא מכאן.
      // לא persisted — נטען מחדש בכל ChildEntry.
      assignments: [],

      // Per-game state
      // step = current step in the learning path (1-N per game, per STEP_CONFIG)
      // lvl = legacy field kept for backward-compat with old DB events (= rough equiv to step/2)
      // recentResults = rolling window of last 5 rounds (true=win, false=fail)
      equations:    { stars: 0, step: 1, lvl: 1, count: 0, consecutiveWins: 0, recentResults: [] },
      balance:      { stars: 0, step: 1, lvl: 1, count: 0, consecutiveWins: 0, recentResults: [] },
      tank:         { stars: 0, step: 1, lvl: 1, count: 0, consecutiveWins: 0, recentResults: [] },
      decimal:      { stars: 0, step: 1, lvl: 1, count: 0, consecutiveWins: 0, recentResults: [] },
      fractionLab:  { stars: 0, step: 1, lvl: 1, count: 0, consecutiveWins: 0, recentResults: [] },
      magicPatterns:{ stars: 0, step: 1, lvl: 1, count: 0, consecutiveWins: 0, recentResults: [] },
      grid:         { stars: 0, step: 1, lvl: 1, count: 0, consecutiveWins: 0, recentResults: [] },
      word:         { stars: 0, step: 1, lvl: 1, count: 0, consecutiveWins: 0, recentResults: [] },
      multChamp:    { stars: 0, step: 1, lvl: 1, count: 0, consecutiveWins: 0, recentResults: [] },
      percentages:  { stars: 0, step: 1, lvl: 1, count: 0, consecutiveWins: 0, recentResults: [] },

      // Locks
      locks: { equations: 0, balance: 0, tank: 0, decimal: 0, fractionLab: 0, magicPatterns: 0, grid: 0, word: 0, multChamp: 0, percentages: 0 },

      // Practice levels — child-chosen drill level per game (0 = off, 1-5 = practicing that level).
      // Not a restriction; child picks this themselves. Real lvl is unaffected.
      practiceLevels: { equations: 0, balance: 0, tank: 0, decimal: 0, fractionLab: 0, magicPatterns: 0, grid: 0, word: 0, multChamp: 0, percentages: 0 },

      // Practice streak tracking — how many consecutive sessions a child practiced below their real level.
      // Used to alert parent/teacher.
      practiceAlerts: {},

      // Weekly stats
      weeklyStats: emptyWeek(),

      // === Actions ===

      setScreen: (screen) => set({ currentScreen: screen }),

      // ─── Subscription actions ────────────────────────────────────────────
      setSubscription: ({ status, expiresAt }) => {
        const expired = expiresAt ? new Date(expiresAt) < new Date() : false;
        const blocked =
          status === 'expired'  ||
          status === 'canceled' ||
          (status === 'trial' && expired);
        set({ subscription: { status, expiresAt, checked: true, blocked } });
      },

      clearSubscription: () => set({
        subscription: { status: null, expiresAt: null, checked: false, blocked: false },
      }),

      setAssignments: (arr) => set({ assignments: Array.isArray(arr) ? arr : [] }),

      toggleDarkMode: () => {
        const next = !get().darkMode;
        document.documentElement.classList.toggle('dark', next);
        set({ darkMode: next });
      },

      initDarkMode: () => {
        if (get().darkMode) {
          document.documentElement.classList.add('dark');
        }
      },

      updateGameField: (game, updates) => set((s) => ({
        [game]: { ...s[game], ...updates }
      })),

      // ─── Load progress from DB events (called by ChildEntry) ───────────
      loadProgress: (events) => {
        const GAMES = ['equations','balance','tank','decimal','fractionLab','magicPatterns','grid','word','multChamp','percentages'];
        const updates = {};
        let totalStars = 0;

        for (const game of GAMES) {
          const ge = events.filter((e) => e.game_name === game);
          if (ge.length === 0) continue;
          const maxLvl  = Math.min(Math.max(...ge.map((e) => e.level)), 5);
          const stars   = ge.reduce((acc, e) => acc + (e.success ? e.level + 1 : 0), 0);
          totalStars   += stars;
          updates[game] = { stars, lvl: maxLvl, count: 0, consecutiveWins: 0, recentResults: [] };
        }

        if (Object.keys(updates).length > 0) {
          set({ ...updates, totalStars });
        }
      },

      handleWin: (game) => {
        const s = get();
        if (s.isAnimating) return { isLevelUp: false, unlocked: false, pts: 0 };

        // In practice mode: award stars for the practice step, but don't advance real step
        const practiceLevel = s.practiceLevels[game] || 0;
        const effectiveStep = practiceLevel || s[game].step || s[game].lvl;
        const maxSteps = STEP_CONFIG[game] || 5;

        const pts = effectiveStep + 1;
        const newStars = s[game].stars + pts;
        const newTotalStars = s.totalStars + pts;
        let newCount = s[game].count;
        let newStep = s[game].step || s[game].lvl;
        let newLvl = s[game].lvl;
        let isLevelUp = false;
        let unlocked = false;
        let isCapped = false;
        let newConsecutiveWins = s[game].consecutiveWins;

        // ── Practice mode: stars only, no progression changes ──────────────
        if (practiceLevel > 0) {
          const today = new Date().getDay();
          const shortGame = getGameShort(game);
          const newWeekly = { ...s.weeklyStats };
          if (newWeekly.weekId !== getWeekId()) Object.assign(newWeekly, emptyWeek());
          newWeekly.days = newWeekly.days.map((d, i) =>
            i !== today ? d : { pts: d.pts + pts, games: { ...d.games, [shortGame]: (d.games[shortGame] || 0) + pts } }
          );
          set({ isAnimating: true, totalStars: newTotalStars, [game]: { ...s[game], stars: newStars }, weeklyStats: newWeekly });
          get().reportGameEvent(game, practiceLevel, true);
          if (typeof window !== 'undefined') {
            if (window.__animGuardId) clearTimeout(window.__animGuardId);
            window.__animGuardId = setTimeout(() => { if (get().isAnimating) set({ isAnimating: false }); }, 3000);
          }
          return { isStepUp: false, isLevelUp: false, unlocked: false, pts, isPractice: true };
        }

        // Update weekly stats
        const today = new Date().getDay();
        const shortGame = getGameShort(game);
        const newWeekly = { ...s.weeklyStats };
        if (newWeekly.weekId !== getWeekId()) {
          Object.assign(newWeekly, emptyWeek());
        }
        newWeekly.days = newWeekly.days.map((d, i) => {
          if (i !== today) return d;
          return {
            pts: d.pts + pts,
            games: { ...d.games, [shortGame]: (d.games[shortGame] || 0) + pts }
          };
        });

        if (s.locks[game] > 0) {
          // Locked mode: count consecutive wins toward unlock
          newConsecutiveWins++;
          if (newConsecutiveWins >= 5) {
            unlocked = true;
            const candidateLvl = Math.min(newLvl + 1, 5);
            isLevelUp = candidateLvl > newLvl;
            newLvl = candidateLvl;
            newCount = 0;
            newConsecutiveWins = 0;
            set({
              isAnimating: true,
              totalStars: newTotalStars,
              locks: { ...s.locks, [game]: 0 },
              [game]: { ...s[game], stars: newStars, lvl: newLvl, count: newCount, consecutiveWins: 0 },
              weeklyStats: newWeekly,
            });
          } else {
            set({
              isAnimating: true,
              totalStars: newTotalStars,
              [game]: { ...s[game], stars: newStars, consecutiveWins: newConsecutiveWins },
              weeklyStats: newWeekly,
            });
          }
        } else {
          // Normal mode: level-up when ("3 ברצף") OR ("4 מתוך 5 אחרונים").
          // Fast-track: multChamp עולה בכל ניצחון.
          // equations ברמות 3-4: עולה אחרי 2 ניצחונות ברצף ללא כישלון.
          const eqFastTrack = game === 'equations' && (newLvl === 3 || newLvl === 4);
          const fastTrack = game === 'multChamp';
          const prevRecent = Array.isArray(s[game].recentResults) ? s[game].recentResults : [];
          const recent = [...prevRecent, true].slice(-5);

          // Assignment sub-level cap: אם הילד ברמה >= assignment.target_level, לא מעלים רמה.
          const assignmentCap = (s.assignments || []).find(a => a.game_name === game)?.target_level;
          const capped = (typeof assignmentCap === 'number') && newLvl >= assignmentCap;

          const last3 = recent.slice(-3);
          const threeInARow = last3.length === 3 && last3.every(Boolean);
          const fourOfFive  = recent.length === 5 && recent.filter(Boolean).length >= 4;
          // equations L3-4: 2 ניצחונות ברצף (ללא כישלון באמצע) = עלייה
          const last2 = recent.slice(-2);
          const twoInARow = eqFastTrack && last2.length === 2 && last2.every(Boolean);
          const shouldLevelUp = fastTrack || twoInARow || threeInARow || fourOfFive;

          newCount = s[game].count + 1;
          let newRecent = recent;
          if (shouldLevelUp && newLvl < 5 && !capped) {
            newLvl++;
            newCount = 0;
            isLevelUp = true;
            newRecent = []; // reset window on level-up
          } else if (shouldLevelUp && capped) {
            isCapped = true; // would level up but assignment cap prevents it
          }
          set({
            isAnimating: true,
            totalStars: newTotalStars,
            [game]: { ...s[game], stars: newStars, lvl: newLvl, count: newCount, consecutiveWins: 0, recentResults: newRecent },
            weeklyStats: newWeekly,
          });
        }

        // שלח אירוע ל-Supabase אוטומטית
        get().reportGameEvent(game, get()[game].lvl, true);

        // Safety: if FeedbackOverlay unmounts without firing finishAnimation
        // (e.g. parent navigates away mid-animation), clear the flag after 3s
        // so the game isn't stuck in a frozen isAnimating=true state.
        if (typeof window !== 'undefined') {
          if (window.__animGuardId) clearTimeout(window.__animGuardId);
          window.__animGuardId = setTimeout(() => {
            if (get().isAnimating) set({ isAnimating: false });
          }, 3000);
        }

        return { isLevelUp, unlocked, pts, isCapped };
      },

      finishAnimation: () => {
        if (typeof window !== 'undefined' && window.__animGuardId) {
          clearTimeout(window.__animGuardId);
          window.__animGuardId = null;
        }
        set({ isAnimating: false });
      },

      reportGameEvent: async (game, level, success) => {
        const token = localStorage.getItem(CHILD_TOKEN_KEY);
        if (!token) return;
        const s = get();
        const practiceLevel = s.practiceLevels[game] || 0;
        try {
          await supabase.from('game_events').insert({
            child_token: token,
            game_name: game,
            level,
            success,
            ...(practiceLevel > 0 ? { practice_level: practiceLevel } : {}),
          });
          // הטריגר ב-DB סוגר assignments שעמדו ביעד. רענן את הרשימה בלקוח,
          // וסמן את היום כהושלם אם נסגרה משימה — Menu יפתח את שאר המשחקים.
          if (success) {
            const previousCount = get().assignments.length;
            const { data } = await supabase.rpc('get_child_assignments', { p_token: token });
            const nextAssignments = data || [];
            set({ assignments: nextAssignments });
            if (previousCount > 0 && nextAssignments.length < previousCount) {
              try {
                localStorage.setItem('assignment_done_date', new Date().toDateString());
              } catch { /* storage blocked */ }
            }
          }
        } catch (e) {
          console.error('[reportGameEvent]', e);
        }
      },

      handleGameFail: (game) => {
        const s = get();
        const practiceLevel = s.practiceLevels[game] || 0;
        const prevRecent = Array.isArray(s[game].recentResults) ? s[game].recentResults : [];
        const recent = [...prevRecent, false].slice(-5);

        if (practiceLevel > 0) {
          // Practice mode — no lock. Just record fail and track alert if child drills below real level.
          set({ [game]: { ...s[game], count: 0, consecutiveWins: 0, recentResults: recent } });
          get().reportGameEvent(game, practiceLevel, false);

          // Track how many times child practiced below their real level (for parent alert)
          if (practiceLevel < s[game].lvl) {
            const key = game;
            const prev = s.practiceAlerts[key] || 0;
            set({ practiceAlerts: { ...s.practiceAlerts, [key]: prev + 1 } });
          }
          return 'practice';
        }

        // Normal mode — lock as before
        set({
          locks: { ...s.locks, [game]: s[game].lvl },
          [game]: { ...s[game], count: 0, consecutiveWins: 0, recentResults: recent }
        });
        // שלח אירוע כישלון ל-Supabase
        get().reportGameEvent(game, s[game].lvl, false);
        return 'locked';
      },

      // handleLightFail — למשחקים ללא lives (ניסוי-וטעייה):
      // רושם כישלון ב-recentResults בלי להפעיל lock.
      handleLightFail: (game) => {
        const s = get();
        const prevRecent = Array.isArray(s[game].recentResults) ? s[game].recentResults : [];
        const recent = [...prevRecent, false].slice(-5);
        set({
          [game]: { ...s[game], recentResults: recent }
        });
        get().reportGameEvent(game, s[game].lvl, false);
      },

      // setPracticeLevel — child picks a drill level (0 = exit practice mode)
      setPracticeLevel: (game, lvl) => {
        const s = get();
        const newLevels = { ...s.practiceLevels, [game]: lvl };
        set({ practiceLevels: newLevels });
        // Reset alert counter when child exits practice mode or switches level
        if (lvl === 0) {
          const newAlerts = { ...s.practiceAlerts };
          delete newAlerts[game];
          set({ practiceAlerts: newAlerts });
        }
      },

      // cheatLevel kept for backward compat (used in older code paths)
      cheatLevel: (game) => {
        const s = get();
        if (s.locks[game] > 0) return false;
        const newLvl = (s[game].lvl % 5) + 1;
        set({
          [game]: { ...s[game], lvl: newLvl, count: 0, consecutiveWins: 0 }
        });
        return true;
      },

      applyLock: (game, lvl) => set((s) => ({
        locks: { ...s.locks, [game]: lvl }
      })),

      removeLock: (game) => set((s) => ({
        locks: { ...s.locks, [game]: 0 }
      })),

      resetProgress: () => {
        const fresh = { stars: 0, lvl: 1, count: 0, consecutiveWins: 0, recentResults: [] };
        set({
          totalStars: 0,
          equations: { ...fresh },
          balance: { ...fresh },
          tank: { ...fresh },
          decimal: { ...fresh },
          fractionLab: { ...fresh },
          magicPatterns: { ...fresh },
          grid: { ...fresh },
          word: { ...fresh },
          multChamp: { ...fresh },
          percentages: { ...fresh },
          locks: { equations: 0, balance: 0, tank: 0, decimal: 0, fractionLab: 0, magicPatterns: 0, grid: 0, word: 0, multChamp: 0, percentages: 0 },
          weeklyStats: emptyWeek(),
        });
      },
    }),
    {
      name: 'nat-game-store',
      version: 4,
      // v2: added percentages game + lock key.
      // v3: added recentResults[] per-game for the 3-in-a-row OR 4-of-5 rule.
      // v4: added practiceLevels + practiceAlerts (child-chosen drill level).
      migrate: (persisted, fromVersion) => {
        if (!persisted) return persisted;
        if (fromVersion < 2) {
          persisted.percentages = persisted.percentages ||
            { stars: 0, lvl: 1, count: 0, consecutiveWins: 0 };
          persisted.locks = {
            equations: 0, balance: 0, tank: 0, decimal: 0, fractionLab: 0,
            magicPatterns: 0, grid: 0, word: 0, multChamp: 0, percentages: 0,
            ...(persisted.locks || {}),
          };
        }
        if (fromVersion < 3) {
          const GAMES = ['equations','balance','tank','decimal','fractionLab','magicPatterns','grid','word','multChamp','percentages'];
          for (const g of GAMES) {
            if (persisted[g] && !Array.isArray(persisted[g].recentResults)) {
              persisted[g] = { ...persisted[g], recentResults: [] };
            }
          }
        }
        if (fromVersion < 4) {
          persisted.practiceLevels = persisted.practiceLevels || {
            equations: 0, balance: 0, tank: 0, decimal: 0, fractionLab: 0,
            magicPatterns: 0, grid: 0, word: 0, multChamp: 0, percentages: 0,
          };
          persisted.practiceAlerts = persisted.practiceAlerts || {};
        }
        return persisted;
      },
      // Safety net even when version matches — any missing per-game key falls
      // back to the initial-state default (shallow merge is already the zustand
      // default, but we make it explicit to guard against future additions).
      merge: (persisted, current) => {
        const merged = { ...current, ...(persisted || {}) };
        if (!merged.percentages) merged.percentages = current.percentages;
        merged.locks          = { ...current.locks,          ...(persisted?.locks          || {}) };
        merged.practiceLevels = { ...current.practiceLevels, ...(persisted?.practiceLevels || {}) };
        merged.practiceAlerts = { ...(persisted?.practiceAlerts || {}) };
        return merged;
      },
      partialize: (state) => ({
        totalStars: state.totalStars,
        equations: state.equations,
        balance: state.balance,
        tank: state.tank,
        decimal: state.decimal,
        fractionLab: state.fractionLab,
        magicPatterns: state.magicPatterns,
        grid: state.grid,
        word: state.word,
        multChamp: state.multChamp,
        percentages: state.percentages,
        locks: state.locks,
        practiceLevels: state.practiceLevels,
        practiceAlerts: state.practiceAlerts,
        weeklyStats: state.weeklyStats,
        darkMode: state.darkMode,
      }),
    }
  )
);

export default useGameStore;
