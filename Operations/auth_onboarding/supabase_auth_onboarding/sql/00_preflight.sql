-- Run in Supabase SQL Editor before provisioning.
SELECT
  to_regclass('public."Voter"') AS voter_table,
  to_regclass('private.voter_auth_map') AS voter_auth_map,
  to_regprocedure('public.admin_link_voter_auth(uuid,integer)') AS link_rpc,
  to_regprocedure('private.is_election_admin()') AS admin_check,
  to_regprocedure('private.has_aal2()') AS aal2_check;

SELECT
  count(*) FILTER (
    WHERE "Voter_IsActive" IS TRUE AND "Voter_DeletionDate" IS NULL
  ) AS active_voters,
  count(*) FILTER (
    WHERE "Voter_IsActive" IS NOT TRUE OR "Voter_DeletionDate" IS NOT NULL
  ) AS inactive_or_deleted_voters
FROM public."Voter";
