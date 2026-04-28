import { Pool, type PoolClient, type PoolConfig, type QueryResultRow } from "pg";

declare global {
  var __dashboardHumanTalentPool: Pool | undefined;
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
  if (process.env.HUMAN_TALENT_DATABASE_URL) {
    return {
      connectionString: process.env.HUMAN_TALENT_DATABASE_URL,
      ssl: sslEnabled() ? { rejectUnauthorized: false } : undefined,
      max: Number(process.env.DATABASE_POOL_MAX) || 10,
      idleTimeoutMillis: Number(process.env.DATABASE_IDLE_TIMEOUT_MS) || 30000,
    };
  }

  if (!hasSplitConfig()) {
    return null;
  }

  return {
    host: process.env.DATABASE_HOST,
    port: Number(process.env.DATABASE_PORT),
    database: process.env.HUMAN_TALENT_DATABASE_NAME ?? "db_human_talent",
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    ssl: sslEnabled() ? { rejectUnauthorized: false } : undefined,
    max: Number(process.env.DATABASE_POOL_MAX) || 10,
    idleTimeoutMillis: Number(process.env.DATABASE_IDLE_TIMEOUT_MS) || 30000,
  };
}

export function getHumanTalentPool() {
  const config = buildPoolConfig();

  if (!config) {
    return null;
  }

  if (!global.__dashboardHumanTalentPool) {
    global.__dashboardHumanTalentPool = new Pool(config);
  }

  return global.__dashboardHumanTalentPool;
}

export async function queryHumanTalent<T extends QueryResultRow>(text: string, values: unknown[] = []) {
  const pool = getHumanTalentPool();
  if (!pool) {
    throw new Error("Human talent database is not configured.");
  }

  return pool.query<T>(text, values);
}

export async function withHumanTalentTransaction<T>(run: (client: PoolClient) => Promise<T>) {
  const pool = getHumanTalentPool();
  if (!pool) {
    throw new Error("Human talent database is not configured.");
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
