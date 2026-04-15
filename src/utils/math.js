export const opsDict = { "+": "ועוד", "-": "פחות", "*": "כפול", "/": "לחלק ל" };
export const opEmojis = { "+": "➕", "-": "➖", "*": "✖️", "/": "➗" };
export const ranks = ["", "טירון 🥉", "סמל 🥈", "קצין 🥇", "אלוף 🎖️", "רמטכ\"ל 👑"];

// Unified color palette for all games (Menu cards and Settings chart)
export const GAME_COLORS = {
  equations:     { token: 'purple',  bar: 'bg-purple-500' },
  balance:       { token: 'emerald', bar: 'bg-emerald-500' },
  tank:          { token: 'blue',    bar: 'bg-blue-500' },
  decimal:       { token: 'yellow',  bar: 'bg-yellow-500' },
  fractionLab:   { token: 'orange',  bar: 'bg-orange-500' },
  magicPatterns: { token: 'rose',    bar: 'bg-rose-500' },
  grid:          { token: 'teal',    bar: 'bg-teal-500' },
  word:          { token: 'red',     bar: 'bg-red-800' },
  multChamp:     { token: 'yellow',  bar: 'bg-yellow-500' },
};

export const anims = {
  success: "https://lottie.host/21a44f7a-fb9f-4e6e-8ed5-647aa8455b43/jGVlPat0sl.lottie",
  levelUp: "https://lottie.host/73bc4bc3-cc86-4dd0-8df2-f8766be51655/8v2NthxfBU.lottie",
  logo: "https://lottie.host/83ee023a-d930-4f0b-87eb-97c3be9c47f1/RuHHEA9yD3.lottie",
  menuHero: "https://lottie.host/fbfc5c91-1662-4725-a05f-5fb6b4bbe45d/yh6GxHRwWS.lottie",
};

export function vibe(ms = 15) {
  if (navigator.vibrate) navigator.vibrate(ms);
}

export function getWeekId() {
  // Return week identifier based on Sunday start (not ISO Monday)
  const d = new Date();
  const sunday = new Date(d);
  sunday.setDate(d.getDate() - d.getDay()); // go back to Sunday
  sunday.setHours(0, 0, 0, 0);
  return sunday.toISOString().slice(0, 10); // YYYY-MM-DD format
}

export function getGameShort(game) {
  const map = { equations: 'eq', balance: 'bal', tank: 'tank', decimal: 'dec', fractionLab: 'flab', magicPatterns: 'mpat', grid: 'grid', word: 'word', multChamp: 'mult' };
  return map[game] || game.substring(0, 3);
}

export function emptyWeek() {
  return {
    weekId: getWeekId(),
    days: Array(7).fill(null).map(() => ({ pts: 0, games: { eq: 0, bal: 0, tank: 0, dec: 0, flab: 0, mpat: 0, grid: 0, word: 0, mult: 0 } }))
  };
}
