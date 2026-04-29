import { queryAdmin, withAdminTransaction } from "@/lib/admin-db";

export type AdminMetric = {
  metricCode: string;
  metricName: string;
  metricDescription: string | null;
  dataTypeCode: string;
  dataTypeLabel: string | null;
  directionCode: string;
  directionLabel: string | null;
  unitCode: string | null;
  unitName: string | null;
  unitSymbol: string | null;
  notesText: string | null;
  validFrom: string;
  validTo: string | null;
  actorId: string | null;
  changeReason: string;
};

export type AdminMetricHistoryEntry = AdminMetric & {
  recordId: string;
  isCurrent: boolean;
  isValid: boolean;
  loadedAt: string;
};

type MetricRow = {
  record_id: string;
  metric_code: string;
  metric_name: string;
  metric_description: string | null;
  data_type_code: string;
  data_type_label: string | null;
  direction_code: string;
  direction_label: string | null;
  unit_code: string | null;
  unit_name: string | null;
  unit_symbol: string | null;
  notes_text: string | null;
  valid_from: Date | string;
  valid_to: Date | string | null;
  is_current: boolean;
  is_valid: boolean;
  loaded_at: Date | string;
  actor_id: string | null;
  change_reason: string;
};

const RUN_ID = "corex_admin_metrics";

function toIso(v: Date | string): string {
  return v instanceof Date ? v.toISOString() : new Date(v).toISOString();
}

function toIsoOrNull(v: Date | string | null): string | null {
  return v === null ? null : toIso(v);
}

function mapRow(r: MetricRow): AdminMetric {
  return {
    metricCode: r.metric_code,
    metricName: r.metric_name,
    metricDescription: r.metric_description,
    dataTypeCode: r.data_type_code,
    dataTypeLabel: r.data_type_label,
    directionCode: r.direction_code,
    directionLabel: r.direction_label,
    unitCode: r.unit_code,
    unitName: r.unit_name,
    unitSymbol: r.unit_symbol,
    notesText: r.notes_text,
    validFrom: toIso(r.valid_from),
    validTo: toIsoOrNull(r.valid_to),
    actorId: r.actor_id,
    changeReason: r.change_reason,
  };
}

const SELECT_METRIC_WITH_LABELS = `
  SELECT m.record_id, m.metric_code, m.metric_name, m.metric_description,
         m.data_type_code, dt.item_label_es AS data_type_label,
         m.direction_code, dr.item_label_es AS direction_label,
         m.unit_code, u.unit_name, u.unit_symbol,
         m.notes_text, m.valid_from, m.valid_to, m.is_current, m.is_valid,
         m.loaded_at, m.actor_id, m.change_reason
  FROM public.adm_dim_metric_scd2 m
  LEFT JOIN public.adm_dim_catalog_item_scd2 dt
    ON dt.catalog_code = 'metric_data_types' AND dt.item_code = m.data_type_code
    AND dt.is_current AND dt.is_valid
  LEFT JOIN public.adm_dim_catalog_item_scd2 dr
    ON dr.catalog_code = 'metric_directions' AND dr.item_code = m.direction_code
    AND dr.is_current AND dr.is_valid
  LEFT JOIN public.adm_dim_unit_of_measure_scd2 u
    ON u.unit_code = m.unit_code AND u.is_current AND u.is_valid
`;

export async function listActiveMetrics(): Promise<AdminMetric[]> {
  try {
    const result = await queryAdmin<MetricRow>(
      `${SELECT_METRIC_WITH_LABELS}
       WHERE m.is_current = true AND m.is_valid = true
       ORDER BY m.metric_code`,
    );
    return result.rows.map(mapRow);
  } catch {
    return [];
  }
}

export async function listMetricHistory(metricCode: string): Promise<AdminMetricHistoryEntry[]> {
  const result = await queryAdmin<MetricRow>(
    `${SELECT_METRIC_WITH_LABELS}
     WHERE m.metric_code = $1
     ORDER BY m.valid_from DESC, m.loaded_at DESC`,
    [metricCode],
  );
  return result.rows.map((r) => ({
    ...mapRow(r),
    recordId: r.record_id,
    isCurrent: r.is_current,
    isValid: r.is_valid,
    loadedAt: toIso(r.loaded_at),
  }));
}

export type UpsertMetricInput = {
  metricCode: string;
  metricName: string;
  metricDescription?: string | null;
  dataTypeCode: string;
  directionCode: string;
  unitCode?: string | null;
  notesText?: string | null;
  actorId?: string;
  changeReason?: string;
};

export async function createMetric(input: UpsertMetricInput): Promise<void> {
  await queryAdmin(
    `INSERT INTO public.adm_dim_metric_scd2
      (metric_code, metric_name, metric_description, data_type_code, direction_code,
       unit_code, notes_text, valid_from, is_current, is_valid, run_id, actor_id, change_reason)
     VALUES ($1, $2, $3, $4, $5, $6, $7, now(), true, true, $8, $9, $10)`,
    [
      input.metricCode,
      input.metricName,
      input.metricDescription ?? null,
      input.dataTypeCode,
      input.directionCode,
      input.unitCode ?? null,
      input.notesText ?? null,
      RUN_ID,
      input.actorId ?? null,
      input.changeReason ?? "manual_create",
    ],
  );
}

export async function updateMetric(input: UpsertMetricInput): Promise<void> {
  await withAdminTransaction(async (client) => {
    await client.query(
      `UPDATE public.adm_dim_metric_scd2
       SET is_current = false, valid_to = now(), loaded_at = now(),
           actor_id = $2, change_reason = $3
       WHERE metric_code = $1 AND is_current = true AND is_valid = true`,
      [input.metricCode, input.actorId ?? null, input.changeReason ?? "manual_update"],
    );

    await client.query(
      `INSERT INTO public.adm_dim_metric_scd2
        (metric_code, metric_name, metric_description, data_type_code, direction_code,
         unit_code, notes_text, valid_from, is_current, is_valid, run_id, actor_id, change_reason)
       VALUES ($1, $2, $3, $4, $5, $6, $7, now(), true, true, $8, $9, $10)`,
      [
        input.metricCode,
        input.metricName,
        input.metricDescription ?? null,
        input.dataTypeCode,
        input.directionCode,
        input.unitCode ?? null,
        input.notesText ?? null,
        RUN_ID,
        input.actorId ?? null,
        input.changeReason ?? "manual_update",
      ],
    );
  });
}

export async function setMetricValidity(
  metricCode: string,
  isValid: boolean,
  actorId: string | null,
  changeReason: string = "manual_update",
): Promise<void> {
  await queryAdmin(
    `UPDATE public.adm_dim_metric_scd2
     SET is_valid = $2, loaded_at = now(), actor_id = $3, change_reason = $4
     WHERE metric_code = $1 AND is_current = true`,
    [metricCode, isValid, actorId, changeReason],
  );
}
