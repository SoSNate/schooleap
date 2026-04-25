import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Hook for managing parent push notification settings
 * Returns current settings and control functions
 */
export default function useParentPushSettings(childToken, parentToken) {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ─── Fetch settings on mount ──────────────────────────────────
  useEffect(() => {
    if (!childToken || !parentToken) {
      setLoading(false);
      return;
    }

    (async () => {
      try {
        // Try to fetch existing settings
        const { data, error: err } = await supabase
          .from('parent_push_settings')
          .select('*')
          .eq('magic_token', childToken)
          .maybeSingle();

        if (err) throw err;

        if (!data) {
          // Initialize default settings if none exist
          const { data: newSettings, error: createErr } = await supabase
            .rpc('init_push_settings_for_child', {
              p_child_token: childToken,
              p_parent_token: parentToken,
            });

          if (createErr) throw createErr;
          setSettings(newSettings);
        } else {
          setSettings(data);
        }
      } catch (e) {
        console.error('[useParentPushSettings] fetch error:', e);
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [childToken, parentToken]);

  // ─── Update settings ─────────────────────────────────────────
  const updateSettings = useCallback(
    async (updates) => {
      if (!childToken || !parentToken) return false;

      try {
        setError(null);

        // Call RPC to update settings
        const { data: updated, error: err } = await supabase
          .rpc('update_child_push_settings', {
            p_parent_token: parentToken,
            p_child_token: childToken,
            p_enabled: updates.notifications_enabled ?? undefined,
            p_max_per_day: updates.max_notifications_per_day ?? undefined,
            p_quiet_start: updates.quiet_hour_start ?? undefined,
            p_quiet_end: updates.quiet_hour_end ?? undefined,
            p_quiet_enabled: updates.quiet_hours_enabled ?? undefined,
          });

        if (err) throw err;

        setSettings(updated);
        return true;
      } catch (e) {
        console.error('[useParentPushSettings] update error:', e);
        setError(e.message);
        return false;
      }
    },
    [childToken, parentToken]
  );

  // ─── Toggle notifications ────────────────────────────────────
  const toggleNotifications = useCallback(
    async (enabled) => {
      return updateSettings({ notifications_enabled: enabled });
    },
    [updateSettings]
  );

  // ─── Update max per day ──────────────────────────────────────
  const setMaxPerDay = useCallback(
    async (max) => {
      return updateSettings({ max_notifications_per_day: max });
    },
    [updateSettings]
  );

  // ─── Update quiet hours ──────────────────────────────────────
  const setQuietHours = useCallback(
    async (startTime, endTime, enabled) => {
      return updateSettings({
        quiet_hour_start: startTime,
        quiet_hour_end: endTime,
        quiet_hours_enabled: enabled,
      });
    },
    [updateSettings]
  );

  // ─── Toggle quiet hours ──────────────────────────────────────
  const toggleQuietHours = useCallback(
    async (enabled) => {
      return updateSettings({ quiet_hours_enabled: enabled });
    },
    [updateSettings]
  );

  return {
    settings,
    loading,
    error,
    updateSettings,
    toggleNotifications,
    setMaxPerDay,
    setQuietHours,
    toggleQuietHours,
  };
}
