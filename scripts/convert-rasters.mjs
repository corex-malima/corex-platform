/**
 * Converts NDVI/NDRE/LCI GeoTIFFs to color-mapped PNGs for Leaflet ImageOverlay.
 *
 * Classified raster values 1–4 are mapped to a 4-color ramp:
 *   1 = low    → red        (#DC2626)
 *   2 = medium → yellow     (#EAB308)
 *   3 = good   → light green (#86EFAC)
 *   4 = high   → dark green  (#16A34A)
 *   0 = no-data → transparent
 *
 * Output:
 *   public/rasters/{ndvi,ndre,lci}.png  (downsampled to ≤2000px wide)
 *   public/rasters/bounds.json          (Leaflet [[lat,lng],[lat,lng]] per layer)
 *
 * Run: node scripts/convert-rasters.mjs
 * Requirements: npm install geotiff pngjs (both already installed)
 */

import { fromFile } from "geotiff";
import { PNG }      from "pngjs";
import proj4        from "proj4";
import { writeFileSync, mkdirSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir   = join(__dirname, "..");
const outDir    = join(rootDir, "public", "rasters");
mkdirSync(outDir, { recursive: true });

// ── CRS ────────────────────────────────────────────────────────────────────────
const UTM17S = "+proj=utm +zone=17 +south +datum=WGS84 +units=m +no_defs";
const WGS84  = "+proj=longlat +datum=WGS84 +no_defs";

// ── Color ramp: classified value → [R,G,B,A] ─────────────────────────────────
const RAMP = {
  1: [220, 38,  38,  210],   // low
  2: [234, 179,  8,  210],   // medium-low
  3: [134, 239, 172, 210],   // medium-high
  4: [22,  163,  74, 210],   // high
};
const NO_DATA = [0, 0, 0, 0];  // transparent

// ── Downsample factor: 2 = sample every 2nd pixel (high quality) ──────────────
const FIXED_FACTOR = 2;

const LAYERS = [
  { name: "ndvi", file: "NDVI.tif" },
  { name: "ndre", file: "NDRE.tif" },
  { name: "lci",  file: "LCI.tif"  },
];

const boundsMap = {};

for (const { name, file } of LAYERS) {
  const tifPath = join(rootDir, "Capas", file);
  console.log(`\nProcessing ${file}…`);

  const tiff  = await fromFile(tifPath);
  const image = await tiff.getImage();

  const srcWidth  = image.getWidth();
  const srcHeight = image.getHeight();
  const bbox      = image.getBoundingBox(); // [xmin, ymin, xmax, ymax] in UTM

  // Convert UTM bbox corners to WGS84
  const [swLng, swLat] = proj4(UTM17S, WGS84, [bbox[0], bbox[1]]);
  const [neLng, neLat] = proj4(UTM17S, WGS84, [bbox[2], bbox[3]]);
  boundsMap[name] = [[swLat, swLng], [neLat, neLng]]; // Leaflet [[lat,lng],[lat,lng]]
  console.log(`  Source: ${srcWidth}×${srcHeight}px`);
  console.log(`  Bounds: SW=[${swLng.toFixed(6)}, ${swLat.toFixed(6)}] NE=[${neLng.toFixed(6)}, ${neLat.toFixed(6)}]`);

  // Compute downsample factor: fixed factor 2 (sample every 2nd pixel)
  const factor = FIXED_FACTOR;
  const outWidth  = Math.ceil(srcWidth  / factor);
  const outHeight = Math.ceil(srcHeight / factor);
  console.log(`  Downsampling ×${factor} → ${outWidth}×${outHeight}px`);

  // Read band 1 with Leaflet window (full extent)
  const rasters = await image.readRasters({ interleave: true });
  // rasters is a TypedArray (Uint8/Float32/etc.)
  const raw = rasters instanceof DataView ? null : rasters;
  if (!raw) { console.warn("  Could not read raster data, skipping."); continue; }

  // Build PNG via pngjs
  const png = new PNG({ width: outWidth, height: outHeight, filterType: -1 });

  for (let outY = 0; outY < outHeight; outY++) {
    for (let outX = 0; outX < outWidth; outX++) {
      const srcX = Math.min(outX * factor, srcWidth  - 1);
      const srcY = Math.min(outY * factor, srcHeight - 1);
      const srcIdx = srcY * srcWidth + srcX;

      // Get pixel value (may be int or float)
      let val = typeof raw[srcIdx] === "number" ? Math.round(raw[srcIdx]) : 0;
      if (val < 1 || val > 4) val = 0;  // treat out-of-range as no-data

      const color = val === 0 ? NO_DATA : (RAMP[val] ?? NO_DATA);
      const dstIdx = (outY * outWidth + outX) * 4;
      png.data[dstIdx]     = color[0];
      png.data[dstIdx + 1] = color[1];
      png.data[dstIdx + 2] = color[2];
      png.data[dstIdx + 3] = color[3];

      if (outX === 0 && outY % 200 === 0) {
        process.stdout.write(`  Row ${outY}/${outHeight}\r`);
      }
    }
  }

  const buf = PNG.sync.write(png, { deflateLevel: 9 });
  const outPath = join(outDir, `${name}.png`);
  writeFileSync(outPath, buf);

  const sizeMB = (buf.length / 1024 / 1024).toFixed(1);
  console.log(`\n  Saved → public/rasters/${name}.png (${sizeMB} MB)`);
}

// Save bounds for Leaflet
const boundsPath = join(outDir, "bounds.json");
writeFileSync(boundsPath, JSON.stringify(boundsMap, null, 2));
console.log("\nWrote public/rasters/bounds.json");
console.log("\nDone! Add ImageOverlay in campo-map.tsx is already wired — just refresh the app.");
