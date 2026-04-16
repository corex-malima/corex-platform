import { createHash } from "node:crypto";
import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { basename, dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const __dirname = dirname(fileURLToPath(import.meta.url));
export const rootDir = join(__dirname, "..");
export const canonDir = join(rootDir, "canon_capas_v2");
export const configPath = join(canonDir, "config", "pipeline.config.json");
export const publicRastersDir = join(rootDir, "public", "rasters");
export const publicDataDir = join(rootDir, "public", "data");

export async function loadPipelineConfig() {
  const content = await readFile(configPath, "utf8");
  return JSON.parse(content);
}

export async function ensureDir(dirPath) {
  await mkdir(dirPath, { recursive: true });
}

export async function resetDir(dirPath) {
  await rm(dirPath, { recursive: true, force: true });
  await mkdir(dirPath, { recursive: true });
}

export async function writeJson(filePath, value) {
  await ensureDir(dirname(filePath));
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export async function detectSourceDir(config) {
  const candidates = [config.sourceDir, config.sourceDir.toLowerCase()]
    .filter(Boolean)
    .map((name) => resolve(rootDir, name));

  for (const candidate of candidates) {
    try {
      const candidateStat = await stat(candidate);
      if (candidateStat.isDirectory()) {
        return candidate;
      }
    } catch {
      // Try next candidate.
    }
  }

  throw new Error(
    `No se encontro la carpeta fuente del pipeline v2. Busque: ${candidates.map((value) => relative(rootDir, value)).join(", ")}`,
  );
}

export async function listMatchingFiles(dirPath, baseName) {
  const entries = await readdir(dirPath, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().startsWith(`${baseName.toLowerCase()}.`))
    .map((entry) => join(dirPath, entry.name));
}

export async function validateRequiredFiles(dirPath, baseName, requiredExtensions) {
  const files = await listMatchingFiles(dirPath, baseName);
  const extensions = new Set(files.map((filePath) => filePath.slice(filePath.lastIndexOf(".")).toLowerCase()));
  const missing = requiredExtensions.filter((extension) => !extensions.has(extension.toLowerCase()));

  if (missing.length) {
    throw new Error(
      `Faltan archivos requeridos para ${baseName} en ${relative(rootDir, dirPath)}: ${missing.join(", ")}`,
    );
  }

  return files;
}

export async function copyMatchingFiles(dirPath, baseName, targetDir) {
  const files = await listMatchingFiles(dirPath, baseName);
  await ensureDir(targetDir);

  await Promise.all(
    files.map(async (filePath) => {
      await cp(filePath, join(targetDir, basename(filePath)));
    }),
  );

  return files;
}

export async function sha256File(filePath) {
  const hash = createHash("sha256");
  const content = await readFile(filePath);
  hash.update(content);
  return hash.digest("hex");
}

export async function buildFileRecord(filePath) {
  const info = await stat(filePath);
  return {
    path: toRepoPath(filePath),
    sha256: await sha256File(filePath),
    size: info.size,
    mtime: info.mtime.toISOString(),
  };
}

export async function walkFiles(dirPath) {
  const entries = await readdir(dirPath, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const nextPath = join(dirPath, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await walkFiles(nextPath)));
      continue;
    }

    files.push(nextPath);
  }

  return files;
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function toRepoPath(filePath) {
  return relative(rootDir, filePath).replaceAll("\\", "/");
}
