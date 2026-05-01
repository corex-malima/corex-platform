import "server-only";

import { query } from "@/lib/db";
import { cachedAsync } from "@/lib/server-cache";

const DRENCH_WEEK_CALENDAR_TTL_MS = 5 * 60 * 1000;

type DrenchWeekCalendarQueryRow = {
  cycle_key: string | null;
  block_id: string | null;
  parent_block: string | null;
  area_id: string | null;
  variety: string | null;
  sp_type: string | null;
  cycle_type_code: string | null;
  cycle_type_label: string | null;
  drench_group_key: string | null;
  drench_group_label: string | null;
  sp_date: string | null;
  iso_week_id: string | null;
  publication_iso_week_id: string | null;
  week_start_date: string | null;
  week_end_date: string | null;
  anchor_date: string | null;
  publication_date: string | null;
  days_since_sp: number | null;
  phenological_week: number | null;
  phenological_start_date: string | null;
  phenological_end_date: string | null;
};

type DrenchWeekCalendarWeekOptionRow = {
  iso_week_id: string;
  week_start_date: string;
  week_end_date: string;
};

export type DrenchWeekCalendarFilters = {
  isoWeekId: string;
  cycleType: string;
  variety: string;
  areaId: string;
};

export type DrenchWeekCalendarRow = {
  cycleKey: string;
  blockId: string;
  parentBlock: string | null;
  areaId: string | null;
  variety: string;
  spType: string | null;
  cycleTypeCode: string;
  cycleTypeLabel: string;
  drenchGroupKey: string;
  drenchGroupLabel: string;
  spDate: string;
  isoWeekId: string;
  publicationIsoWeekId: string | null;
  weekStartDate: string;
  weekEndDate: string;
  anchorDate: string;
  publicationDate: string;
  daysSinceSp: number;
  phenologicalWeek: number;
  phenologicalStartDate: string;
  phenologicalEndDate: string;
};

export type DrenchWeekCalendarWeekOption = {
  isoWeekId: string;
  weekStartDate: string;
  weekEndDate: string;
};

export type DrenchWeekCalendarOptions = {
  isoWeeks: DrenchWeekCalendarWeekOption[];
  cycleTypes: string[];
  varieties: string[];
  areas: string[];
  defaultIsoWeekId: string;
};

function normalizeFilters(filters: Partial<DrenchWeekCalendarFilters>): DrenchWeekCalendarFilters {
  return {
    isoWeekId: String(filters.isoWeekId ?? "").trim(),
    cycleType: String(filters.cycleType ?? "").trim().toUpperCase(),
    variety: String(filters.variety ?? "").trim().toUpperCase(),
    areaId: String(filters.areaId ?? "").trim().toUpperCase(),
  };
}

function mapCalendarRow(row: DrenchWeekCalendarQueryRow): DrenchWeekCalendarRow | null {
  if (
    !row.cycle_key ||
    !row.block_id ||
    !row.variety ||
    !row.cycle_type_code ||
    !row.cycle_type_label ||
    !row.drench_group_key ||
    !row.drench_group_label ||
    !row.sp_date ||
    !row.iso_week_id ||
    !row.week_start_date ||
    !row.week_end_date ||
    !row.anchor_date ||
    !row.publication_date ||
    row.days_since_sp === null ||
    row.phenological_week === null ||
    !row.phenological_start_date ||
    !row.phenological_end_date
  ) {
    return null;
  }

  return {
    cycleKey: row.cycle_key,
    blockId: row.block_id,
    parentBlock: row.parent_block ?? null,
    areaId: row.area_id ?? null,
    variety: row.variety,
    spType: row.sp_type ?? null,
    cycleTypeCode: row.cycle_type_code,
    cycleTypeLabel: row.cycle_type_label,
    drenchGroupKey: row.drench_group_key,
    drenchGroupLabel: row.drench_group_label,
    spDate: row.sp_date,
    isoWeekId: row.iso_week_id,
    publicationIsoWeekId: row.publication_iso_week_id ?? null,
    weekStartDate: row.week_start_date,
    weekEndDate: row.week_end_date,
    anchorDate: row.anchor_date,
    publicationDate: row.publication_date,
    daysSinceSp: row.days_since_sp,
    phenologicalWeek: row.phenological_week,
    phenologicalStartDate: row.phenological_start_date,
    phenologicalEndDate: row.phenological_end_date,
  };
}

export async function getDefaultDrenchTargetIsoWeekId() {
  const cacheKey = "drench-week-calendar:default-iso-week";

  return cachedAsync(cacheKey, DRENCH_WEEK_CALENDAR_TTL_MS, async () => {
    const result = await query<{ iso_week_id: string | null }>(
      `
        select iso_week_id
        from slv.common_dim_calendar_date_scd0
        where calendar_date = current_date + 7
        limit 1
      `,
    );

    return result.rows[0]?.iso_week_id?.trim() ?? "";
  });
}

export async function listDrenchWeekCalendarOptions(): Promise<DrenchWeekCalendarOptions> {
  const cacheKey = "drench-week-calendar:options";

  return cachedAsync(cacheKey, DRENCH_WEEK_CALENDAR_TTL_MS, async () => {
    const [weekResult, cycleTypeResult, varietyResult, areaResult, defaultIsoWeekId] = await Promise.all([
      query<DrenchWeekCalendarWeekOptionRow>(
        `
          select distinct iso_week_id, week_start_date, week_end_date
          from slv.camp_v_drench_week_calendar_cur
          order by week_start_date asc
        `,
      ),
      query<{ cycle_type_code: string | null }>(
        `
          select distinct cycle_type_code
          from slv.camp_v_drench_week_calendar_cur
          where cycle_type_code is not null
          order by cycle_type_code asc
        `,
      ),
      query<{ variety: string | null }>(
        `
          select distinct variety
          from slv.camp_v_drench_week_calendar_cur
          where variety is not null
          order by variety asc
        `,
      ),
      query<{ area_id: string | null }>(
        `
          select distinct area_id
          from slv.camp_v_drench_week_calendar_cur
          where area_id is not null and area_id <> ''
          order by area_id asc
        `,
      ),
      getDefaultDrenchTargetIsoWeekId(),
    ]);

    return {
      isoWeeks: weekResult.rows.map((row) => ({
        isoWeekId: row.iso_week_id,
        weekStartDate: row.week_start_date,
        weekEndDate: row.week_end_date,
      })),
      cycleTypes: cycleTypeResult.rows.flatMap((row) => (row.cycle_type_code ? [row.cycle_type_code] : [])),
      varieties: varietyResult.rows.flatMap((row) => (row.variety ? [row.variety] : [])),
      areas: areaResult.rows.flatMap((row) => (row.area_id ? [row.area_id] : [])),
      defaultIsoWeekId,
    };
  });
}

export async function listDrenchWeekCalendar(
  incomingFilters: Partial<DrenchWeekCalendarFilters> = {},
): Promise<DrenchWeekCalendarRow[]> {
  const filters = normalizeFilters(incomingFilters);
  const resolvedIsoWeekId = filters.isoWeekId || await getDefaultDrenchTargetIsoWeekId();
  const cacheKey = [
    "drench-week-calendar:rows",
    resolvedIsoWeekId,
    filters.cycleType || "all",
    filters.variety || "all",
    filters.areaId || "all",
  ].join(":");

  return cachedAsync(cacheKey, DRENCH_WEEK_CALENDAR_TTL_MS, async () => {
    const result = await query<DrenchWeekCalendarQueryRow>(
      `
        select
          cycle_key,
          block_id,
          parent_block,
          area_id,
          variety,
          sp_type,
          cycle_type_code,
          cycle_type_label,
          drench_group_key,
          drench_group_label,
          to_char(sp_date, 'YYYY-MM-DD') as sp_date,
          iso_week_id,
          publication_iso_week_id,
          to_char(week_start_date, 'YYYY-MM-DD') as week_start_date,
          to_char(week_end_date, 'YYYY-MM-DD') as week_end_date,
          to_char(anchor_date, 'YYYY-MM-DD') as anchor_date,
          to_char(publication_date, 'YYYY-MM-DD') as publication_date,
          days_since_sp,
          phenological_week,
          to_char(phenological_start_date, 'YYYY-MM-DD') as phenological_start_date,
          to_char(phenological_end_date, 'YYYY-MM-DD') as phenological_end_date
        from slv.camp_v_drench_week_calendar_cur
        where iso_week_id = $1
          and ($2 = '' or cycle_type_code = $2)
          and ($3 = '' or variety = $3)
          and ($4 = '' or coalesce(area_id, '') = $4)
        order by cycle_type_code asc, variety asc, block_id asc, cycle_key asc
      `,
      [resolvedIsoWeekId, filters.cycleType, filters.variety, filters.areaId],
    );

    return result.rows.flatMap((row) => {
      const mapped = mapCalendarRow(row);
      return mapped ? [mapped] : [];
    });
  });
}
