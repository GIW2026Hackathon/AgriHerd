import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { Client } from 'pg';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL is required. Set it in the server environment or local .env file.');
  process.exit(1);
}

const migrationFiles = ['schema.sql', ...(await readdir('migrations')).filter((file) => file.endsWith('.sql')).sort()];
const client = new Client({ connectionString });

try {
  await client.connect();
  await client.query(`
    do $$
    begin
      if to_regclass('public._dairyhub_migrations') is null
        and to_regclass('public._agriherd_migrations') is not null then
        alter table public._agriherd_migrations rename to _dairyhub_migrations;
      end if;
    end
    $$;
  `);
  await client.query('create table if not exists public._dairyhub_migrations (filename text primary key, applied_at timestamptz not null default now())');

  for (const filename of migrationFiles) {
    const applied = await client.query('select 1 from public._dairyhub_migrations where filename = $1', [filename]);
    if (applied.rowCount) {
      console.log(`Skipped already applied migration: ${filename}`);
      continue;
    }

    const sql = await readFile(join(filename === 'schema.sql' ? '.' : 'migrations', filename), 'utf8');
    await client.query('begin');
    try {
      await client.query(sql);
      await client.query('insert into public._dairyhub_migrations (filename) values ($1)', [filename]);
      await client.query('commit');
      console.log(`Applied migration: ${filename}`);
    } catch (error) {
      await client.query('rollback');
      throw error;
    }
  }
} catch (error) {
  console.error(`Migration failed: ${error instanceof Error ? error.message : 'unknown error'}`);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => undefined);
}
