/**
 * Converts Capas/Capas_Bloque.shp (UTM Zone 17S) to public/data/campo-geo.json (WGS84)
 * Each feature = one bed polygon with properties: bloque, bloquePad, cama, valvula
 *
 * Run: node scripts/convert-shapefile.mjs
 */

import { writeFileSync, mkdirSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { open } from "shapefile";
import proj4 from "proj4";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");

// UTM Zone 17S (EPSG:32717) → WGS84 (EPSG:4326)
const UTM17S = "+proj=utm +zone=17 +south +datum=WGS84 +units=m +no_defs";
const WGS84  = "+proj=longlat +datum=WGS84 +no_defs";

function reprojectRing(ring) {
  return ring.map(([x, y]) => {
    const [lng, lat] = proj4(UTM17S, WGS84, [x, y]);
    return [
      Math.round(lng * 1e7) / 1e7,
      Math.round(lat * 1e7) / 1e7,
    ];
  });
}

function reprojectGeometry(geom) {
  if (geom.type === "Polygon") {
    return { ...geom, coordinates: geom.coordinates.map(reprojectRing) };
  }
  if (geom.type === "MultiPolygon") {
    return {
      ...geom,
      coordinates: geom.coordinates.map((poly) => poly.map(reprojectRing)),
    };
  }
  return geom;
}

const shpPath = join(rootDir, "Capas", "Capas_Bloque.shp");
const dbfPath = join(rootDir, "Capas", "Capas_Bloque.dbf");
const outPath = join(rootDir, "public", "data", "campo-geo.json");

console.log("Reading shapefile…");
const source = await open(shpPath, dbfPath, { encoding: "UTF-8" });

const features = [];
let count = 0;

while (true) {
  const { done, value } = await source.read();
  if (done) break;

  const p = value.properties || {};
  const bloquePad = (p.Bloque_Pad || "").trim();
  const bloque    = (p.Bloque     || "").trim();
  const valvula   = (p.Valvula    || "").trim();
  const cama      = Math.round(parseFloat(p.Cama) || 0);

  // Derived composite keys matching DB conventions
  // bed_id format in DB: parentBlock-valve-bed  e.g. "313-A-1"
  const valveId = bloquePad && valvula ? `${bloquePad}-${valvula}` : bloque;
  const bedId   = valveId ? `${valveId}-${cama}` : String(cama);

  features.push({
    type: "Feature",
    geometry: reprojectGeometry(value.geometry),
    properties: {
      id:        Number(p.Id) || count,
      bloque,
      bloquePad,
      cama,
      valvula,
      valveId,  // "313-A"
      bedId,    // "313-A-1"
    },
  });

  count++;
  if (count % 500 === 0) process.stdout.write(`  ${count} features…\r`);
}

const geojson = { type: "FeatureCollection", features };

mkdirSync(join(rootDir, "public", "data"), { recursive: true });
writeFileSync(outPath, JSON.stringify(geojson));
console.log(`\nWrote ${features.length} features to public/data/campo-geo.json`);

// ── Compute bounding box of entire dataset ──────────────────────────────────
let minLng =  Infinity, maxLng = -Infinity;
let minLat =  Infinity, maxLat = -Infinity;
for (const f of features) {
  const coords = f.geometry.type === "Polygon"
    ? f.geometry.coordinates.flat()
    : f.geometry.coordinates.flat(2);
  for (const [lng, lat] of coords) {
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  }
}
console.log(`Bounds: SW=[${minLng.toFixed(6)}, ${minLat.toFixed(6)}] NE=[${maxLng.toFixed(6)}, ${maxLat.toFixed(6)}]`);

// ── Unique blocks summary ───────────────────────────────────────────────────
const blocks  = new Set(features.map((f) => f.properties.bloquePad));
const valves  = new Set(features.map((f) => f.properties.valveId));
console.log(`Unique parent blocks: ${blocks.size}`);
console.log(`Unique valves (block-valve): ${valves.size}`);
console.log(`Total beds: ${features.length}`);
