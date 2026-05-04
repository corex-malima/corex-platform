"use client";

import { useRef } from "react";

import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { cn } from "@/lib/utils";

export type DateFieldProps = {
  id?: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  helperText?: string;
};

export function DateField({ id, label, value, onChange, className, helperText }: DateFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className={cn("min-w-0 space-y-2", className)}>
      <Label htmlFor={id}>{label}</Label>
      {helperText ? <p className="text-xs text-slate-500">{helperText}</p> : null}
      <Input
        ref={inputRef}
        id={id}
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onClick={() => inputRef.current?.showPicker?.()}
      />
    </div>
  );
}
