-- ElectMe Supabase RPC starter.
-- Adjust table/column names to your existing schema before running.
-- Goal: keep ballot anonymous while enforcing one vote per voter per election.

-- Recommended supporting table. This table proves a voter has voted, but does NOT store preferences.
create table if not exists public.vote_receipts (
                                                    receipt_id
                                                    uuid
                                                    primary
                                                    key
                                                    default
                                                    gen_random_uuid
(
),
    election_id bigint not null references public.elections
(
    election_id
),
    voter_id bigint not null references public.voters
(
    voter_id
),
    submitted_at timestamptz not null default now
(
),
    unique
(
    election_id,
    voter_id
)
    );

-- Recommended anonymous ballot header. No voter_id here.
create table if not exists public.ballots (
                                              ballot_id
                                              uuid
                                              primary
                                              key
                                              default
                                              gen_random_uuid
(
),
    election_id bigint not null references public.elections
(
    election_id
),
    submitted_at timestamptz not null default now
(
)
    );

create table if not exists public.ballot_preferences (
                                                         ballot_id
                                                         uuid
                                                         not
                                                         null
                                                         references
                                                         public
                                                         .
                                                         ballots
(
                                                         ballot_id
) on delete cascade,
    candidate_id bigint not null references public.candidates
(
    candidate_id
),
    preference int not null check
(
    preference >
    0
),
    primary key
(
    ballot_id,
    preference
),
    unique
(
    ballot_id,
    candidate_id
)
    );

-- This assumes voters.auth_user_id stores auth.uid(). Add this column if missing.
-- alter table public.voters add column if not exists auth_user_id uuid unique references auth.users(id);

create or replace function public.get_my_voter_profile()
returns table(voter_id bigint, full_name text, district_id bigint)
language sql
security definer
set search_path = public
as $$
select v.voter_id,
       concat_ws(' ', v.first_name, v.surname) as full_name,
       v.district_id
from voters v
where v.auth_user_id = auth.uid();
$$;

create or replace function public.get_my_valid_elections()
returns table(election_id bigint, election_name text, election_type text, starts_at timestamptz, ends_at timestamptz, is_valid boolean, has_voted boolean)
language sql
security definer
set search_path = public
as $$
select e.election_id,
       e.election_name,
       e.election_type,
       e.starts_at,
       e.ends_at,
       e.is_valid,
       exists (
           select 1 from vote_receipts vr
                             join voters v on v.voter_id = vr.voter_id
           where vr.election_id = e.election_id
             and v.auth_user_id = auth.uid()) as has_voted
from elections e
where e.is_valid = true
  and (e.starts_at is null or e.starts_at <= now())
  and (e.ends_at is null or e.ends_at >= now())
order by e.starts_at nulls last, e.election_name;
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
select c.candidate_id,
       c.first_name,
       c.surname,
       c.profession,
       c.address,
       c.photo_url,
       p.party_id,
       p.party_name,
       p.logo_url as party_logo_url
from voters v
         join candidates c on c.district_id = v.district_id
         join parties p on p.party_id = c.party_id
-- If you have a candidate_elections bridge, uncomment this:
-- join candidate_elections ce on ce.candidate_id = c.candidate_id and ce.election_id = p_election_id
where v.auth_user_id = auth.uid()
order by p.party_name asc, c.surname asc, c.first_name asc;
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
select voter_id, district_id
into v_voter_id, v_district_id
from voters
where auth_user_id = auth.uid();

if
v_voter_id is null then
    raise exception 'Voter profile not found';
end if;

  if not exists (
    select 1 from elections e
    where e.election_id = p_election_id
      and e.is_valid = true
      and (e.starts_at is null or e.starts_at <= now())
      and (e.ends_at is null or e.ends_at >= now())
  ) then
    raise exception 'Election is not open';
end if;

  if p_preferences is null or jsonb_array_length(p_preferences) = 0 then
    raise exception 'At least one preference is required';
end if;

  -- Enforce one vote first. Unique constraint blocks race conditions.
insert into vote_receipts(election_id, voter_id)
values (p_election_id, v_voter_id);

-- Validate candidate IDs: must belong to same voter district.
select count(*)
into v_invalid_count
from jsonb_to_recordset(p_preferences) as x(candidate_id bigint, preference int)
         left join candidates c on c.candidate_id = x.candidate_id and c.district_id = v_district_id
where c.candidate_id is null
   or x.preference is null
   or x.preference <= 0;

if
v_invalid_count > 0 then
    raise exception 'Invalid ballot preferences';
end if;

insert into ballots(election_id)
values (p_election_id) returning ballot_id
into v_ballot_id;

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
