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
      equations: { stars: 0, lvl: 1, count: 0, fails: 0, consecutiveWins: 0 },
      balance: { stars: 0, lvl: 1, count: 0, fails: 0, consecutiveWins: 0 },
      tank: { stars: 0, lvl: 1, count: 0, fails: 0, consecutiveWins: 0 },
      decimal: { stars: 0, lvl: 1, count: 0, fails: 0, consecutiveWins: 0 },
      fractionLab: { stars: 0, lvl: 1, count: 0, fails: 0, consecutiveWins: 0 },
      magicPatterns: { stars: 0, lvl: 1, count: 0, fails: 0, consecutiveWins: 0 },
      grid: { stars: 0, lvl: 1, count: 0, fails: 0, consecutiveWins: 0 },
      word: { stars: 0, lvl: 1, count: 0, fails: 0, consecutiveWins: 0 },

      // Locks
      locks: { equations: 0, balance: 0, tank: 0, decimal: 0, fractionLab: 0, magicPatterns: 0, grid: 0, word: 0 },

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
              [game]: { ...s[game], stars: newStars, lvl: newLvl, count: newCount, fails: 0, consecutiveWins: 0 },
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
          // Fast-track for Equations L3 and L4 (1 win = level up)
          const threshold = (game === 'equations' && newLvl >= 3) ? 1 : 3;
          newCount = s[game].count + 1;
          if (newCount >= threshold && newLvl < 5) {
            newLvl++;
            newCount = 0;
            isLevelUp = true;
          }
          set({
            isAnimating: true,
            totalStars: newTotalStars,
            [game]: { ...s[game], stars: newStars, lvl: newLvl, count: newCount, fails: 0, consecutiveWins: 0 },
            weeklyStats: newWeekly,
          });
        }

        return { isLevelUp, unlocked, pts };
      },

      finishAnimation: () => set({ isAnimating: false }),

      handleGameFail: (game) => {
        const s = get();
        set({
          locks: { ...s.locks, [game]: s[game].lvl },
          [game]: { ...s[game], fails: 0, count: 0, consecutiveWins: 0 }
        });
        return 'locked';
      },

      cheatLevel: (game) => {
        const s = get();
        if (s.locks[game] > 0) return false;
        const newLvl = (s[game].lvl % 5) + 1;
        set({
          [game]: { ...s[game], lvl: newLvl, count: 0, fails: 0, consecutiveWins: 0 }
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
        const fresh = { stars: 0, lvl: 1, count: 0, fails: 0, consecutiveWins: 0 };
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
          locks: { equations: 0, balance: 0, tank: 0, decimal: 0, fractionLab: 0, magicPatterns: 0, grid: 0, word: 0 },
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
        locks: state.locks,
        weeklyStats: state.weeklyStats,
        darkMode: state.darkMode,
      }),
    }
  )
);

export default useGameStore;
