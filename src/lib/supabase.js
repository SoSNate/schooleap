import { createClient } from '@supabase/supabase-js';

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey  = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    // שמור session ב-localStorage — חיוני לניידים שסוגרים את הדפדפן
    persistSession:      true,
    // רענן token אוטומטית לפני שיפוג — מונע ניתוק בטאב שנשאר פתוח
    autoRefreshToken:    true,
    // זהה session מ-URL hash — לאחר OAuth redirect בנייד
    detectSessionInUrl:  true,
    // storage מפורש — iOS Safari מגביל localStorage ב-iframe
    storage:             typeof window !== 'undefined' ? window.localStorage : undefined,
  },
});
