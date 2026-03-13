import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getWeekId, emptyWeek, getGameShort } from '../utils/math';

const useGameStore = create(
  persist(
    (set, get) => ({
      // Global
      totalStars: 0,
      isAnimating: false,
      darkMode: false,
      currentScreen: 'menu',

      // Per-game state
      equations: { stars: 0, lvl: 1, count: 0, fails: 0 },
      balance: { stars: 0, lvl: 1, count: 0, fails: 0 },
      tank: { stars: 0, lvl: 1, count: 0, fails: 0 },
      decimal: { stars: 0, lvl: 1, count: 0, fails: 0 },

      // Locks
      locks: { equations: 0, balance: 0, tank: 0, decimal: 0 },

      // Weekly stats
      weeklyStats: emptyWeek(),

      // === Actions ===

      setScreen: (screen) => set({ currentScreen: screen }),

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

      handleWin: (game) => {
        const s = get();
        if (s.isAnimating) return { isLevelUp: false, pts: 0 };

        const pts = s[game].lvl + 1;
        const newStars = s[game].stars + pts;
        const newTotalStars = s.totalStars + pts;
        let newCount = s[game].count + 1;
        let newLvl = s[game].lvl;
        let isLevelUp = false;

        if (s.locks[game] === 0 && newCount >= 3 && newLvl < 5) {
          newLvl++;
          newCount = 0;
          isLevelUp = true;
        }

        // Update weekly stats
        const today = new Date().getDay();
        const shortGame = getGameShort(game);
        const newWeekly = { ...s.weeklyStats };
        // Check if week changed
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

        set({
          isAnimating: true,
          totalStars: newTotalStars,
          [game]: { ...s[game], stars: newStars, lvl: newLvl, count: newCount, fails: 0 },
          weeklyStats: newWeekly,
        });

        return { isLevelUp, pts };
      },

      finishAnimation: () => set({ isAnimating: false }),

      handleGameFail: (game) => {
        const s = get();
        const newFails = (s[game].fails || 0) + 1;

        if (newFails >= 3) {
          set({
            locks: { ...s.locks, [game]: s[game].lvl },
            [game]: { ...s[game], fails: 0 }
          });
          return 'locked';
        }

        set({ [game]: { ...s[game], fails: newFails } });
        return 'retry';
      },

      cheatLevel: (game) => {
        const s = get();
        if (s.locks[game] > 0) return false;
        const newLvl = (s[game].lvl % 5) + 1;
        set({
          [game]: { ...s[game], lvl: newLvl, count: 0, fails: 0 }
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
        set({
          totalStars: 0,
          equations: { stars: 0, lvl: 1, count: 0, fails: 0 },
          balance: { stars: 0, lvl: 1, count: 0, fails: 0 },
          tank: { stars: 0, lvl: 1, count: 0, fails: 0 },
          decimal: { stars: 0, lvl: 1, count: 0, fails: 0 },
          locks: { equations: 0, balance: 0, tank: 0, decimal: 0 },
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
        locks: state.locks,
        weeklyStats: state.weeklyStats,
        darkMode: state.darkMode,
      }),
    }
  )
);

export default useGameStore;
