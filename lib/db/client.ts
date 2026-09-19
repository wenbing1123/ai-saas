import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema';

const DATABASE_URL = process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/ai_saas';

/** Pool tunables (see .env.example). Defaults suit a small Next.js deployment. */
const POOL_MAX = Number(process.env.PG_POOL_MAX ?? 10);
const POOL_IDLE_TIMEOUT = Number(process.env.PG_IDLE_TIMEOUT ?? 30);
const POOL_CONNECT_TIMEOUT = Number(process.env.PG_CONNECT_TIMEOUT ?? 10);
const POOL_MAX_LIFETIME = Number(process.env.PG_MAX_LIFETIME ?? 1800);

declare global {
  // eslint-disable-next-line no-var
  var pgClient: postgres.Sql | undefined;
  // eslint-disable-next-line no-var
  var db: ReturnType<typeof drizzle<typeof schema>> | undefined;
}

function createClient() {
  return postgres(DATABASE_URL, {
    max: POOL_MAX,
    idle_timeout: POOL_IDLE_TIMEOUT,
    connect_timeout: POOL_CONNECT_TIMEOUT,
    max_lifetime: POOL_MAX_LIFETIME,
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

/** Callback argument type of db.transaction — repository helpers take this to enlist in an outer tx. */
export type DbTx = Parameters<Parameters<ReturnType<typeof getDb>['transaction']>[0]>[0];

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