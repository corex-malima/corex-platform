/**
 * Aplica sql/db_human_talent.sql contra la base db_human_talent.
 *
 * Lee credenciales desde .env.local (nunca hardcodeadas).
 * Uso:
 *   node scripts/apply-human-talent-sql.mjs
 *   node scripts/apply-human-talent-sql.mjs --env .env.production
 *
 * Para conectar a un cluster distinto, definir HUMAN_TALENT_DATABASE_URL
 * o HUMAN_TALENT_DATABASE_NAME + las vars DATABASE_HOST/PORT/USER/PASSWORD
 * habituales del proyecto.
 */

import fs from "node:fs";
import path from "node:path";
import pg from "pg";

const { Pool } = pg;

// ──────────────────────────────────────────────────────────────────────────────
// Leer env file
// ──────────────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const envFlagIndex = args.indexOf("--env");
const envFileName = envFlagIndex >= 0 ? args[envFlagIndex + 1] : ".env.local";
const envPath = path.resolve(process.cwd(), envFileName);

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.warn(`[WARN] ${filePath} no existe. Usando process.env directamente.`);
    return {};
  }

  const result = {};
  const raw = fs.readFileSync(filePath, "utf8");

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex < 0) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim();
    result[key] = value;
  }

  return result;
}

const envFile = loadEnvFile(envPath);

function env(name) {
  return (envFile[name] ?? process.env[name] ?? "").trim();
}

// ──────────────────────────────────────────────────────────────────────────────
// Construir config del pool
// ──────────────────────────────────────────────────────────────────────────────

function buildConfig() {
  const url = env("HUMAN_TALENT_DATABASE_URL");
  if (url) {
    console.info("[DB] Usando HUMAN_TALENT_DATABASE_URL");
    return { connectionString: url };
  }

  const host = env("DATABASE_HOST");
  const port = env("DATABASE_PORT");
  const user = env("DATABASE_USER");
  const password = env("DATABASE_PASSWORD");
  const database = env("HUMAN_TALENT_DATABASE_NAME") || "db_human_talent";

  if (!host || !port || !user || !password) {
    console.error(
      "[ERROR] Faltan credenciales. Define HUMAN_TALENT_DATABASE_URL " +
        "o DATABASE_HOST/PORT/USER/PASSWORD en " +
        envPath,
    );
    process.exit(1);
  }

  console.info(`[DB] Conectando a ${host}:${port}/${database}`);

  return {
    host,
    port: Number(port),
    database,
    user,
    password,
    ssl: env("DATABASE_SSL") === "true" ? { rejectUnauthorized: false } : undefined,
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────────────────────────────────────

const sqlPath = path.resolve(process.cwd(), "sql", "db_human_talent.sql");

if (!fs.existsSync(sqlPath)) {
  console.error(`[ERROR] No se encontro ${sqlPath}`);
  process.exit(1);
}

const sql = fs.readFileSync(sqlPath, "utf8");
const pool = new Pool(buildConfig());

async function main() {
  const client = await pool.connect();

  try {
    console.info("[SQL] Aplicando sql/db_human_talent.sql ...");
    await client.query(sql);
    console.info("[SQL] Aplicado correctamente.");
  } catch (error) {
    console.error("[ERROR] Fallo al aplicar SQL:", error.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
