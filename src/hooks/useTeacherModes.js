import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Hook for managing teacher's dual-mode operation (private + institutional)
 * Teachers can be both private tutors and institutional instructors simultaneously
 */
export default function useTeacherModes(teacherId) {
  const [modes, setModes] = useState([]);
  const [primaryMode, setPrimaryMode] = useState('private');
  const [modeStatus, setModeStatus] = useState({
    private: { enabled: true, approved_at: null },
    institutional: { enabled: false, approved_at: null },
  });
  const [pendingRequests, setPendingRequests] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const subscriptionRef = useRef(null);

  // ─── Load teacher's mode status on mount ───────────────────────────────────
  useEffect(() => {
    if (!teacherId) {
      setLoading(false);
      return;
    }

    (async () => {
      try {
        setError(null);
        console.log('[useTeacherModes] Loading mode status for:', teacherId);

        const { data, error: err } = await supabase.rpc('get_teacher_mode_status', {
          p_teacher_id: teacherId,
        });

        if (err) {
          console.error('[useTeacherModes] RPC error:', err);
          throw err;
        }

        if (data && data.length > 0) {
          const row = data[0];
          console.log('[useTeacherModes] Mode status loaded:', row);
          setModes(row.teacher_modes || ['private']);
          setPrimaryMode(row.primary_mode || 'private');
          setModeStatus(row.mode_status || {});
          setPendingRequests(row.pending_requests || 0);
        }
      } catch (e) {
        console.error('[useTeacherModes] fetch error:', e);
        setError(`שגיאה בטעינת מצב המורה: ${e.message}`);
        // Default to private mode on error
        setModes(['private']);
        setPrimaryMode('private');
      } finally {
        setLoading(false);
      }
    })();
  }, [teacherId]);

  // ─── Set up real-time subscription to mode changes (supabase-js v2 API) ───
  useEffect(() => {
    if (!teacherId) return;

    const channel = supabase
      .channel(`teacher-modes-${teacherId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${teacherId}`,
        },
        (payload) => {
          if (payload.new?.id !== teacherId) return;
          setModes(payload.new.teacher_modes || ['private']);
          setPrimaryMode(payload.new.primary_teacher_mode || 'private');
          setModeStatus(payload.new.teacher_mode_status || {});
        }
      )
      .subscribe();

    subscriptionRef.current = channel;

    return () => {
      try { supabase.removeChannel(channel); } catch { /* noop */ }
    };
  }, [teacherId]);

  // ─── Request mode change (requires admin approval) ──────────────────────────
  const requestModeChange = useCallback(
    async (requestedMode, reason) => {
      if (!teacherId) {
        setError('לא מחובר');
        return false;
      }

      try {
        setError(null);
        console.log('[useTeacherModes] Requesting mode change to:', requestedMode);

        const { error: err } = await supabase.rpc('request_teacher_mode_change', {
          p_teacher_id: teacherId,
          p_requested_mode: requestedMode,
          p_reason: reason || null,
        });

        if (err) throw err;

        console.log('[useTeacherModes] Mode change request submitted');
        // Increment pending requests counter
        setPendingRequests(prev => prev + 1);
        return true;
      } catch (e) {
        const errorMsg = e.message || 'שגיאה בהגשת בקשה';
        console.error('[useTeacherModes] request error:', e);
        setError(errorMsg);
        return false;
      }
    },
    [teacherId]
  );

  // ─── Switch between enabled modes (immediate, no approval needed) ───────────
  const switchMode = useCallback(
    async (newMode) => {
      if (!teacherId) {
        setError('לא מחובר');
        return false;
      }

      // Check if mode is enabled
      if (!modes.includes(newMode)) {
        setError(`מצב ${newMode} עדיין לא מופעל`);
        return false;
      }

      try {
        setError(null);
        console.log('[useTeacherModes] Switching to mode:', newMode);

        const { error: err } = await supabase.rpc('set_teacher_primary_mode', {
          p_teacher_id: teacherId,
          p_mode: newMode,
        });

        if (err) throw err;

        console.log('[useTeacherModes] Mode switched to:', newMode);
        setPrimaryMode(newMode);
        return true;
      } catch (e) {
        const errorMsg = e.message || 'שגיאה בהחלפת מצב';
        console.error('[useTeacherModes] switch error:', e);
        setError(errorMsg);
        return false;
      }
    },
    [teacherId, modes]
  );

  // ─── Get institutional enrollment details ─────────────────────────────────
  const getInstitutionalEnrollment = useCallback(async () => {
    if (!teacherId) return null;

    try {
      const { data, error: err } = await supabase
        .from('teacher_institutional_enrollment')
        .select('*')
        .eq('teacher_id', teacherId)
        .maybeSingle();

      if (err) throw err;
      return data;
    } catch (e) {
      console.error('[useTeacherModes] getEnrollment error:', e);
      return null;
    }
  }, [teacherId]);

  // ─── Submit institutional enrollment details ──────────────────────────────
  const submitInstitutionalEnrollment = useCallback(
    async (enrollmentData) => {
      if (!teacherId) {
        setError('לא מחובר');
        return false;
      }

      try {
        setError(null);
        console.log('[useTeacherModes] Submitting institutional enrollment');

        const { error: err } = await supabase
          .from('teacher_institutional_enrollment')
          .upsert({
            teacher_id: teacherId,
            organization_name: enrollmentData.organizationName,
            organization_id: enrollmentData.organizationId || null,
            contact_email: enrollmentData.contactEmail,
            contact_phone: enrollmentData.contactPhone || null,
            notes: enrollmentData.notes || null,
          });

        if (err) throw err;

        console.log('[useTeacherModes] Enrollment submitted successfully');
        return true;
      } catch (e) {
        const errorMsg = e.message || 'שגיאה בהגשת פרטי הרישום';
        console.error('[useTeacherModes] enrollment error:', e);
        setError(errorMsg);
        return false;
      }
    },
    [teacherId]
  );

  return {
    // State
    modes,
    primaryMode,
    modeStatus,
    pendingRequests,
    loading,
    error,

    // Methods
    switchMode,
    requestModeChange,
    getInstitutionalEnrollment,
    submitInstitutionalEnrollment,

    // Computed
    isPrivateMode: primaryMode === 'private',
    isInstitutionalMode: primaryMode === 'institutional',
    canRequestInstitutional: modes.length === 1 && modes[0] === 'private',
    canRequestPrivate: modes.length === 1 && modes[0] === 'institutional',
    hasMultipleModes: modes.length > 1,
  };
}
