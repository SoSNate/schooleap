import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { readCache, writeCache } from '../lib/swrCache';

const STORAGE_KEY = 'hasbaonautica_teacher_selected_classroom';

/**
 * Hook for managing teacher classrooms with real-time sync
 * Features:
 * - Real-time syncing across devices
 * - URL-based classroom selection
 * - Persistent state management
 * - Robust error handling and code generation
 */
export default function useTeacherClassrooms(teacherId, searchParams, setSearchParams) {
  const [classrooms, setClassrooms] = useState([]);
  const [selectedClassroom, setSelectedClassroom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const subscriptionRef = useRef(null);

  // ─── Generate unique classroom code ────────────────────────────────────────
  const generateUniqueCode = useCallback(() => {
    // Format: TIMESTAMP-RANDOM (e.g., "ABCD123-XY789")
    const timestamp = Date.now().toString(36).slice(-8).toUpperCase();
    const random = Math.random().toString(36).substring(2, 7).toUpperCase();
    return `${timestamp}-${random}`;
  }, []);

  // ─── Fetch classrooms on mount (SWR pattern) ──────────────────────────────
  useEffect(() => {
    if (!teacherId) {
      setLoading(false);
      return;
    }

    // SWR: הצג cache מיד (0ms)
    const cached = readCache(`classrooms:${teacherId}`);
    if (cached?.value) {
      setClassrooms(cached.value);
      setLoading(false);
      if (!selectedClassroom && cached.value.length > 0) {
        setSelectedClassroom(cached.value[0]);
      }
    }

    (async () => {
      try {
        setError(null);
        const { data, error: err } = await supabase.rpc('get_teacher_classrooms', {
          p_teacher_id: teacherId,
        });

        if (err) throw err;

        const list = data || [];
        writeCache(`classrooms:${teacherId}`, list);
        setClassrooms(list);

        if (!selectedClassroom && list.length > 0) {
          setSelectedClassroom(list[0]);
        }
      } catch (e) {
        console.error('[useTeacherClassrooms] fetch error:', e);
        if (!cached?.value) {
          setError(`שגיאה בטעינת הכיתות: ${e.message}`);
          setClassrooms([]);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [teacherId]);

  // ─── Set up real-time subscription (supabase-js v2 API) ───────────────────
  useEffect(() => {
    if (!teacherId) return;

    const channel = supabase
      .channel(`teacher-classrooms-${teacherId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'classrooms', filter: `teacher_id=eq.${teacherId}` },
        (payload) => {
          setClassrooms((prev) => [payload.new, ...prev]);
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'classrooms', filter: `teacher_id=eq.${teacherId}` },
        (payload) => {
          setClassrooms((prev) =>
            prev.map((c) => (c.id === payload.new.id ? payload.new : c))
          );
          if (selectedClassroom?.id === payload.new.id) {
            setSelectedClassroom(payload.new);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'classrooms', filter: `teacher_id=eq.${teacherId}` },
        (payload) => {
          setClassrooms((prev) => prev.filter((c) => c.id !== payload.old.id));
          if (selectedClassroom?.id === payload.old.id) {
            setClassrooms((prev) => {
              setSelectedClassroom(prev.length > 0 ? prev[0] : null);
              return prev;
            });
          }
        }
      )
      .subscribe();

    subscriptionRef.current = channel;

    return () => {
      try { supabase.removeChannel(channel); } catch { /* noop */ }
    };
  }, [teacherId, selectedClassroom?.id]);

  // ─── Handle URL-based classroom selection ──────────────────────────────────
  useEffect(() => {
    if (!searchParams || !setSearchParams) return;

    const classroomCode = searchParams.get('classroom');

    if (classroomCode && classrooms.length > 0) {
      const classroom = classrooms.find((c) => c.classroom_code === classroomCode);
      if (classroom && classroom.id !== selectedClassroom?.id) {
        setSelectedClassroom(classroom);
      }
    } else if (!classroomCode && classrooms.length > 0 && !selectedClassroom) {
      // No URL param and no selection - select first
      setSelectedClassroom(classrooms[0]);
    }
  }, [searchParams, classrooms, selectedClassroom?.id, setSearchParams]);

  // ─── Restore from localStorage on mount ────────────────────────────────────
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && classrooms.length > 0 && !selectedClassroom) {
        const classroom = classrooms.find((c) => c.classroom_code === saved);
        if (classroom) {
          setSelectedClassroom(classroom);
          // Update URL if needed
          if (setSearchParams) {
            setSearchParams((prev) => {
              const params = new URLSearchParams(prev);
              params.set('classroom', saved);
              return params;
            });
          }
        }
      }
    } catch (e) {
      console.warn('[useTeacherClassrooms] localStorage restore failed:', e);
    }
  }, [classrooms.length, setSearchParams]);

  // ─── Save selected classroom to localStorage ───────────────────────────────
  useEffect(() => {
    if (selectedClassroom?.classroom_code) {
      try {
        localStorage.setItem(STORAGE_KEY, selectedClassroom.classroom_code);
      } catch (e) {
        console.warn('[useTeacherClassrooms] localStorage save failed:', e);
      }
    }
  }, [selectedClassroom?.classroom_code]);

  // ─── Select classroom and update URL ───────────────────────────────────────
  const selectClassroom = useCallback(
    (classroom) => {
      setSelectedClassroom(classroom);
      if (setSearchParams) {
        setSearchParams((prev) => {
          const params = new URLSearchParams(prev);
          params.set('classroom', classroom.classroom_code);
          return params;
        });
      }
    },
    [setSearchParams]
  );

  // ─── Create new classroom with retry logic ─────────────────────────────────
  const createClassroom = useCallback(
    async (classroomName) => {
      if (!teacherId) {
        console.error('[useTeacherClassrooms] No teacherId');
        setError('לא ניתן ליצור כיתה - לא מחובר');
        return null;
      }

      if (!classroomName?.trim()) {
        setError('יש להזין שם לכיתה');
        return null;
      }

      try {
        setError(null);

        // Try to create with retry logic for duplicate codes
        let classroomCode;
        let attempts = 0;
        const maxAttempts = 3;
        let lastError;

        while (attempts < maxAttempts) {
          classroomCode = generateUniqueCode();

          const { data, error: err } = await supabase.rpc('create_teacher_classroom', {
            p_teacher_id: teacherId,
            p_classroom_code: classroomCode,
            p_classroom_name: classroomName,
          });

          if (err) {
            lastError = err;
            if (err.code === '23505') {
              // UNIQUE constraint violation - try again
              console.warn('[useTeacherClassrooms] Duplicate code, retrying...');
              attempts++;
              continue;
            }
            // Other error - throw
            throw err;
          }

          if (!data || data.length === 0) {
            throw new Error('לא נתקבלה תגובה מהשרת');
          }

          const newClassroom = data[0];

          // Update local state
          setClassrooms((prev) => [newClassroom, ...prev]);
          setSelectedClassroom(newClassroom);

          // Update URL
          if (setSearchParams) {
            setSearchParams((prev) => {
              const params = new URLSearchParams(prev);
              params.set('classroom', newClassroom.classroom_code);
              return params;
            });
          }

          return newClassroom;
        }

        // All retries exhausted
        throw lastError || new Error('לא ניתן ליצור קוד כיתה יחודי');
      } catch (e) {
        const errorMsg = e.message || 'שגיאה בייצור כיתה';
        console.error('[useTeacherClassrooms] create error:', e);
        setError(errorMsg);
        return null;
      }
    },
    [teacherId, generateUniqueCode, setSearchParams]
  );

  // ─── Update classroom name ────────────────────────────────────────────────
  const updateClassroomName = useCallback(
    async (classroomId, newName) => {
      if (!teacherId) return false;

      if (!newName?.trim()) {
        setError('יש להזין שם לכיתה');
        return false;
      }

      try {
        setError(null);

        const { error: err } = await supabase.rpc('update_classroom_name', {
          p_classroom_id: classroomId,
          p_teacher_id: teacherId,
          p_new_name: newName,
        });

        if (err) throw err;

        // Update local state - will be synced via real-time subscription
        return true;
      } catch (e) {
        console.error('[useTeacherClassrooms] update error:', e);
        setError(`שגיאה בעדכון שם הכיתה: ${e.message}`);
        return false;
      }
    },
    [teacherId]
  );

  // ─── Delete classroom ────────────────────────────────────────────────────
  const deleteClassroom = useCallback(
    async (classroomId) => {
      if (!teacherId) return false;

      try {
        setError(null);

        const { error: err } = await supabase.rpc('delete_classroom', {
          p_classroom_id: classroomId,
          p_teacher_id: teacherId,
        });

        if (err) {
          // Check if it's because classroom has students
          if (err.message?.includes('student')) {
            setError('לא ניתן למחוק כיתה שיש בה תלמידים');
          } else {
            throw err;
          }
          return false;
        }

        // Update local state - will be synced via real-time subscription
        return true;
      } catch (e) {
        console.error('[useTeacherClassrooms] delete error:', e);
        setError(`שגיאה במחיקת כיתה: ${e.message}`);
        return false;
      }
    },
    [teacherId]
  );

  return {
    classrooms,
    selectedClassroom,
    loading,
    error,
    selectClassroom,
    createClassroom,
    updateClassroomName,
    deleteClassroom,
  };
}
