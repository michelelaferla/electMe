import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';

export function required(name) {
  const value = process.env[name];
  if (!value || value.startsWith('replace_with_')) {
    throw new Error(`Missing required .env value: ${name}`);
  }
  return value;
}

export function isDryRun() {
  return String(process.env.DRY_RUN ?? 'true').toLowerCase() !== 'false';
}

export function serviceClient() {
  return createClient(required('SUPABASE_URL'), required('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

export function anonClient() {
  return createClient(required('SUPABASE_URL'), process.env.SUPABASE_ANON_KEY || required('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

export function readCsv(file) {
  const text = fs.readFileSync(file, 'utf8');
  return parse(text, { columns: true, skip_empty_lines: true, trim: true });
}

export function writeCsv(file, rows) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, stringify(rows, { header: true }), 'utf8');
}

export async function findUserByEmail(admin, email) {
  let page = 1;
  const perPage = 1000;
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const found = data.users.find(u => String(u.email).toLowerCase() === String(email).toLowerCase());
    if (found) return found;
    if (!data.users.length || data.users.length < perPage) return null;
    page += 1;
  }
}
