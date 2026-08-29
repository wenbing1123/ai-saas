import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema';

const DATABASE_URL = process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/ai_saas';

declare global {
  // eslint-disable-next-line no-var
  var pgClient: postgres.Sql | undefined;
  // eslint-disable-next-line no-var
  var db: ReturnType<typeof drizzle<typeof schema>> | undefined;
}

function createClient() {
  return postgres(DATABASE_URL, {
    max: 10,
    idle_timeout: 30,
    connect_timeout: 10,
    prepare: true,
  });
}

export function getDb() {
  if (!globalThis.pgClient) {
    globalThis.pgClient = createClient();
    globalThis.db = drizzle(globalThis.pgClient, { schema });
  }
  return globalThis.db!;
}

export function getPgClient() {
  if (!globalThis.pgClient) {
    globalThis.pgClient = createClient();
  }
  return globalThis.pgClient;
}

export async function closeDb() {
  if (globalThis.pgClient) {
    await globalThis.pgClient.end();
    globalThis.pgClient = undefined;
    globalThis.db = undefined;
  }
}