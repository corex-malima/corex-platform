import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";

import type {
  PoscosechaClasificacionModeResult,
  PoscosechaClasificacionRecipeResult,
} from "@/lib/postcosecha-clasificacion-en-blanco-types";

type FallbackFlowRow = {
  label: string;
  incoming: number;
  resolved: number;
  remaining: number;
  compliance: number;
};

type FallbackRecipeEntry = {
  sku: string;
  recipe: PoscosechaClasificacionRecipeResult | null;
};

type FallbackRunRow = PoscosechaClasificacionModeResult & {
  flow: FallbackFlowRow;
  recipes: FallbackRecipeEntry[];
};

const execFileAsync = promisify(execFile);

const BUNDLED_PYTHON_BIN = resolve(
  homedir(),
  ".cache",
  "codex-runtimes",
  "codex-primary-runtime",
  "dependencies",
  "python",
  "python.exe",
);

export async function generateClasificacionFallbackPdf(
  runs: FallbackRunRow[],
  exportDate: Date,
): Promise<Buffer> {
  const workDir = await mkdtemp(join(tmpdir(), "solver_clas_pdf_"));
  const inputPath = join(workDir, "input.json");
  const outputPath = join(workDir, "output.pdf");
  const scriptPath = resolve(process.cwd(), "scripts", "generate_solver_clasificacion_pdf.py");

  try {
    await writeFile(
      inputPath,
      JSON.stringify({
        exportDate: exportDate.toISOString(),
        runs,
      }),
      "utf-8",
    );

    await execFileAsync(BUNDLED_PYTHON_BIN, [scriptPath, "--input-json", inputPath, "--output-pdf", outputPath], {
      windowsHide: true,
      timeout: 120_000,
      maxBuffer: 10 * 1024 * 1024,
    });

    return await readFile(outputPath);
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}
