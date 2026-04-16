"use client";

import { ChevronDown } from "lucide-react";

import { Label } from "@/shared/ui/label";
import { cn } from "@/lib/utils";

export type WeekFieldOption = {
  value: string;
  label: string;
};

export type WeekFieldProps = {
  id?: string;
  label: string;
  value: string;
  options: WeekFieldOption[];
  onChange: (value: string) => void;
  className?: string;
};

export function WeekField({ id, label, value, options, onChange, className }: WeekFieldProps) {
  return (
    <div className={cn("min-w-0 space-y-2", className)}>
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-11 w-full appearance-none rounded-[16px] border border-input bg-background px-4 pr-10 text-sm text-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/40"
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      </div>
    </div>
  );
}
