"use client";

import { cn } from "@/lib/utils";

export type ToggleChipOption<T extends string = string> = {
  value: T;
  label: string;
};

export type ToggleChipGroupProps<T extends string = string> = {
  options: ToggleChipOption<T>[];
  selected: T[];
  onChange: (value: T[]) => void;
  className?: string;
};

export function ToggleChipGroup<T extends string = string>({
  options,
  selected,
  onChange,
  className,
}: ToggleChipGroupProps<T>) {
  function toggle(value: T) {
    onChange(
      selected.includes(value)
        ? selected.filter((v) => v !== value)
        : [...selected, value],
    );
  }

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {options.map((option) => {
        const active = selected.includes(option.value);
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => toggle(option.value)}
            className={cn(
              "inline-flex items-center rounded-full border px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "border-slate-700/40 bg-slate-900/20 text-foreground dark:border-slate-600/40 dark:bg-slate-900/30"
                : "border-border/70 bg-background text-muted-foreground hover:text-foreground",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
