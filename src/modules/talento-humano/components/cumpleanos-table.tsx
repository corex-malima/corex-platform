"use client";

import { useMemo, useState } from "react";

import type { CumpleanosRow } from "@/lib/talento-humano-cumpleanos";
import { SearchInput } from "@/shared/forms/search-input";
import { DetailSection } from "@/shared/layout/filter-panel";
import { formatInteger } from "@/shared/lib/format";
import { ScrollFadeTable } from "@/shared/tables/scroll-fade-table";
import { SortableHeader, type SortDirection } from "@/shared/tables/sortable-header";
import { StandardTable, StandardTd } from "@/shared/tables/standard-table";
import { Badge } from "@/shared/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";

type SortKey =
  | "personName"
  | "nationalId"
  | "birthMonth"
  | "birthDay"
  | "areaName"
  | "jobClassificationCode"
  | "jobTitle";

const collator = new Intl.Collator("es-EC", { numeric: true, sensitivity: "base" });

function compareValue(a: unknown, b: unknown): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  return collator.compare(String(a), String(b));
}

function rowSortValue(row: CumpleanosRow, key: SortKey): string | number | null {
  switch (key) {
    case "personName":
      return row.personName;
    case "nationalId":
      return row.nationalId;
    case "birthMonth":
      return row.birthMonth;
    case "birthDay":
      return row.birthDay;
    case "areaName":
      return row.areaName ?? row.areaId;
    case "jobClassificationCode":
      return row.jobClassificationCode;
    case "jobTitle":
      return row.jobTitle;
    default:
      return null;
  }
}

function titleCaseName(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase("es-EC")
    .replace(/\p{L}+/gu, (word) => word.charAt(0).toLocaleUpperCase("es-EC") + word.slice(1));
}

function getMonthLabel(month: number): string {
  const months = [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
  ];
  return months[month - 1] ?? `Mes ${month}`;
}

function isTodayBirthday(row: CumpleanosRow): boolean {
  const today = new Date();
  return row.birthMonth === today.getMonth() + 1 && row.birthDay === today.getDate();
}

export function CumpleanosTable({
  rows,
  searchValue,
  onSearchChange,
  isValidating,
}: {
  rows: CumpleanosRow[];
  searchValue: string;
  onSearchChange: (value: string) => void;
  isValidating: boolean;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("birthMonth");
  const [direction, setDirection] = useState<SortDirection>("asc");

  const handleSort = (key: string) => {
    if (key === sortKey) {
      setDirection((current) => (current === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key as SortKey);
      setDirection("asc");
    }
  };

  const filteredRows = useMemo(() => {
    if (!searchValue.trim()) return rows;
    const lowerQuery = searchValue.toLocaleLowerCase("es-EC");
    return rows.filter((row) => {
      const searchFields = [
        row.personName?.toLocaleLowerCase("es-EC") ?? "",
        row.nationalId ?? "",
        row.areaName?.toLocaleLowerCase("es-EC") ?? "",
        row.jobTitle?.toLocaleLowerCase("es-EC") ?? "",
      ];
      return searchFields.some((field) => field.includes(lowerQuery));
    });
  }, [rows, searchValue]);

  const sortedRows = useMemo(() => {
    const copy = [...filteredRows];
    const multiplier = direction === "asc" ? 1 : -1;
    copy.sort((left, right) => {
      const result = compareValue(rowSortValue(left, sortKey), rowSortValue(right, sortKey));
      return result * multiplier;
    });
    return copy;
  }, [filteredRows, sortKey, direction]);

  return (
    <DetailSection>
      <Card className="starter-panel border-border/70 bg-card/86">
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-lg font-semibold">Detalle por colaborador</CardTitle>
            <div className="w-full max-w-xs">
              <SearchInput
                value={searchValue}
                onChange={onSearchChange}
                placeholder="Buscar nombre, código o cédula..."
                ariaLabel="Buscar colaborador"
                debounceMs={220}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {formatInteger(filteredRows.length)} colaboradores {sortedRows.length !== rows.length && "filtrados"} · {isValidating ? "actualizando…" : "datos al día"}
          </p>
        </CardHeader>
        <CardContent>
          <ScrollFadeTable topScrollbar>
            <StandardTable className="min-w-[1000px]">
              <thead>
                <tr>
                  <SortableHeader
                    label="Nombre Completo"
                    sortKey="personName"
                    activeSortKey={sortKey}
                    direction={direction}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    label="Cédula"
                    sortKey="nationalId"
                    activeSortKey={sortKey}
                    direction={direction}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    label="Mes"
                    sortKey="birthMonth"
                    activeSortKey={sortKey}
                    direction={direction}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    label="Día"
                    sortKey="birthDay"
                    activeSortKey={sortKey}
                    direction={direction}
                    onSort={handleSort}
                    align="right"
                  />
                  <SortableHeader
                    label="Área"
                    sortKey="areaName"
                    activeSortKey={sortKey}
                    direction={direction}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    label="Clasificación"
                    sortKey="jobClassificationCode"
                    activeSortKey={sortKey}
                    direction={direction}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    label="Cargo"
                    sortKey="jobTitle"
                    activeSortKey={sortKey}
                    direction={direction}
                    onSort={handleSort}
                  />
                </tr>
              </thead>
              <tbody>
                {sortedRows.map((row) => (
                  <CumpleanosRowItem key={row.personId} row={row} />
                ))}
              </tbody>
            </StandardTable>
          </ScrollFadeTable>
        </CardContent>
      </Card>
    </DetailSection>
  );
}

function CumpleanosRowItem({ row }: { row: CumpleanosRow }) {
  const isToday = isTodayBirthday(row);
  return (
    <tr className="border-t border-border/60 hover:bg-muted/30">
      <StandardTd className="font-medium">{titleCaseName(row.personName)}</StandardTd>
      <StandardTd className="font-mono text-xs">{row.nationalId}</StandardTd>
      <StandardTd>{getMonthLabel(row.birthMonth)}</StandardTd>
      <StandardTd align="right">
        {isToday ? (
          <Badge variant="success">{row.birthDay}</Badge>
        ) : (
          <span className="text-sm">{row.birthDay}</span>
        )}
      </StandardTd>
      <StandardTd className="text-sm">{row.areaName ?? row.areaId ?? "—"}</StandardTd>
      <StandardTd className="text-sm">{row.jobClassificationCode}</StandardTd>
      <StandardTd className="text-sm">{row.jobTitle}</StandardTd>
    </tr>
  );
}
