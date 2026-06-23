-- ElectMe Supabase RPC starter.
-- Adjust table/column names to your existing schema before running.
-- Goal: keep ballot anonymous while enforcing one vote per voter per election.

-- Recommended supporting table. This table proves a voter has voted, but does NOT store preferences.
create table if not exists public.vote_receipts (
                                                    receipt_id uuid primary key default gen_random_uuid(),
    election_id bigint not null references public."Election"("Election_ID"),
    voter_id bigint not null references public."Voter"("Voter_ID"),
    submitted_at timestamptz not null default now(),
    unique (election_id, voter_id)
    );

-- Recommended anonymous ballot header. No voter_id here.
create table if not exists public.ballots (
                                              ballot_id uuid primary key default gen_random_uuid(),
    election_id bigint not null references public."Election"("Election_ID"),
    submitted_at timestamptz not null default now()
    );

create table if not exists public.ballot_preferences (
                                                         ballot_id uuid not null references public.ballots(ballot_id) on delete cascade,
    candidate_id bigint not null references public."Candidate"("Cand_ID"),
    preference int not null check (preference > 0),
    primary key (ballot_id, preference),
    unique (ballot_id, candidate_id)
    );

-- This assumes voters.auth_user_id stores auth.uid(). Add this column if missing.
-- alter table public.voters add column if not exists auth_user_id uuid unique references auth.users(id);

create or replace function public.get_my_voter_profile()
returns table(voter_id bigint, full_name text, district_id bigint)
language sql
security definer
set search_path = public
as $$
select v."Voter_ID",
       concat_ws(' ', v."Voter_Name", v."Voter_Surname") as full_name
from "Voter" v
where v."Voter_ID" = auth.uid();
$$;

create or replace function public.get_my_valid_elections()
returns table(election_id bigint, election_name text, election_type text, starts_at timestamptz, ends_at timestamptz, is_valid boolean, has_voted boolean)
language sql
security definer
set search_path = public
as $$
select e."Election_ID",
       e."Election_Name",
       e."Election_Type",
       e."Election_StartDate",
       e."Election_EndDate",
       e."Election_IsActive",
       exists (
           select 1 from vote_receipts vr
                             join "Voter" v on v."Voter_ID" = vr.voter_id
           where vr.election_id = e."Election_ID" and v."Voter_ID" = auth.uid()
       ) as has_voted
from "Election" e
where e."Election_IsActive" = true
  and (e."Election_StartDate" is null or e."Election_StartDate" <= now())
  and (e."Election_EndDate" is null or e."Election_EndDate" >= now())
order by e."Election_StartDate" nulls last, e."Election_Name";
$$;

create or replace function public.get_candidates_for_my_district(p_election_id bigint)
returns table(
  candidate_id bigint,
  first_name text,
  surname text,
  profession text,
  address text,
  photo_url text,
  party_id bigint,
  party_name text,
  party_logo_url text
)
language sql
security definer
set search_path = public
as $$
select c."Cand_ID",
       concat_ws(' ', c."Cand_FirstName", c."Cand_LastName"),
       c."Cand_Profession",
       c."Cand_AddressLine1" ,
       c."Cand_Logo",
       p."Party_ID",
       p."Party_Name",
       p."Party_Logo" as party_logo_url
from "Voter" v
         join "Candidate_Election_Locality" cel on cel."Loc_ID" = v."Voter_Loc_ID"
         join "Candidate" c on c."Cand_ID" = cel."Cand_ID" = c."Cand_ID"
         join "Party" p on p."Party_ID" = c."Cand_Party_ID"
-- If you have a candidate_elections bridge, uncomment this:
-- join candidate_elections ce on ce.candidate_id = c.candidate_id and ce.election_id = p_election_id
where v."Voter_ID" = auth.uid()
order by p."Party_Name" asc, c."Cand_LastName" asc, c."Cand_FirstName" asc;
$$;

create or replace function public.submit_ballot(p_election_id bigint, p_preferences jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
v_voter_id bigint;
  v_district_id bigint;
  v_ballot_id uuid;
  v_invalid_count int;
begin
select "Voter_ID", district_id into v_voter_id, v_district_id
from "Voter" where "Voter_ID" = auth.uid();

if v_voter_id is null then
    raise exception 'Voter profile not found';
end if;

  if not exists (
    select 1 from "Election" e
    where e."Election_ID" = p_election_id
      and e."Election_IsActive" = true
      and (e."Election_StartDate" is null or e."Election_StartDate" <= now())
      and (e."Election_EndDate" is null or e."Election_EndDate" >= now())
  ) then
    raise exception 'Election is not open';
end if;

  if p_preferences is null or jsonb_array_length(p_preferences) = 0 then
    raise exception 'At least one preference is required';
end if;

  -- Enforce one vote first. Unique constraint blocks race conditions.
insert into vote_receipts(election_id, voter_id) values (p_election_id, v_voter_id);

-- Validate candidate IDs: must belong to same voter district.
select count(*) into v_invalid_count
from jsonb_to_recordset(p_preferences) as x(candidate_id bigint, preference int)
         left join "Candidate" c on c."Cand_ID" = x.candidate_id and c.district_id = v_district_id
where c."Cand_ID" is null or x.preference is null or x.preference <= 0;

if v_invalid_count > 0 then
    raise exception 'Invalid ballot preferences';
end if;

insert into ballots(election_id) values (p_election_id) returning ballot_id into v_ballot_id;

insert into ballot_preferences(ballot_id, candidate_id, preference)
select v_ballot_id, candidate_id, preference
from jsonb_to_recordset(p_preferences) as x(candidate_id bigint, preference int)
order by preference;

return v_ballot_id;
exception
  when unique_violation then
    raise exception 'You have already voted in this election';
end;
$$;

revoke all on function public.submit_ballot(bigint, jsonb) from public;
grant execute on function public.submit_ballot(bigint, jsonb) to authenticated;
grant execute on function public.get_my_voter_profile() to authenticated;
grant execute on function public.get_my_valid_elections() to authenticated;
grant execute on function public.get_candidates_for_my_district(bigint) to authenticated;
