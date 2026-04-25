-- Phase 2: Parent Control Over Child Push Notifications
-- Allows parents to manage notification frequency, timing, and preferences

-- 1. Parent notification preferences table
CREATE TABLE IF NOT EXISTS public.parent_push_settings (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  magic_token           TEXT NOT NULL UNIQUE,  -- link to child
  parent_magic_token    TEXT NOT NULL,         -- link to parent

  -- Control flags
  notifications_enabled BOOLEAN DEFAULT true,
  max_notifications_per_day INTEGER DEFAULT 10,  -- 0 = unlimited

  -- Quiet hours (24h format, e.g., 22:00 to 08:00)
  quiet_hour_start      TIME DEFAULT '22:00',
  quiet_hour_end        TIME DEFAULT '08:00',
  quiet_hours_enabled   BOOLEAN DEFAULT true,

  -- Notification types to allow (if needed in future)
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS parent_push_settings_token_idx
  ON public.parent_push_settings(magic_token);

CREATE INDEX IF NOT EXISTS parent_push_settings_parent_token_idx
  ON public.parent_push_settings(parent_magic_token);

---

-- 2. Simple daily push counter (resets at midnight)
-- Used to enforce max_notifications_per_day limit
CREATE TABLE IF NOT EXISTS public.push_notification_count (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  magic_token     TEXT NOT NULL,
  date            DATE NOT NULL,
  count           INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unique constraint: one row per child per day
CREATE UNIQUE INDEX IF NOT EXISTS push_notification_count_daily_idx
  ON public.push_notification_count(magic_token, date);

---

-- Note: RLS not enabled in Phase 1 (using magic token auth)
-- Will add RLS policies in Phase 2 after implementing proper auth
-- For now, push_subscriptions table and parent_push_settings are public-readable by magic token

---

-- 4. Simple RPC to update parent settings
CREATE OR REPLACE FUNCTION update_child_push_settings(
  p_parent_token TEXT,
  p_child_token TEXT,
  p_enabled BOOLEAN DEFAULT NULL,
  p_max_per_day INTEGER DEFAULT NULL,
  p_quiet_start TIME DEFAULT NULL,
  p_quiet_end TIME DEFAULT NULL,
  p_quiet_enabled BOOLEAN DEFAULT NULL
)
RETURNS public.parent_push_settings
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_settings public.parent_push_settings;
BEGIN
  UPDATE public.parent_push_settings
  SET
    notifications_enabled = COALESCE(p_enabled, notifications_enabled),
    max_notifications_per_day = COALESCE(p_max_per_day, max_notifications_per_day),
    quiet_hour_start = COALESCE(p_quiet_start, quiet_hour_start),
    quiet_hour_end = COALESCE(p_quiet_end, quiet_hour_end),
    quiet_hours_enabled = COALESCE(p_quiet_enabled, quiet_hours_enabled),
    updated_at = NOW()
  WHERE parent_magic_token = p_parent_token
    AND magic_token = p_child_token
  RETURNING * INTO v_settings;

  RETURN v_settings;
END;
$$;

---

-- 5. RPC to check if push should be sent (used by Edge Function)
CREATE OR REPLACE FUNCTION can_send_push_notification(
  p_child_token TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_settings public.parent_push_settings;
  v_today_count INTEGER;
  v_current_time TIME;
  v_in_quiet_hours BOOLEAN;
BEGIN
  -- Get parent settings
  SELECT * INTO v_settings
  FROM public.parent_push_settings
  WHERE magic_token = p_child_token;

  -- If no settings found, default to allow
  IF v_settings IS NULL THEN
    RETURN true;
  END IF;

  -- Check if notifications disabled
  IF NOT v_settings.notifications_enabled THEN
    RETURN false;
  END IF;

  -- Check quiet hours
  v_current_time := CURRENT_TIME;
  IF v_settings.quiet_hours_enabled THEN
    -- Handle case where quiet hours span midnight (e.g., 22:00 to 08:00)
    IF v_settings.quiet_hour_start > v_settings.quiet_hour_end THEN
      v_in_quiet_hours := (v_current_time >= v_settings.quiet_hour_start
                           OR v_current_time < v_settings.quiet_hour_end);
    ELSE
      v_in_quiet_hours := (v_current_time >= v_settings.quiet_hour_start
                           AND v_current_time < v_settings.quiet_hour_end);
    END IF;

    IF v_in_quiet_hours THEN
      RETURN false;
    END IF;
  END IF;

  -- Check daily limit
  IF v_settings.max_notifications_per_day > 0 THEN
    SELECT COUNT(*) INTO v_today_count
    FROM public.push_notification_count
    WHERE magic_token = p_child_token
      AND date = CURRENT_DATE;

    IF COALESCE(v_today_count, 0) >= v_settings.max_notifications_per_day THEN
      RETURN false;
    END IF;
  END IF;

  RETURN true;
END;
$$;

---

-- 6. RPC to increment daily counter (called after successful push send)
CREATE OR REPLACE FUNCTION increment_daily_push_count(
  p_child_token TEXT
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Upsert: insert if not exists, else increment
  INSERT INTO public.push_notification_count (magic_token, date, count)
  VALUES (p_child_token, CURRENT_DATE, 1)
  ON CONFLICT (magic_token, date)
  DO UPDATE SET count = count + 1
  RETURNING count INTO v_count;

  RETURN v_count;
END;
$$;

---

-- 7. Initialize default settings for existing children
-- (when they first opt-in to notifications)
CREATE OR REPLACE FUNCTION init_push_settings_for_child(
  p_child_token TEXT,
  p_parent_token TEXT
)
RETURNS public.parent_push_settings
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_settings public.parent_push_settings;
BEGIN
  INSERT INTO public.parent_push_settings (
    magic_token,
    parent_magic_token,
    notifications_enabled,
    max_notifications_per_day,
    quiet_hour_start,
    quiet_hour_end,
    quiet_hours_enabled
  ) VALUES (
    p_child_token,
    p_parent_token,
    true,
    10,
    '22:00',
    '08:00',
    true
  )
  ON CONFLICT (magic_token) DO NOTHING
  RETURNING * INTO v_settings;

  RETURN v_settings;
END;
$$;
