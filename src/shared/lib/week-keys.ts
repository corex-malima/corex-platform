import { getISOWeek, getISOWeekYear } from "date-fns";

import { parseDateOnly } from "./format";

export type WeekKind = "iso" | "sunsat";

function pad2(value: number): string {
  return String(Math.abs(value)).padStart(2, "0");
}

function twoDigitYear(year: number): string {
  return pad2(year % 100);
}

function toDate(input: string | Date): Date | null {
  if (input instanceof Date) {
    return Number.isNaN(input.getTime()) ? null : input;
  }
  return parseDateOnly(input);
}

/**
 * Semana ISO 8601 (lunes a domingo). Año = año del jueves de esa semana.
 * Devuelve etiqueta de 4 caracteres "YYWW" para uso en ejes/labels.
 */
export function getIsoWeekKey(date: string | Date): string | null {
  const parsed = toDate(date);
  if (!parsed) return null;
  const year = getISOWeekYear(parsed);
  const week = getISOWeek(parsed);
  return `${twoDigitYear(year)}${pad2(week)}`;
}

/**
 * Domingo de la semana que contiene `date`. Si `date` ya es domingo, devuelve `date`.
 */
function startOfSundayWeek(date: Date): Date {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0, 0);
  const day = result.getDay(); // 0..6 con 0 = domingo
  result.setDate(result.getDate() - day);
  return result;
}

/**
 * Semana domingo→sábado. Numeración:
 *  - La "semana 1" del año es la que contiene el primer domingo de ese año.
 *  - Fechas anteriores al primer domingo del año pertenecen a la última semana del año anterior.
 *  - Año del key = año del domingo de inicio de esa semana.
 *
 * Devuelve etiqueta de 4 caracteres "YYWW".
 */
export function getSunSatWeekKey(date: string | Date): string | null {
  const parsed = toDate(date);
  if (!parsed) return null;

  const weekStart = startOfSundayWeek(parsed);
  const year = weekStart.getFullYear();

  // Primer domingo del año del weekStart
  const jan1 = new Date(year, 0, 1, 12, 0, 0, 0);
  const jan1Day = jan1.getDay();
  const firstSunday = new Date(year, 0, 1 + ((7 - jan1Day) % 7), 12, 0, 0, 0);

  if (weekStart.getTime() < firstSunday.getTime()) {
    // Pertenece a la última semana del año previo
    const prevYear = year - 1;
    const prevJan1 = new Date(prevYear, 0, 1, 12, 0, 0, 0);
    const prevFirstSundayOffset = (7 - prevJan1.getDay()) % 7;
    const prevFirstSunday = new Date(prevYear, 0, 1 + prevFirstSundayOffset, 12, 0, 0, 0);
    const diffDays = Math.round((weekStart.getTime() - prevFirstSunday.getTime()) / 86_400_000);
    const weekNumber = Math.floor(diffDays / 7) + 1;
    return `${twoDigitYear(prevYear)}${pad2(weekNumber)}`;
  }

  const diffDays = Math.round((weekStart.getTime() - firstSunday.getTime()) / 86_400_000);
  const weekNumber = Math.floor(diffDays / 7) + 1;
  return `${twoDigitYear(year)}${pad2(weekNumber)}`;
}

export function getWeekKey(date: string | Date, kind: WeekKind): string | null {
  return kind === "iso" ? getIsoWeekKey(date) : getSunSatWeekKey(date);
}

/**
 * Devuelve la fecha (YYYY-MM-DD) de inicio de la semana que contiene `date`,
 * según el tipo de semana elegido. ISO inicia lunes, sunsat inicia domingo.
 */
export function getWeekStartIso(date: string | Date, kind: WeekKind): string | null {
  const parsed = toDate(date);
  if (!parsed) return null;

  if (kind === "sunsat") {
    const start = startOfSundayWeek(parsed);
    return formatYmd(start);
  }

  // ISO: lunes (1) a domingo (0 = 7)
  const local = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate(), 12, 0, 0, 0);
  const dayMon = ((local.getDay() + 6) % 7); // 0 = lunes
  local.setDate(local.getDate() - dayMon);
  return formatYmd(local);
}

export function getWeekEndIso(date: string | Date, kind: WeekKind): string | null {
  const start = getWeekStartIso(date, kind);
  if (!start) return null;
  const startDate = parseDateOnly(start);
  if (!startDate) return null;
  startDate.setDate(startDate.getDate() + 6);
  return formatYmd(startDate);
}

function formatYmd(date: Date): string {
  const y = date.getFullYear();
  const m = pad2(date.getMonth() + 1);
  const d = pad2(date.getDate());
  return `${y}-${m}-${d}`;
}

/**
 * Formato de etiqueta "YYWW" derivado de un key crudo (sin transformar).
 * Reexpuesto por simetría con formatIsoWeekLabel para call sites uniformes.
 */
export function formatWeekKeyLabel(weekKey: string | null | undefined): string {
  return weekKey ?? "-";
}
