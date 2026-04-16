import { Pool, type PoolClient, type PoolConfig, type QueryResultRow } from "pg";

declare global {
  var __dashboardPostharvestPool: Pool | undefined;
}

function hasSplitConfig() {
  return [
    process.env.DATABASE_HOST,
    process.env.DATABASE_PORT,
    process.env.DATABASE_USER,
    process.env.DATABASE_PASSWORD,
  ].every(Boolean);
}

function sslEnabled() {
  return process.env.DATABASE_SSL === "true";
}

function buildPoolConfig(): PoolConfig | null {
  if (!hasSplitConfig()) {
    return null;
  }

  return {
    host: process.env.DATABASE_HOST,
    port: Number(process.env.DATABASE_PORT),
    database: process.env.POSTHARVEST_DATABASE_NAME ?? "db_postharvest",
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    ssl: sslEnabled() ? { rejectUnauthorized: false } : undefined,
    max: Number(process.env.DATABASE_POOL_MAX) || 10,
    idleTimeoutMillis: Number(process.env.DATABASE_IDLE_TIMEOUT_MS) || 30000,
  };
}

export function getPostharvestPool() {
  const config = buildPoolConfig();

  if (!config) {
    return null;
  }

  if (!global.__dashboardPostharvestPool) {
    global.__dashboardPostharvestPool = new Pool(config);
  }

  return global.__dashboardPostharvestPool;
}

export async function queryPostharvest<T extends QueryResultRow>(
  text: string,
  values: unknown[] = [],
) {
  const pool = getPostharvestPool();

  if (!pool) {
    throw new Error("Postharvest database is not configured.");
  }

  return pool.query<T>(text, values);
}

export async function withPostharvestTransaction<T>(
  run: (client: PoolClient) => Promise<T>,
) {
  const pool = getPostharvestPool();

  if (!pool) {
    throw new Error("Postharvest database is not configured.");
  }

  const client = await pool.connect();

  try {
    await client.query("begin");
    const result = await run(client);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}
