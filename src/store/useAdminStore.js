import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// editMode persisted so refresh/reload doesn't silently disable approval buttons.
// Impersonation is session-only — never persisted.
const useAdminStore = create(
  persist(
    (set, get) => ({
      editMode: false,

      toggleEditMode: () => set({ editMode: !get().editMode }),
      setEditMode: (val) => set({ editMode: Boolean(val) }),

      impersonatedUserId: null,
      impersonatedEmail: null,
      impersonatedRole: null,

      startImpersonation: ({ userId, email, role }) => set({
        impersonatedUserId: userId,
        impersonatedEmail: email,
        impersonatedRole: role,
        editMode: false,
      }),

      stopImpersonation: () => set({
        impersonatedUserId: null,
        impersonatedEmail: null,
        impersonatedRole: null,
      }),

      canMutate: () => {
        const s = get();
        if (s.impersonatedUserId) return false;
        return s.editMode;
      },

      isReadOnly: () => !get().canMutate(),
    }),
    {
      name: 'nat-admin-store',
      partialize: (s) => ({ editMode: s.editMode }),
    }
  )
);

export default useAdminStore;
