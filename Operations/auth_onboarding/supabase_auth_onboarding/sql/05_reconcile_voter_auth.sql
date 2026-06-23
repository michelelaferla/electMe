-- 05_reconcile_voter_auth.sql
-- Read-only reconciliation. All CRITICAL counts must be zero.

-- 1. Summary and coverage percentage.
WITH counts AS (
  SELECT
    count(*) FILTER (
      WHERE v."Voter_IsActive" IS TRUE
        AND v."Voter_DeletionDate" IS NULL
    ) AS active_voters,
    count(*) FILTER (
      WHERE v."Voter_IsActive" IS TRUE
        AND v."Voter_DeletionDate" IS NULL
        AND m.auth_user_id IS NOT NULL
        AND m.is_enabled IS TRUE
    ) AS active_voters_with_enabled_mapping
  FROM public."Voter" v
  LEFT JOIN private.voter_auth_map m
    ON m.voter_guid = v."Voter_GUID"
)
SELECT
  active_voters,
  active_voters_with_enabled_mapping,
  active_voters - active_voters_with_enabled_mapping AS unmapped_active_voters,
  round(
    100.0 * active_voters_with_enabled_mapping / NULLIF(active_voters, 0),
    2
  ) AS coverage_percent
FROM counts;

-- 2. CRITICAL: active voters without exactly one enabled mapping.
SELECT
  v."Voter_GUID",
  v."Voter_Name",
  v."Voter_Surname",
  count(m.auth_user_id) FILTER (WHERE m.is_enabled IS TRUE) AS enabled_mapping_count
FROM public."Voter" v
LEFT JOIN private.voter_auth_map m
  ON m.voter_guid = v."Voter_GUID"
WHERE v."Voter_IsActive" IS TRUE
  AND v."Voter_DeletionDate" IS NULL
GROUP BY v."Voter_GUID", v."Voter_Name", v."Voter_Surname"
HAVING count(m.auth_user_id) FILTER (WHERE m.is_enabled IS TRUE) <> 1
ORDER BY v."Voter_GUID";

-- 3. CRITICAL: enabled mappings attached to inactive/deleted voters.
SELECT
  m.auth_user_id,
  m.voter_guid,
  m.is_enabled,
  v."Voter_IsActive",
  v."Voter_DeletionDate"
FROM private.voter_auth_map m
JOIN public."Voter" v
  ON v."Voter_GUID" = m.voter_guid
WHERE m.is_enabled IS TRUE
  AND (
    v."Voter_IsActive" IS NOT TRUE
    OR v."Voter_DeletionDate" IS NOT NULL
  )
ORDER BY m.voter_guid;

-- 4. CRITICAL: mappings whose Auth user has disappeared.
-- The FK normally prevents this, but this verifies it explicitly.
SELECT m.auth_user_id, m.voter_guid
FROM private.voter_auth_map m
LEFT JOIN auth.users u
  ON u.id = m.auth_user_id
WHERE u.id IS NULL;

-- 5. Informational: disabled mappings for active voters.
SELECT
  m.auth_user_id,
  m.voter_guid,
  m.linked_at,
  m.linked_by
FROM private.voter_auth_map m
JOIN public."Voter" v
  ON v."Voter_GUID" = m.voter_guid
WHERE m.is_enabled IS FALSE
  AND v."Voter_IsActive" IS TRUE
  AND v."Voter_DeletionDate" IS NULL
ORDER BY m.voter_guid;

-- 6. Verify one-to-one uniqueness constraints are present.
SELECT
  c.conname,
  pg_get_constraintdef(c.oid) AS definition
FROM pg_constraint c
WHERE c.conrelid = 'private.voter_auth_map'::regclass
  AND c.contype IN ('p', 'u', 'f')
ORDER BY c.contype, c.conname;

-- 7. One-row go/no-go result.
WITH failures AS (
  SELECT count(*) AS failure_count
  FROM public."Voter" v
  LEFT JOIN private.voter_auth_map m
    ON m.voter_guid = v."Voter_GUID"
   AND m.is_enabled IS TRUE
  WHERE v."Voter_IsActive" IS TRUE
    AND v."Voter_DeletionDate" IS NULL
    AND m.auth_user_id IS NULL

  UNION ALL

  SELECT count(*)
  FROM private.voter_auth_map m
  JOIN public."Voter" v ON v."Voter_GUID" = m.voter_guid
  WHERE m.is_enabled IS TRUE
    AND (v."Voter_IsActive" IS NOT TRUE OR v."Voter_DeletionDate" IS NOT NULL)
)
SELECT
  CASE WHEN sum(failure_count) = 0 THEN 'PASS' ELSE 'FAIL' END AS auth_mapping_gate,
  sum(failure_count) AS critical_failure_count
FROM failures;
