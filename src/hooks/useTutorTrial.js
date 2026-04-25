import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Hook for private teacher 48-hour trial state.
 * Returns isReadOnly=true once trial expires and no payment exists.
 * Subscribes to real-time profile updates so paying removes the lock instantly.
 */
export default function useTutorTrial(teacherId) {
  const [isInTrial, setIsInTrial]         = useState(false);
  const [trialExpired, setTrialExpired]   = useState(false);
  const [hoursRemaining, setHoursRemaining] = useState(48);
  const [loading, setLoading]             = useState(true);
  const channelRef = useRef(null);

  const fetchStatus = async () => {
    if (!teacherId) { setLoading(false); return; }
    try {
      const { data, error } = await supabase.rpc('get_tutor_trial_status', {
        p_teacher_id: teacherId,
      });
      if (error) throw error;
      if (data && data.length > 0) {
        const row = data[0];
        setIsInTrial(row.is_in_trial);
        setTrialExpired(row.trial_expired);
        setHoursRemaining(row.hours_remaining ?? 0);
      }
    } catch (e) {
      console.error('[useTutorTrial] fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, [teacherId]); // eslint-disable-line

  // Real-time: re-fetch when subscription_status changes to 'active'/'vip' (removes lock)
  useEffect(() => {
    if (!teacherId) return;

    channelRef.current = supabase
      .channel(`tutor-trial-${teacherId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${teacherId}` },
        (payload) => {
          const s = payload.new?.subscription_status;
          if (s === 'active' || s === 'vip') {
            // Paid — clear lock immediately without extra RPC
            setIsInTrial(false);
            setTrialExpired(false);
            setHoursRemaining(48);
          } else {
            fetchStatus();
          }
        }
      )
      .subscribe();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [teacherId]); // eslint-disable-line

  return {
    isInTrial,
    trialExpired,
    hoursRemaining,
    isReadOnly: trialExpired,
    loading,
  };
}
