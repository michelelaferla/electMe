import qrcode from 'qrcode-terminal';
import { anonClient, required } from './common.mjs';

const supabase = anonClient();

const email = required('ELECTION_ADMIN_EMAIL');
const password = required('ELECTION_ADMIN_PASSWORD');
const code = process.env.ELECTION_ADMIN_TOTP_CODE;

const { data: signIn, error: signInError } =
    await supabase.auth.signInWithPassword({ email, password });

if (signInError) throw signInError;

console.log(`Signed in as ${signIn.user.email}`);

const { data: factorsData, error: factorsError } =
    await supabase.auth.mfa.listFactors();

if (factorsError) throw factorsError;

const factors = factorsData.totp ?? [];

let factor =
    factors.find((f) => f.status === 'verified') ??
    factors[factors.length - 1];

if (!factor || factor.status === 'verified') {
  const { data: enrolled, error: enrollError } =
      await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: `Election Admin ${Date.now()}`,
      });

  if (enrollError) throw enrollError;

  factor = enrolled;

  console.log('MFA factor ID:', enrolled.id);
  console.log('TOTP secret:', enrolled.totp.secret);

  const qrValue =
      enrolled?.totp?.uri ??
      enrolled?.totp?.qr_code ??
      enrolled?.totp?.secret;

  if (qrValue && qrValue.length < 2000) {
    console.log('Scan this QR code in your authenticator app:');
    qrcode.generate(qrValue, { small: true });
  } else {
    console.log('QR payload too large for terminal.');
    console.log('Add MFA manually using this secret:');
    console.log(enrolled.totp.secret);
  }

  console.log('Set ELECTION_ADMIN_TOTP_CODE in .env to the current 6-digit code and run this command again.');
  process.exit(0);
}

console.log(`Using MFA factor ${factor.id} with status ${factor.status}`);

if (!code) {
  console.log('Set ELECTION_ADMIN_TOTP_CODE in .env to the current 6-digit code and run again.');
  process.exit(0);
}

const { data: challenge, error: challengeError } =
    await supabase.auth.mfa.challenge({ factorId: factor.id });

if (challengeError) throw challengeError;

const { error: verifyError } =
    await supabase.auth.mfa.verify({
      factorId: factor.id,
      challengeId: challenge.id,
      code,
    });

if (verifyError) throw verifyError;

const { data: aal, error: aalError } =
    await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

if (aalError) throw aalError;

console.log('MFA verified. Current AAL:', aal.currentLevel);