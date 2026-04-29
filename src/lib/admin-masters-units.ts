import { queryAdmin, withAdminTransaction } from "@/lib/admin-db";

export type AdminUnit = {
  unitCode: string;
  unitName: string;
  unitSymbol: string | null;
  unitCategoryCode: string | null;
  notesText: string | null;
  validFrom: string;
  validTo: string | null;
  actorId: string | null;
  changeReason: string;
};

export type AdminUnitHistoryEntry = AdminUnit & {
  recordId: string;
  isCurrent: boolean;
  isValid: boolean;
  loadedAt: string;
};

type UnitRow = {
  record_id: string;
  unit_code: string;
  unit_name: string;
  unit_symbol: string | null;
  unit_category_code: string | null;
  notes_text: string | null;
  valid_from: Date | string;
  valid_to: Date | string | null;
  is_current: boolean;
  is_valid: boolean;
  loaded_at: Date | string;
  actor_id: string | null;
  change_reason: string;
};

const RUN_ID = "corex_admin_units";

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function toIsoOrNull(value: Date | string | null): string | null {
  return value === null ? null : toIso(value);
}

function mapRow(r: UnitRow): AdminUnit {
  return {
    unitCode: r.unit_code,
    unitName: r.unit_name,
    unitSymbol: r.unit_symbol,
    unitCategoryCode: r.unit_category_code,
    notesText: r.notes_text,
    validFrom: toIso(r.valid_from),
    validTo: toIsoOrNull(r.valid_to),
    actorId: r.actor_id,
    changeReason: r.change_reason,
  };
}

export async function listActiveUnits(): Promise<AdminUnit[]> {
  try {
    const result = await queryAdmin<UnitRow>(
      `SELECT record_id, unit_code, unit_name, unit_symbol, unit_category_code, notes_text,
              valid_from, valid_to, is_current, is_valid, loaded_at, actor_id, change_reason
       FROM public.adm_dim_unit_of_measure_scd2
       WHERE is_current = true AND is_valid = true
       ORDER BY unit_category_code NULLS LAST, unit_code`,
    );
    return result.rows.map(mapRow);
  } catch {
    return [];
  }
}

export async function listUnitHistory(unitCode: string): Promise<AdminUnitHistoryEntry[]> {
  const result = await queryAdmin<UnitRow>(
    `SELECT record_id, unit_code, unit_name, unit_symbol, unit_category_code, notes_text,
            valid_from, valid_to, is_current, is_valid, loaded_at, actor_id, change_reason
     FROM public.adm_dim_unit_of_measure_scd2
     WHERE unit_code = $1
     ORDER BY valid_from DESC, loaded_at DESC`,
    [unitCode],
  );
  return result.rows.map((r) => ({
    ...mapRow(r),
    recordId: r.record_id,
    isCurrent: r.is_current,
    isValid: r.is_valid,
    loadedAt: toIso(r.loaded_at),
  }));
}

export type UpsertUnitInput = {
  unitCode: string;
  unitName: string;
  unitSymbol?: string | null;
  unitCategoryCode?: string | null;
  notesText?: string | null;
  actorId?: string;
  changeReason?: string;
};

export async function createUnit(input: UpsertUnitInput): Promise<void> {
  await queryAdmin(
    `INSERT INTO public.adm_dim_unit_of_measure_scd2
      (unit_code, unit_name, unit_symbol, unit_category_code, notes_text,
       valid_from, is_current, is_valid, run_id, actor_id, change_reason)
     VALUES ($1, $2, $3, $4, $5, now(), true, true, $6, $7, $8)`,
    [
      input.unitCode,
      input.unitName,
      input.unitSymbol ?? null,
      input.unitCategoryCode ?? null,
      input.notesText ?? null,
      RUN_ID,
      input.actorId ?? null,
      input.changeReason ?? "manual_create",
    ],
  );
}

/**
 * SCD2 update: cierra la version actual (is_current=false, valid_to=now)
 * e inserta una nueva version con is_current=true.
 */
export async function updateUnit(input: UpsertUnitInput): Promise<void> {
  await withAdminTransaction(async (client) => {
    await client.query(
      `UPDATE public.adm_dim_unit_of_measure_scd2
       SET is_current = false, valid_to = now(), loaded_at = now(),
           actor_id = $2, change_reason = $3
       WHERE unit_code = $1 AND is_current = true AND is_valid = true`,
      [input.unitCode, input.actorId ?? null, input.changeReason ?? "manual_update"],
    );

    await client.query(
      `INSERT INTO public.adm_dim_unit_of_measure_scd2
        (unit_code, unit_name, unit_symbol, unit_category_code, notes_text,
         valid_from, is_current, is_valid, run_id, actor_id, change_reason)
       VALUES ($1, $2, $3, $4, $5, now(), true, true, $6, $7, $8)`,
      [
        input.unitCode,
        input.unitName,
        input.unitSymbol ?? null,
        input.unitCategoryCode ?? null,
        input.notesText ?? null,
        RUN_ID,
        input.actorId ?? null,
        input.changeReason ?? "manual_update",
      ],
    );
  });
}

export async function setUnitValidity(
  unitCode: string,
  isValid: boolean,
  actorId: string | null,
  changeReason: string = "manual_update",
): Promise<void> {
  await queryAdmin(
    `UPDATE public.adm_dim_unit_of_measure_scd2
     SET is_valid = $2, loaded_at = now(), actor_id = $3, change_reason = $4
     WHERE unit_code = $1 AND is_current = true`,
    [unitCode, isValid, actorId, changeReason],
  );
}
