import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { spawn } from "node:child_process";

import pg from "pg";

const { Client } = pg;

const projectRoot = resolve(process.cwd());
const envPath = resolve(projectRoot, ".env.local");

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) {
    return;
  }

  const raw = readFileSync(filePath, "utf8");

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");

    if (separatorIndex <= 0) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

function safeIdentifier(value, fallback) {
  const normalized = (value ?? fallback).trim();

  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(normalized)) {
    throw new Error(`Invalid SQL identifier: ${normalized}`);
  }

  return normalized;
}

function runPythonExport({ pythonPath, parquetPath }) {
  const pythonCode = `
import json
import sys
import pandas as pd

parquet_path = sys.argv[1]
columns = [
    "fecha",
    "tipo",
    "tipo_norm",
    "cedula_raw",
    "cedula_norm",
    "trabajador",
    "sexo",
    "edad",
    "rbc",
    "hemoglobina",
    "hematocrito",
    "wbc",
    "plaquetas",
    "glucosa",
    "colesterol",
    "trigliceridos",
    "creatinina",
    "tgo_ast",
    "tgp_alt",
    "colinesterasa",
    "source_file",
    "source_format",
]
numeric_columns = [
    "edad",
    "rbc",
    "hemoglobina",
    "hematocrito",
    "wbc",
    "plaquetas",
    "glucosa",
    "colesterol",
    "trigliceridos",
    "creatinina",
    "tgo_ast",
    "tgp_alt",
    "colinesterasa",
]

df = pd.read_parquet(parquet_path).copy()

for column in columns:
    if column not in df.columns:
        df[column] = pd.NA

df = df[columns].copy()
df["fecha"] = pd.to_datetime(df["fecha"], errors="coerce")
df = df[df["fecha"].notna() & df["cedula_norm"].notna()].copy()

for column in numeric_columns:
    df[column] = pd.to_numeric(df[column], errors="coerce")

df["fecha"] = df["fecha"].dt.strftime("%Y-%m-%d")
df = df.sort_values(["cedula_norm", "fecha", "tipo_norm"], kind="stable")
sys.stdout.write(df.to_json(orient="records", force_ascii=False))
`;

  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(pythonPath, ["-c", pythonCode, parquetPath], {
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      rejectPromise(error);
    });

    child.on("close", (code) => {
      if (code !== 0) {
        rejectPromise(new Error(stderr || `Python exporter exited with code ${code}`));
        return;
      }

      try {
        resolvePromise(JSON.parse(stdout));
      } catch (error) {
        rejectPromise(error);
      }
    });
  });
}

function chunkRows(rows, size) {
  const chunks = [];

  for (let index = 0; index < rows.length; index += size) {
    chunks.push(rows.slice(index, index + size));
  }

  return chunks;
}

function buildInsertStatement(schemaName, tableName, rows) {
  const qualifiedName = `${schemaName}.${tableName}`;
  const columns = [
    "fecha",
    "tipo",
    "tipo_norm",
    "cedula_raw",
    "cedula_norm",
    "trabajador",
    "sexo",
    "edad",
    "rbc",
    "hemoglobina",
    "hematocrito",
    "wbc",
    "plaquetas",
    "glucosa",
    "colesterol",
    "trigliceridos",
    "creatinina",
    "tgo_ast",
    "tgp_alt",
    "colinesterasa",
    "source_file",
    "source_format",
  ];
  const values = [];

  const tuples = rows.map((row, rowIndex) => {
    const baseIndex = rowIndex * columns.length;

    values.push(
      row.fecha,
      row.tipo,
      row.tipo_norm,
      row.cedula_raw,
      row.cedula_norm,
      row.trabajador,
      row.sexo,
      row.edad,
      row.rbc,
      row.hemoglobina,
      row.hematocrito,
      row.wbc,
      row.plaquetas,
      row.glucosa,
      row.colesterol,
      row.trigliceridos,
      row.creatinina,
      row.tgo_ast,
      row.tgp_alt,
      row.colinesterasa,
      row.source_file,
      row.source_format,
    );

    return `(${columns.map((_, columnIndex) => `$${baseIndex + columnIndex + 1}`).join(", ")})`;
  });

  return {
    text: `
      insert into ${qualifiedName} (
        ${columns.join(",\n        ")}
      )
      values
      ${tuples.join(",\n      ")}
    `,
    values,
  };
}

async function main() {
  loadEnvFile(envPath);

  const pythonPath =
    process.argv[2] ??
    process.env.MEDICAL_PYTHON ??
    "C:\\Users\\paul.loja\\PYPROYECTOS\\medicina\\.venv\\Scripts\\python.exe";
  const parquetPath =
    process.argv[3] ??
    process.env.MEDICAL_PARQUET_PATH ??
    "C:\\Users\\paul.loja\\PYPROYECTOS\\medicina\\base_salud_consolidada.parquet";
  const schemaName = safeIdentifier(process.env.MEDICAL_SCHEMA, "tmp_corex_salud");
  const tableName = safeIdentifier(process.env.MEDICAL_TABLE, "person_medical_exams_tmp");

  const rows = await runPythonExport({
    pythonPath,
    parquetPath,
  });

  if (!Array.isArray(rows) || !rows.length) {
    throw new Error("The parquet export returned no rows.");
  }

  const client = new Client({
    host: process.env.DATABASE_HOST,
    port: Number(process.env.DATABASE_PORT ?? "5432"),
    database: process.env.DATABASE_NAME,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined,
  });

  await client.connect();

  try {
    await client.query("begin");
    await client.query(`create schema if not exists ${schemaName}`);
    await client.query(`drop table if exists ${schemaName}.${tableName}`);
    await client.query(`
      create table ${schemaName}.${tableName} (
        exam_id bigserial primary key,
        fecha date not null,
        tipo text null,
        tipo_norm text null,
        cedula_raw text null,
        cedula_norm text not null,
        trabajador text null,
        sexo text null,
        edad numeric(12, 2) null,
        rbc numeric(12, 2) null,
        hemoglobina numeric(12, 2) null,
        hematocrito numeric(12, 2) null,
        wbc numeric(12, 2) null,
        plaquetas numeric(12, 2) null,
        glucosa numeric(12, 2) null,
        colesterol numeric(12, 2) null,
        trigliceridos numeric(12, 2) null,
        creatinina numeric(12, 2) null,
        tgo_ast numeric(12, 2) null,
        tgp_alt numeric(12, 2) null,
        colinesterasa numeric(12, 2) null,
        source_file text null,
        source_format text null,
        loaded_at timestamptz not null default now()
      )
    `);

    for (const chunk of chunkRows(rows, 200)) {
      const statement = buildInsertStatement(schemaName, tableName, chunk);
      await client.query(statement.text, statement.values);
    }

    await client.query(`
      create index ${tableName}_cedula_fecha_idx
      on ${schemaName}.${tableName} (cedula_norm, fecha desc, exam_id desc)
    `);
    await client.query(`
      create index ${tableName}_fecha_idx
      on ${schemaName}.${tableName} (fecha desc)
    `);
    await client.query("commit");

    const countResult = await client.query(`select count(*)::int as total from ${schemaName}.${tableName}`);
    console.log(
      JSON.stringify(
        {
          schema: schemaName,
          table: tableName,
          rows: countResult.rows[0]?.total ?? 0,
          parquetPath,
        },
        null,
        2,
      ),
    );
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
  } finally {
    await client.end().catch(() => {});
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
