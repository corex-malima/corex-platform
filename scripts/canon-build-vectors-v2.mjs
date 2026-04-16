import { join } from "node:path";
import { writeFile } from "node:fs/promises";

import { open } from "shapefile";
import proj4 from "proj4";

import {
  canonDir,
  ensureDir,
  loadPipelineConfig,
  publicDataDir,
} from "./canon-pipeline-utils.mjs";

function pickString(properties, keys) {
  for (const key of keys) {
    const value = properties[key];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }

    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
  }

  return "";
}

function pickNumber(properties, keys) {
  for (const key of keys) {
    const value = properties[key];
    const numericValue = typeof value === "number" ? value : Number.parseFloat(String(value ?? ""));

    if (Number.isFinite(numericValue)) {
      return Math.round(numericValue);
    }
  }

  return 0;
}

function reprojectRing(ring, sourceProj, targetProj) {
  return ring.map(([x, y]) => {
    const [lng, lat] = proj4(sourceProj, targetProj, [x, y]);
    return [
      Math.round(lng * 1e7) / 1e7,
      Math.round(lat * 1e7) / 1e7,
    ];
  });
}

function reprojectGeometry(geometry, sourceProj, targetProj) {
  if (geometry.type === "Polygon") {
    return { ...geometry, coordinates: geometry.coordinates.map((ring) => reprojectRing(ring, sourceProj, targetProj)) };
  }

  if (geometry.type === "MultiPolygon") {
    return {
      ...geometry,
      coordinates: geometry.coordinates.map((polygon) =>
        polygon.map((ring) => reprojectRing(ring, sourceProj, targetProj)),
      ),
    };
  }

  return geometry;
}

async function convertShapefile({ shpPath, dbfPath, outputName, sourceProj, targetProj }) {
  const source = await open(shpPath, dbfPath, { encoding: "UTF-8" });
  const features = [];
  let count = 0;

  while (true) {
    const { done, value } = await source.read();
    if (done) {
      break;
    }

    const properties = value.properties ?? {};
    const bloquePad = pickString(properties, ["Bloque_Pad", "BLOQUE_PAD", "bloquePad"]);
    const bloque = pickString(properties, ["Bloque", "BLOQUE", "bloque"]) || bloquePad;
    const valvula = pickString(properties, ["Valvula", "VALVULA", "valvula"]);
    const cama = pickNumber(properties, ["Cama", "CAMA", "cama"]);
    const valveId = bloquePad && valvula ? `${bloquePad}-${valvula}` : bloquePad || bloque;
    const bedId = valveId && cama ? `${valveId}-${cama}` : cama ? String(cama) : valveId;

    features.push({
      type: "Feature",
      geometry: reprojectGeometry(value.geometry, sourceProj, targetProj),
      properties: {
        id: Number(properties.Id ?? properties.ID ?? count) || count,
        bloque,
        bloquePad,
        cama,
        valvula,
        valveId,
        bedId,
      },
    });

    count += 1;
  }

  const geojson = {
    type: "FeatureCollection",
    features,
  };

  const processedDir = join(canonDir, "processed", "vectors");
  await Promise.all([ensureDir(processedDir), ensureDir(publicDataDir)]);

  const processedPath = join(processedDir, outputName);
  const publicPath = join(publicDataDir, outputName);
  const payload = `${JSON.stringify(geojson)}\n`;

  await Promise.all([writeFile(processedPath, payload, "utf8"), writeFile(publicPath, payload, "utf8")]);
  return features.length;
}

const config = await loadPipelineConfig();

const campoCount = await convertShapefile({
  shpPath: join(canonDir, "raw", "vectors", "Capas_Bloque.shp"),
  dbfPath: join(canonDir, "raw", "vectors", "Capas_Bloque.dbf"),
  outputName: "campo-geo.json",
  sourceProj: config.projections.source.proj4,
  targetProj: config.projections.target.proj4,
});
console.log(`Built campo-geo.json con ${campoCount} features.`);

const sjpCount = await convertShapefile({
  shpPath: join(canonDir, "raw", "sjp", "Bloques_Camas.shp"),
  dbfPath: join(canonDir, "raw", "sjp", "Bloques_Camas.dbf"),
  outputName: "sjp-geo.json",
  sourceProj: config.projections.source.proj4,
  targetProj: config.projections.target.proj4,
});
console.log(`Built sjp-geo.json con ${sjpCount} features.`);

console.log("Vector build canon v2 listo.");
