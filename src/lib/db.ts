import { Pool, type PoolConfig, type QueryResultRow } from "pg";

declare global {
  var __dashboardStarterPool: Pool | undefined;
}

type DatabaseSummary = {
  configured: boolean;
  source: "DATABASE_URL" | "DATABASE_HOST";
  host: string;
  port: string;
  database: string;
  ssl: boolean;
};

type DatabaseHealth = DatabaseSummary & {
  connected: boolean;
  message: string;
  checkedAt: string | null;
};

function hasUrlConfig() {
  return Boolean(process.env.DATABASE_URL);
}

function hasSplitConfig() {
  return [
    process.env.DATABASE_HOST,
    process.env.DATABASE_PORT,
    process.env.DATABASE_NAME,
    process.env.DATABASE_USER,
    process.env.DATABASE_PASSWORD,
  ].every(Boolean);
}

function sslEnabled() {
  return process.env.DATABASE_SSL === "true";
}

function buildPoolConfig(): PoolConfig | null {
  if (hasUrlConfig()) {
    return {
      connectionString: process.env.DATABASE_URL,
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
    database: process.env.DATABASE_NAME,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    ssl: sslEnabled() ? { rejectUnauthorized: false } : undefined,
    max: Number(process.env.DATABASE_POOL_MAX) || 10,
    idleTimeoutMillis: Number(process.env.DATABASE_IDLE_TIMEOUT_MS) || 30000,
  };
}

export function hasDatabaseConfig() {
  return hasUrlConfig() || hasSplitConfig();
}

export function getDatabaseConfigSummary(): DatabaseSummary {
  return {
    configured: hasDatabaseConfig(),
    source: hasUrlConfig() ? "DATABASE_URL" : "DATABASE_HOST",
    host: process.env.DATABASE_HOST ?? "pendiente",
    port: process.env.DATABASE_PORT ?? "5432",
    database: process.env.DATABASE_NAME ?? "pendiente",
    ssl: sslEnabled(),
  };
}

export function getPool() {
  const config = buildPoolConfig();

  if (!config) {
    return null;
  }

  if (!global.__dashboardStarterPool) {
    global.__dashboardStarterPool = new Pool(config);
  }

  return global.__dashboardStarterPool;
}

export async function getDatabaseHealth(): Promise<DatabaseHealth> {
  const summary = getDatabaseConfigSummary();
  const pool = getPool();

  if (!pool) {
    return {
      ...summary,
      connected: false,
      message: "Configura .env.local antes de intentar la conexion.",
      checkedAt: null,
    };
  }

  try {
    const result = await pool.query<{ current_database: string; current_time: Date }>(
      "select current_database() as current_database, now() as current_time",
    );
    const row = result.rows[0];

    return {
      ...summary,
      database: row?.current_database ?? summary.database,
      connected: true,
      message: "Conexion a PostgreSQL operativa.",
      checkedAt: row?.current_time ? new Date(row.current_time).toISOString() : null,
    };
  } catch (error) {
    return {
      ...summary,
      connected: false,
      message: error instanceof Error ? error.message : "No se pudo validar la conexion.",
      checkedAt: null,
    };
  }
}

export async function query<T extends QueryResultRow>(text: string, values: unknown[] = []) {
  const pool = getPool();

  if (!pool) {
    throw new Error("Database is not configured.");
  }

  const SLOW_QUERY_MS = Number(process.env.SLOW_QUERY_THRESHOLD_MS) || 500;
  const start = Date.now();
  const result = await pool.query<T>(text, values);
  const elapsed = Date.now() - start;

  if (elapsed > SLOW_QUERY_MS) {
    console.warn(`[DB] Slow query (${elapsed}ms): ${text.slice(0, 120)}`);
  }

  return result;
}
