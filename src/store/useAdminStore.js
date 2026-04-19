import { create } from 'zustand';

// Store לאדמין — שולט על מצב עריכה/קריאה ועל Overwatch (impersonation).
// לא persisted: כל session מתחיל ב-Read Mode וללא impersonation.
const useAdminStore = create((set, get) => ({
  // ─── Edit / Read mode ──────────────────────────────────────────────────────
  // ברירת מחדל: Read Mode. המנהל חייב ללחוץ "עבור לעריכה" כדי לבצע מוטציות.
  editMode: false,

  toggleEditMode: () => set({ editMode: !get().editMode }),
  setEditMode: (val) => set({ editMode: Boolean(val) }),

  // ─── Overwatch (Impersonation) — מוכן ל-Chunk B ────────────────────────────
  impersonatedUserId: null,
  impersonatedEmail: null,
  impersonatedRole: null, // 'parent' | 'teacher' | null

  startImpersonation: ({ userId, email, role }) => set({
    impersonatedUserId: userId,
    impersonatedEmail: email,
    impersonatedRole: role,
    editMode: false, // Overwatch תמיד Read-Only
  }),

  stopImpersonation: () => set({
    impersonatedUserId: null,
    impersonatedEmail: null,
    impersonatedRole: null,
  }),

  // ─── Derived helpers ───────────────────────────────────────────────────────
  // כל רכיב מוטציה חייב לקרוא ל-canMutate() לפני כתיבה.
  canMutate: () => {
    const s = get();
    // ב-Overwatch אסור לכתוב, גם אם editMode דלוק.
    if (s.impersonatedUserId) return false;
    return s.editMode;
  },

  isReadOnly: () => !get().canMutate(),
}));

export default useAdminStore;
