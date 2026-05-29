import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const MIGRATIONS_TABLE = '_migrations';
const MIGRATIONS_DIR = path.resolve(__dirname, '..', 'migrations');

async function ensureMigrationsTable() {
  const { error } = await supabase.rpc('exec_sql', {
    sql: `
      CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `
  });

  if (error) {
    // Fallback: try direct SQL via REST
    const { error: fallbackError } = await supabase
      .from(MIGRATIONS_TABLE)
      .select('id')
      .limit(1);

    if (fallbackError && fallbackError.message?.includes('relation') && fallbackError.message?.includes('does not exist')) {
      console.log('Creating migrations tracking table via raw SQL...');
      const sql = `
        CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL UNIQUE,
          applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `;

      // Execute via direct fetch to Supabase SQL endpoint
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`
        },
        body: JSON.stringify({ sql })
      });

      if (!response.ok) {
        const text = await response.text();
        console.error(`Failed to create migrations table: ${text}`);
        console.log('\nTip: Create the _migrations table manually in Supabase SQL Editor:');
        console.log(`
CREATE TABLE IF NOT EXISTS _migrations (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
        `);
        process.exit(1);
      }
    }
  }
}

async function getAppliedMigrations(): Promise<string[]> {
  const { data, error } = await supabase
    .from(MIGRATIONS_TABLE)
    .select('name')
    .order('id');

  if (error) {
    console.error('Failed to fetch applied migrations:', error.message);
    return [];
  }

  return data?.map(r => r.name) || [];
}

async function applyMigration(name: string, sql: string) {
  // Execute the migration SQL via the exec_sql RPC
  const { error } = await supabase.rpc('exec_sql', { sql });

  if (error) {
    console.error(`Failed to apply migration ${name}:`, error.message);

    // Try direct SQL execution as fallback
    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`
        },
        body: JSON.stringify({ sql })
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text);
      }
    } catch (fallbackErr: any) {
      console.error(`Migration ${name} failed via fallback as well:`, fallbackErr.message);
      console.log(`\nPlease apply this migration manually in Supabase SQL Editor:\n${sql}\n`);
      return false;
    }
  }

  // Record the migration
  const { error: recordError } = await supabase
    .from(MIGRATIONS_TABLE)
    .insert({ name });

  if (recordError) {
    console.error(`Failed to record migration ${name}:`, recordError.message);
  }

  console.log(`Applied: ${name}`);
  return true;
}

async function main() {
  console.log('Running migrations...\n');

  await ensureMigrationsTable();
  const applied = await getAppliedMigrations();

  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort();

  let count = 0;

  for (const file of files) {
    if (applied.includes(file)) {
      console.log(`Skipping (already applied): ${file}`);
      continue;
    }

    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf-8');
    const success = await applyMigration(file, sql);
    if (success) count++;
  }

  console.log(`\nDone. ${count} migration(s) applied.`);
  process.exit(0);
}

main().catch(err => {
  console.error('Migration runner failed:', err);
  process.exit(1);
});
