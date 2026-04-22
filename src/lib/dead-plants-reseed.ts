import "server-only";

import crypto from "crypto";
import type { PoolClient } from "pg";

import { query } from "@/lib/db";
import { queryCamp, withCampTransaction } from "@/lib/camp-db";
import { formatDateLocal } from "@/shared/lib/format";
import { toNumber } from "@/shared/lib/number-utils";

export type DeadPlantsReseedType = "dead" | "reseed";

export type DeadPlantsReseedBlockOption = {
  blockId: string;
  areaId: string;
  bedCount: number;
};

export type DeadPlantsReseedCaptureRow = {
  bedId: string;
  bedPosition: string;
  blockId: string;
  areaId: string;
  cycleKey: string | null;
  value: number;
  blocked: boolean;
  blockedReason: string | null;
  existingEventId: string | null;
  existingValue: number | null;
};

export type DeadPlantsReseedLoadSummary = {
  type: DeadPlantsReseedType;
  runId: string;
  workDate: string;
  blockId: string;
  areaId: string | null;
  totalValue: number;
  bedCount: number;
  actorId: string | null;
  loadedAt: string | null;
};

export type DeadPlantsReseedLoadDetailRow = {
  eventId: string;
  bedId: string;
  bedPosition: string;
  cycleKey: string;
  value: number;
};

export type DeadPlantsReseedLoadDetail = {
  summary: DeadPlantsReseedLoadSummary;
  rows: DeadPlantsReseedLoadDetailRow[];
};

export type DeadPlantsReseedInitialData = {
  generatedAt: string;
  blocks: DeadPlantsReseedBlockOption[];
  latestLoads: Record<DeadPlantsReseedType, DeadPlantsReseedLoadSummary[]>;
};

export type CreateCaptureInput = {
  type: DeadPlantsReseedType;
  workDate: string;
  blockId: string;
  rows?: Array<{ bedId: string; value: number }>;
};

export type PatchRecordsInput = {
  type: DeadPlantsReseedType;
  changes: Array<{ eventId: string; value: number; changeReason?: string | null }>;
};

export type CreateCaptureResult = {
  runId: string;
  insertedCount: number;
  blockedCount: number;
  blockedRows: DeadPlantsReseedCaptureRow[];
};

export type PatchRecordsResult = {
  runId: string;
  updatedCount: number;
};

type AssignmentRow = {
  bed_id: string;
  block_id: string;
  area_id: string | null;
  cycle_key: string | null;
};

type ExistingRecordRow = {
  event_id: string;
  bed_id: string;
  value: string | number | null;
};

type LoadSummaryRow = {
  run_id: string;
  work_date: string;
  block_id: string;
  area_id: string | null;
  total_value: string | number | null;
  bed_count: string | number | null;
  actor_id: string | null;
  loaded_at: string | Date | null;
};

type LoadDetailRow = {
  event_id: string;
  bed_id: string;
  cycle_key: string;
  value: string | number | null;
};

type RecordConfig = {
  tableName: "public.camp_fact_dead_plants_cur" | "public.camp_fact_reseed_plants_cur";
  valueColumn: "dead_plants_count" | "reseed_plants_count";
};

export class DeadPlantsReseedConflictError extends Error {
  readonly status = 409;

  constructor(message: string) {
    super(message);
    this.name = "DeadPlantsReseedConflictError";
  }
}

const CREATE_REASON = "MANUAL_WEB_FORM_CREATE";
const EDIT_REASON = "MANUAL_WEB_FORM_EDIT";

const configByType: Record<DeadPlantsReseedType, RecordConfig> = {
  dead: {
    tableName: "public.camp_fact_dead_plants_cur",
    valueColumn: "dead_plants_count",
  },
  reseed: {
    tableName: "public.camp_fact_reseed_plants_cur",
    valueColumn: "reseed_plants_count",
  },
};

export function isDeadPlantsReseedType(value: unknown): value is DeadPlantsReseedType {
  return value === "dead" || value === "reseed";
}

export function normalizeDeadPlantsReseedType(value: unknown): DeadPlantsReseedType {
  return isDeadPlantsReseedType(value) ? value : "dead";
}

export function getBedPosition(bedId: string) {
  const parts = bedId.trim().split("-").filter(Boolean);
  return parts.length > 0 ? parts[parts.length - 1] : bedId;
}

export function normalizeCaptureCount(value: unknown) {
  const numericValue = toNumber(value);

  if (numericValue === null || !Number.isInteger(numericValue) || numericValue < 0) {
    throw new Error("Los conteos deben ser enteros mayores o iguales a cero.");
  }

  return numericValue;
}

export function assertValidWorkDate(workDate: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(workDate)) {
    throw new Error("La fecha de trabajo no es valida.");
  }

  const today = formatDateLocal(new Date());
  if (workDate > today) {
    throw new Error("No se permiten fechas futuras.");
  }
}

function getRecordConfig(type: DeadPlantsReseedType) {
  return configByType[type];
}

function makeRunId(type: DeadPlantsReseedType, action: "create" | "edit") {
  return `dead_plants_reseed_${type}_${action}_${new Date().toISOString()}_${crypto.randomUUID()}`;
}

function mapLoadedAt(value: string | Date | null) {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function mapLoadSummary(type: DeadPlantsReseedType, row: LoadSummaryRow): DeadPlantsReseedLoadSummary {
  return {
    type,
    runId: row.run_id,
    workDate: row.work_date,
    blockId: row.block_id,
    areaId: row.area_id,
    totalValue: toNumber(row.total_value, 0),
    bedCount: toNumber(row.bed_count, 0),
    actorId: row.actor_id,
    loadedAt: mapLoadedAt(row.loaded_at),
  };
}

function sortByBedPosition<T extends { bedId: string }>(rows: T[]) {
  return [...rows].sort((left, right) =>
    left.bedId.localeCompare(right.bedId, "es-EC", { numeric: true, sensitivity: "base" }),
  );
}

export async function listDeadPlantsReseedBlocks(): Promise<DeadPlantsReseedBlockOption[]> {
  const result = await query<{
    block_id: string;
    area_id: string | null;
    bed_count: string | number | null;
  }>(
    `
    select
      block_id,
      max(area_id) as area_id,
      count(distinct bed_id) as bed_count
    from slv.camp_asgn_cycle_core_scd2
    where is_valid = true
      and is_current = true
      and block_id is not null
      and bed_id is not null
    group by block_id
    order by max(area_id), block_id
    `,
  );

  return result.rows.map((row) => ({
    blockId: row.block_id,
    areaId: row.area_id ?? "-",
    bedCount: toNumber(row.bed_count, 0),
  }));
}

export async function listDeadPlantsReseedLoads({
  type,
  dateFrom,
  dateTo,
  blockId,
  limit = 20,
}: {
  type: DeadPlantsReseedType;
  dateFrom?: string | null;
  dateTo?: string | null;
  blockId?: string | null;
  limit?: number;
}): Promise<DeadPlantsReseedLoadSummary[]> {
  const config = getRecordConfig(type);
  const values: unknown[] = [];
  const where = ["is_valid = true", "run_id is not null"];

  if (dateFrom) {
    values.push(dateFrom);
    where.push(`work_date >= $${values.length}::date`);
  }

  if (dateTo) {
    values.push(dateTo);
    where.push(`work_date <= $${values.length}::date`);
  }

  if (blockId && blockId !== "all") {
    values.push(blockId);
    where.push(`split_part(bed_id, '-', 1) = $${values.length}`);
  }

  values.push(limit);

  const result = await queryCamp<LoadSummaryRow>(
    `
    select
      run_id,
      work_date::text as work_date,
      split_part(bed_id, '-', 1) as block_id,
      null::text as area_id,
      coalesce(sum(${config.valueColumn}), 0) as total_value,
      count(*) as bed_count,
      max(actor_id) as actor_id,
      max(loaded_at) as loaded_at
    from ${config.tableName}
    where ${where.join(" and ")}
    group by run_id, work_date, split_part(bed_id, '-', 1)
    order by max(loaded_at) desc nulls last
    limit $${values.length}
    `,
    values,
  );

  return result.rows.map((row) => mapLoadSummary(type, row));
}

export async function getDeadPlantsReseedInitialData(): Promise<DeadPlantsReseedInitialData> {
  const [blocks, latestDead, latestReseed] = await Promise.all([
    listDeadPlantsReseedBlocks(),
    listDeadPlantsReseedLoads({ type: "dead", limit: 10 }),
    listDeadPlantsReseedLoads({ type: "reseed", limit: 10 }),
  ]);

  return {
    generatedAt: new Date().toISOString(),
    blocks,
    latestLoads: {
      dead: latestDead,
      reseed: latestReseed,
    },
  };
}

async function listExistingRecords(
  type: DeadPlantsReseedType,
  workDate: string,
  bedIds: string[],
) {
  if (bedIds.length === 0) {
    return new Map<string, ExistingRecordRow>();
  }

  const config = getRecordConfig(type);
  const result = await queryCamp<ExistingRecordRow>(
    `
    select
      event_id,
      bed_id,
      ${config.valueColumn} as value
    from ${config.tableName}
    where is_valid = true
      and work_date = $1::date
      and bed_id = any($2::text[])
    `,
    [workDate, bedIds],
  );

  return new Map(result.rows.map((row) => [row.bed_id, row]));
}

export async function getDeadPlantsReseedCaptureRows({
  type,
  workDate,
  blockId,
}: {
  type: DeadPlantsReseedType;
  workDate: string;
  blockId: string;
}): Promise<DeadPlantsReseedCaptureRow[]> {
  assertValidWorkDate(workDate);

  if (!blockId) {
    throw new Error("Selecciona un bloque.");
  }

  const assignmentResult = await query<AssignmentRow>(
    `
    with block_beds as (
      select
        bed_id,
        max(block_id) as block_id,
        max(area_id) as area_id
      from slv.camp_asgn_cycle_core_scd2
      where is_valid = true
        and block_id = $1
        and bed_id is not null
      group by bed_id
    ),
    valid_assignment as (
      select distinct on (bed_id)
        bed_id,
        cycle_key
      from slv.camp_asgn_cycle_core_scd2
      where is_valid = true
        and block_id = $1
        and bed_id is not null
        and valid_from::date <= $2::date
        and coalesce(valid_to::date, date '9999-12-31') >= $2::date
      order by bed_id, is_current desc, loaded_at desc nulls last
    )
    select
      block_beds.bed_id,
      block_beds.block_id,
      block_beds.area_id,
      valid_assignment.cycle_key
    from block_beds
    left join valid_assignment on valid_assignment.bed_id = block_beds.bed_id
    order by block_beds.bed_id
    `,
    [blockId, workDate],
  );

  const bedIds = assignmentResult.rows.map((row) => row.bed_id);
  const existingByBedId = await listExistingRecords(type, workDate, bedIds);

  return sortByBedPosition(assignmentResult.rows.map((row) => {
    const existing = existingByBedId.get(row.bed_id) ?? null;
    const noCycle = !row.cycle_key;

    return {
      bedId: row.bed_id,
      bedPosition: getBedPosition(row.bed_id),
      blockId: row.block_id,
      areaId: row.area_id ?? "-",
      cycleKey: row.cycle_key,
      value: 0,
      blocked: noCycle || Boolean(existing),
      blockedReason: noCycle
        ? "Sin ciclo vigente para la fecha seleccionada."
        : existing
          ? "Ya existe un registro valido para esta cama y fecha. Edita la carga existente."
          : null,
      existingEventId: existing?.event_id ?? null,
      existingValue: existing ? toNumber(existing.value, 0) : null,
    };
  }));
}

export async function createDeadPlantsReseedCapture(
  input: CreateCaptureInput,
  actorId: string,
): Promise<CreateCaptureResult> {
  const type = normalizeDeadPlantsReseedType(input.type);
  assertValidWorkDate(input.workDate);

  if (!input.blockId) {
    throw new Error("Selecciona un bloque.");
  }

  const valueByBedId = new Map((input.rows ?? []).map((row) => [
    row.bedId,
    normalizeCaptureCount(row.value),
  ]));
  const captureRows = await getDeadPlantsReseedCaptureRows({
    type,
    workDate: input.workDate,
    blockId: input.blockId,
  });
  const insertableRows = captureRows.filter((row) => !row.blocked);
  const blockedRows = captureRows.filter((row) => row.blocked);

  if (insertableRows.length === 0) {
    throw new DeadPlantsReseedConflictError("Todas las camas estan bloqueadas para esta captura.");
  }

  const config = getRecordConfig(type);
  const runId = makeRunId(type, "create");

  await withCampTransaction(async (client) => {
    await ensureNoRaceConflicts(client, config, input.workDate, insertableRows.map((row) => row.bedId));

    for (const row of insertableRows) {
      await client.query(
        `
        insert into ${config.tableName} (
          event_id,
          event_at,
          event_date,
          work_date,
          cycle_key,
          bed_id,
          ${config.valueColumn},
          is_valid,
          loaded_at,
          run_id,
          actor_id,
          change_reason
        )
        values ($1, now(), $2::date, $2::date, $3, $4, $5, true, now(), $6, $7, $8)
        `,
        [
          crypto.randomUUID(),
          input.workDate,
          row.cycleKey,
          row.bedId,
          valueByBedId.get(row.bedId) ?? 0,
          runId,
          actorId,
          CREATE_REASON,
        ],
      );
    }
  });

  return {
    runId,
    insertedCount: insertableRows.length,
    blockedCount: blockedRows.length,
    blockedRows,
  };
}

async function ensureNoRaceConflicts(
  client: PoolClient,
  config: RecordConfig,
  workDate: string,
  bedIds: string[],
) {
  const result = await client.query<{ bed_id: string }>(
    `
    select bed_id
    from ${config.tableName}
    where is_valid = true
      and work_date = $1::date
      and bed_id = any($2::text[])
    limit 1
    `,
    [workDate, bedIds],
  );

  if (result.rows.length > 0) {
    throw new DeadPlantsReseedConflictError("Algunas camas fueron registradas por otro usuario. Recarga la captura.");
  }
}

export async function getDeadPlantsReseedLoadDetail(
  type: DeadPlantsReseedType,
  runId: string,
): Promise<DeadPlantsReseedLoadDetail | null> {
  const config = getRecordConfig(type);
  const summaryResult = await queryCamp<LoadSummaryRow>(
    `
    select
      run_id,
      work_date::text as work_date,
      split_part(bed_id, '-', 1) as block_id,
      null::text as area_id,
      coalesce(sum(${config.valueColumn}), 0) as total_value,
      count(*) as bed_count,
      max(actor_id) as actor_id,
      max(loaded_at) as loaded_at
    from ${config.tableName}
    where is_valid = true
      and run_id = $1
    group by run_id, work_date, split_part(bed_id, '-', 1)
    limit 1
    `,
    [runId],
  );

  const summaryRow = summaryResult.rows[0];
  if (!summaryRow) return null;

  const detailResult = await queryCamp<LoadDetailRow>(
    `
    select
      event_id,
      bed_id,
      cycle_key,
      ${config.valueColumn} as value
    from ${config.tableName}
    where is_valid = true
      and work_date = $1::date
      and split_part(bed_id, '-', 1) = $2
    order by bed_id
    `,
    [summaryRow.work_date, summaryRow.block_id],
  );

  return {
    summary: mapLoadSummary(type, summaryRow),
    rows: sortByBedPosition(detailResult.rows.map((row) => ({
      eventId: row.event_id,
      bedId: row.bed_id,
      bedPosition: getBedPosition(row.bed_id),
      cycleKey: row.cycle_key,
      value: toNumber(row.value, 0),
    }))),
  };
}

export async function patchDeadPlantsReseedRecords(
  input: PatchRecordsInput,
  actorId: string,
): Promise<PatchRecordsResult> {
  const type = normalizeDeadPlantsReseedType(input.type);
  const config = getRecordConfig(type);
  const runId = makeRunId(type, "edit");

  if (!Array.isArray(input.changes) || input.changes.length === 0) {
    throw new Error("No hay cambios para guardar.");
  }

  const changes = input.changes.map((change) => ({
    eventId: change.eventId,
    value: normalizeCaptureCount(change.value),
    changeReason: change.changeReason?.trim() || EDIT_REASON,
  }));

  await withCampTransaction(async (client) => {
    for (const change of changes) {
      const oldRecord = await client.query<{
        event_date: string;
        work_date: string;
        cycle_key: string;
        bed_id: string;
      }>(
        `
        update ${config.tableName}
        set is_valid = false
        where event_id = $1
          and is_valid = true
        returning event_date::text, work_date::text, cycle_key, bed_id
        `,
        [change.eventId],
      );

      const previous = oldRecord.rows[0];
      if (!previous) {
        throw new DeadPlantsReseedConflictError("El registro ya no esta vigente. Recarga la carga antes de editar.");
      }

      await client.query(
        `
        insert into ${config.tableName} (
          event_id,
          event_at,
          event_date,
          work_date,
          cycle_key,
          bed_id,
          ${config.valueColumn},
          is_valid,
          loaded_at,
          run_id,
          actor_id,
          change_reason
        )
        values ($1, now(), $2::date, $3::date, $4, $5, $6, true, now(), $7, $8, $9)
        `,
        [
          crypto.randomUUID(),
          previous.event_date,
          previous.work_date,
          previous.cycle_key,
          previous.bed_id,
          change.value,
          runId,
          actorId,
          change.changeReason,
        ],
      );
    }
  });

  return {
    runId,
    updatedCount: changes.length,
  };
}
