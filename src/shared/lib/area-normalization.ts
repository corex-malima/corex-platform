export function cleanAreaText(value: string | null | undefined) {
  return value?.trim() ?? "";
}

const AREA_ALIAS_MAP = new Map<string, string>([
  ["A-4", "SJP"],
  ["A4", "SJP"],
  ["SJP", "SJP"],
]);

export function normalizeAreaDisplayName(value: string | null | undefined): string {
  const cleaned = cleanAreaText(value).toUpperCase();
  return AREA_ALIAS_MAP.get(cleaned) ?? cleaned;
}
