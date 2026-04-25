/**
 * Service Worker for Web Push Notifications
 * Handles push events and notification clicks
 */

// Listen for push events from the server
self.addEventListener('push', (event) => {
  if (!event.data) {
    console.warn('[push] No data in push event');
    return;
  }

  let payload;
  try {
    payload = event.data.json();
  } catch (e) {
    console.error('[push] Failed to parse push payload', e);
    payload = {
      title: 'חשבונאוטיקה',
      body: event.data.text(),
    };
  }

  const {
    title = '🚀 חשבונאוטיקה',
    body = 'יש לך הודעה חדשה',
    icon = '/icon-192.png',
    badge = '/icon-192.png',
    tag = 'hasbaonautica',
    data = {},
  } = payload;

  const options = {
    body,
    icon,
    badge,
    tag,
    lang: 'he',
    dir: 'rtl',
    vibrate: [120, 60, 120],
    data,
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Listen for notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    // Try to find an existing client window
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // If app is already open, focus it
        for (const client of clientList) {
          if (client.url === '/' || client.url.includes('/play')) {
            return client.focus();
          }
        }
        // Otherwise, open a new window to the home page
        return clients.openWindow('/');
      })
  );
});

// Keep SW minimal for PoC — no install/activate caching logic
console.log('[push] Service Worker ready');
