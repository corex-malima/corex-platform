"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";

import { Card } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { ScrollFadeTable } from "@/shared/tables/scroll-fade-table";
import { SortableHeader } from "@/shared/tables/sortable-header";
import { StandardTable, StandardTd } from "@/shared/tables/standard-table";
import { SearchInput } from "@/shared/forms/search-input";
import { formatDecimal, formatPercent } from "@/shared/lib/format";
import type { AlturasDronStatsRow } from "@/lib/campo-alturas-dron";

export interface AlturasDronTableProps {
  rows: AlturasDronStatsRow[];
  searchValue: string;
  onSearchChange: (value: string) => void;
}

type SortKey =
  | "parentBlock"
  | "alturaM"
  | "cv"
  | "mediana"
  | "sd"
  | "tendencia";

export function AlturasDronTable({
  rows,
  searchValue,
  onSearchChange,
}: AlturasDronTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("parentBlock");
  const [sortAsc, setSortAsc] = useState(true);

  // Calcular tendencia por bloque (altura última fecha - altura primera fecha)
  const blockTendencias = useMemo(() => {
    const map = new Map<string, { first: number | null; last: number | null }>();
    rows.forEach((row) => {
      const key = row.parentBlock;
      if (!map.has(key)) {
        map.set(key, { first: row.alturaM, last: row.alturaM });
      } else {
        const current = map.get(key)!;
        current.last = row.alturaM; // Asumir que están ordenados por fecha
      }
    });

    const tendencias = new Map<string, number>();
    map.forEach((val, key) => {
      const first = val.first ?? 0;
      const last = val.last ?? 0;
      tendencias.set(key, last - first);
    });
    return tendencias;
  }, [rows]);

  // Filtrar por búsqueda
  const filtered = useMemo(
    () =>
      searchValue.trim() === ""
        ? rows
        : rows.filter((row) =>
            row.parentBlock
              .toLowerCase()
              .includes(searchValue.toLowerCase()),
          ),
    [rows, searchValue],
  );

  // Ordenar
  const sorted = useMemo(() => {
    const copy = [...filtered];
    copy.sort((a, b) => {
      let aVal: number | string = 0;
      let bVal: number | string = 0;

      switch (sortKey) {
        case "parentBlock":
          aVal = a.parentBlock;
          bVal = b.parentBlock;
          break;
        case "alturaM":
          aVal = a.alturaM ?? 0;
          bVal = b.alturaM ?? 0;
          break;
        case "cv":
          aVal = a.cv ?? 0;
          bVal = b.cv ?? 0;
          break;
        case "mediana":
          aVal = a.mediana ?? 0;
          bVal = b.mediana ?? 0;
          break;
        case "sd":
          aVal = a.sd ?? 0;
          bVal = b.sd ?? 0;
          break;
        case "tendencia":
          aVal = blockTendencias.get(a.parentBlock) ?? 0;
          bVal = blockTendencias.get(b.parentBlock) ?? 0;
          break;
      }

      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }

      const numA = Number(aVal);
      const numB = Number(bVal);
      return sortAsc ? numA - numB : numB - numA;
    });

    return copy;
  }, [filtered, sortKey, sortAsc, blockTendencias]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  }

  function getCvBadgeVariant(cv: number | null): "success" | "warning" | "danger" {
    if (cv === null) return "success";
    if (cv >= 0.4) return "danger";
    if (cv >= 0.25) return "warning";
    return "success";
  }

  return (
    <Card>
      <div className="border-b px-4 py-3">
        <SearchInput
          value={searchValue}
          onChange={onSearchChange}
          placeholder="Buscar por bloque..."
        />
      </div>

      <ScrollFadeTable>
        <StandardTable>
          <thead className="bg-muted/40 text-xs font-semibold uppercase tracking-wide">
            <tr>
              <th className="border-b px-4 py-2 text-left">
                <SortableHeader
                  label="Bloque"
                  sortKey="parentBlock"
                  activeSortKey={sortKey}
                  direction={sortAsc ? "asc" : "desc"}
                  onSort={() => toggleSort("parentBlock")}
                />
              </th>
              <th className="border-b px-4 py-2 text-right">
                <SortableHeader
                  label="Altura (m)"
                  sortKey="alturaM"
                  activeSortKey={sortKey}
                  direction={sortAsc ? "asc" : "desc"}
                  onSort={() => toggleSort("alturaM")}
                  align="right"
                />
              </th>
              <th className="border-b px-4 py-2 text-right">
                <SortableHeader
                  label="CV"
                  sortKey="cv"
                  activeSortKey={sortKey}
                  direction={sortAsc ? "asc" : "desc"}
                  onSort={() => toggleSort("cv")}
                  align="right"
                />
              </th>
              <th className="border-b px-4 py-2 text-right">
                <SortableHeader
                  label="Mediana (m)"
                  sortKey="mediana"
                  activeSortKey={sortKey}
                  direction={sortAsc ? "asc" : "desc"}
                  onSort={() => toggleSort("mediana")}
                  align="right"
                />
              </th>
              <th className="border-b px-4 py-2 text-right">
                <SortableHeader
                  label="SD"
                  sortKey="sd"
                  activeSortKey={sortKey}
                  direction={sortAsc ? "asc" : "desc"}
                  onSort={() => toggleSort("sd")}
                  align="right"
                />
              </th>
              <th className="border-b px-4 py-2 text-right">
                <SortableHeader
                  label="Tendencia"
                  sortKey="tendencia"
                  activeSortKey={sortKey}
                  direction={sortAsc ? "asc" : "desc"}
                  onSort={() => toggleSort("tendencia")}
                  align="right"
                />
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, idx) => {
              const tendencia = blockTendencias.get(row.parentBlock) ?? 0;
              const tendenciaIcon =
                Math.abs(tendencia) < 0.001 ? (
                  <Minus className="size-4 text-muted-foreground" />
                ) : tendencia > 0 ? (
                  <ArrowUp className="size-4 text-success" />
                ) : (
                  <ArrowDown className="size-4 text-danger" />
                );

              return (
                <tr key={idx} className="border-b hover:bg-muted/20 transition-colors">
                  <StandardTd className="text-left font-medium">
                    {row.parentBlock}
                  </StandardTd>
                  <StandardTd className="text-right">
                    {formatDecimal(row.alturaM)}
                  </StandardTd>
                  <StandardTd className="text-right">
                    <Badge variant={getCvBadgeVariant(row.cv)}>
                      {formatPercent(row.cv, { maximumFractionDigits: 1 })}
                    </Badge>
                  </StandardTd>
                  <StandardTd className="text-right">
                    {formatDecimal(row.mediana)}
                  </StandardTd>
                  <StandardTd className="text-right">
                    {formatDecimal(row.sd)}
                  </StandardTd>
                  <StandardTd className="text-right flex items-center justify-end gap-2">
                    {tendenciaIcon}
                    <span className="w-12 text-right">
                      {formatDecimal(tendencia)}
                    </span>
                  </StandardTd>
                </tr>
              );
            })}
          </tbody>
        </StandardTable>
      </ScrollFadeTable>
    </Card>
  );
}
