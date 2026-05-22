export type OpeningPointCategoryDefinition = {
  code: string;
  name: string;
  sortKey: string;
  classMin: number;
  classMax: number;
  description: string;
};

export const OPENING_POINT_CATEGORY_DEFINITIONS: OpeningPointCategoryDefinition[] = [
  {
    code: "PA_BOTON",
    name: "Boton",
    sortKey: "01",
    classMin: 0,
    classMax: 0,
    description: "Punto de apertura en boton cerrado.",
  },
  {
    code: "PA_1_A_3",
    name: "1 a 3",
    sortKey: "02",
    classMin: 1,
    classMax: 3,
    description: "Punto de apertura entre 1 y 3 flores abiertas.",
  },
  {
    code: "PA_4_A_9",
    name: "4 a 9",
    sortKey: "03",
    classMin: 4,
    classMax: 9,
    description: "Punto de apertura entre 4 y 9 flores abiertas.",
  },
  {
    code: "PA_10_A_20",
    name: "10 a 20",
    sortKey: "04",
    classMin: 10,
    classMax: 20,
    description: "Punto de apertura entre 10 y 20 flores abiertas.",
  },
  {
    code: "PA_MAS_DE_20",
    name: "Más de 20",
    sortKey: "05",
    classMin: 21,
    classMax: 99,
    description: "Punto de apertura mayor a 20 flores abiertas.",
  },
];

function normalizeCode(value: string) {
  return value.trim().toUpperCase();
}

export function getOpeningPointCategoryDefinitionByCode(code: string | null | undefined) {
  if (!code) {
    return null;
  }

  const normalized = normalizeCode(code);
  return OPENING_POINT_CATEGORY_DEFINITIONS.find((item) => item.code === normalized) ?? null;
}

export function inferOpeningPointCategoryDefinitionByRange(classMin: number, classMax: number) {
  return OPENING_POINT_CATEGORY_DEFINITIONS.find((item) => item.classMin === classMin && item.classMax === classMax) ?? null;
}
