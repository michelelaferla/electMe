-- ElectMe Supabase RPCs for the migrated PascalCase schema.
-- Run this in Supabase SQL Editor after confirming the table/column names match your database.

create
extension if not exists pgcrypto;

-- Helpful table defaults used by the submit_ballot function.
alter table public."Ballot"
    alter column "Ballot_ID" set default gen_random_uuid();

alter table public."Ballot"
    alter column "Submitted_Date" set default now();

-- Voter profile for the logged-in Supabase Auth user.
drop function if exists public.get_my_voter_profile();

create function public.get_my_voter_profile()
    returns table
            (
                voter_id    integer,
                full_name   text,
                district_id integer
            )
language sql
security definer
set search_path = public
as $$
select v."Voter_GUID"::integer as voter_id, concat_ws(' ', v."Voter_Name", v."Voter_Surname") as full_name,
       l."Loc_District_ID"::integer as district_id
from public."Voter" v
         left join public."Locality" l
                   on l."Loc_ID" = v."Voter_Loc_ID"
where v.auth_user_id = auth.uid();
$$;

grant
execute
on
function
public
.
get_my_voter_profile
() to authenticated;

-- Open elections that the logged-in voter has NOT already voted in.
drop function if exists public.get_my_valid_elections();

create function public.get_my_valid_elections()
    returns table
            (
                election_id   integer,
                election_name text,
                election_type text,
                starts_at     date,
                ends_at       date,
                is_valid      boolean,
                has_voted     boolean
            )
language sql
security definer
set search_path = public
as $$
select e."Election_ID"::integer as election_id, e."Election_Name"::text as election_name, e."Election_Type"::text as election_type, e."Election_StartDate"::date as starts_at, e."Election_EndDate"::date as ends_at, e."Election_IsActive"::boolean as is_valid, false as has_voted
from public."Election" e
         join public."Voter" v
              on v.auth_user_id = auth.uid()
where e."Election_IsActive" = true
  and current_date between e."Election_StartDate" and e."Election_EndDate"
  and not exists (select 1
                  from public."Ballot" b
                  where b."Election_ID" = e."Election_ID"
                    and b."Voter_ID" = v."Voter_GUID")
order by e."Election_StartDate" desc, e."Election_Name" asc;
$$;

grant
execute
on
function
public
.
get_my_valid_elections
() to authenticated;

-- Candidates for the logged-in voter's locality/district and selected election.
drop function if exists public.get_candidates_for_my_district(integer);

create function public.get_candidates_for_my_district(
    p_election_id integer
)
returns table(
                 candidate_id integer,
  first_name text,
  surname text,
  profession text,
  address text,
  photo_url text,
                 party_id     integer,
  party_name text,
  party_logo_url text
)
language sql
security definer
set search_path = public
as $$
select distinct c."Cand_ID"::integer as candidate_id, c."Cand_FirstName"::text as first_name, c."Cand_LastName"::text as surname, c."Cand_Profession"::text as profession, null::text as address, c."Cand_Logo"::text as photo_url, c."Cand_Party_ID"::integer as party_id, p."Party_Name"::text as party_name, p."Party_Logo"::text as party_logo_url
from public."Candidate" c
         join public."Candidate_Election_Locality" cel
              on cel."Cand_ID" = c."Cand_ID"
         join public."Voter" v
              on v.auth_user_id = auth.uid()
         left join public."Party" p
                   on p."Party_ID" = c."Cand_Party_ID"
where cel."Election_ID" = p_election_id
  and cel."Loc_ID" = v."Voter_Loc_ID"
order by p."Party_Name", c."Cand_LastName", c."Cand_FirstName";
$$;

grant
execute
on
function
public
.
get_candidates_for_my_district
(integer) to authenticated;

-- Submit one ballot row per selected candidate preference.
drop function if exists public.submit_ballot(integer, jsonb);

create function public.submit_ballot(
    p_election_id integer,
    p_preferences jsonb
)
    returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
v_voter_guid integer;
  v_pref
jsonb;
begin
select "Voter_GUID"::integer
into v_voter_guid
from public."Voter"
where auth_user_id = auth.uid();

if
v_voter_guid is null then
    raise exception 'No voter profile linked to this authenticated user';
end if;

  if p_preferences is null or jsonb_array_length(p_preferences) = 0 then
    raise exception 'Select at least one candidate before submitting';
end if;

  if
exists (
    select 1
    from public."Ballot"
    where "Voter_ID" = v_voter_guid
      and "Election_ID" = p_election_id
  ) then
    raise exception 'You have already submitted a ballot for this election';
end if;

for v_pref in
select *
from jsonb_array_elements(p_preferences) loop
    insert
into public."Ballot" ("Voter_ID",
                      "Election_ID",
                      "Cand_ID",
                      "Preference",
                      "Submitted_Date")
values (
    v_voter_guid, p_election_id, (v_pref->>'candidate_id'):: integer, (v_pref->>'preference'):: integer, now()
    );
end loop;

return jsonb_build_object(
        'success', true,
        'message', 'Ballot submitted successfully'
       );
end;
$$;

grant execute on function public.submit_ballot
(integer, jsonb) to authenticated;
