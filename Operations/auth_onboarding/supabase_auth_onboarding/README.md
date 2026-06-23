# Supabase voter Auth onboarding

This package implements production steps 12-14:

1. Provision Supabase Auth users.
2. Link each Auth UUID to exactly one active `Voter.Voter_GUID` through `public.admin_link_voter_auth()`.
3. Reconcile all active voters and fail the cutover if coverage is not 100%.

## Important fact about the current database

`public."Voter"` has no email or phone column. `public."Temp_Users"` has a card number and password but no foreign key or other enforced relationship to `Voter`. Therefore, a production mapping cannot be inferred safely from the current schema.

Create a reviewed CSV with these columns:

```csv
voter_guid,email,full_name,card_number
1,michele@example.com,Michele Vittorio La Ferla,0455686M
```

The `card_number` field is optional metadata. The authoritative join is `voter_guid` -> generated Supabase Auth UUID.

## Prerequisites

Run these production scripts first:

```text
sql/04_security_rls.sql
sql/05_auth_mapping_and_vote_rpc.sql
```

Then run `sql/00_preflight.sql` in the Supabase SQL Editor. Every object in the first result must be non-null.

## Install the CLI helpers

```bash
cp .env.example .env
cp input/voters_to_provision.csv.example input/voters_to_provision.csv
npm install
```

Never put `SUPABASE_SERVICE_ROLE_KEY` in React, a mobile app, Git, or any browser-delivered bundle.

## A. Create an election administrator Auth user

Use Supabase Dashboard -> Authentication -> Users -> Add user. Use a real admin email and a strong unique password.

Copy the Auth user UUID into `ELECTION_ADMIN_USER_ID` in `.env`, then assign the trusted application role:

```bash
npm run set-admin-role
```

Sign out and sign back in so the refreshed JWT contains:

```json
{"app_metadata":{"app_role":"election_admin"}}
```

## B. Enroll the admin in MFA

Run:

```bash
npm run enroll-admin-mfa
```

On the first run, scan the printed QR code. Set the current six-digit code in `ELECTION_ADMIN_TOTP_CODE`, then rerun the command. The result must say `Current AAL: aal2`.

## C. Provision voter Auth users

Fill `input/voters_to_provision.csv` with a reviewed one-to-one source mapping.

Start with a dry run:

```bash
DRY_RUN=true npm run provision-voters
```

Then actually send invitations:

```bash
DRY_RUN=false npm run provision-voters
```

The script:

- validates CSV uniqueness;
- confirms every `voter_guid` exists and is active;
- reuses existing Auth users by email;
- invites missing users;
- writes `output/voter_auth_resolved.csv` containing the generated Auth UUIDs.

For a test environment, you may create users manually in the dashboard instead. Put their UUIDs directly into `output/voter_auth_resolved.csv`.

## D. Link voters through `admin_link_voter_auth()`

This function cannot be tested correctly from the SQL Editor because it checks the caller's Supabase JWT for:

- `app_metadata.app_role` = `election_admin` or `database_admin`;
- `aal` = `aal2`.

Use the authenticated admin CLI:

```bash
DRY_RUN=true npm run link-voters
DRY_RUN=false npm run link-voters
```

The script signs in as the election administrator, completes the MFA challenge, confirms AAL2, then calls:

```javascript
supabase.rpc('admin_link_voter_auth', {
  p_auth_user_id: authUserId,
  p_voter_guid: voterGuid
})
```

## E. Reconcile

Run `sql/05_reconcile_voter_auth.sql` in the Supabase SQL Editor.

Required results:

- `coverage_percent = 100.00`;
- the active-voter exception query returns zero rows;
- the inactive/deleted-voter mapping query returns zero rows;
- missing Auth user query returns zero rows;
- final `auth_mapping_gate = PASS` and `critical_failure_count = 0`.

The table already enforces one-to-one cardinality:

- `auth_user_id` is the primary key;
- `voter_guid` is unique.

Therefore one Auth user cannot map to multiple voters and one voter cannot map to multiple Auth users.

## Current sample database

The migrated sample contains one active voter with `Voter_GUID = 1`. It also contains one legacy card number, `0455686M`, but there is no foreign key proving the two records represent the same person. For local testing only, map them together after manually confirming that assumption.

## Do not do this

- Do not copy the legacy password from `Temp_Users` into Supabase Auth.
- Do not create fake production email addresses just to satisfy Auth.
- Do not expose the service-role key to React.
- Do not bulk insert mappings before resolving duplicate emails, duplicate voter GUIDs, inactive voters, and missing Auth users.
- Do not retire `Temp_Users` until the reconciliation gate passes.
