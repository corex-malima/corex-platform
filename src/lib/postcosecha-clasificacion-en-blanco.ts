import "server-only";

import { existsSync } from "fs";
import { resolve } from "path";
import { spawn } from "child_process";

import { listCurrentPostharvestSkus } from "@/lib/postcosecha-skus";
import type { PoscosechaSkuRecord } from "@/lib/postcosecha-sku-types";
import type {
  PoscosechaClasificacionAvailabilityDerivedRow,
  PoscosechaClasificacionAvailabilityRow,
  PoscosechaClasificacionAvailabilitySeed,
  PoscosechaClasificacionBootData,
  PoscosechaClasificacionDateSlot,
  PoscosechaClasificacionLotSlot,
  PoscosechaClasificacionModeResult,
  PoscosechaClasificacionOrderRow,
  PoscosechaClasificacionOrderOrigin,
  PoscosechaClasificacionOrderSlot,
  PoscosechaClasificacionPrecheck,
  PoscosechaClasificacionRecipeInput,
  PoscosechaClasificacionRecipeResult,
  PoscosechaClasificacionResult,
  PoscosechaClasificacionRunMode,
  PoscosechaClasificacionRunInput,
  PoscosechaClasificacionSettings,
  SolverDateKey,
} from "@/lib/postcosecha-clasificacion-en-blanco-types";
import {
  POSCOSECHA_CLASIFICACION_RUN_MODES,
  SOLVER_DATE_KEYS,
} from "@/lib/postcosecha-clasificacion-en-blanco-types";

type SolverBridgeDefaults = {
  settings?: Partial<PoscosechaClasificacionSettings>;
  availability_template?: Array<{
    grado?: number;
    peso_tallo_seed?: number;
  }>;
  workbook_path?: string | null;
  master_path?: string | null;
};

const DEFAULT_SETTINGS: PoscosechaClasificacionSettings = {
  desperdicio: 0.13,
};

const DEFAULT_AVAILABILITY_SEEDS: PoscosechaClasificacionAvailabilitySeed[] = [
  { grado: 15, pesoTalloSeed: 15 },
  { grado: 20, pesoTalloSeed: 20 },
  { grado: 25, pesoTalloSeed: 28.62 },
  { grado: 30, pesoTalloSeed: 31.15 },
  { grado: 35, pesoTalloSeed: 35.27 },
  { grado: 40, pesoTalloSeed: 40.25 },
  { grado: 45, pesoTalloSeed: 46.91 },
  { grado: 50, pesoTalloSeed: 51.21 },
  { grado: 55, pesoTalloSeed: 56.89 },
  { grado: 60, pesoTalloSeed: 63.08 },
  { grado: 65, pesoTalloSeed: 65.65 },
  { grado: 70, pesoTalloSeed: 71.36 },
  { grado: 75, pesoTalloSeed: 77.38 },
];

const BRIDGE_SCRIPT_PATH = resolve(
  process.cwd(),
  "scripts",
  "solver_clasificacion_en_blanco_bridge.py",
);

const LEGACY_SOLVER_PYTHON = resolve(
  process.cwd(),
  "..",
  "solver_poscosecha",
  "venv",
  "Scripts",
  "python.exe",
);

declare global {
  var __dashboardClasificacionEnBlancoDefaultsPromise:
    | Promise<{
        settings: PoscosechaClasificacionSettings;
        availabilitySeeds: PoscosechaClasificacionAvailabilitySeed[];
        workbookPath: string | null;
        masterPath: string | null;
        usedFallbackDefaults: boolean;
      }>
    | undefined;
}

function toNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toInteger(value: unknown, fallback = 0) {
  return Math.round(toNumber(value, fallback));
}

export function excelRound(value: number, digits = 0) {
  const factor = 10 ** digits;
  const scaled = value * factor;
  const rounded = scaled >= 0 ? Math.floor(scaled + 0.5) : Math.ceil(scaled - 0.5);
  return rounded / factor;
}

function sanitizeSettings(
  input: Partial<PoscosechaClasificacionSettings> | null | undefined,
): PoscosechaClasificacionSettings {
  const desperdicio = Math.min(Math.max(toNumber(input?.desperdicio, DEFAULT_SETTINGS.desperdicio), 0), 0.95);

  return {
    desperdicio: Math.round(desperdicio * 10000) / 10000,
  };
}

function normalizeAvailabilitySeeds(
  seeds: PoscosechaClasificacionAvailabilitySeed[],
) {
  return seeds
    .map((seed) => ({
      grado: Math.max(toInteger(seed.grado, 0), 1),
      pesoTalloSeed: Math.max(toNumber(seed.pesoTalloSeed, 0), 0),
    }))
    .filter((seed) => seed.grado > 0)
    .sort((left, right) => left.grado - right.grado);
}

function buildFallbackDefaults() {
  return {
    settings: DEFAULT_SETTINGS,
    availabilitySeeds: normalizeAvailabilitySeeds(DEFAULT_AVAILABILITY_SEEDS),
    workbookPath: null,
    masterPath: null,
    usedFallbackDefaults: true,
  };
}

function ensureSolverEngineAvailable() {
  if (!existsSync(BRIDGE_SCRIPT_PATH)) {
    throw new Error("No se encontro el puente local del solver de clasificacion en blanco.");
  }

  const envPython = process.env.POSTHARVEST_SOLVER_PYTHON?.trim() ?? "";
  const localCandidates = [
    envPython,
    resolve(process.cwd(), ".venv", "Scripts", "python.exe"),
    resolve(process.cwd(), ".venv", "bin", "python"),
    resolve(process.cwd(), "venv", "Scripts", "python.exe"),
    resolve(process.cwd(), "venv", "bin", "python"),
    LEGACY_SOLVER_PYTHON,
    "python",
    "python3",
  ].filter(Boolean);

  for (const candidate of localCandidates) {
    const looksLikePath = candidate.includes("\\") || candidate.includes("/");

    if (!looksLikePath || existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error(
    "No se encontro un interprete Python compatible para el solver de postcosecha.",
  );
}

async function runBridge<T>(
  command: "defaults" | "solve" | "recipe",
  payload?: unknown,
) {
  const solverPython = ensureSolverEngineAvailable();

  return new Promise<T>((resolvePromise, rejectPromise) => {
    const child = spawn(solverPython, [BRIDGE_SCRIPT_PATH, command], {
      cwd: process.cwd(),
      env: process.env,
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
    });

    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });

    child.on("error", (error) => {
      rejectPromise(error);
    });

    child.on("close", (code) => {
      if (code !== 0) {
        rejectPromise(new Error(stderr.trim() || "No se pudo ejecutar el solver de clasificacion en blanco."));
        return;
      }

      try {
        const parsed = JSON.parse(stdout) as T;
        resolvePromise(parsed);
      } catch (error) {
        rejectPromise(
          error instanceof Error
            ? error
            : new Error("El solver devolvio una respuesta invalida."),
        );
      }
    });

    if (payload !== undefined) {
      child.stdin.write(JSON.stringify(payload));
    }

    child.stdin.end();
  });
}

async function loadSolverDefaults() {
  if (!global.__dashboardClasificacionEnBlancoDefaultsPromise) {
    global.__dashboardClasificacionEnBlancoDefaultsPromise = (async () => {
      try {
        const payload = await runBridge<SolverBridgeDefaults>("defaults");

        const availabilitySeeds = normalizeAvailabilitySeeds(
          (payload.availability_template ?? []).map((row) => ({
            grado: toInteger(row.grado, 0),
            pesoTalloSeed: toNumber(row.peso_tallo_seed, 0),
          })),
        );

        if (availabilitySeeds.length === 0) {
          return buildFallbackDefaults();
        }

        return {
          settings: sanitizeSettings(payload.settings),
          availabilitySeeds,
          workbookPath: payload.workbook_path ?? null,
          masterPath: payload.master_path ?? null,
          usedFallbackDefaults: false,
        };
      } catch {
        return buildFallbackDefaults();
      }
    })();
  }

  return global.__dashboardClasificacionEnBlancoDefaultsPromise;
}

export function buildClasificacionOrdersTemplate(
  skuMaster: PoscosechaSkuRecord[],
): PoscosechaClasificacionOrderRow[] {
  return skuMaster.map((record) => ({
    skuId: record.skuId,
    sku: record.sku,
    fecha_1: 0,
    fecha_2: 0,
    fecha_3: 0,
    fecha_4: 0,
    fecha_5: 0,
  }));
}

export function buildClasificacionOrderSlotsTemplate(): PoscosechaClasificacionOrderSlot[] {
  return [{ key: SOLVER_DATE_KEYS[0], restriction: null, restrictionMode: "SOFT" }];
}

export function buildClasificacionLotSlotsTemplate(): PoscosechaClasificacionLotSlot[] {
  return [{ key: SOLVER_DATE_KEYS[0], lotDate: null, origin: "GV" }];
}

export function buildClasificacionDateSlotsTemplate(): PoscosechaClasificacionDateSlot[] {
  return [{
    key: SOLVER_DATE_KEYS[0],
    lotDate: null,
    origin: "GV",
    restriction: null,
    restrictionMode: "SOFT",
  }];
}

export function buildClasificacionAvailabilityTemplate(
  seeds: PoscosechaClasificacionAvailabilitySeed[],
): PoscosechaClasificacionAvailabilityRow[] {
  return seeds.map((seed) => ({
    grado: seed.grado,
    pesoTalloSeed: Math.round(seed.pesoTalloSeed * 100) / 100,
    fecha_1: 0,
    fecha_2: 0,
    fecha_3: 0,
    fecha_4: 0,
    fecha_5: 0,
  }));
}

function sanitizeOrigin(value: unknown): PoscosechaClasificacionOrderOrigin {
  return value === "APERTURA" || value === "PRECLASIFICACION" ? value : "GV";
}

function sanitizeRestriction(value: unknown): PoscosechaClasificacionOrderOrigin | null {
  return value === "GV" || value === "APERTURA" || value === "PRECLASIFICACION"
    ? value
    : null;
}

function sanitizeRestrictionMode(value: unknown): PoscosechaClasificacionOrderSlot["restrictionMode"] {
  return value === "STRICT" ? "STRICT" : "SOFT";
}

function sanitizeOrderSlots(
  slots: PoscosechaClasificacionOrderSlot[] | PoscosechaClasificacionDateSlot[] | null | undefined,
): PoscosechaClasificacionOrderSlot[] {
  const fallback = buildClasificacionOrderSlotsTemplate();
  const source = Array.isArray(slots) && slots.length > 0 ? slots : fallback;
  const seen = new Set<string>();

  return source
    .map((slot) => ({
      key: (SOLVER_DATE_KEYS as readonly string[]).includes(slot.key)
        ? (slot.key as SolverDateKey)
        : SOLVER_DATE_KEYS[0],
      restriction: sanitizeRestriction(slot.restriction),
      restrictionMode: sanitizeRestrictionMode(slot.restrictionMode),
    }))
    .filter((slot) => {
      if (seen.has(slot.key)) return false;
      seen.add(slot.key);
      return true;
    });
}

function sanitizeLotSlots(
  slots: PoscosechaClasificacionLotSlot[] | PoscosechaClasificacionDateSlot[] | null | undefined,
): PoscosechaClasificacionLotSlot[] {
  const fallback = buildClasificacionLotSlotsTemplate();
  const source = Array.isArray(slots) && slots.length > 0 ? slots : fallback;
  const seen = new Set<string>();

  return source
    .map((slot) => ({
      key: (SOLVER_DATE_KEYS as readonly string[]).includes(slot.key)
        ? (slot.key as SolverDateKey)
        : SOLVER_DATE_KEYS[0],
      lotDate:
        typeof slot.lotDate === "string" && slot.lotDate.trim().length > 0
          ? slot.lotDate.trim()
          : null,
      origin: sanitizeOrigin(slot.origin),
    }))
    .filter((slot) => {
      if (seen.has(slot.key)) return false;
      seen.add(slot.key);
      return true;
    });
}

function originMatchesMode(
  origin: PoscosechaClasificacionOrderOrigin,
  mode: PoscosechaClasificacionRunMode,
) {
  return origin === mode;
}

function slotCanBeSolvedByMode(
  slot: PoscosechaClasificacionOrderSlot | undefined,
  mode: PoscosechaClasificacionRunMode,
) {
  if (!slot?.restriction || slot.restrictionMode !== "STRICT") return true;
  return slot.restriction === mode;
}

function getRunLabel(mode: PoscosechaClasificacionRunMode) {
  return mode;
}

function getRunOriginScope(mode: PoscosechaClasificacionRunMode) {
  switch (mode) {
    case "GV":
      return "Solo GV";
    case "APERTURA":
      return "Solo Apertura";
    case "PRECLASIFICACION":
      return "Solo Preclasificacion";
    default:
      return mode;
  }
}

function sanitizeDateValue(value: unknown) {
  return Math.max(toInteger(value, 0), 0);
}

function sanitizeAvailabilityRow(
  row: PoscosechaClasificacionAvailabilityRow,
): PoscosechaClasificacionAvailabilityRow {
  return {
    grado: Math.max(toInteger(row.grado, 0), 1),
    pesoTalloSeed: Math.max(toNumber(row.pesoTalloSeed, 0), 0),
    fecha_1: sanitizeDateValue(row.fecha_1),
    fecha_2: sanitizeDateValue(row.fecha_2),
    fecha_3: sanitizeDateValue(row.fecha_3),
    fecha_4: sanitizeDateValue(row.fecha_4),
    fecha_5: sanitizeDateValue(row.fecha_5),
  };
}

export function buildClasificacionAvailabilityDerived(
  rows: PoscosechaClasificacionAvailabilityRow[],
  desperdicio: number,
): PoscosechaClasificacionAvailabilityDerivedRow[] {
  return rows.map((row) => {
    const sanitizedRow = sanitizeAvailabilityRow(row);
    const mallasTotales = SOLVER_DATE_KEYS.reduce(
      (accumulator, key) => accumulator + sanitizedRow[key],
      0,
    );
    const tallosBrutos = mallasTotales * 20;
    const tallosNetos = excelRound(tallosBrutos * (1 - desperdicio), 0);
    const pesoTotalGestionable = tallosNetos * sanitizedRow.pesoTalloSeed;

    return {
      grado: sanitizedRow.grado,
      pesoTalloSeed: sanitizedRow.pesoTalloSeed,
      mallasTotales,
      tallosBrutos,
      tallosNetos,
      pesoTotalGestionable,
    };
  });
}

export function buildClasificacionPrecheck(
  orders: PoscosechaClasificacionOrderRow[],
  availability: PoscosechaClasificacionAvailabilityRow[],
  skuMaster: PoscosechaSkuRecord[],
  desperdicio: number,
  orderSlots?: PoscosechaClasificacionOrderSlot[],
  lotSlots?: PoscosechaClasificacionLotSlot[],
  mode: PoscosechaClasificacionRunMode = "GV",
): PoscosechaClasificacionPrecheck {
  const masterBySkuId = new Map(skuMaster.map((record) => [record.skuId, record]));
  const orderSlotMeta = new Map(sanitizeOrderSlots(orderSlots).map((slot) => [slot.key, slot]));
  const lotSlotMeta = new Map(sanitizeLotSlots(lotSlots).map((slot) => [slot.key, slot]));
  const orderEligibleKeys = SOLVER_DATE_KEYS.filter((key) => {
    const slot = orderSlotMeta.get(key);
    return slotCanBeSolvedByMode(slot, mode);
  });
  const availabilityEligibleKeys = SOLVER_DATE_KEYS.filter((key) => {
    const slot = lotSlotMeta.get(key);
    return slot ? originMatchesMode(slot.origin, mode) : false;
  });

  let tallosPedidos = 0;

  for (const row of orders) {
    const masterRecord = masterBySkuId.get(row.skuId);

    if (!masterRecord) continue;

    const totalPedido = orderEligibleKeys.reduce(
      (accumulator, key) => accumulator + sanitizeDateValue(row[key]),
      0,
    );

    tallosPedidos += totalPedido * Math.max(toInteger(masterRecord.tallosMin, 0), 0);
  }

  const tallosDisponibles = buildClasificacionAvailabilityDerived(
    availability.map((row) => ({
      ...row,
      fecha_1: availabilityEligibleKeys.includes("fecha_1") ? row.fecha_1 : 0,
      fecha_2: availabilityEligibleKeys.includes("fecha_2") ? row.fecha_2 : 0,
      fecha_3: availabilityEligibleKeys.includes("fecha_3") ? row.fecha_3 : 0,
      fecha_4: availabilityEligibleKeys.includes("fecha_4") ? row.fecha_4 : 0,
      fecha_5: availabilityEligibleKeys.includes("fecha_5") ? row.fecha_5 : 0,
    })),
    desperdicio,
  ).reduce((accumulator, row) => accumulator + row.tallosNetos, 0);

  const diferencia = tallosPedidos - tallosDisponibles;

  if (tallosPedidos <= 0) {
    return {
      isValid: false,
      message: "Debes ingresar pedidos mayores a cero.",
      tallosPedidos,
      tallosDisponibles,
      diferencia,
    };
  }

  if (tallosDisponibles <= 0) {
    return {
      isValid: false,
      message: "Debes ingresar disponibilidad mayor a cero.",
      tallosPedidos,
      tallosDisponibles,
      diferencia,
    };
  }

  return {
    isValid: true,
    message:
      diferencia < 0
        ? "Hay mas tallos disponibles que pedidos minimos; el solver usara lo necesario y dejara saldo."
        : "Validacion previa correcta.",
    tallosPedidos,
    tallosDisponibles,
    diferencia,
  };
}

function mapMasterForBridge(skuMaster: PoscosechaSkuRecord[]) {
  return skuMaster.map((record) => ({
    sku: record.sku,
    peso_ideal_bunch: toNumber(record.pesoIdealBunch, 0),
    tallos_min: Math.max(toInteger(record.tallosMin, 0), 1),
    tallos_max: Math.max(
      toInteger(record.tallosMax, record.tallosMin),
      toInteger(record.tallosMin, 1),
    ),
    peso_min_objetivo: toNumber(record.pesoMinObjetivo, 0),
    peso_max_objetivo: toNumber(record.pesoMaxObjetivo, 0),
    max_grados_objetivo: Math.max(toInteger(record.maxGradosObjetivo, 1), 1),
  }));
}

function mapOrdersForBridge(
  orders: PoscosechaClasificacionOrderRow[],
  skuMaster: PoscosechaSkuRecord[],
) {
  const masterBySkuId = new Map(skuMaster.map((record) => [record.skuId, record]));

  return orders
    .map((row) => {
      const masterRecord = masterBySkuId.get(row.skuId);

      if (!masterRecord) return null;

      return {
        sku: masterRecord.sku,
        fecha_1: sanitizeDateValue(row.fecha_1),
        fecha_2: sanitizeDateValue(row.fecha_2),
        fecha_3: sanitizeDateValue(row.fecha_3),
        fecha_4: sanitizeDateValue(row.fecha_4),
        fecha_5: sanitizeDateValue(row.fecha_5),
      };
    })
    .filter(Boolean);
}

function mapAvailabilityForBridge(
  availability: PoscosechaClasificacionAvailabilityRow[],
) {
  return availability
    .map((row) => {
      const sanitizedRow = sanitizeAvailabilityRow(row);

      return {
        grado: sanitizedRow.grado,
        fecha_1: sanitizedRow.fecha_1,
        fecha_2: sanitizedRow.fecha_2,
        fecha_3: sanitizedRow.fecha_3,
        fecha_4: sanitizedRow.fecha_4,
        fecha_5: sanitizedRow.fecha_5,
        peso_tallo_seed: sanitizedRow.pesoTalloSeed,
      };
    })
    .filter((row) => row.grado > 0);
}

function filterOrdersByMode(
  orders: PoscosechaClasificacionOrderRow[],
  orderSlots: PoscosechaClasificacionOrderSlot[],
  mode: PoscosechaClasificacionRunMode,
) {
  const slotMeta = new Map(orderSlots.map((slot) => [slot.key, slot]));
  const canUseKey = (key: SolverDateKey) => slotCanBeSolvedByMode(slotMeta.get(key), mode);

  return orders.map((row) => ({
    ...row,
    fecha_1: canUseKey("fecha_1") ? row.fecha_1 : 0,
    fecha_2: canUseKey("fecha_2") ? row.fecha_2 : 0,
    fecha_3: canUseKey("fecha_3") ? row.fecha_3 : 0,
    fecha_4: canUseKey("fecha_4") ? row.fecha_4 : 0,
    fecha_5: canUseKey("fecha_5") ? row.fecha_5 : 0,
  }));
}

function filterAvailabilityByMode(
  availability: PoscosechaClasificacionAvailabilityRow[],
  lotSlots: PoscosechaClasificacionLotSlot[],
  mode: PoscosechaClasificacionRunMode,
) {
  const slotMeta = new Map(lotSlots.map((slot) => [slot.key, slot]));
  const canUseKey = (key: SolverDateKey) => {
    const slot = slotMeta.get(key);
    return slot ? originMatchesMode(slot.origin, mode) : false;
  };

  return availability.map((row) => ({
    ...row,
    fecha_1: canUseKey("fecha_1") ? row.fecha_1 : 0,
    fecha_2: canUseKey("fecha_2") ? row.fecha_2 : 0,
    fecha_3: canUseKey("fecha_3") ? row.fecha_3 : 0,
    fecha_4: canUseKey("fecha_4") ? row.fecha_4 : 0,
    fecha_5: canUseKey("fecha_5") ? row.fecha_5 : 0,
  }));
}

function subtractSolvedFromRemainingOrders(
  remainingOrders: PoscosechaClasificacionOrderRow[],
  result: PoscosechaClasificacionResult | null,
) {
  if (!result) return remainingOrders;

  const solvedBySku = new Map(
    result.orderRows.map((row) => [row.sku, Math.max(toInteger(row.pedidoResuelto, 0), 0)]),
  );

  return remainingOrders.map((row) => {
    let pendingSolved = solvedBySku.get(row.sku) ?? 0;
    const nextRow = { ...row };

    for (const key of SOLVER_DATE_KEYS) {
      if (pendingSolved <= 0) break;
      const captured = sanitizeDateValue(nextRow[key]);
      const consumed = Math.min(captured, pendingSolved);
      nextRow[key] = captured - consumed;
      pendingSolved -= consumed;
    }

    return nextRow;
  });
}

export async function getClasificacionEnBlancoBootData(): Promise<PoscosechaClasificacionBootData> {
  const [skuMaster, defaults] = await Promise.all([
    listCurrentPostharvestSkus(),
    loadSolverDefaults(),
  ]);

  return {
    skuMaster,
    ordersTemplate: buildClasificacionOrdersTemplate(skuMaster),
    availabilityTemplate: buildClasificacionAvailabilityTemplate(defaults.availabilitySeeds),
    orderSlots: buildClasificacionOrderSlotsTemplate(),
    lotSlots: buildClasificacionLotSlotsTemplate(),
    settings: defaults.settings,
    metadata: {
      engine: "Python + PuLP",
      masterSource: "PostgreSQL / public.postharvest_dim_sku_profile_scd2",
      workbookPath: defaults.workbookPath,
      masterPath: defaults.masterPath,
      usedFallbackDefaults: defaults.usedFallbackDefaults,
    },
  };
}

export async function runClasificacionEnBlancoSolver(
  input: PoscosechaClasificacionRunInput,
): Promise<{ runs: PoscosechaClasificacionModeResult[] }> {
  const skuMaster = await listCurrentPostharvestSkus();

  if (skuMaster.length === 0) {
    throw new Error("No hay SKU activos para ejecutar Clasificacion en blanco.");
  }

  const settings = sanitizeSettings(input.settings);
  const orderSlots = sanitizeOrderSlots(input.orderSlots ?? input.dateSlots);
  const lotSlots = sanitizeLotSlots(input.lotSlots ?? input.dateSlots);
  let remainingOrders = input.orders.map((row) => ({ ...row }));
  const runs: PoscosechaClasificacionModeResult[] = [];

  for (const mode of POSCOSECHA_CLASIFICACION_RUN_MODES) {
    const filteredOrders = filterOrdersByMode(remainingOrders, orderSlots, mode);
    const filteredAvailability = filterAvailabilityByMode(input.availability, lotSlots, mode);
    const precheck = buildClasificacionPrecheck(
      filteredOrders,
      filteredAvailability,
      skuMaster,
      settings.desperdicio,
      orderSlots,
      lotSlots,
      mode,
    );

    let result: PoscosechaClasificacionResult | null = null;

    if (precheck.isValid) {
      result = await runBridge<PoscosechaClasificacionResult>("solve", {
        master: mapMasterForBridge(skuMaster),
        orders: mapOrdersForBridge(filteredOrders, skuMaster),
        availability: mapAvailabilityForBridge(filteredAvailability),
        settings,
      });
      remainingOrders = subtractSolvedFromRemainingOrders(remainingOrders, result);
    }

    runs.push({
      mode,
      label: getRunLabel(mode),
      originScope: getRunOriginScope(mode),
      precheck,
      result,
    });
  }

  if (runs.every((run) => !run.precheck.isValid)) {
    throw new Error(runs[0]?.precheck.message ?? "No se pudo ejecutar Clasificacion en blanco.");
  }

  return { runs };
}

export async function runClasificacionEnBlancoRecipeSolver(
  input: PoscosechaClasificacionRecipeInput,
): Promise<PoscosechaClasificacionRecipeResult> {
  if (!input.sku.trim()) {
    throw new Error("Debes indicar el SKU para construir la receta.");
  }

  if (toInteger(input.pedidoResuelto, 0) <= 0) {
    throw new Error("El SKU seleccionado no tiene bunches resueltos.");
  }

  if (!input.grados.length) {
    throw new Error("No hay tallos netos por grado para construir la receta.");
  }

  return runBridge<PoscosechaClasificacionRecipeResult>("recipe", {
    sku: input.sku,
    pedidoResuelto: Math.max(toInteger(input.pedidoResuelto, 0), 0),
    pesoIdealBunch: Math.max(toNumber(input.pesoIdealBunch, 0), 0),
    pesoMinObjetivo: Math.max(toNumber(input.pesoMinObjetivo, 0), 0),
    pesoMaxObjetivo: Math.max(toNumber(input.pesoMaxObjetivo, 0), 0),
    tallosMin: Math.max(toInteger(input.tallosMin, 0), 0),
    tallosMax: Math.max(toInteger(input.tallosMax, 0), 0),
    tallosAsignadosNetos: Math.max(toInteger(input.tallosAsignadosNetos, 0), 0),
    tallosPromedioRamo: Math.max(toNumber(input.tallosPromedioRamo, 0), 0),
    grados: input.grados.map((row) => ({
      grado: Math.max(toInteger(row.grado, 0), 0),
      tallosNetos: Math.max(toInteger(row.tallosNetos, 0), 0),
      pesoTalloSeed: Math.max(toNumber(row.pesoTalloSeed, 0), 0),
    })),
  });
}

export function getDateLabel(dateKey: SolverDateKey) {
  const datePosition = SOLVER_DATE_KEYS.indexOf(dateKey) + 1;
  return `Fecha ${datePosition}`;
}
