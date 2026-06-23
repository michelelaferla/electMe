# ElectMe React Starter

Responsive React + Supabase voting app starter for Malta-style preference voting.

## Stack
- React + TypeScript + Vite
- Supabase JavaScript client
- dnd-kit sortable drag-and-drop


## Supabase connection

This React/Vite app connects to Supabase through the browser-safe Supabase API, not directly to the Postgres pooler.

Your Supabase project ref appears to be `dangsbnsuvmwhvartmik`, so use:

```env
VITE_SUPABASE_URL=https://dangsbnsuvmwhvartmik.supabase.co
VITE_SUPABASE_ANON_KEY=your anon public key from Supabase > Project Settings > API
```

Do **not** put these in a React `.env` file:

- Postgres host / port / database / user / password
- `SUPABASE_SERVICE_ROLE_KEY`
- admin email/password/TOTP values

Those are backend/admin secrets and will be exposed to every browser user if bundled into React. If any of those were committed or shared, rotate them in Supabase.

## Setup
```bash
npm install
cp .env.example .env
npm run dev
```

Fill `.env` with your Supabase project URL and anon key.

## Important database notes
Run/adapt `supabase/election_rpc.sql` after matching the column names to your existing schema.

For true anonymity, do **not** put `voter_id` on the `ballots` table. Use a separate `vote_receipts` table with a unique `(election_id, voter_id)` constraint. This enforces one vote per voter while keeping the ballot itself unlinkable from the voter in normal querying.

## App flow
1. Login with Supabase Auth.
2. Load voter profile from `get_my_voter_profile()`.
3. Show valid elections from `get_my_valid_elections()`.
4. Load candidates from the voter's matching district.
5. User reorders selected candidates by preference.
6. Submit once through `submit_ballot()`.
