/**
 * Rank system for חשבונאוטיקה
 * Each game tracks its own level (unlimited progression)
 * Ranks are determined by level thresholds
 */

export const RANKS = [
  { level: 1, name: 'חניך', emoji: '🌱', minLevel: 1 },
  { level: 2, name: 'מתמחה', emoji: '👨‍🔧', minLevel: 2 },
  { level: 3, name: 'טייס', emoji: '✈️', minLevel: 3 },
  { level: 4, name: 'קפטן', emoji: '🎖️', minLevel: 4 },
  { level: 5, name: 'מפקד', emoji: '🚀', minLevel: 5 },
  // Future ranks (hidden until unlocked)
  { level: 6, name: 'קומודור', emoji: '🛸', minLevel: 6 },
  { level: 7, name: 'חוקר', emoji: '🔬', minLevel: 7 },
  { level: 8, name: 'מהנדס', emoji: '⚙️', minLevel: 8 },
  { level: 9, name: 'אסטרונאוט', emoji: '👨‍🚀', minLevel: 9 },
];

// Maximum visible rank (change this to unlock higher ranks)
export const MAX_VISIBLE_RANK = 5;

/**
 * Get rank data for a given level
 * @param {number} lvl - The player's level
 * @returns {object} Rank object with name, emoji, etc.
 */
export function getRankByLevel(lvl) {
  const rank = RANKS.find(r => r.minLevel <= lvl);
  return rank || RANKS[0];
}

/**
 * Get visible rank (respects MAX_VISIBLE_RANK)
 * If player level exceeds visible max, show the max visible rank
 * @param {number} lvl - The player's level
 * @returns {object} Visible rank object
 */
export function getVisibleRank(lvl) {
  const allRank = getRankByLevel(lvl);
  if (lvl > MAX_VISIBLE_RANK) {
    return getRankByLevel(MAX_VISIBLE_RANK);
  }
  return allRank;
}

/**
 * Check if a level is in the "hidden future" ranks
 * @param {number} lvl - The player's level
 * @returns {boolean}
 */
export function isHiddenRank(lvl) {
  return lvl > MAX_VISIBLE_RANK;
}
