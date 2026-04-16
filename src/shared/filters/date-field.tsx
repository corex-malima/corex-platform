"use client";

import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { cn } from "@/lib/utils";

export type DateFieldProps = {
  id?: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
};

export function DateField({ id, label, value, onChange, className }: DateFieldProps) {
  return (
    <div className={cn("min-w-0 space-y-2", className)}>
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
