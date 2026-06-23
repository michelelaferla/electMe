import path from 'node:path';
import { anonClient, readCsv, required, isDryRun } from './common.mjs';

const supabase = anonClient();
const dryRun = isDryRun();
const email = required('ELECTION_ADMIN_EMAIL');
const password = required('ELECTION_ADMIN_PASSWORD');
const code = required('ELECTION_ADMIN_TOTP_CODE');
const inputFile = path.resolve('output/voter_auth_resolved.csv');
const rows = readCsv(inputFile).filter(r => r.auth_user_id && r.voter_guid);

const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
if (signInError) throw signInError;

const { data: factorsData, error: factorsError } = await supabase.auth.mfa.listFactors();
if (factorsError) throw factorsError;
const factor = factorsData.totp?.find(f => f.status === 'verified') || factorsData.totp?.[0];
if (!factor) throw new Error('No TOTP MFA factor found for election admin. Run npm run enroll-admin-mfa first.');

const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: factor.id });
if (challengeError) throw challengeError;
const { error: verifyError } = await supabase.auth.mfa.verify({ factorId: factor.id, challengeId: challenge.id, code });
if (verifyError) throw verifyError;

const { data: aal, error: aalError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
if (aalError) throw aalError;
console.log('Current AAL:', aal.currentLevel);
if (aal.currentLevel !== 'aal2') throw new Error('Admin session is not AAL2.');

for (const row of rows) {
  const p_auth_user_id = row.auth_user_id;
  const p_voter_guid = Number(row.voter_guid);
  if (dryRun) {
    console.log(`DRY RUN would link auth ${p_auth_user_id} -> voter ${p_voter_guid}`);
    continue;
  }
  const { error } = await supabase.rpc('admin_link_voter_auth', { p_auth_user_id, p_voter_guid });
  if (error) throw error;
  console.log(`Linked auth ${p_auth_user_id} -> voter ${p_voter_guid}`);
}
