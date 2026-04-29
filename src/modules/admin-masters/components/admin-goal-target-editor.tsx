"use client";

import { Save } from "lucide-react";

import { DateField } from "@/shared/filters/date-field";
import { MultiSelectField } from "@/shared/filters/multi-select-field";
import { SingleSelectField } from "@/shared/filters/single-select-field";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";

export type GoalTargetFormValues = {
  targetCode: string;
  targetName: string;
  targetDescription: string;
  parentTargetCode: string;
  levelIndex: string;
  levelLabel: string;
  metricCode: string;
  domainCodesEncoded: string;
  typeItemCodesEncoded: string;
  operatorCode: string;
  valueMin: string;
  valueMax: string;
  valueText: string;
  validFromDate: string;
  notesText: string;
  changeReason: string;
};

export type EditorOption = { code: string; label: string };

type Props = {
  isEdit: boolean;
  formValues: GoalTargetFormValues;
  setFormValues: React.Dispatch<React.SetStateAction<GoalTargetFormValues>>;
  parentOptions: EditorOption[];
  metricOptions: EditorOption[];
  domainOptions: EditorOption[];
  goalTypeOptions: EditorOption[];
  operatorOptions: EditorOption[];
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onDeactivate?: () => void;
  selectedTitle: string | null;
};

const RANGE_OPS = new Set(["between"]);
const TEXT_OPS = new Set(["eq", "neq", "in_list"]);

function labelOf(opts: EditorOption[]) {
  const map = new Map(opts.map((o) => [o.code, o.label] as const));
  return (v: string) => map.get(v) ?? v;
}

export function AdminGoalTargetEditor({
  isEdit,
  formValues,
  setFormValues,
  parentOptions,
  metricOptions,
  domainOptions,
  goalTypeOptions,
  operatorOptions,
  onSubmit,
  onDeactivate,
  selectedTitle,
}: Props) {
  const showRange = RANGE_OPS.has(formValues.operatorCode);
  const showText = TEXT_OPS.has(formValues.operatorCode);

  return (
    <Card className="starter-panel border-border/70 bg-card/84 xl:sticky xl:top-4 xl:self-start">
      <CardHeader>
        <CardTitle className="text-lg">{isEdit ? selectedTitle : "Registrar meta"}</CardTitle>
        <CardDescription>{isEdit ? "Al guardar, se cierra la versión vigente un día antes y se inserta una nueva (SCD2)." : "Define una meta. Puede tener padre para jerarquías."}</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-6" onSubmit={onSubmit}>
          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="target-code">Código</Label>
              <Input id="target-code" className="rounded-xl" value={formValues.targetCode} onChange={(e) => setFormValues((c) => ({ ...c, targetCode: e.target.value }))} disabled={isEdit} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="target-level-label">Etiqueta de nivel</Label>
              <Input id="target-level-label" className="rounded-xl" value={formValues.levelLabel} onChange={(e) => setFormValues((c) => ({ ...c, levelLabel: e.target.value }))} placeholder="sub_area, categoria, etc." />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="target-name">Nombre</Label>
              <Input id="target-name" className="rounded-xl" value={formValues.targetName} onChange={(e) => setFormValues((c) => ({ ...c, targetName: e.target.value }))} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <SingleSelectField
                id="target-parent"
                label="Meta padre (vacío para raíz)"
                value={formValues.parentTargetCode || "all"}
                options={parentOptions.map((o) => o.code)}
                displayValue={labelOf(parentOptions)}
                emptyLabel="Raíz (sin padre)"
                onChange={(v) => setFormValues((c) => {
                  const newParent = v === "all" ? "" : v;
                  const parent = parentOptions.find((p) => p.code === newParent);
                  const parentLvl = parent ? Number(parent.label.match(/L(\d+)/)?.[1] ?? "0") : 0;
                  return { ...c, parentTargetCode: newParent, levelIndex: String(parentLvl + 1) };
                })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="target-level-index">Nivel (auto)</Label>
              <Input id="target-level-index" type="number" className="rounded-xl" value={formValues.levelIndex} disabled />
            </div>
            <div className="space-y-2">
              <SingleSelectField
                id="target-metric"
                label="Métrica"
                value={formValues.metricCode || "all"}
                options={metricOptions.map((o) => o.code)}
                displayValue={labelOf(metricOptions)}
                emptyLabel="Sin métrica"
                onChange={(v) => setFormValues((c) => ({ ...c, metricCode: v === "all" ? "" : v }))}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <MultiSelectField
                id="target-domains"
                label="Dominios"
                value={formValues.domainCodesEncoded}
                options={domainOptions.map((o) => o.code)}
                displayValue={labelOf(domainOptions)}
                onChange={(v) => setFormValues((c) => ({ ...c, domainCodesEncoded: v }))}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <MultiSelectField
                id="target-types"
                label="Tipos de meta"
                value={formValues.typeItemCodesEncoded}
                options={goalTypeOptions.map((o) => o.code)}
                displayValue={labelOf(goalTypeOptions)}
                onChange={(v) => setFormValues((c) => ({ ...c, typeItemCodesEncoded: v }))}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <SingleSelectField
                id="target-operator"
                label="Operador"
                value={formValues.operatorCode || "all"}
                options={operatorOptions.map((o) => o.code)}
                displayValue={labelOf(operatorOptions)}
                emptyLabel="Sin operador"
                onChange={(v) => setFormValues((c) => ({ ...c, operatorCode: v === "all" ? "" : v }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="target-value-min">{showRange ? "Valor mínimo" : "Valor"}</Label>
              <Input id="target-value-min" type="number" className="rounded-xl" value={formValues.valueMin} onChange={(e) => setFormValues((c) => ({ ...c, valueMin: e.target.value }))} />
            </div>
            {showRange ? (
              <div className="space-y-2">
                <Label htmlFor="target-value-max">Valor máximo</Label>
                <Input id="target-value-max" type="number" className="rounded-xl" value={formValues.valueMax} onChange={(e) => setFormValues((c) => ({ ...c, valueMax: e.target.value }))} />
              </div>
            ) : null}
            {showText ? (
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="target-value-text">Valor de texto / lista</Label>
                <Input id="target-value-text" className="rounded-xl" value={formValues.valueText} onChange={(e) => setFormValues((c) => ({ ...c, valueText: e.target.value }))} placeholder="Para in_list, separa por coma." />
              </div>
            ) : null}
            <div className="space-y-2 md:col-span-2">
              <DateField
                id="target-valid-from"
                label="Vigente desde"
                value={formValues.validFromDate}
                onChange={(v) => setFormValues((c) => ({ ...c, validFromDate: v }))}
                helperText="Esta fecha define cuándo empieza a aplicar la meta. Al modificar, la versión anterior se cierra un día antes."
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="target-description">Descripción</Label>
              <textarea id="target-description" rows={3} className="flex min-h-[96px] w-full rounded-xl border border-input bg-background px-3 py-2 text-sm" value={formValues.targetDescription} onChange={(e) => setFormValues((c) => ({ ...c, targetDescription: e.target.value }))} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="target-notes">Notas</Label>
              <textarea id="target-notes" rows={2} className="flex min-h-[72px] w-full rounded-xl border border-input bg-background px-3 py-2 text-sm" value={formValues.notesText} onChange={(e) => setFormValues((c) => ({ ...c, notesText: e.target.value }))} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="target-reason">Motivo del cambio</Label>
              <Input id="target-reason" className="rounded-xl" value={formValues.changeReason} onChange={(e) => setFormValues((c) => ({ ...c, changeReason: e.target.value }))} placeholder="Opcional. Se registra en el historial." />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            {isEdit && onDeactivate ? <Button type="button" variant="outline" className="rounded-full" onClick={onDeactivate}>Desactivar</Button> : null}
            <Button type="submit" className="rounded-full"><Save className="size-4" /> {isEdit ? "Guardar nueva versión" : "Crear meta"}</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
