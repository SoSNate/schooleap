// רשימת משחקים משותפת ל-Menu, AssignmentManager ו-ParentDashboard.
// שינוי כאן = שינוי בכל המקומות.

export const GAMES = [
  { id: 'equations',     label: 'כאן בונים בכיף',    emoji: '🧩', colorToken: 'purple'  },
  { id: 'balance',       label: 'שומרים על איזון',   emoji: '⚖️', colorToken: 'emerald' },
  { id: 'tank',          label: 'חצי הכוס המלאה',    emoji: '🧪', colorToken: 'blue'    },
  { id: 'decimal',       label: 'תפוס את הנקודה',    emoji: '🎯', colorToken: 'yellow'  },
  { id: 'fractionLab',   label: 'מעבדת השברים',      emoji: '🍕', colorToken: 'orange'  },
  { id: 'magicPatterns', label: 'תבניות הקסם',       emoji: '🪄', colorToken: 'rose'    },
  { id: 'grid',          label: 'מעבדת השטחים',      emoji: '📐', colorToken: 'teal'    },
  { id: 'word',          label: 'שאלות מילוליות',    emoji: '🧠', colorToken: 'red'     },
  { id: 'multChamp',     label: 'אלוף הכפל',         emoji: '✖️', colorToken: 'lime'    },
  { id: 'percentages',   label: 'מעבדת אחוזים',      emoji: '📊', colorToken: 'sky'     },
];

export const GAME_BY_ID = Object.fromEntries(GAMES.map(g => [g.id, g]));

export const GAME_COLOR_CLASSES = {
  purple:  { border: 'border-purple-400 dark:border-purple-600',  text: 'text-purple-600 dark:text-purple-400',  bg: 'bg-purple-50 dark:bg-purple-900/30'  },
  emerald: { border: 'border-emerald-400 dark:border-emerald-600', text: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/30' },
  blue:    { border: 'border-blue-400 dark:border-blue-600',     text: 'text-blue-600 dark:text-blue-400',     bg: 'bg-blue-50 dark:bg-blue-900/30'     },
  cyan:    { border: 'border-cyan-400 dark:border-cyan-600',     text: 'text-cyan-600 dark:text-cyan-400',     bg: 'bg-cyan-50 dark:bg-cyan-900/30'     },
  sky:     { border: 'border-sky-400 dark:border-sky-600',       text: 'text-sky-600 dark:text-sky-400',       bg: 'bg-sky-50 dark:bg-sky-900/30'       },
  yellow:  { border: 'border-yellow-400 dark:border-yellow-600', text: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-50 dark:bg-yellow-900/30' },
  orange:  { border: 'border-orange-400 dark:border-orange-600', text: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-900/30' },
  violet:  { border: 'border-violet-400 dark:border-violet-600', text: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-50 dark:bg-violet-900/30' },
  teal:    { border: 'border-teal-400 dark:border-teal-600',     text: 'text-teal-600 dark:text-teal-400',     bg: 'bg-teal-50 dark:bg-teal-900/30'     },
  rose:    { border: 'border-rose-400 dark:border-rose-200',     text: 'text-rose-600 dark:text-rose-100',     bg: 'bg-rose-50 dark:bg-rose-900/30'     },
  red:     { border: 'border-red-800 dark:border-red-950',       text: 'text-red-800 dark:text-red-700',       bg: 'bg-red-50 dark:bg-red-950/40'       },
  lime:    { border: 'border-lime-400 dark:border-lime-600',     text: 'text-lime-600 dark:text-lime-400',     bg: 'bg-lime-50 dark:bg-lime-900/30'     },
};

export function getGameColorClasses(colorToken) {
  return GAME_COLOR_CLASSES[colorToken] || GAME_COLOR_CLASSES.purple;
}
