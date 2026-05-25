import { type NextRequest } from "next/server";

import { requireAuth } from "@/lib/api-auth";
import { handleApiError } from "@/lib/api-error";
import {
  getAlturasDronData,
  normalizeAlturasDronFilters,
  type AlturasDronRangeRow,
  type AlturasDronStatsRow,
} from "@/lib/campo-alturas-dron";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// ─────────────────────────────────────────────────────────────────────────────
// XML helpers (mismo patrón que otros export-xlsx del proyecto)
// ─────────────────────────────────────────────────────────────────────────────

function xml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function colName(index: number): string {
  let current = index + 1;
  let name = "";
  while (current > 0) {
    const remainder = (current - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    current = Math.floor((current - 1) / 26);
  }
  return name;
}

function cellString(value: unknown, rowIndex: number, columnIndex: number): string {
  const ref = `${colName(columnIndex)}${rowIndex}`;
  return `<c r="${ref}" t="inlineStr"><is><t>${xml(value)}</t></is></c>`;
}

function fmtNum(value: number | null | undefined, decimals = 4): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "";
  return value.toFixed(decimals);
}

// ─────────────────────────────────────────────────────────────────────────────
// Worksheet builders
// ─────────────────────────────────────────────────────────────────────────────

// Hoja 1 — Estadísticas: Ciclo, Bloque, SP Type, Variedad, Área, Día Vegetativo al inicio + 13 medidas
const STATS_HEADERS = [
  "Fecha",
  "Ciclo",
  "Bloque",
  "Block ID",
  "SP Type",
  "Variedad",
  "Área",
  "Día Vegetativo",
  "Media (e_x)",
  "Mediana (me_x)",
  "DS (s_x)",
  "IQR",
  "MAD",
  "R-SIQR",
  "R-SMAD",
  "CV",
  "R-CVIQR",
  "R-CVMAD",
  "P10",
  "P25",
  "P75",
  "P90",
  "Bowley V1",
  "Bowley V2",
  "Fisher",
  "Gini (g)",
  "Entropía norm. (hn)",
];

function buildStatsWorksheet(rows: AlturasDronStatsRow[]): string {
  const headerCells = STATS_HEADERS.map((h, i) => cellString(h, 1, i)).join("");
  const headerRow = `<row r="1">${headerCells}</row>`;

  const dataRows = rows
    .map((row, dataIndex) => {
      const excelRow = dataIndex + 2;
      const cells: string[] = [
        cellString(row.eventDate, excelRow, 0),
        cellString(row.cycleKey, excelRow, 1),
        cellString(row.parentBlock, excelRow, 2),
        cellString(row.blockId ?? "", excelRow, 3),
        cellString(row.spType ?? "", excelRow, 4),
        cellString(row.variety ?? "", excelRow, 5),
        cellString(row.areaId ?? "", excelRow, 6),
        cellString(row.vegetativeDay !== null ? String(row.vegetativeDay) : "", excelRow, 7),
        cellString(fmtNum(row.mean, 4), excelRow, 8),
        cellString(fmtNum(row.median, 4), excelRow, 9),
        cellString(fmtNum(row.sd, 4), excelRow, 10),
        cellString(fmtNum(row.iqr, 4), excelRow, 11),
        cellString(fmtNum(row.mad, 4), excelRow, 12),
        cellString(fmtNum(row.rSiqr, 4), excelRow, 13),
        cellString(fmtNum(row.rSmad, 4), excelRow, 14),
        cellString(fmtNum(row.cv, 4), excelRow, 15),
        cellString(fmtNum(row.rCviqr, 4), excelRow, 16),
        cellString(fmtNum(row.rCvmad, 4), excelRow, 17),
        cellString(fmtNum(row.p10, 4), excelRow, 18),
        cellString(fmtNum(row.p25, 4), excelRow, 19),
        cellString(fmtNum(row.p75, 4), excelRow, 20),
        cellString(fmtNum(row.p90, 4), excelRow, 21),
        cellString(fmtNum(row.bowleyV1, 4), excelRow, 22),
        cellString(fmtNum(row.bowleyV2, 4), excelRow, 23),
        cellString(fmtNum(row.fisher, 4), excelRow, 24),
        cellString(fmtNum(row.gini, 4), excelRow, 25),
        cellString(fmtNum(row.entropyNorm, 4), excelRow, 26),
      ];
      return `<row r="${excelRow}">${cells.join("")}</row>`;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <cols>
    <col min="1" max="1" width="14" customWidth="1"/>
    <col min="2" max="2" width="22" customWidth="1"/>
    <col min="3" max="4" width="12" customWidth="1"/>
    <col min="5" max="7" width="16" customWidth="1"/>
    <col min="8" max="8" width="14" customWidth="1"/>
    <col min="9" max="27" width="12" customWidth="1"/>
  </cols>
  <sheetData>${headerRow}${dataRows}</sheetData>
</worksheet>`;
}

// Hoja 2 — Histogramas: Fecha, Ciclo, Bloque, Día Vegetativo, Altura, Distribución
const RANGES_HEADERS = [
  "Fecha",
  "Ciclo",
  "Bloque",
  "Día Vegetativo",
  "Altura (m)",
  "Distribución (%)",
];

function buildRangesWorksheet(rows: AlturasDronRangeRow[]): string {
  const headerCells = RANGES_HEADERS.map((h, i) => cellString(h, 1, i)).join("");
  const headerRow = `<row r="1">${headerCells}</row>`;

  const dataRows = rows
    .map((row, dataIndex) => {
      const excelRow = dataIndex + 2;
      const cells: string[] = [
        cellString(row.eventDate, excelRow, 0),
        cellString(row.cycleKey, excelRow, 1),
        cellString(row.parentBlock, excelRow, 2),
        cellString(row.vegetativeDay !== null ? String(row.vegetativeDay) : "", excelRow, 3),
        cellString(fmtNum(row.alturaM, 2), excelRow, 4),
        cellString(fmtNum(row.distPrc, 4), excelRow, 5),
      ];
      return `<row r="${excelRow}">${cells.join("")}</row>`;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <cols>
    <col min="1" max="1" width="14" customWidth="1"/>
    <col min="2" max="2" width="22" customWidth="1"/>
    <col min="3" max="3" width="12" customWidth="1"/>
    <col min="4" max="4" width="14" customWidth="1"/>
    <col min="5" max="5" width="14" customWidth="1"/>
    <col min="6" max="6" width="18" customWidth="1"/>
  </cols>
  <sheetData>${headerRow}${dataRows}</sheetData>
</worksheet>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// ZIP inline (idéntico al patrón existente en otros export-xlsx del proyecto)
// ─────────────────────────────────────────────────────────────────────────────

// Static XLSX structure with 2 sheets
const XLSX_STATIC_FILES: Array<{ path: string; content: string }> = [
  {
    path: "[Content_Types].xml",
    content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>`,
  },
  {
    path: "_rels/.rels",
    content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`,
  },
  {
    path: "xl/workbook.xml",
    content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="Estadísticas" sheetId="1" r:id="rId1"/>
    <sheet name="Histogramas" sheetId="2" r:id="rId2"/>
  </sheets>
</workbook>`,
  },
  {
    path: "xl/_rels/workbook.xml.rels",
    content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/>
</Relationships>`,
  },
];

const CRC_TABLE = Array.from({ length: 256 }, (_, index) => {
  let crc = index;
  for (let bit = 0; bit < 8; bit += 1) {
    crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
  }
  return crc >>> 0;
});

function crc32(buffer: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff]! ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function createZip(files: Array<{ path: string; content: string }>): Buffer {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;

  for (const file of files) {
    const name = Buffer.from(file.path, "utf8");
    const content = Buffer.from(file.content, "utf8");
    const crc = crc32(content);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6);
    local.writeUInt16LE(0, 8);
    local.writeUInt16LE(0, 10);
    local.writeUInt16LE(0, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(content.length, 18);
    local.writeUInt32LE(content.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);
    localParts.push(local, name, content);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(0, 10);
    central.writeUInt16LE(0, 12);
    central.writeUInt16LE(0, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(content.length, 20);
    central.writeUInt32LE(content.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE(0, 38);
    central.writeUInt32LE(offset, 42);
    centralParts.push(central, name);

    offset += local.length + name.length + content.length;
  }

  const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralSize, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, ...centralParts, end]);
}

// ─────────────────────────────────────────────────────────────────────────────
// Handler
// ─────────────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  try {
    const sp = request.nextUrl.searchParams;
    const filters = normalizeAlturasDronFilters({
      dateFrom: sp.get("dateFrom") ?? undefined,
      dateTo: sp.get("dateTo") ?? undefined,
      block: sp.get("block") ?? undefined,
      cycleKey: sp.get("cycleKey") ?? undefined,
      variety: sp.get("variety") ?? undefined,
      spType: sp.get("spType") ?? undefined,
      areaId: sp.get("areaId") ?? undefined,
      vegDayFrom: sp.get("vegDayFrom") ?? undefined,
      vegDayTo: sp.get("vegDayTo") ?? undefined,
      q: sp.get("q") ?? undefined,
    });

    const data = await getAlturasDronData(filters);

    const xlsx = createZip([
      ...XLSX_STATIC_FILES,
      { path: "xl/worksheets/sheet1.xml", content: buildStatsWorksheet(data.stats) },
      { path: "xl/worksheets/sheet2.xml", content: buildRangesWorksheet(data.ranges) },
    ]);

    const stampDate = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    return new Response(new Uint8Array(xlsx), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="alturas_dron_${stampDate}.xlsx"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return handleApiError(error, "No se pudo exportar los datos de alturas de dron.");
  }
}
