export type PoscosechaSkuRecord = {
  skuId: string;
  sku: string;
  pesoIdealBunch: number;
  tallosMin: number;
  tallosMax: number;
  pesoMinObjetivo: number;
  pesoMaxObjetivo: number;
  maxGradosObjetivo: number;
  validFrom: string | null;
  validTo: string | null;
  loadedAt: string | null;
  runId: string | null;
  actorId: string | null;
  changeReason: string | null;
};

export type PoscosechaSkuInput = {
  sku: string;
  pesoIdealBunch: number;
  tallosMin: number;
  tallosMax: number;
  pesoMinObjetivo: number;
  pesoMaxObjetivo: number;
  maxGradosObjetivo: number;
  changeReason?: string | null;
};

export type PoscosechaSkuPayload = {
  data: PoscosechaSkuRecord;
};
