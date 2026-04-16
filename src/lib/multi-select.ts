export function decodeMultiSelectValue(value: string | null | undefined) {
  if (!value || value === "all") {
    return [] as string[];
  }

  return Array.from(
    new Set(
      value
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean),
    ),
  );
}

export function encodeMultiSelectValue(values: string[]) {
  const normalizedValues = Array.from(
    new Set(values.map((entry) => entry.trim()).filter(Boolean)),
  );

  return normalizedValues.length ? normalizedValues.join(",") : "all";
}

export function hasMultiSelectValue(value: string | null | undefined) {
  return decodeMultiSelectValue(value).length > 0;
}

export function matchesMultiSelectValue(
  encodedValue: string | null | undefined,
  candidate: string | null | undefined,
) {
  const selectedValues = decodeMultiSelectValue(encodedValue);

  if (!selectedValues.length) {
    return true;
  }

  const normalizedCandidate = candidate?.trim() ?? "";
  return selectedValues.includes(normalizedCandidate);
}

export function summarizeMultiSelectValue(
  encodedValue: string | null | undefined,
  emptyLabel = "Todos",
) {
  const selectedValues = decodeMultiSelectValue(encodedValue);

  if (!selectedValues.length) {
    return emptyLabel;
  }

  if (selectedValues.length === 1) {
    return selectedValues[0] ?? emptyLabel;
  }

  return `${selectedValues[0]} +${selectedValues.length - 1}`;
}
