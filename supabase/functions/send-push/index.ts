import webpush from 'webpush';
import { createClient } from 'supabase';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY');
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY');
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') || 'mailto:support@schooleap.com';

// Set VAPID details once at module scope
try {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
} catch (err) {
  console.error('[send-push] VAPID setup failed:', err);
}

// Initialize Supabase client with service role key (full permissions)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface PushRequest {
  p_token: string;
  title?: string;
  body?: string;
  url?: string;
  delay_ms?: number;
}

interface PushResponse {
  sent: number;
  failed: number;
  total: number;
  error?: string;
}

/**
 * Supabase Edge Function to send push notifications
 * POST /send-push
 * Body: { p_token, title?, body?, url?, delay_ms? }
 */
Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey',
      },
    });
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      {
        status: 405,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }

  try {
    const payload: PushRequest = await req.json();

    // Validate required fields
    if (!payload.p_token) {
      return new Response(
        JSON.stringify({ error: 'Missing p_token' }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    // Apply delay if requested (capped to 25s to stay under 30s timeout)
    if (payload.delay_ms) {
      const delayMs = Math.min(payload.delay_ms, 25000);
      await new Promise((r) => setTimeout(r, delayMs));
    }

    // Query push subscriptions for this child
    const { data: subscriptions, error: queryError } = await supabase
      .from('push_subscriptions')
      .select('id, subscription')
      .eq('magic_token', payload.p_token);

    if (queryError) {
      console.error('[send-push] Query error:', queryError);
      return new Response(
        JSON.stringify({ sent: 0, failed: 0, total: 0, error: 'Query failed' }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    const total = subscriptions?.length || 0;
    if (total === 0) {
      return new Response(
        JSON.stringify({ sent: 0, failed: 0, total: 0 }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    // Prepare notification payload
    const notificationPayload = {
      title: payload.title || '🚀 חשבונאוטיקה',
      body: payload.body || 'יש לך הודעה חדשה',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: 'hasbaonautica',
      data: {
        url: payload.url || '/',
      },
    };

    // Send to each subscription
    let sent = 0;
    let failed = 0;

    for (const record of subscriptions) {
      try {
        const sub = record.subscription;

        // Send via web-push
        await webpush.sendNotification(
          sub,
          JSON.stringify(notificationPayload)
        );

        sent++;
        console.log(`[send-push] Sent to subscription ${record.id}`);
      } catch (err: any) {
        failed++;

        // Log error details
        console.error(
          `[send-push] Failed to send to subscription ${record.id}:`,
          err.message || err
        );

        // Handle 410 Gone (endpoint expired) — could delete from DB here if needed
        if (err.statusCode === 410 || err.statusCode === 404) {
          console.warn(`[send-push] Subscription ${record.id} expired`);
          // Optional: delete from DB
          // await supabase.from('push_subscriptions').delete().eq('id', record.id);
        }
      }
    }

    return new Response(
      JSON.stringify({ sent, failed, total }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (err: any) {
    console.error('[send-push] Error:', err);
    return new Response(
      JSON.stringify({
        sent: 0,
        failed: 0,
        total: 0,
        error: err.message || 'Internal error',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
});
