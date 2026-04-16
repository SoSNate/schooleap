-- ─── get_child_goals ─────────────────────────────────────────────────────────
-- Returns the goals set by the parent for the child identified by token.
-- Called from GameApp.jsx on every /play load, results displayed in Menu.jsx.
--
-- Usage: supabase.rpc('get_child_goals', { p_token: '<child-token>' })
-- Returns: SETOF goals (id, parent_id, title, reward, created_at)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_child_goals(p_token TEXT)
RETURNS TABLE (
  id          UUID,
  parent_id   UUID,
  title       TEXT,
  reward      TEXT,
  created_at  TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_parent_id UUID;
BEGIN
  -- Resolve child token → parent_id
  SELECT c.parent_id
    INTO v_parent_id
    FROM children c
   WHERE c.token = p_token
   LIMIT 1;

  IF v_parent_id IS NULL THEN
    RETURN;   -- unknown token → empty result
  END IF;

  RETURN QUERY
    SELECT g.id, g.parent_id, g.title, g.reward, g.created_at
      FROM goals g
     WHERE g.parent_id = v_parent_id
     ORDER BY g.created_at DESC;
END;
$$;

-- Grant execute to anon and authenticated (RLS on goals table still applies
-- for direct table access, but SECURITY DEFINER bypasses it here intentionally
-- since we already validated the child token).
GRANT EXECUTE ON FUNCTION get_child_goals(TEXT) TO anon, authenticated;
