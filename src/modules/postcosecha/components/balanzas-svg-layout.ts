/**
 * Layout pixel-perfect del diagrama BPMN-style de Balanzas (SVG hand-crafted).
 *
 * ViewBox: 1600×980 — proporciones generosas para que tasks, labels, notas
 * y sub-rows ARCOIRIS/BLANCO/TINTURADO no se solapen.
 *
 * Preserva los 40 IDs de Task usados en `BALANZAS_NODES` (postcosecha-balanzas-core.ts).
 */

export const VB_W = 1600;
export const VB_H = 980;

// Y centerlines (4 rows + raíz central)
export const Y = {
  preGV:        140,
  preDirecto:   350,
  raiz:         505,
  aperturaGV:   660,
  aperturaDir:  870,
} as const;

// Sub-row offsets para destinos ARCOIRIS / BLANCO / TINTURADO (relativo al row centerline)
export const SUB = { arc: -55, blc: 0, tnt: 55 } as const;

// X columns (centers)
export const X = {
  start:    60,
  gwRaiz:   135,
  b1:       220,
  gwRutas:  315,
  max10:    410,
  pelado:   515,    // PELADO TALLO (preclasif) / B1C (apertura)
  b1ab:     635,    // B1AB (preclasif) / Event MAX10 (apertura GV)
  hidrata:  735,    // HIDRATACION
  b2:       820,
  gwDest:   910,
  clasif:   1015,   // CLASIFICADO (preclasif) — narrow box
  clasifA:  1080,   // PELADO TALLOS Y CLASIFICADO (apertura) — wide box
  b3b2a:    1200,   // B3 / B2A
  gwCierre: 1290,
  general:  1370,
  gwGlobal: 1465,
  end:      1540,
} as const;

// Box sizes
export const B = {
  task:      { w: 80, h: 40 },
  taskWide:  { w: 130, h: 40 }, // PELADO TALLOS Y CLASIFICADO
  taskGen:   { w: 90, h: 40 },  // GENERAL
  evt:       { r: 18 },
  gw:        { w: 30, h: 30 },
  note:      { w: 130, h: 44 },
} as const;

export const STROKE_W = 1.6;
export const FLOW_STROKE_W = 1.7;

// ───────────────────────────────────────────────────────────────────────
// Mapa de coordenadas por elementId BPMN — fuente de verdad para la
// posición de cada Task. Si cambias aquí, los overlays HTML clickeables
// se recalculan automáticamente sobre el nodo correcto.
// ───────────────────────────────────────────────────────────────────────

export type NodeKind = "task" | "general";
export type NodeRect = { cx: number; cy: number; w: number; h: number; kind: NodeKind };

export const NODE_LAYOUT: Record<string, NodeRect> = {
  // Lane 0 — PRECLASIFICACION / GV
  Task_B1_Preclasificacion:        { cx: X.b1,     cy: (Y.preGV + Y.preDirecto) / 2, w: B.task.w, h: B.task.h, kind: "task" },
  Task_PeladoTallo_Pre_GV:         { cx: X.pelado, cy: Y.preGV, w: 95, h: B.task.h, kind: "task" },
  Task_B1AB_Pre_GV:                { cx: X.b1ab,   cy: Y.preGV, w: B.task.w, h: B.task.h, kind: "task" },
  Task_B2_Pre_GV:                  { cx: X.b2,     cy: Y.preGV, w: B.task.w, h: B.task.h, kind: "task" },
  Task_Clasificado_Pre_GV_Arcoiris:  { cx: X.clasif, cy: Y.preGV + SUB.arc, w: 100, h: 34, kind: "task" },
  Task_Clasificado_Pre_GV_Blanco:    { cx: X.clasif, cy: Y.preGV + SUB.blc, w: 100, h: 34, kind: "task" },
  Task_Clasificado_Pre_GV_Tinturado: { cx: X.clasif, cy: Y.preGV + SUB.tnt, w: 100, h: 34, kind: "task" },
  Task_B3_Pre_GV_Arcoiris:           { cx: X.b3b2a,  cy: Y.preGV + SUB.arc, w: 70, h: 34, kind: "task" },
  Task_B3_Pre_GV_Blanco:             { cx: X.b3b2a,  cy: Y.preGV + SUB.blc, w: 70, h: 34, kind: "task" },
  Task_B3_Pre_GV_Tinturado:          { cx: X.b3b2a,  cy: Y.preGV + SUB.tnt, w: 70, h: 34, kind: "task" },
  Task_General_Pre_GV:               { cx: X.general, cy: Y.preGV, w: B.taskGen.w, h: B.taskGen.h, kind: "general" },

  // Lane 1 — PRECLASIFICACION / DIRECTO
  Task_PeladoTallo_Pre_Directo:           { cx: X.pelado, cy: Y.preDirecto, w: 95, h: B.task.h, kind: "task" },
  Task_B1AB_Pre_Directo:                  { cx: X.b1ab,   cy: Y.preDirecto, w: B.task.w, h: B.task.h, kind: "task" },
  Task_B2_Pre_Directo:                    { cx: X.b2,     cy: Y.preDirecto, w: B.task.w, h: B.task.h, kind: "task" },
  Task_Clasificado_Pre_Directo_Arcoiris:  { cx: X.clasif, cy: Y.preDirecto + SUB.arc, w: 100, h: 34, kind: "task" },
  Task_Clasificado_Pre_Directo_Blanco:    { cx: X.clasif, cy: Y.preDirecto + SUB.blc, w: 100, h: 34, kind: "task" },
  Task_Clasificado_Pre_Directo_Tinturado: { cx: X.clasif, cy: Y.preDirecto + SUB.tnt, w: 100, h: 34, kind: "task" },
  Task_B3_Pre_Directo_Arcoiris:           { cx: X.b3b2a,  cy: Y.preDirecto + SUB.arc, w: 70, h: 34, kind: "task" },
  Task_B3_Pre_Directo_Blanco:             { cx: X.b3b2a,  cy: Y.preDirecto + SUB.blc, w: 70, h: 34, kind: "task" },
  Task_B3_Pre_Directo_Tinturado:          { cx: X.b3b2a,  cy: Y.preDirecto + SUB.tnt, w: 70, h: 34, kind: "task" },
  Task_General_Pre_Directo:               { cx: X.general, cy: Y.preDirecto, w: B.taskGen.w, h: B.taskGen.h, kind: "general" },

  // Lane 2 — APERTURA / GV PELADO
  Task_B1_Apertura:                                { cx: X.b1,     cy: (Y.aperturaGV + Y.aperturaDir) / 2, w: B.task.w, h: B.task.h, kind: "task" },
  Task_B1C_Apertura_GV:                            { cx: X.pelado, cy: Y.aperturaGV, w: B.task.w, h: B.task.h, kind: "task" },
  Task_B2_Apertura_Max10:                          { cx: X.b2,     cy: Y.aperturaGV, w: B.task.w, h: B.task.h, kind: "task" },
  Task_PeladoClasificado_Apertura_Max10_Arcoiris:  { cx: X.clasifA, cy: Y.aperturaGV + SUB.arc, w: B.taskWide.w, h: 36, kind: "task" },
  Task_PeladoClasificado_Apertura_Max10_Blanco:    { cx: X.clasifA, cy: Y.aperturaGV + SUB.blc, w: B.taskWide.w, h: 36, kind: "task" },
  Task_PeladoClasificado_Apertura_Max10_Tinturado: { cx: X.clasifA, cy: Y.aperturaGV + SUB.tnt, w: B.taskWide.w, h: 36, kind: "task" },
  Task_B2A_Apertura_Max10_Arcoiris:                { cx: X.b3b2a,  cy: Y.aperturaGV + SUB.arc, w: 70, h: 34, kind: "task" },
  Task_B2A_Apertura_Max10_Blanco:                  { cx: X.b3b2a,  cy: Y.aperturaGV + SUB.blc, w: 70, h: 34, kind: "task" },
  Task_B2A_Apertura_Max10_Tinturado:               { cx: X.b3b2a,  cy: Y.aperturaGV + SUB.tnt, w: 70, h: 34, kind: "task" },
  Task_General_Apertura_Max10:                     { cx: X.general, cy: Y.aperturaGV, w: B.taskGen.w, h: B.taskGen.h, kind: "general" },

  // Lane 3 — APERTURA / APERTURA
  Task_B1C_Apertura_Directo:                          { cx: X.pelado, cy: Y.aperturaDir, w: B.task.w, h: B.task.h, kind: "task" },
  Task_B2_Apertura_Directo:                           { cx: X.b2,     cy: Y.aperturaDir, w: B.task.w, h: B.task.h, kind: "task" },
  Task_PeladoClasificado_Apertura_Directo_Arcoiris:   { cx: X.clasifA, cy: Y.aperturaDir + SUB.arc, w: B.taskWide.w, h: 36, kind: "task" },
  Task_PeladoClasificado_Apertura_Directo_Blanco:     { cx: X.clasifA, cy: Y.aperturaDir + SUB.blc, w: B.taskWide.w, h: 36, kind: "task" },
  Task_PeladoClasificado_Apertura_Directo_Tinturado:  { cx: X.clasifA, cy: Y.aperturaDir + SUB.tnt, w: B.taskWide.w, h: 36, kind: "task" },
  Task_B2A_Apertura_Directo_Arcoiris:                 { cx: X.b3b2a,  cy: Y.aperturaDir + SUB.arc, w: 70, h: 34, kind: "task" },
  Task_B2A_Apertura_Directo_Blanco:                   { cx: X.b3b2a,  cy: Y.aperturaDir + SUB.blc, w: 70, h: 34, kind: "task" },
  Task_B2A_Apertura_Directo_Tinturado:                { cx: X.b3b2a,  cy: Y.aperturaDir + SUB.tnt, w: 70, h: 34, kind: "task" },
  Task_General_Apertura_Directo:                      { cx: X.general, cy: Y.aperturaDir, w: B.taskGen.w, h: B.taskGen.h, kind: "general" },
};

export const TASK_LABELS: Record<string, string> = {
  Task_B1_Preclasificacion: "B1",
  Task_B1_Apertura: "B1",
  Task_PeladoTallo_Pre_GV: "PELADO TALLO",
  Task_PeladoTallo_Pre_Directo: "PELADO TALLO",
  Task_B1AB_Pre_GV: "B1AB",
  Task_B1AB_Pre_Directo: "B1AB",
  Task_B1C_Apertura_GV: "B1C",
  Task_B1C_Apertura_Directo: "B1C",
  Task_B2_Pre_GV: "B2",
  Task_B2_Pre_Directo: "B2",
  Task_B2_Apertura_Max10: "B2",
  Task_B2_Apertura_Directo: "B2",
  Task_Clasificado_Pre_GV_Arcoiris: "CLASIFICADO",
  Task_Clasificado_Pre_GV_Blanco: "CLASIFICADO",
  Task_Clasificado_Pre_GV_Tinturado: "CLASIFICADO",
  Task_Clasificado_Pre_Directo_Arcoiris: "CLASIFICADO",
  Task_Clasificado_Pre_Directo_Blanco: "CLASIFICADO",
  Task_Clasificado_Pre_Directo_Tinturado: "CLASIFICADO",
  Task_PeladoClasificado_Apertura_Max10_Arcoiris: "PELADO TALLOS Y CLASIFICADO",
  Task_PeladoClasificado_Apertura_Max10_Blanco: "PELADO TALLOS Y CLASIFICADO",
  Task_PeladoClasificado_Apertura_Max10_Tinturado: "PELADO TALLOS Y CLASIFICADO",
  Task_PeladoClasificado_Apertura_Directo_Arcoiris: "PELADO TALLOS Y CLASIFICADO",
  Task_PeladoClasificado_Apertura_Directo_Blanco: "PELADO TALLOS Y CLASIFICADO",
  Task_PeladoClasificado_Apertura_Directo_Tinturado: "PELADO TALLOS Y CLASIFICADO",
  Task_B3_Pre_GV_Arcoiris: "B3",
  Task_B3_Pre_GV_Blanco: "B3",
  Task_B3_Pre_GV_Tinturado: "B3",
  Task_B3_Pre_Directo_Arcoiris: "B3",
  Task_B3_Pre_Directo_Blanco: "B3",
  Task_B3_Pre_Directo_Tinturado: "B3",
  Task_B2A_Apertura_Max10_Arcoiris: "B2A",
  Task_B2A_Apertura_Max10_Blanco: "B2A",
  Task_B2A_Apertura_Max10_Tinturado: "B2A",
  Task_B2A_Apertura_Directo_Arcoiris: "B2A",
  Task_B2A_Apertura_Directo_Blanco: "B2A",
  Task_B2A_Apertura_Directo_Tinturado: "B2A",
  Task_General_Pre_GV: "GENERAL",
  Task_General_Pre_Directo: "GENERAL",
  Task_General_Apertura_Max10: "GENERAL",
  Task_General_Apertura_Directo: "GENERAL",
};

// ───────────────────────────────────────────────────────────────────────
// Helpers de geometría
// ───────────────────────────────────────────────────────────────────────

export function diamondPath(cx: number, cy: number, half: number): string {
  return `M ${cx} ${cy - half} L ${cx + half} ${cy} L ${cx} ${cy + half} L ${cx - half} ${cy} Z`;
}

export function polyPath(points: Array<[number, number]>): string {
  return points.map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x} ${y}`).join(" ");
}
