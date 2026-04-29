import fs from "node:fs";
import path from "node:path";
import pg from "pg";

const envPath = path.resolve(process.cwd(), ".env.local");
const envFile = fs.existsSync(envPath)
  ? Object.fromEntries(
      fs.readFileSync(envPath, "utf8")
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith("#") && line.includes("="))
        .map((line) => {
          const idx = line.indexOf("=");
          return [line.slice(0, idx).trim(), line.slice(idx + 1).trim()];
        }),
    )
  : {};

const env = (key) => envFile[key] ?? process.env[key] ?? "";
const config = env("DATABASE_URL")
  ? { connectionString: env("DATABASE_URL") }
  : {
      host: env("DATABASE_HOST"),
      port: Number(env("DATABASE_PORT") || 5432),
      database: env("DATABASE_NAME"),
      user: env("DATABASE_USER"),
      password: env("DATABASE_PASSWORD"),
      ssl: env("DATABASE_SSL") === "true" ? { rejectUnauthorized: false } : undefined,
    };

const sqlPath = path.resolve(process.cwd(), "sql", "admin_masters.sql");
const pool = new pg.Pool(config);

try {
  console.info("[SQL] Aplicando sql/admin_masters.sql ...");
  await pool.query(fs.readFileSync(sqlPath, "utf8"));
  console.info("[SQL] Aplicado correctamente.");
} finally {
  await pool.end();
}
