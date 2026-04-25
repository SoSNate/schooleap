import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Convert a base64 URL string to a Uint8Array
 * Needed for applicationServerKey in pushManager.subscribe()
 */
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

/**
 * Hook for managing Web Push notifications
 * Returns state and control functions
 */
export default function usePushNotifications() {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState(Notification?.permission || 'default');
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Initialize on mount
  useEffect(() => {
    (async () => {
      try {
        // Check browser support
        const isSupported =
          'serviceWorker' in navigator &&
          'PushManager' in window &&
          'Notification' in window;

        setSupported(isSupported);

        if (!isSupported) {
          setLoading(false);
          return;
        }

        // Check permission
        setPermission(Notification.permission);

        // Check if already subscribed
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        setSubscribed(!!sub);

        setLoading(false);
      } catch (err) {
        console.error('[push] Init failed', err);
        setError(err.message);
        setLoading(false);
      }
    })();
  }, []);

  /**
   * Enable push notifications
   * Requests permission, subscribes, and saves subscription to DB
   */
  const enable = useCallback(async () => {
    if (!supported) {
      setError('אין תמיכה בדפדפן זה');
      return false;
    }

    try {
      setError(null);

      // Request permission
      const perm = await Notification.requestPermission();
      setPermission(perm);

      if (perm === 'denied') {
        setError('הרשאה נדחתה על ידי המשתמש');
        return false;
      }

      // Get VAPID public key from env
      const publicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
      if (!publicKey) {
        setError('VAPID public key not configured');
        return false;
      }

      // Get service worker and subscribe
      const reg = await navigator.serviceWorker.ready;
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      // Get magic token
      const magicToken = localStorage.getItem('hasbaonautica_child_token');
      if (!magicToken) {
        setError('משהו השתבש בהתחברות');
        return false;
      }

      // Save subscription to Supabase
      const { error: dbError } = await supabase
        .from('push_subscriptions')
        .insert({
          magic_token: magicToken,
          subscription: subscription.toJSON(),
        });

      if (dbError) {
        console.error('[push] DB error', dbError);
        setError('שגיאה בשמירה לשרת');
        return false;
      }

      setSubscribed(true);
      return true;
    } catch (err) {
      console.error('[push] Enable failed', err);
      setError(err.message);
      return false;
    }
  }, [supported]);

  /**
   * Disable push notifications
   * Unsubscribes and removes subscription from DB
   */
  const disable = useCallback(async () => {
    try {
      setError(null);

      // Get magic token
      const magicToken = localStorage.getItem('hasbaonautica_child_token');
      if (!magicToken) {
        setError('משהו השתבש בהתחברות');
        return false;
      }

      // Unsubscribe from push manager
      const reg = await navigator.serviceWorker.ready;
      const subscription = await reg.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();
      }

      // Remove from database
      const supabase = createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_ANON_KEY
      );

      await supabase
        .from('push_subscriptions')
        .delete()
        .eq('magic_token', magicToken);

      setSubscribed(false);
      return true;
    } catch (err) {
      console.error('[push] Disable failed', err);
      setError(err.message);
      return false;
    }
  }, []);

  return {
    supported,
    permission,
    subscribed,
    loading,
    error,
    enable,
    disable,
  };
}
