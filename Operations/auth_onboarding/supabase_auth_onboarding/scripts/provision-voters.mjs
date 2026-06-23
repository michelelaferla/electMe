import path from 'node:path';
import { serviceClient, readCsv, writeCsv, isDryRun, findUserByEmail } from './common.mjs';

const admin = serviceClient();
const dryRun = isDryRun();
const inputFile = path.resolve('input/voters_to_provision.csv');
const outputFile = path.resolve('output/voter_auth_resolved.csv');
const rows = readCsv(inputFile);

const seenEmails = new Set();
const seenVoters = new Set();
const output = [];

for (const row of rows) {
  const voter_guid = Number(row.voter_guid);
  const email = String(row.email || '').trim().toLowerCase();
  if (!voter_guid || !email) throw new Error(`Bad row: ${JSON.stringify(row)}`);
  if (seenEmails.has(email)) throw new Error(`Duplicate email in CSV: ${email}`);
  if (seenVoters.has(voter_guid)) throw new Error(`Duplicate voter_guid in CSV: ${voter_guid}`);
  seenEmails.add(email); seenVoters.add(voter_guid);

  const { data: voterRows, error: voterError } = await admin
    .from('Voter')
    .select('Voter_GUID,Voter_Name,Voter_Surname,Voter_IsActive,Voter_DeletionDate')
    .eq('Voter_GUID', voter_guid)
    .limit(1);
  if (voterError) throw voterError;
  if (!voterRows?.length) throw new Error(`Voter_GUID not found: ${voter_guid}`);

  const existing = await findUserByEmail(admin, email);
  if (existing) {
    output.push({ ...row, voter_guid, email, auth_user_id: existing.id, status: 'existing' });
    console.log(`Existing auth user: ${email} -> ${existing.id}`);
    continue;
  }

  if (dryRun) {
    output.push({ ...row, voter_guid, email, auth_user_id: '', status: 'would_invite' });
    console.log(`DRY RUN would invite: ${email}`);
    continue;
  }

  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { voter_guid, full_name: row.full_name || null, card_number: row.card_number || null }
  });
  if (error) throw error;
  output.push({ ...row, voter_guid, email, auth_user_id: data.user.id, status: 'invited' });
  console.log(`Invited: ${email} -> ${data.user.id}`);
}

writeCsv(outputFile, output);
console.log(`Wrote ${outputFile}`);
