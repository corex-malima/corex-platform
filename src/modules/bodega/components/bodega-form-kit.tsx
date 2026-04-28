import type { ReactNode } from "react";

import { Badge } from "@/shared/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { cn } from "@/lib/utils";

export function BodegaPrototypePageShell({
  badge,
  title,
  summary,
  children,
}: {
  badge: string;
  title: string;
  summary: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-4">
      <Card className="starter-panel border-border/70 bg-card/84">
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="rounded-full px-3 py-1">
                  {badge}
                </Badge>
                <Badge variant="secondary" className="rounded-full px-3 py-1">
                  Prototipo de captura
                </Badge>
              </div>
              <div className="space-y-2">
                <CardTitle className="text-2xl">{title}</CardTitle>
                <CardDescription className="max-w-3xl text-sm leading-relaxed">
                  {summary}
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </div>
  );
}

export function DraftPanel({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("starter-panel border-border/70 bg-card/84", className)}>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription className="leading-relaxed">{description}</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export function DraftField({
  id,
  label,
  value,
  placeholder,
}: {
  id: string;
  label: string;
  value?: string;
  placeholder?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} defaultValue={value} placeholder={placeholder} className="rounded-xl" />
    </div>
  );
}

export function DraftSelect({
  id,
  label,
  options,
  defaultValue,
}: {
  id: string;
  label: string;
  options: string[];
  defaultValue?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <select
        id={id}
        defaultValue={defaultValue}
        className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}

export function DraftAutocomplete({
  id,
  label,
  options,
  defaultValue,
  placeholder,
  helper,
}: {
  id: string;
  label: string;
  options: string[];
  defaultValue?: string;
  placeholder?: string;
  helper?: string;
}) {
  const listId = `${id}-options`;

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        list={listId}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="rounded-xl"
      />
      <datalist id={listId}>
        {options.map((option) => (
          <option key={option} value={option} />
        ))}
      </datalist>
      {helper ? <p className="text-xs leading-relaxed text-muted-foreground">{helper}</p> : null}
    </div>
  );
}

export function DraftTextArea({
  id,
  label,
  value,
  placeholder,
}: {
  id: string;
  label: string;
  value?: string;
  placeholder?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <textarea
        id={id}
        defaultValue={value}
        placeholder={placeholder}
        rows={4}
        className="flex min-h-[110px] w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background"
      />
    </div>
  );
}

export function PreviewItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[18px] border border-dashed border-border/70 bg-background/72 px-4 py-3">
      <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-sm font-medium">{value}</p>
    </div>
  );
}

export function FlowStep({
  step,
  title,
  detail,
}: {
  step: string;
  title: string;
  detail: string;
}) {
  return (
    <div className="rounded-[20px] border border-border/70 bg-background/75 px-4 py-4">
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="rounded-full px-3 py-1">
          {step}
        </Badge>
        <p className="text-sm font-semibold">{title}</p>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{detail}</p>
    </div>
  );
}
