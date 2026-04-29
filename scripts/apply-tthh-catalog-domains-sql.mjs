import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import pg from "pg";

const envPath = path.resolve(".env.local");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match) process.env[match[1]] = match[2];
  }
}

const pool = new pg.Pool({
  host: process.env.DATABASE_HOST,
  port: Number(process.env.DATABASE_PORT || 5432),
  database: process.env.HUMAN_TALENT_DATABASE_NAME || "db_human_talent",
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
});

try {
  const sql = fs.readFileSync(path.resolve("sql/tthh_catalog_domains.sql"), "utf8");
  await pool.query(sql);
  console.log("tthh catalog domains applied");
} finally {
  await pool.end();
}
