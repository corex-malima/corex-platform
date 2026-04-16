import { join } from "node:path";

import {
  buildFileRecord,
  canonDir,
  loadPipelineConfig,
  toRepoPath,
  walkFiles,
  writeJson,
} from "./canon-pipeline-utils.mjs";

const config = await loadPipelineConfig();

const trackedDirs = [
  join(canonDir, "raw"),
  join(canonDir, "processed"),
  join(process.cwd(), "public", "rasters"),
  join(process.cwd(), "public", "data"),
];

const allFiles = (await Promise.all(trackedDirs.map((dirPath) => walkFiles(dirPath)))).flat();
const manifestFiles = allFiles.filter((filePath) => {
  const repoPath = toRepoPath(filePath);
  return (
    repoPath.startsWith("canon_capas_v2/raw/")
    || repoPath.startsWith("canon_capas_v2/processed/")
    || repoPath === "public/rasters/bounds.json"
    || repoPath === "public/rasters/ndvi.webp"
    || repoPath === "public/rasters/ndre.webp"
    || repoPath === "public/rasters/lci.webp"
    || repoPath === "public/data/campo-geo.json"
    || repoPath === "public/data/sjp-geo.json"
  );
});

const assetsManifest = {
  generatedAt: new Date().toISOString(),
  sourceDir: config.sourceDir,
  files: await Promise.all(manifestFiles.sort().map((filePath) => buildFileRecord(filePath))),
};

const migrationMap = {
  generatedAt: new Date().toISOString(),
  assets: [
    {
      source: `${config.sourceDir}/NDVI.tif`,
      staged: "canon_capas_v2/raw/rasters/NDVI.tif",
      processed: "canon_capas_v2/processed/rasters/ndvi.webp",
      published: "public/rasters/ndvi.webp",
    },
    {
      source: `${config.sourceDir}/NDRE.tif`,
      staged: "canon_capas_v2/raw/rasters/NDRE.tif",
      processed: "canon_capas_v2/processed/rasters/ndre.webp",
      published: "public/rasters/ndre.webp",
    },
    {
      source: `${config.sourceDir}/LCI.tif`,
      staged: "canon_capas_v2/raw/rasters/LCI.tif",
      processed: "canon_capas_v2/processed/rasters/lci.webp",
      published: "public/rasters/lci.webp",
    },
    {
      source: `${config.sourceDir}/Capas_Bloque.shp`,
      staged: "canon_capas_v2/raw/vectors/Capas_Bloque.shp",
      processed: "canon_capas_v2/processed/vectors/campo-geo.json",
      published: "public/data/campo-geo.json",
    },
    {
      source: `${config.sourceDir}/SJP/Bloques_Camas.shp`,
      staged: "canon_capas_v2/raw/sjp/Bloques_Camas.shp",
      processed: "canon_capas_v2/processed/vectors/sjp-geo.json",
      published: "public/data/sjp-geo.json",
    },
    {
      source: `${config.sourceDir}/NDVI.tif + ${config.sourceDir}/NDRE.tif + ${config.sourceDir}/LCI.tif`,
      staged: "canon_capas_v2/raw/rasters/*",
      processed: "canon_capas_v2/processed/rasters/bounds.json",
      published: "public/rasters/bounds.json",
    },
  ],
};

await Promise.all([
  writeJson(join(canonDir, "manifests", "assets.json"), assetsManifest),
  writeJson(join(canonDir, "manifests", "migration-map.json"), migrationMap),
]);

console.log("Manifest canon v2 listo.");
