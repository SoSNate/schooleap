import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getWeekId, emptyWeek, getGameShort } from '../utils/math';
import { supabase } from '../lib/supabase';

const CHILD_TOKEN_KEY = 'hasbaonautica_child_token';

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
      equations: { stars: 0, lvl: 1, count: 0, consecutiveWins: 0 },
      balance: { stars: 0, lvl: 1, count: 0, consecutiveWins: 0 },
      tank: { stars: 0, lvl: 1, count: 0, consecutiveWins: 0 },
      decimal: { stars: 0, lvl: 1, count: 0, consecutiveWins: 0 },
      fractionLab: { stars: 0, lvl: 1, count: 0, consecutiveWins: 0 },
      magicPatterns: { stars: 0, lvl: 1, count: 0, consecutiveWins: 0 },
      grid: { stars: 0, lvl: 1, count: 0, consecutiveWins: 0 },
      word: { stars: 0, lvl: 1, count: 0, consecutiveWins: 0 },
      multChamp: { stars: 0, lvl: 1, count: 0, consecutiveWins: 0 },
      percentages: { stars: 0, lvl: 1, count: 0, consecutiveWins: 0 },

      // Locks
      locks: { equations: 0, balance: 0, tank: 0, decimal: 0, fractionLab: 0, magicPatterns: 0, grid: 0, word: 0, multChamp: 0, percentages: 0 },

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
          updates[game] = { stars, lvl: maxLvl, count: 0, consecutiveWins: 0 };
        }

        if (Object.keys(updates).length > 0) {
          set({ ...updates, totalStars });
        }
      },

      handleWin: (game) => {
        const s = get();
        if (s.isAnimating) return { isLevelUp: false, unlocked: false, pts: 0 };

        const pts = s[game].lvl + 1;
        const newStars = s[game].stars + pts;
        const newTotalStars = s.totalStars + pts;
        let newCount = s[game].count;
        let newLvl = s[game].lvl;
        let isLevelUp = false;
        let unlocked = false;
        let newConsecutiveWins = s[game].consecutiveWins;

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
          // Normal mode: count wins toward level up
          // Fast-track: equations L3+ and multChamp always level up on every win
          const threshold = (game === 'multChamp' || (game === 'equations' && newLvl >= 3)) ? 1 : 3;
          newCount = s[game].count + 1;
          if (newCount >= threshold && newLvl < 5) {
            newLvl++;
            newCount = 0;
            isLevelUp = true;
          }
          set({
            isAnimating: true,
            totalStars: newTotalStars,
            [game]: { ...s[game], stars: newStars, lvl: newLvl, count: newCount, consecutiveWins: 0 },
            weeklyStats: newWeekly,
          });
        }

        // שלח אירוע ל-Supabase אוטומטית
        get().reportGameEvent(game, get()[game].lvl, true);

        return { isLevelUp, unlocked, pts };
      },

      finishAnimation: () => set({ isAnimating: false }),

      reportGameEvent: async (game, level, success) => {
        const token = localStorage.getItem(CHILD_TOKEN_KEY);
        if (!token) return;
        try {
          await supabase.from('game_events').insert({
            child_token: token,
            game_name: game,
            level,
            success,
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
        set({
          locks: { ...s.locks, [game]: s[game].lvl },
          [game]: { ...s[game], count: 0, consecutiveWins: 0 }
        });
        // שלח אירוע כישלון ל-Supabase
        get().reportGameEvent(game, s[game].lvl, false);
        return 'locked';
      },

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
        const fresh = { stars: 0, lvl: 1, count: 0, consecutiveWins: 0 };
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
        weeklyStats: state.weeklyStats,
        darkMode: state.darkMode,
      }),
    }
  )
);

export default useGameStore;
