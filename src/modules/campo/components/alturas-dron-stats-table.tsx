"use client";

import { useMemo, useState } from "react";

import type { AlturasDronStatsRow } from "@/lib/campo-alturas-dron";
import { SearchInput } from "@/shared/forms/search-input";
import { DetailSection } from "@/shared/layout/filter-panel";
import { formatDateSlash, formatDecimal, formatPercent } from "@/shared/lib/format";
import { ScrollFadeTable } from "@/shared/tables/scroll-fade-table";
import { SortableHeader, type SortDirection } from "@/shared/tables/sortable-header";
import { StandardTable, StandardTd } from "@/shared/tables/standard-table";
import { Badge } from "@/shared/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";

// ─── Tipos ────────────────────────────────────────────────────────────────────
type DateMode = "last" | "all";

type SortKey =
  | "cycleKey"
  | "eventDate"
  | "parentBlock"
  | "variety"
  | "spType"
  | "areaId"
  | "vegetativeDay"
  | "mean"
  | "median"
  | "sd"
  | "rSmad"
  | "rSiqr"
  | "cv"
  | "rCviqr"
  | "rCvmad"
  | "bowleyV1"
  | "bowleyV2"
  | "fisher"
  | "gini"
  | "entropyNorm";

type Props = {
  stats: AlturasDronStatsRow[];
  initialSortKey?: SortKey;
  initialSortDir?: "asc" | "desc";
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const collator = new Intl.Collator("es-EC", { numeric: true, sensitivity: "base" });

function compareVal(a: unknown, b: unknown): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  return collator.compare(String(a), String(b));
}

function rowSortVal(row: AlturasDronStatsRow, key: SortKey): string | number | null {
  switch (key) {
    case "cycleKey":      return row.cycleKey;
    case "eventDate":     return row.eventDate;
    case "parentBlock":   return row.parentBlock;
    case "variety":       return row.variety ?? null;
    case "spType":        return row.spType ?? null;
    case "areaId":        return row.areaId ?? null;
    case "vegetativeDay": return row.vegetativeDay ?? null;
    case "mean":          return row.mean;
    case "median":        return row.median ?? null;
    case "sd":            return row.sd ?? null;
    case "rSmad":         return row.rSmad ?? null;
    case "rSiqr":         return row.rSiqr ?? null;
    case "cv":            return row.cv ?? null;
    case "rCviqr":        return row.rCviqr ?? null;
    case "rCvmad":        return row.rCvmad ?? null;
    case "bowleyV1":      return row.bowleyV1 ?? null;
    case "bowleyV2":      return row.bowleyV2 ?? null;
    case "fisher":        return row.fisher ?? null;
    case "gini":          return row.gini ?? null;
    case "entropyNorm":   return row.entropyNorm ?? null;
    default:              return null;
  }
}

// Semáforo CV / rCViqr / rCVmad: verde < 0.25, amarillo < 0.40, rojo >= 0.40
function cvVariant(val: number | null): "success" | "warning" | "danger" | "secondary" {
  if (val === null) return "secondary";
  if (val < 0.25) return "success";
  if (val < 0.4) return "warning";
  return "danger";
}

// Bowley / Fisher: azul < -0.2, neutro -0.2..0.2, naranja > 0.2
function bowleyVariant(val: number | null): "info" | "outline" | "warning" | "secondary" {
  if (val === null) return "secondary";
  if (val < -0.2) return "info";
  if (val <= 0.2) return "outline";
  return "warning";
}

// Gini 0-1: verde bajo, rojo alto
function giniVariant(val: number | null): "success" | "warning" | "danger" | "secondary" {
  if (val === null) return "secondary";
  if (val < 0.25) return "success";
  if (val < 0.45) return "warning";
  return "danger";
}

// Hn 0-1: gris bajo, azul alto
function hnVariant(val: number | null): "secondary" | "info" {
  if (val === null) return "secondary";
  if (val < 0.4) return "secondary";
  return "info";
}

function fmtRatio(val: number | null) {
  return formatPercent(val, { input: "ratio", minimumFractionDigits: 0, maximumFractionDigits: 1 });
}

function fmtDec(val: number | null, digits = 3) {
  return formatDecimal(val, digits);
}

// ─── Componente principal ─────────────────────────────────────────────────────
export function AlturasDronStatsTable({
  stats,
  initialSortKey = "cycleKey",
  initialSortDir = "asc",
}: Props) {
  const [dateMode, setDateMode] = useState<DateMode>("last");
  const [sortKey, setSortKey] = useState<SortKey>(initialSortKey);
  const [direction, setDirection] = useState<SortDirection>(initialSortDir);
  const [search, setSearch] = useState("");

  // En modo "last": para cada cycleKey tomar solo la fila con la fecha más reciente
  const baseRows = useMemo<AlturasDronStatsRow[]>(() => {
    if (dateMode === "all") return stats;

    const map = new Map<string, AlturasDronStatsRow>();
    for (const row of stats) {
      const existing = map.get(row.cycleKey);
      if (!existing || row.eventDate > existing.eventDate) {
        map.set(row.cycleKey, row);
      }
    }
    return [...map.values()];
  }, [stats, dateMode]);

  // Filtro de búsqueda: cycleKey + parentBlock + variety + spType + areaId
  const filtered = useMemo<AlturasDronStatsRow[]>(() => {
    const q = search.trim().toLowerCase();
    if (!q) return baseRows;
    return baseRows.filter(
      (r) =>
        r.cycleKey.toLowerCase().includes(q) ||
        r.parentBlock.toLowerCase().includes(q) ||
        (r.variety ?? "").toLowerCase().includes(q) ||
        (r.spType ?? "").toLowerCase().includes(q) ||
        (r.areaId ?? "").toLowerCase().includes(q),
    );
  }, [baseRows, search]);

  // Ordenado
  const sorted = useMemo<AlturasDronStatsRow[]>(() => {
    const copy = [...filtered];
    const mul = direction === "asc" ? 1 : -1;
    copy.sort((a, b) => compareVal(rowSortVal(a, sortKey), rowSortVal(b, sortKey)) * mul);
    return copy;
  }, [filtered, sortKey, direction]);

  const handleSort = (key: string) => {
    if (key === sortKey) {
      setDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key as SortKey);
      setDirection("asc");
    }
  };

  // 19 cols en modo "last", 20 en modo "all" (+ Fecha como 1ra)
  const colCount = dateMode === "all" ? 20 : 19;

  return (
    <DetailSection>
      <Card className="starter-panel border-border/70 bg-card/86">
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-lg font-semibold">
              Estadísticas por ciclo
            </CardTitle>

            {/* Toggle modo fecha */}
            <div className="flex overflow-hidden rounded-[12px] border border-border/70 bg-muted/30 text-xs font-medium">
              <ToggleButton
                active={dateMode === "last"}
                onClick={() => setDateMode("last")}
              >
                Última fecha
              </ToggleButton>
              <ToggleButton
                active={dateMode === "all"}
                onClick={() => setDateMode("all")}
              >
                Todas las fechas
              </ToggleButton>
            </div>
          </div>

          {/* Buscador */}
          <div className="w-full max-w-sm">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Buscar ciclo, bloque, variedad, SP type, área..."
              ariaLabel="Buscar en estadísticas de alturas dron"
              debounceMs={200}
            />
          </div>

          <p className="text-xs text-muted-foreground">
            {sorted.length} {sorted.length === 1 ? "registro" : "registros"}
            {search.trim() ? " (filtrado)" : ""}
          </p>
        </CardHeader>

        <CardContent>
          <ScrollFadeTable topScrollbar>
            <StandardTable className="min-w-[1900px]">
              <thead>
                <tr>
                  {/* Fecha — solo en modo "all" */}
                  {dateMode === "all" && (
                    <SortableHeader
                      label="Fecha"
                      sortKey="eventDate"
                      activeSortKey={sortKey}
                      direction={direction}
                      onSort={handleSort}
                    />
                  )}
                  {/* 1. Ciclo */}
                  <SortableHeader
                    label="Ciclo"
                    sortKey="cycleKey"
                    activeSortKey={sortKey}
                    direction={direction}
                    onSort={handleSort}
                  />
                  {/* 2. Variedad */}
                  <SortableHeader
                    label="Variedad"
                    sortKey="variety"
                    activeSortKey={sortKey}
                    direction={direction}
                    onSort={handleSort}
                  />
                  {/* 3. SP Type */}
                  <SortableHeader
                    label="SP Type"
                    sortKey="spType"
                    activeSortKey={sortKey}
                    direction={direction}
                    onSort={handleSort}
                  />
                  {/* 4. Área */}
                  <SortableHeader
                    label="Área"
                    sortKey="areaId"
                    activeSortKey={sortKey}
                    direction={direction}
                    onSort={handleSort}
                  />
                  {/* 5. Bloque */}
                  <SortableHeader
                    label="Bloque"
                    sortKey="parentBlock"
                    activeSortKey={sortKey}
                    direction={direction}
                    onSort={handleSort}
                  />
                  {/* 6. Día Veg */}
                  <SortableHeader
                    label="Día Veg"
                    sortKey="vegetativeDay"
                    activeSortKey={sortKey}
                    direction={direction}
                    onSort={handleSort}
                    align="right"
                  />
                  {/* 7. E[x] */}
                  <SortableHeader
                    label="E[x] (m)"
                    sortKey="mean"
                    activeSortKey={sortKey}
                    direction={direction}
                    onSort={handleSort}
                    align="right"
                  />
                  {/* 8. Me(x) */}
                  <SortableHeader
                    label="Me(x) (m)"
                    sortKey="median"
                    activeSortKey={sortKey}
                    direction={direction}
                    onSort={handleSort}
                    align="right"
                  />
                  {/* 9. S(x) */}
                  <SortableHeader
                    label="S(x) (m)"
                    sortKey="sd"
                    activeSortKey={sortKey}
                    direction={direction}
                    onSort={handleSort}
                    align="right"
                  />
                  {/* 10. rSmad */}
                  <SortableHeader
                    label="rSmad (m)"
                    sortKey="rSmad"
                    activeSortKey={sortKey}
                    direction={direction}
                    onSort={handleSort}
                    align="right"
                  />
                  {/* 11. rSiqr */}
                  <SortableHeader
                    label="rSiqr (m)"
                    sortKey="rSiqr"
                    activeSortKey={sortKey}
                    direction={direction}
                    onSort={handleSort}
                    align="right"
                  />
                  {/* 12. CV */}
                  <SortableHeader
                    label="CV"
                    sortKey="cv"
                    activeSortKey={sortKey}
                    direction={direction}
                    onSort={handleSort}
                    align="right"
                  />
                  {/* 13. rCViqr */}
                  <SortableHeader
                    label="rCViqr"
                    sortKey="rCviqr"
                    activeSortKey={sortKey}
                    direction={direction}
                    onSort={handleSort}
                    align="right"
                  />
                  {/* 14. rCVmad */}
                  <SortableHeader
                    label="rCVmad"
                    sortKey="rCvmad"
                    activeSortKey={sortKey}
                    direction={direction}
                    onSort={handleSort}
                    align="right"
                  />
                  {/* 15. Bowley V1 */}
                  <SortableHeader
                    label="Bowley V1"
                    sortKey="bowleyV1"
                    activeSortKey={sortKey}
                    direction={direction}
                    onSort={handleSort}
                    align="right"
                  />
                  {/* 16. Bowley V2 */}
                  <SortableHeader
                    label="Bowley V2"
                    sortKey="bowleyV2"
                    activeSortKey={sortKey}
                    direction={direction}
                    onSort={handleSort}
                    align="right"
                  />
                  {/* 17. Fisher */}
                  <SortableHeader
                    label="Fisher"
                    sortKey="fisher"
                    activeSortKey={sortKey}
                    direction={direction}
                    onSort={handleSort}
                    align="right"
                  />
                  {/* 18. Gini */}
                  <SortableHeader
                    label="Gini"
                    sortKey="gini"
                    activeSortKey={sortKey}
                    direction={direction}
                    onSort={handleSort}
                    align="right"
                  />
                  {/* 19. Hn */}
                  <SortableHeader
                    label="Hn"
                    sortKey="entropyNorm"
                    activeSortKey={sortKey}
                    direction={direction}
                    onSort={handleSort}
                    align="right"
                  />
                </tr>
              </thead>
              <tbody>
                {sorted.length === 0 ? (
                  <tr>
                    <td
                      colSpan={colCount}
                      className="px-4 py-8 text-center text-sm text-muted-foreground"
                    >
                      Sin resultados para la búsqueda.
                    </td>
                  </tr>
                ) : (
                  sorted.map((row, idx) => (
                    <StatsRow
                      key={`${row.cycleKey}|${row.eventDate}|${idx}`}
                      row={row}
                      showDate={dateMode === "all"}
                    />
                  ))
                )}
              </tbody>
            </StandardTable>
          </ScrollFadeTable>
        </CardContent>
      </Card>
    </DetailSection>
  );
}

// ─── Fila de datos ────────────────────────────────────────────────────────────
function StatsRow({ row, showDate }: { row: AlturasDronStatsRow; showDate: boolean }) {
  return (
    <tr className="border-t border-border/60 hover:bg-muted/30">
      {/* Fecha (modo "all") */}
      {showDate && (
        <StandardTd>
          <span className="tabular-nums text-muted-foreground">
            {formatDateSlash(row.eventDate)}
          </span>
        </StandardTd>
      )}

      {/* 1. Ciclo */}
      <StandardTd>
        <span className="font-mono text-xs font-medium text-foreground">
          {row.cycleKey}
        </span>
      </StandardTd>

      {/* 2. Variedad */}
      <StandardTd>
        {row.variety ?? <span className="text-muted-foreground">—</span>}
      </StandardTd>

      {/* 3. SP Type */}
      <StandardTd>
        {row.spType ?? <span className="text-muted-foreground">—</span>}
      </StandardTd>

      {/* 4. Área */}
      <StandardTd>
        {row.areaId ?? <span className="text-muted-foreground">—</span>}
      </StandardTd>

      {/* 5. Bloque */}
      <StandardTd>
        <span className="font-medium text-foreground">{row.parentBlock}</span>
      </StandardTd>

      {/* 6. Día Veg */}
      <StandardTd align="right">
        {row.vegetativeDay != null ? (
          <span className="tabular-nums">{row.vegetativeDay}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </StandardTd>

      {/* 7. E[x] */}
      <StandardTd align="right">
        <span className="tabular-nums font-medium">{fmtDec(row.mean)}</span>
      </StandardTd>

      {/* 8. Me(x) */}
      <StandardTd align="right">
        <span className="tabular-nums">{fmtDec(row.median)}</span>
      </StandardTd>

      {/* 9. S(x) */}
      <StandardTd align="right">
        <span className="tabular-nums">{fmtDec(row.sd)}</span>
      </StandardTd>

      {/* 10. rSmad */}
      <StandardTd align="right">
        <span className="tabular-nums">{fmtDec(row.rSmad)}</span>
      </StandardTd>

      {/* 11. rSiqr */}
      <StandardTd align="right">
        <span className="tabular-nums">{fmtDec(row.rSiqr)}</span>
      </StandardTd>

      {/* 12. CV */}
      <StandardTd align="right">
        <Badge variant={cvVariant(row.cv)} className="tabular-nums">
          {fmtRatio(row.cv)}
        </Badge>
      </StandardTd>

      {/* 13. rCViqr */}
      <StandardTd align="right">
        <Badge variant={cvVariant(row.rCviqr)} className="tabular-nums">
          {fmtRatio(row.rCviqr)}
        </Badge>
      </StandardTd>

      {/* 14. rCVmad */}
      <StandardTd align="right">
        <Badge variant={cvVariant(row.rCvmad)} className="tabular-nums">
          {fmtRatio(row.rCvmad)}
        </Badge>
      </StandardTd>

      {/* 15. Bowley V1 */}
      <StandardTd align="right">
        <Badge variant={bowleyVariant(row.bowleyV1)} className="tabular-nums">
          {fmtDec(row.bowleyV1)}
        </Badge>
      </StandardTd>

      {/* 16. Bowley V2 */}
      <StandardTd align="right">
        <Badge variant={bowleyVariant(row.bowleyV2)} className="tabular-nums">
          {fmtDec(row.bowleyV2)}
        </Badge>
      </StandardTd>

      {/* 17. Fisher */}
      <StandardTd align="right">
        <Badge variant={bowleyVariant(row.fisher)} className="tabular-nums">
          {fmtDec(row.fisher)}
        </Badge>
      </StandardTd>

      {/* 18. Gini */}
      <StandardTd align="right">
        <Badge variant={giniVariant(row.gini)} className="tabular-nums">
          {fmtDec(row.gini)}
        </Badge>
      </StandardTd>

      {/* 19. Hn */}
      <StandardTd align="right">
        <Badge variant={hnVariant(row.entropyNorm)} className="tabular-nums">
          {fmtDec(row.entropyNorm)}
        </Badge>
      </StandardTd>
    </tr>
  );
}

// ─── Toggle button ────────────────────────────────────────────────────────────
function ToggleButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "bg-foreground px-4 py-2 text-background"
          : "px-4 py-2 text-muted-foreground hover:text-foreground"
      }
    >
      {children}
    </button>
  );
}
