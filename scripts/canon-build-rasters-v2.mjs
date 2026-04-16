import { join } from "node:path";
import { writeFile } from "node:fs/promises";

import { fromFile } from "geotiff";
import proj4 from "proj4";
import sharp from "sharp";

import {
  canonDir,
  clamp,
  ensureDir,
  loadPipelineConfig,
  publicRastersDir,
  writeJson,
} from "./canon-pipeline-utils.mjs";

const RAMP = {
  1: [220, 38, 38, 210],
  2: [234, 179, 8, 210],
  3: [134, 239, 172, 210],
  4: [22, 163, 74, 210],
};
const NO_DATA = [0, 0, 0, 0];

const config = await loadPipelineConfig();
const processedRastersDir = join(canonDir, "processed", "rasters");
await Promise.all([ensureDir(processedRastersDir), ensureDir(publicRastersDir)]);

const requestedQuality = Number(process.env.CANON_WEBP_QUALITY || config.webpQualityDefault);
const webpQuality = clamp(
  Number.isFinite(requestedQuality) ? requestedQuality : config.webpQualityDefault,
  config.webpQualityMin,
  config.webpQualityMax,
);
const requestedDownsample = Number(process.env.CANON_DOWNSAMPLE_FACTOR || config.downsampleFactor);
const downsampleFactor = Math.max(1, Math.round(Number.isFinite(requestedDownsample) ? requestedDownsample : config.downsampleFactor));

const boundsMap = {};

for (const layer of config.layers) {
  const tifPath = join(canonDir, "raw", "rasters", layer.source);
  const tiff = await fromFile(tifPath);
  const image = await tiff.getImage();
  const srcWidth = image.getWidth();
  const srcHeight = image.getHeight();
  const bbox = image.getBoundingBox();

  const [swLng, swLat] = proj4(config.projections.source.proj4, config.projections.target.proj4, [
    bbox[0],
    bbox[1],
  ]);
  const [neLng, neLat] = proj4(config.projections.source.proj4, config.projections.target.proj4, [
    bbox[2],
    bbox[3],
  ]);

  boundsMap[layer.key] = [
    [swLat, swLng],
    [neLat, neLng],
  ];

  const outWidth = Math.ceil(srcWidth / downsampleFactor);
  const outHeight = Math.ceil(srcHeight / downsampleFactor);
  const raw = await image.readRasters({ interleave: true });
  const rgba = Buffer.alloc(outWidth * outHeight * 4);

  for (let outY = 0; outY < outHeight; outY += 1) {
    for (let outX = 0; outX < outWidth; outX += 1) {
      const srcX = Math.min(outX * downsampleFactor, srcWidth - 1);
      const srcY = Math.min(outY * downsampleFactor, srcHeight - 1);
      const srcIndex = srcY * srcWidth + srcX;
      let value = typeof raw[srcIndex] === "number" ? Math.round(raw[srcIndex]) : 0;

      if (value < 1 || value > 4) {
        value = 0;
      }

      const color = value === 0 ? NO_DATA : (RAMP[value] ?? NO_DATA);
      const dstIndex = (outY * outWidth + outX) * 4;

      rgba[dstIndex] = color[0];
      rgba[dstIndex + 1] = color[1];
      rgba[dstIndex + 2] = color[2];
      rgba[dstIndex + 3] = color[3];
    }
  }

  const webpBuffer = await sharp(rgba, {
    raw: {
      width: outWidth,
      height: outHeight,
      channels: 4,
    },
  })
    .webp({ quality: webpQuality, alphaQuality: 100 })
    .toBuffer();

  const processedPath = join(processedRastersDir, layer.output);
  const publicPath = join(publicRastersDir, layer.output);

  await Promise.all([writeFile(processedPath, webpBuffer), writeFile(publicPath, webpBuffer)]);
  console.log(
    `Built ${layer.output}: ${srcWidth}x${srcHeight} -> ${outWidth}x${outHeight} @ q=${webpQuality}`,
  );
}

await Promise.all([
  writeJson(join(processedRastersDir, "bounds.json"), boundsMap),
  writeJson(join(publicRastersDir, "bounds.json"), boundsMap),
]);

console.log("Raster build canon v2 listo.");
