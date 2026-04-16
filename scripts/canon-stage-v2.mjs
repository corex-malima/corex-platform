import { join } from "node:path";

import {
  canonDir,
  copyMatchingFiles,
  detectSourceDir,
  loadPipelineConfig,
  resetDir,
  validateRequiredFiles,
} from "./canon-pipeline-utils.mjs";

const REQUIRED_VECTOR_EXTENSIONS = [".shp", ".dbf", ".shx", ".prj"];

const config = await loadPipelineConfig();
const sourceDir = await detectSourceDir(config);
const rawRastersDir = join(canonDir, "raw", "rasters");
const rawVectorsDir = join(canonDir, "raw", "vectors");
const rawSjpDir = join(canonDir, "raw", "sjp");
const sourceSjpDir = join(sourceDir, "SJP");

await Promise.all([resetDir(rawRastersDir), resetDir(rawVectorsDir), resetDir(rawSjpDir)]);

for (const layer of config.layers) {
  await validateRequiredFiles(sourceDir, layer.source.replace(/\.tif$/i, ""), [".tif"]);
  const copiedFiles = await copyMatchingFiles(
    sourceDir,
    layer.source.replace(/\.tif$/i, ""),
    rawRastersDir,
  );
  console.log(`Staged raster ${layer.source}: ${copiedFiles.length} archivo(s)`);
}

await validateRequiredFiles(sourceDir, "Capas_Bloque", REQUIRED_VECTOR_EXTENSIONS);
const stagedVectorFiles = await copyMatchingFiles(sourceDir, "Capas_Bloque", rawVectorsDir);
console.log(`Staged Capas_Bloque: ${stagedVectorFiles.length} archivo(s)`);

await validateRequiredFiles(sourceSjpDir, "Bloques_Camas", REQUIRED_VECTOR_EXTENSIONS);
const stagedSjpFiles = await copyMatchingFiles(sourceSjpDir, "Bloques_Camas", rawSjpDir);
console.log(`Staged SJP/Bloques_Camas: ${stagedSjpFiles.length} archivo(s)`);

console.log("Stage canon v2 listo.");
