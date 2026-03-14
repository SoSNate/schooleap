export const opsDict = { "+": "ועוד", "-": "פחות", "*": "כפול", "/": "לחלק ל" };
export const opEmojis = { "+": "➕", "-": "➖", "*": "✖️", "/": "➗" };
export const ranks = ["", "טירון 🥉", "סמל 🥈", "קצין 🥇", "אלוף 🎖️", "רמטכ\"ל 👑"];

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
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
  const week1 = new Date(date.getFullYear(), 0, 4);
  return date.getFullYear() + "-" + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
}

export function getGameShort(game) {
  const map = { equations: 'eq', balance: 'bal', tank: 'tank', decimal: 'dec', fractionLab: 'flab', magicPatterns: 'mpat', grid: 'grid', word: 'word' };
  return map[game] || game.substring(0, 3);
}

export function emptyWeek() {
  return {
    weekId: getWeekId(),
    days: Array(7).fill(null).map(() => ({ pts: 0, games: { eq: 0, bal: 0, tank: 0, dec: 0, flab: 0, mpat: 0, grid: 0, word: 0 } }))
  };
}
