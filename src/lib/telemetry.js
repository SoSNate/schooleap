import { supabase } from './supabase';

const CHILD_TOKEN_KEY = 'hasbaonautica_child_token';

// ─── reportHintUsed ─────────────────────────────────────────────────────────
// נקרא כשהילד מנצח חידה שבה השתמש ברמז. כותב לטלמטריה דרך game_events
// עם data={hint_used:true}. אין שינוי בסכימת ה-DB — עמודת data JSONB קיימת.
//
// Usage:
//   if (usedHint) reportHintUsed({ game: 'percentages', level: gameState.lvl });
//
// Fire-and-forget: לא await, לא חוסם את ה-UI; שגיאות מתועדות ל-console בלבד.
// ─────────────────────────────────────────────────────────────────────────────
export function reportHintUsed({ game, level }) {
  const token = localStorage.getItem(CHILD_TOKEN_KEY);
  if (!token) return;
  supabase
    .from('game_events')
    .insert({
      child_token: token,
      game_name:   game,
      level,
      success:     true,
      data:        { hint_used: true },
    })
    .then(({ error }) => {
      if (error) console.error('[reportHintUsed]', error);
    });
}
