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
  | "eventDate"
  | "parentBlock"
  | "variety"
  | "mean"
  | "median"
  | "sd"
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
    case "eventDate":   return row.eventDate;
    case "parentBlock": return row.parentBlock;
    case "variety":     return row.variety ?? null;
    case "mean":        return row.mean;
    case "median":      return row.median ?? null;
    case "sd":          return row.sd ?? null;
    case "cv":          return row.cv ?? null;
    case "rCviqr":      return row.rCviqr ?? null;
    case "rCvmad":      return row.rCvmad ?? null;
    case "bowleyV1":    return row.bowleyV1 ?? null;
    case "bowleyV2":    return row.bowleyV2 ?? null;
    case "fisher":      return row.fisher ?? null;
    case "gini":        return row.gini ?? null;
    case "entropyNorm": return row.entropyNorm ?? null;
    default:            return null;
  }
}

// Semáforo CV / rCViqr / rCVmad: verde < 0.25, amarillo < 0.40, rojo ≥ 0.40
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
function hnVariant(val: number | null): "secondary" | "info" | "secondary" {
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
export function AlturasDronStatsTable({ stats, initialSortKey = "parentBlock", initialSortDir = "asc" }: Props) {
  const [dateMode, setDateMode] = useState<DateMode>("last");
  const [sortKey, setSortKey] = useState<SortKey>(initialSortKey);
  const [direction, setDirection] = useState<SortDirection>(initialSortDir);
  const [search, setSearch] = useState("");

  // En modo "last": para cada bloque tomar solo la fila con la fecha más reciente
  const baseRows = useMemo<AlturasDronStatsRow[]>(() => {
    if (dateMode === "all") return stats;

    // Agrupar por parentBlock → mantener fila con eventDate max
    const map = new Map<string, AlturasDronStatsRow>();
    for (const row of stats) {
      const existing = map.get(row.parentBlock);
      if (!existing || row.eventDate > existing.eventDate) {
        map.set(row.parentBlock, row);
      }
    }
    return [...map.values()];
  }, [stats, dateMode]);

  // Filtro de búsqueda por bloque y variedad
  const filtered = useMemo<AlturasDronStatsRow[]>(() => {
    const q = search.trim().toLowerCase();
    if (!q) return baseRows;
    return baseRows.filter(
      (r) =>
        r.parentBlock.toLowerCase().includes(q) ||
        (r.variety ?? "").toLowerCase().includes(q),
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

  // min-width depende de si mostramos la columna de fecha
  const minWidth = dateMode === "all" ? "min-w-[1520px]" : "min-w-[1380px]";

  return (
    <DetailSection>
      <Card className="starter-panel border-border/70 bg-card/86">
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-lg font-semibold">
              Estadísticas por bloque
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
          <div className="w-full max-w-xs">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Buscar bloque o variedad..."
              ariaLabel="Buscar bloque o variedad"
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
            <StandardTable className={minWidth}>
              <thead>
                <tr>
                  {dateMode === "all" && (
                    <SortableHeader
                      label="Fecha"
                      sortKey="eventDate"
                      activeSortKey={sortKey}
                      direction={direction}
                      onSort={handleSort}
                    />
                  )}
                  <SortableHeader
                    label="Bloque"
                    sortKey="parentBlock"
                    activeSortKey={sortKey}
                    direction={direction}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    label="Variedad"
                    sortKey="variety"
                    activeSortKey={sortKey}
                    direction={direction}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    label="E[x] (m)"
                    sortKey="mean"
                    activeSortKey={sortKey}
                    direction={direction}
                    onSort={handleSort}
                    align="right"
                  />
                  <SortableHeader
                    label="Me(x) (m)"
                    sortKey="median"
                    activeSortKey={sortKey}
                    direction={direction}
                    onSort={handleSort}
                    align="right"
                  />
                  <SortableHeader
                    label="S(x) (m)"
                    sortKey="sd"
                    activeSortKey={sortKey}
                    direction={direction}
                    onSort={handleSort}
                    align="right"
                  />
                  <SortableHeader
                    label="CV"
                    sortKey="cv"
                    activeSortKey={sortKey}
                    direction={direction}
                    onSort={handleSort}
                    align="right"
                  />
                  <SortableHeader
                    label="rCViqr"
                    sortKey="rCviqr"
                    activeSortKey={sortKey}
                    direction={direction}
                    onSort={handleSort}
                    align="right"
                  />
                  <SortableHeader
                    label="rCVmad"
                    sortKey="rCvmad"
                    activeSortKey={sortKey}
                    direction={direction}
                    onSort={handleSort}
                    align="right"
                  />
                  <SortableHeader
                    label="Bowley V1"
                    sortKey="bowleyV1"
                    activeSortKey={sortKey}
                    direction={direction}
                    onSort={handleSort}
                    align="right"
                  />
                  <SortableHeader
                    label="Bowley V2"
                    sortKey="bowleyV2"
                    activeSortKey={sortKey}
                    direction={direction}
                    onSort={handleSort}
                    align="right"
                  />
                  <SortableHeader
                    label="Fisher"
                    sortKey="fisher"
                    activeSortKey={sortKey}
                    direction={direction}
                    onSort={handleSort}
                    align="right"
                  />
                  <SortableHeader
                    label="Gini"
                    sortKey="gini"
                    activeSortKey={sortKey}
                    direction={direction}
                    onSort={handleSort}
                    align="right"
                  />
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
                      colSpan={dateMode === "all" ? 15 : 14}
                      className="px-4 py-8 text-center text-sm text-muted-foreground"
                    >
                      Sin resultados para la búsqueda.
                    </td>
                  </tr>
                ) : (
                  sorted.map((row, idx) => (
                    <StatsRow
                      key={`${row.parentBlock}|${row.eventDate}|${idx}`}
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
      {showDate && (
        <StandardTd>
          <span className="tabular-nums text-muted-foreground">
            {formatDateSlash(row.eventDate)}
          </span>
        </StandardTd>
      )}

      {/* Bloque */}
      <StandardTd>
        <span className="font-medium text-foreground">{row.parentBlock}</span>
        {row.blockId ? (
          <span className="ml-1 text-xs text-muted-foreground">({row.blockId})</span>
        ) : null}
      </StandardTd>

      {/* Variedad */}
      <StandardTd>
        {row.variety ?? <span className="text-muted-foreground">—</span>}
      </StandardTd>

      {/* E[x] */}
      <StandardTd align="right">
        <span className="tabular-nums font-medium">{fmtDec(row.mean)}</span>
      </StandardTd>

      {/* Me(x) */}
      <StandardTd align="right">
        <span className="tabular-nums">{fmtDec(row.median)}</span>
      </StandardTd>

      {/* S(x) */}
      <StandardTd align="right">
        <span className="tabular-nums">{fmtDec(row.sd)}</span>
      </StandardTd>

      {/* CV */}
      <StandardTd align="right">
        <Badge variant={cvVariant(row.cv)} className="tabular-nums">
          {fmtRatio(row.cv)}
        </Badge>
      </StandardTd>

      {/* rCViqr */}
      <StandardTd align="right">
        <Badge variant={cvVariant(row.rCviqr)} className="tabular-nums">
          {fmtRatio(row.rCviqr)}
        </Badge>
      </StandardTd>

      {/* rCVmad */}
      <StandardTd align="right">
        <Badge variant={cvVariant(row.rCvmad)} className="tabular-nums">
          {fmtRatio(row.rCvmad)}
        </Badge>
      </StandardTd>

      {/* Bowley V1 */}
      <StandardTd align="right">
        <Badge variant={bowleyVariant(row.bowleyV1)} className="tabular-nums">
          {fmtDec(row.bowleyV1)}
        </Badge>
      </StandardTd>

      {/* Bowley V2 */}
      <StandardTd align="right">
        <Badge variant={bowleyVariant(row.bowleyV2)} className="tabular-nums">
          {fmtDec(row.bowleyV2)}
        </Badge>
      </StandardTd>

      {/* Fisher */}
      <StandardTd align="right">
        <Badge variant={bowleyVariant(row.fisher)} className="tabular-nums">
          {fmtDec(row.fisher)}
        </Badge>
      </StandardTd>

      {/* Gini */}
      <StandardTd align="right">
        <Badge variant={giniVariant(row.gini)} className="tabular-nums">
          {fmtDec(row.gini)}
        </Badge>
      </StandardTd>

      {/* Hn */}
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
