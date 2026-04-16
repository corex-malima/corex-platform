const DEFAULT_LOCALE = "es-EC";

type NumericInput = number | string | null | undefined;

type BaseFormatOptions = {
  locale?: string;
  empty?: string;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
};

type PercentFormatOptions = BaseFormatOptions & {
  input?: "percent" | "ratio";
};

function normalizeNumber(value: NumericInput): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatNumericValue(value: NumericInput, options: BaseFormatOptions = {}) {
  const numericValue = normalizeNumber(value);
  if (numericValue === null) return options.empty ?? "—";

  return new Intl.NumberFormat(options.locale ?? DEFAULT_LOCALE, {
    minimumFractionDigits: options.minimumFractionDigits,
    maximumFractionDigits: options.maximumFractionDigits,
  }).format(numericValue);
}

export function formatInteger(value: NumericInput, options: Omit<BaseFormatOptions, "minimumFractionDigits" | "maximumFractionDigits"> = {}) {
  return formatNumericValue(value, {
    ...options,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

export function formatDecimal(value: NumericInput, digits = 2, options: Omit<BaseFormatOptions, "minimumFractionDigits" | "maximumFractionDigits"> = {}) {
  return formatNumericValue(value, {
    ...options,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function formatFlexibleNumber(value: NumericInput, options: BaseFormatOptions = {}) {
  return formatNumericValue(value, {
    maximumFractionDigits: 2,
    ...options,
  });
}

export function formatHours(value: NumericInput, digits = 2, suffix = " h") {
  const formatted = formatDecimal(value, digits);
  return formatted === "—" ? formatted : `${formatted}${suffix}`;
}

export function formatPercent(value: NumericInput, options: PercentFormatOptions = {}) {
  const numericValue = normalizeNumber(value);
  if (numericValue === null) return options.empty ?? "—";

  const normalized = options.input === "ratio" ? numericValue : numericValue / 100;

  return new Intl.NumberFormat(options.locale ?? DEFAULT_LOCALE, {
    style: "percent",
    minimumFractionDigits: options.minimumFractionDigits ?? 2,
    maximumFractionDigits: options.maximumFractionDigits ?? 2,
  }).format(normalized);
}

export function formatDate(value: string | Date | null | undefined, locale = DEFAULT_LOCALE) {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}
