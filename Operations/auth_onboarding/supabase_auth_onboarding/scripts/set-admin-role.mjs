import { serviceClient, required, isDryRun } from './common.mjs';

const admin = serviceClient();
const userId = required('ELECTION_ADMIN_USER_ID');
const dryRun = isDryRun();

const { data: current, error: getError } = await admin.auth.admin.getUserById(userId);
if (getError) throw getError;

const existing = current.user.app_metadata || {};
const app_metadata = { ...existing, app_role: 'election_admin' };

console.log(`Admin user: ${current.user.email || userId}`);
console.log('New app_metadata:', JSON.stringify(app_metadata, null, 2));

if (dryRun) {
  console.log('DRY_RUN=true, no update made. Set DRY_RUN=false to apply.');
  process.exit(0);
}

const { error } = await admin.auth.admin.updateUserById(userId, { app_metadata });
if (error) throw error;
console.log('Done. Sign out and sign back in as the election admin so the JWT refreshes.');
