import "server-only";

import type { PoscosechaSkuRecord } from "@/lib/postcosecha-sku-types";
import type {
  PoscosechaClasificacionAvailabilityDerivedRow,
  PoscosechaClasificacionAvailabilityRow,
  PoscosechaClasificacionAvailabilitySeed,
  PoscosechaClasificacionDateSlot,
  PoscosechaClasificacionLotSlot,
  PoscosechaClasificacionOrderOrigin,
  PoscosechaClasificacionOrderRow,
  PoscosechaClasificacionOrderSlot,
  PoscosechaClasificacionPrecheck,
  PoscosechaClasificacionRunMode,
  PoscosechaClasificacionSettings,
  SolverDateKey,
} from "@/lib/postcosecha-clasificacion-en-blanco-types";
import {
  SOLVER_DATE_KEYS,
} from "@/lib/postcosecha-clasificacion-en-blanco-types";

// ---------------------------------------------------------------------------
// Internal utilities
// ---------------------------------------------------------------------------

export function toNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function toInteger(value: unknown, fallback = 0) {
  return Math.round(toNumber(value, fallback));
}

export function excelRound(value: number, digits = 0) {
  const factor = 10 ** digits;
  const scaled = value * factor;
  const rounded = scaled >= 0 ? Math.floor(scaled + 0.5) : Math.ceil(scaled - 0.5);
  return rounded / factor;
}

// ---------------------------------------------------------------------------
// Sanitizers (exported so runner.ts and loader.ts can import them)
// ---------------------------------------------------------------------------

export function sanitizeDateValue(value: unknown) {
  return Math.max(toInteger(value, 0), 0);
}

export function sanitizeAvailabilityRow(
  row: PoscosechaClasificacionAvailabilityRow,
): PoscosechaClasificacionAvailabilityRow {
  const normalized = {
    grado: Math.max(toInteger(row.grado, 0), 1),
    pesoTalloSeed: Math.max(toNumber(row.pesoTalloSeed, 0), 0),
  } as PoscosechaClasificacionAvailabilityRow;
  for (const key of SOLVER_DATE_KEYS) {
    normalized[key] = sanitizeDateValue(row[key]);
  }
  return normalized;
}

export function sanitizeSettings(
  input: Partial<PoscosechaClasificacionSettings> | null | undefined,
): PoscosechaClasificacionSettings {
  const desperdicio = Math.min(
    Math.max(toNumber(input?.desperdicio, 0.13), 0),
    0.95,
  );
  return {
    desperdicio: Math.round(desperdicio * 10000) / 10000,
  };
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

export function sanitizeOrderSlots(
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

export function sanitizeLotSlots(
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

// ---------------------------------------------------------------------------
// Template builders
// ---------------------------------------------------------------------------

export function buildClasificacionOrdersTemplate(
  skuMaster: PoscosechaSkuRecord[],
): PoscosechaClasificacionOrderRow[] {
  return skuMaster.map((record) => {
    const row = {
      skuId: record.skuId,
      sku: record.sku,
    } as PoscosechaClasificacionOrderRow;
    for (const key of SOLVER_DATE_KEYS) {
      row[key] = 0;
    }
    return row;
  });
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
  return seeds.map((seed) => {
    const row = {
      grado: seed.grado,
      pesoTalloSeed: Math.round(seed.pesoTalloSeed * 100) / 100,
    } as PoscosechaClasificacionAvailabilityRow;
    for (const key of SOLVER_DATE_KEYS) {
      row[key] = 0;
    }
    return row;
  });
}

// ---------------------------------------------------------------------------
// Derived data and precheck
// ---------------------------------------------------------------------------

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
    availability.map((row) => {
      const normalized = { ...row } as PoscosechaClasificacionAvailabilityRow;
      for (const key of SOLVER_DATE_KEYS) {
        normalized[key] = availabilityEligibleKeys.includes(key) ? row[key] : 0;
      }
      return normalized;
    }),
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

// ---------------------------------------------------------------------------
// Labels
// ---------------------------------------------------------------------------

export function getDateLabel(dateKey: SolverDateKey) {
  const datePosition = SOLVER_DATE_KEYS.indexOf(dateKey) + 1;
  return `Fecha ${datePosition}`;
}
