import { query } from "@/lib/db";
import type { BodegaActivityRecord } from "@/lib/bodega-master-types";

type SourceActivityRow = {
  activity_id: string | null;
  activity_name: string | null;
  cost_area: string | null;
  sub_cost_center: string | null;
  activity_type: string | null;
  unit_of_measure: string | null;
};

const SOURCE_ACTIVITY_TABLE = "slv.prod_dim_activity_profile_scd2";

function cleanText(value: string | null | undefined) {
  if (!value) return null;
  const normalized = value.trim().replace(/\s+/g, " ");
  return normalized || null;
}

function mapActivityRow(row: SourceActivityRow): BodegaActivityRecord | null {
  const activityId = cleanText(row.activity_id);
  if (!activityId) return null;

  const activityName = cleanText(row.activity_name) ?? activityId;

  return {
    activityId,
    activityName,
    costArea: cleanText(row.cost_area),
    subCostCenter: cleanText(row.sub_cost_center),
    activityType: cleanText(row.activity_type),
    unitOfMeasure: cleanText(row.unit_of_measure),
  } satisfies BodegaActivityRecord;
}

export function formatActivityUsageLabel(activity: Pick<
  BodegaActivityRecord,
  "activityId" | "activityName" | "costArea" | "subCostCenter"
>) {
  const hierarchy = [activity.costArea, activity.subCostCenter].filter(Boolean).join(" / ");
  const activityLabel = activity.activityName === activity.activityId
    ? activity.activityId
    : `${activity.activityName} (${activity.activityId})`;

  return hierarchy ? `${hierarchy} / ${activityLabel}` : activityLabel;
}

export async function listCurrentBodegaSourceActivities() {
  const result = await query<SourceActivityRow>(
    `
      select distinct on (trim(activity_id::text))
        trim(activity_id::text) as activity_id,
        nullif(trim(activity_name), '') as activity_name,
        nullif(trim(cost_area), '') as cost_area,
        nullif(trim(sub_cost_center), '') as sub_cost_center,
        nullif(trim(activity_type), '') as activity_type,
        nullif(trim(unit_of_measure), '') as unit_of_measure
      from ${SOURCE_ACTIVITY_TABLE}
      where is_current = true
        and is_valid = true
        and nullif(trim(activity_id::text), '') is not null
      order by trim(activity_id::text) asc, loaded_at desc, valid_from desc
    `,
  );

  return result.rows
    .map(mapActivityRow)
    .filter((row): row is BodegaActivityRecord => row !== null);
}

export async function getCurrentBodegaSourceActivitiesById(activityIds: string[]) {
  const sanitizedIds = [...new Set(
    activityIds
      .map((value) => cleanText(value))
      .filter((value): value is string => Boolean(value)),
  )];

  if (!sanitizedIds.length) {
    return new Map<string, BodegaActivityRecord>();
  }

  const result = await query<SourceActivityRow>(
    `
      select distinct on (trim(activity_id::text))
        trim(activity_id::text) as activity_id,
        nullif(trim(activity_name), '') as activity_name,
        nullif(trim(cost_area), '') as cost_area,
        nullif(trim(sub_cost_center), '') as sub_cost_center,
        nullif(trim(activity_type), '') as activity_type,
        nullif(trim(unit_of_measure), '') as unit_of_measure
      from ${SOURCE_ACTIVITY_TABLE}
      where is_current = true
        and is_valid = true
        and trim(activity_id::text) = any($1::text[])
      order by trim(activity_id::text) asc, loaded_at desc, valid_from desc
    `,
    [sanitizedIds],
  );

  return new Map(
    result.rows
      .map(mapActivityRow)
      .filter((row): row is BodegaActivityRecord => row !== null)
      .map((row) => [row.activityId, row]),
  );
}
