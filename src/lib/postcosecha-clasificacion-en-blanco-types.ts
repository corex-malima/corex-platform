import type { PoscosechaSkuRecord } from "@/lib/postcosecha-sku-types";

export const SOLVER_DATE_KEYS = [
  "fecha_1",
  "fecha_2",
  "fecha_3",
  "fecha_4",
  "fecha_5",
] as const;

export type SolverDateKey = (typeof SOLVER_DATE_KEYS)[number];

export type PoscosechaClasificacionSettings = {
  desperdicio: number;
};

export type PoscosechaClasificacionOrderRow = {
  skuId: string;
  sku: string;
} & Record<SolverDateKey, number>;

export type PoscosechaClasificacionAvailabilitySeed = {
  grado: number;
  pesoTalloSeed: number;
};

export type PoscosechaClasificacionAvailabilityRow = {
  grado: number;
  pesoTalloSeed: number;
} & Record<SolverDateKey, number>;

export type PoscosechaClasificacionAvailabilityDerivedRow = {
  grado: number;
  pesoTalloSeed: number;
  mallasTotales: number;
  tallosBrutos: number;
  tallosNetos: number;
  pesoTotalGestionable: number;
};

export type PoscosechaClasificacionPrecheck = {
  isValid: boolean;
  message: string;
  tallosPedidos: number;
  tallosDisponibles: number;
  diferencia: number;
};

export type PoscosechaClasificacionBootData = {
  skuMaster: PoscosechaSkuRecord[];
  ordersTemplate: PoscosechaClasificacionOrderRow[];
  availabilityTemplate: PoscosechaClasificacionAvailabilityRow[];
  settings: PoscosechaClasificacionSettings;
  metadata: {
    engine: string;
    masterSource: string;
    workbookPath: string | null;
    masterPath: string | null;
    usedFallbackDefaults: boolean;
  };
};

export type PoscosechaClasificacionPriorityRow = {
  prioridad: number;
  fecha: string;
  pedido: number;
  resuelto: number;
  noRealizado: number;
  cumplimiento: number;
};

export type PoscosechaClasificacionResultOrderRow = {
  sku: string;
  estadoPeso: string;
  pedidoTotal: number;
  pedidoResuelto: number;
  ajusteBunches: number;
  cumplimientoBunches: number;
  pesoIdealBunch: number;
  pesoIdealPedido: number;
  pesoIdealResuelto: number;
  pesoRealTotal: number;
  pesoRealBunch: number;
  tallosMin: number;
  tallosMax: number;
  tallosPromedioRamo: number;
  pesoMinObjetivo: number;
  pesoMaxObjetivo: number;
  sobrepesoPct: number;
  sobrepesoBunch: number;
  sobrepesoTotal: number;
  tallosAsignadosNetos: number;
  tallosAsignadosBrutos: number;
  mallasTotales: number;
  gradosUsados: number;
  excesoGradosObjetivo: number;
};

export type PoscosechaClasificacionResultAvailabilityRow = {
  grado: number;
  pesoTalloSeed: number;
  tallosBrutos: number;
  tallosNetos: number;
  tallosUsadosNetos: number;
  tallosRestantesNetos: number;
  pesoTotalGestionable: number;
  pesoUsado: number;
  pesoRestante: number;
  mallasUsadas: number;
};

export type PoscosechaClasificacionMatrixRow = {
  sku: string;
  values: Record<string, number>;
  total: number;
};

export type PoscosechaClasificacionMatrix = {
  gradeLabels: number[];
  rows: PoscosechaClasificacionMatrixRow[];
  totals: Record<string, number>;
  grandTotal: number;
};

export type PoscosechaClasificacionResult = {
  stage1Summary: Record<string, number>;
  stage2Summary: Record<string, number>;
  solverMeta: Record<string, number | string>;
  priorityRows: PoscosechaClasificacionPriorityRow[];
  orderRows: PoscosechaClasificacionResultOrderRow[];
  availabilityRows: PoscosechaClasificacionResultAvailabilityRow[];
  matrix: PoscosechaClasificacionMatrix;
  netStemMatrix: PoscosechaClasificacionMatrix;
};

export type PoscosechaClasificacionRunInput = {
  orders: PoscosechaClasificacionOrderRow[];
  availability: PoscosechaClasificacionAvailabilityRow[];
  settings: PoscosechaClasificacionSettings;
};

export type PoscosechaClasificacionRunPayload = {
  data: PoscosechaClasificacionResult;
};

export type PoscosechaClasificacionRecipeGradeInput = {
  grado: number;
  tallosNetos: number;
  pesoTalloSeed: number;
};

export type PoscosechaClasificacionRecipeInput = {
  sku: string;
  pedidoResuelto: number;
  pesoIdealBunch: number;
  pesoMinObjetivo: number;
  pesoMaxObjetivo: number;
  tallosMin: number;
  tallosMax: number;
  tallosAsignadosNetos: number;
  tallosPromedioRamo: number;
  grados: PoscosechaClasificacionRecipeGradeInput[];
};

export type PoscosechaClasificacionRecipeCompositionRow = {
  grado: number;
  tallos: number;
  pesoTalloSeed: number;
  pesoTotal: number;
};

export type PoscosechaClasificacionRecipeRow = {
  recetaId: string;
  cantidad: number;
  tallosPorBunch: number;
  pesoPorBunch: number;
  difIdeal: number;
  estadoPeso: string;
  composicion: PoscosechaClasificacionRecipeCompositionRow[];
};

export type PoscosechaClasificacionRecipeGradeSummaryRow = {
  grado: number;
  tallosObjetivo: number;
  tallosAsignados: number;
  pesoTalloSeed: number;
  pesoTotal: number;
};

export type PoscosechaClasificacionRecipeSummary = {
  sku: string;
  bunchesObjetivo: number;
  bunchesResueltos: number;
  recetasUsadas: number;
  tallosTotales: number;
  pesoIdealBunch: number;
  pesoPromedioReal: number;
  penalidadRango: number;
  desvioAbsolutoTotal: number;
  status: string;
};

export type PoscosechaClasificacionRecipeResult = {
  summary: PoscosechaClasificacionRecipeSummary;
  rows: PoscosechaClasificacionRecipeRow[];
  gradeTotals: PoscosechaClasificacionRecipeGradeSummaryRow[];
};

export type PoscosechaClasificacionRecipePayload = {
  data: PoscosechaClasificacionRecipeResult;
};
