import { Client } from 'pg';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL is required. Set it in the server environment or local .env file.');
  process.exit(1);
}

const client = new Client({ connectionString });
try {
  await client.connect();
  const result = await client.query('select current_database() as database, current_user as user, now() as checked_at');
  console.log(`PostgreSQL connection succeeded: database=${result.rows[0].database}, user=${result.rows[0].user}`);
} catch (error) {
  console.error(`PostgreSQL connection failed: ${error instanceof Error ? error.message : 'unknown error'}`);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => undefined);
}
