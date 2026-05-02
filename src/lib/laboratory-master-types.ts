import type {
  BodegaActivityRecord,
  BodegaProductAssignmentInput,
  BodegaProductAssignmentRecord,
} from "@/lib/bodega-master-types";

export type LaboratoryProductCode = string;

export type LaboratoryCategoryRecord = {
  categoryId: string;
  categoryCode: string;
  categoryName: string;
  isActive: boolean;
  validFrom: string | null;
  validTo: string | null;
  loadedAt: string | null;
  runId: string | null;
  actorId: string | null;
  changeReason: string | null;
};

export type LaboratoryCategoryInput = {
  categoryCode: string;
  categoryName: string;
  isActive: boolean;
  changeReason?: string | null;
};

export type LaboratoryCategoryPayload = {
  data: LaboratoryCategoryRecord;
};

export type LaboratoryRecipeLineRecord = {
  lineId: string;
  lineOrder: number;
  ingredientProductId: string | null;
  ingredientProductCode: string | null;
  ingredientProductName: string | null;
  ingredientUnitCode: string | null;
  ingredientQuantityValue: number | null;
  ingredientQuantityReference: string | null;
  notes: string | null;
  isActive: boolean;
  validFrom: string | null;
  validTo: string | null;
  loadedAt: string | null;
  runId: string | null;
  actorId: string | null;
  changeReason: string | null;
};

export type LaboratoryRecipeLineInput = {
  _formKey?: string;
  lineOrder?: number;
  ingredientProductId?: string | null;
  ingredientQuantityValue?: number | null;
  ingredientQuantityReference?: string | null;
  notes?: string | null;
  isActive?: boolean;
};

export type LaboratoryProductRecord = {
  laboratoryProductId: string;
  productCode: LaboratoryProductCode;
  productName: string;
  description: string | null;
  categoryId: string;
  categoryCode: string;
  categoryName: string;
  baseUnitId: string;
  baseUnitCode: string;
  baseUnitName: string;
  isActive: boolean;
  assignments: BodegaProductAssignmentRecord[];
  recipeLines: LaboratoryRecipeLineRecord[];
  validFrom: string | null;
  validTo: string | null;
  loadedAt: string | null;
  runId: string | null;
  actorId: string | null;
  changeReason: string | null;
};

export type LaboratoryProductInput = {
  productCode: LaboratoryProductCode;
  productName: string;
  description?: string | null;
  categoryId: string;
  baseUnitId: string;
  isActive: boolean;
  assignments: BodegaProductAssignmentInput[];
  recipeLines: LaboratoryRecipeLineInput[];
  changeReason?: string | null;
};

export type LaboratoryProductPayload = {
  data: LaboratoryProductRecord;
};

export type LaboratoryRecipeSnapshot = {
  products: LaboratoryProductRecord[];
  bodegaProducts: Array<{
    productId: string;
    productCode: string;
    productName: string;
    baseUnitCode: string;
  }>;
  units: Array<{
    unitId: string;
    code: string;
    name: string;
  }>;
  categories: LaboratoryCategoryRecord[];
  activities: BodegaActivityRecord[];
};
