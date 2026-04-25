import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Hook for managing teacher classrooms
 * Handles fetching classrooms, creating new ones, and selecting active classroom
 */
export default function useTeacherClassrooms(teacherId) {
  const [classrooms, setClassrooms] = useState([]);
  const [selectedClassroom, setSelectedClassroom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ─── Fetch classrooms on mount or when teacherId changes ──────────────────
  useEffect(() => {
    if (!teacherId) {
      setLoading(false);
      return;
    }

    (async () => {
      try {
        setError(null);

        // Fetch teacher's classrooms
        const { data, error: err } = await supabase.rpc('get_teacher_classrooms', {
          p_teacher_id: teacherId,
        });

        if (err) throw err;

        setClassrooms(data || []);

        // If no URL param, select first classroom
        if (!selectedClassroom && data?.length > 0) {
          setSelectedClassroom(data[0]);
        }
      } catch (e) {
        console.error('[useTeacherClassrooms] fetch error:', e);
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [teacherId]);

  // ─── Select classroom by code ──────────────────────────────────────────────
  const selectClassroom = useCallback((classroom) => {
    setSelectedClassroom(classroom);
  }, []);

  // ─── Create new classroom ─────────────────────────────────────────────────
  const createClassroom = useCallback(
    async (classroomName) => {
      if (!teacherId) return null;

      try {
        setError(null);

        // Generate unique classroom code (UUID first 8 chars + classroom name)
        const codeId = crypto.randomUUID().slice(0, 8).toUpperCase();
        const classroomCode = `${classroomName.replace(/\s+/g, '')}-${codeId}`;

        // Call RPC to create classroom
        const { data, error: err } = await supabase.rpc('create_teacher_classroom', {
          p_teacher_id: teacherId,
          p_classroom_code: classroomCode,
          p_classroom_name: classroomName,
        });

        if (err) throw err;
        if (!data || data.length === 0) throw new Error('Failed to create classroom');

        const newClassroom = data[0];

        // Update classrooms list
        const updatedClassrooms = [newClassroom, ...classrooms];
        setClassrooms(updatedClassrooms);

        // Auto-select new classroom
        setSelectedClassroom(newClassroom);

        return newClassroom;
      } catch (e) {
        console.error('[useTeacherClassrooms] create error:', e);
        setError(e.message);
        return null;
      }
    },
    [teacherId, classrooms]
  );

  // ─── Update classroom name ────────────────────────────────────────────────
  const updateClassroomName = useCallback(
    async (classroomId, newName) => {
      if (!teacherId) return false;

      try {
        setError(null);

        const { error: err } = await supabase.rpc('update_classroom_name', {
          p_classroom_id: classroomId,
          p_teacher_id: teacherId,
          p_new_name: newName,
        });

        if (err) throw err;

        // Update local state
        const updated = classrooms.map((c) =>
          c.id === classroomId ? { ...c, classroom_name: newName } : c
        );
        setClassrooms(updated);

        // Update selected if it's the one being edited
        if (selectedClassroom?.id === classroomId) {
          setSelectedClassroom({ ...selectedClassroom, classroom_name: newName });
        }

        return true;
      } catch (e) {
        console.error('[useTeacherClassrooms] update error:', e);
        setError(e.message);
        return false;
      }
    },
    [teacherId, classrooms, selectedClassroom]
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

        if (err) throw err;

        // Remove from list
        const updated = classrooms.filter((c) => c.id !== classroomId);
        setClassrooms(updated);

        // If deleted classroom was selected, select first remaining
        if (selectedClassroom?.id === classroomId) {
          setSelectedClassroom(updated.length > 0 ? updated[0] : null);
        }

        return true;
      } catch (e) {
        console.error('[useTeacherClassrooms] delete error:', e);
        setError(e.message);
        return false;
      }
    },
    [teacherId, classrooms, selectedClassroom]
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
