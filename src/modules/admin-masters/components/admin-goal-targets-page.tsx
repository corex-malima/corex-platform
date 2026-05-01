"use client";

import { startTransition, useDeferredValue, useMemo, useState } from "react";
import useSWR from "swr";
import { ChevronDown, ChevronRight, Plus, RefreshCcw, Search, Target } from "lucide-react";
import { toast } from "sonner";

import { fetchJson } from "@/lib/fetch-json";
import { cn } from "@/lib/utils";
import { decodeMultiSelectValue, encodeMultiSelectValue } from "@/lib/multi-select";
import { MetricTile } from "@/shared/data-display/metric-tile";
import { FilterPanel, KpiGrid } from "@/shared/layout/filter-panel";
import { SectionPageShell } from "@/shared/layout/section-page-shell";
import { SingleSelectField } from "@/shared/filters/single-select-field";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { localDateString } from "@/shared/lib/format";

import {
  AdminGoalTargetEditor,
  type EditorOption,
  type GoalTargetFormValues,
} from "@/modules/admin-masters/components/admin-goal-target-editor";

type AdminGoalTarget = {
  targetCode: string; targetName: string; targetDescription: string | null;
  parentTargetCode: string | null; levelIndex: number; levelLabel: string | null;
  metricCode: string | null; metricName: string | null; unitSymbol: string | null;
  operatorCode: string | null; operatorLabel: string | null;
  valueMin: number | null; valueMax: number | null; valueText: string | null;
  notesText: string | null; domainCodes: string[]; typeItemCodes: string[];
  validFrom: string; validTo: string | null;
};
type AdminMetric = { metricCode: string; metricName: string };
type AdminDomain = { domainCode: string; domainName: string };
type AdminCatalogItem = { itemCode: string; itemLabelEs: string };
type GoalsPayload = { targets: AdminGoalTarget[]; metrics: AdminMetric[]; domains: AdminDomain[]; operators: AdminCatalogItem[]; goalTypes: AdminCatalogItem[] };

const ENDPOINT = "/api/admin/administracion-maestros/metas-objetivos";
const fetcher = (url: string) => fetchJson<GoalsPayload>(url, "No se pudo cargar metas y objetivos.");
const today = localDateString();
const EMPTY_FORM: GoalTargetFormValues = {
  targetCode: "", targetName: "", targetDescription: "", parentTargetCode: "",
  levelIndex: "1", levelLabel: "", metricCode: "", domainCodesEncoded: "all",
  typeItemCodesEncoded: "all", operatorCode: "", valueMin: "", valueMax: "",
  valueText: "", validFromDate: today, notesText: "", changeReason: "",
};

const PAGE_SIZE = 50; // visible roots per page; expand-all guarded against runaway DOM

type TreeNode = AdminGoalTarget & { children: TreeNode[]; descendantCount: number };

function buildTree(targets: AdminGoalTarget[]): TreeNode[] {
  const map = new Map<string, TreeNode>();
  targets.forEach((t) => map.set(t.targetCode, { ...t, children: [], descendantCount: 0 }));
  const roots: TreeNode[] = [];
  map.forEach((node) => {
    if (node.parentTargetCode && map.has(node.parentTargetCode)) {
      map.get(node.parentTargetCode)!.children.push(node);
    } else {
      roots.push(node);
    }
  });
  const computeAndSort = (n: TreeNode): number => {
    n.children.sort((a, b) => a.targetCode.localeCompare(b.targetCode));
    let total = n.children.length;
    for (const c of n.children) total += computeAndSort(c);
    n.descendantCount = total;
    return total;
  };
  roots.sort((a, b) => a.targetCode.localeCompare(b.targetCode));
  for (const r of roots) computeAndSort(r);
  return roots;
}

export function AdminGoalTargetsPage() {
  const { data, mutate, isValidating } = useSWR(ENDPOINT, fetcher, { revalidateOnFocus: false });
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [domainFilter, setDomainFilter] = useState<string>("all");
  const [metricFilter, setMetricFilter] = useState<string>("all");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [pageOffset, setPageOffset] = useState(0);
  const [formValues, setFormValues] = useState<GoalTargetFormValues>(EMPTY_FORM);
  const deferredSearch = useDeferredValue(search);

  const targets = useMemo(() => data?.targets ?? [], [data?.targets]);
  const metrics = useMemo(() => data?.metrics ?? [], [data?.metrics]);
  const domains = useMemo(() => data?.domains ?? [], [data?.domains]);
  const operators = useMemo(() => data?.operators ?? [], [data?.operators]);
  const goalTypes = useMemo(() => data?.goalTypes ?? [], [data?.goalTypes]);

  const levelDistribution = useMemo(() => {
    const dist = new Map<number, number>();
    for (const t of targets) dist.set(t.levelIndex, (dist.get(t.levelIndex) ?? 0) + 1);
    return [...dist.entries()].sort((a, b) => a[0] - b[0]);
  }, [targets]);

  const maxLevel = useMemo(() => targets.reduce((m, t) => Math.max(m, t.levelIndex), 0), [targets]);
  const levelOptions = useMemo(() => {
    return Array.from({ length: maxLevel }, (_, i) => `L${i + 1}`);
  }, [maxLevel]);

  const filteredFlat = useMemo(() => {
    const normalized = deferredSearch.trim().toLowerCase();
    return targets.filter((t) => {
      if (levelFilter !== "all" && `L${t.levelIndex}` !== levelFilter) return false;
      if (domainFilter !== "all" && !t.domainCodes.includes(domainFilter)) return false;
      if (metricFilter !== "all" && t.metricCode !== metricFilter) return false;
      if (normalized) {
        const hay = `${t.targetCode} ${t.targetName} ${t.levelLabel ?? ""}`.toLowerCase();
        if (!hay.includes(normalized)) return false;
      }
      return true;
    });
  }, [targets, deferredSearch, levelFilter, domainFilter, metricFilter]);

  const tree = useMemo(() => buildTree(targets), [targets]);
  const filteredTree = useMemo(() => {
    const noFilters = !deferredSearch.trim() && levelFilter === "all" && domainFilter === "all" && metricFilter === "all";
    if (noFilters) return tree;
    const matchSet = new Set(filteredFlat.map((t) => t.targetCode));
    const matchesOrHasMatchingChild = (n: TreeNode): boolean =>
      matchSet.has(n.targetCode) || n.children.some(matchesOrHasMatchingChild);
    const filterDeep = (nodes: TreeNode[]): TreeNode[] =>
      nodes.filter(matchesOrHasMatchingChild).map((n) => ({ ...n, children: filterDeep(n.children) }));
    return filterDeep(tree);
  }, [tree, filteredFlat, deferredSearch, levelFilter, domainFilter, metricFilter]);

  const totalRoots = filteredTree.length;
  const pagedRoots = useMemo(
    () => filteredTree.slice(pageOffset, pageOffset + PAGE_SIZE),
    [filteredTree, pageOffset],
  );
  const hasMore = pageOffset + PAGE_SIZE < totalRoots;

  const selected = selectedCode ? targets.find((t) => t.targetCode === selectedCode) ?? null : null;
  const isEdit = selected !== null;

  const parentOptions: EditorOption[] = useMemo(() =>
    targets
      .filter((t) => t.targetCode !== formValues.targetCode)
      .map((t) => ({ code: t.targetCode, label: `L${t.levelIndex} ${t.targetName}` })),
    [targets, formValues.targetCode],
  );
  const metricOptions: EditorOption[] = useMemo(() => metrics.map((m) => ({ code: m.metricCode, label: m.metricName })), [metrics]);
  const domainOptions: EditorOption[] = useMemo(() => domains.map((d) => ({ code: d.domainCode, label: d.domainName })), [domains]);
  const operatorOptions: EditorOption[] = useMemo(() => operators.map((o) => ({ code: o.itemCode, label: o.itemLabelEs })), [operators]);
  const goalTypeOptions: EditorOption[] = useMemo(() => goalTypes.map((g) => ({ code: g.itemCode, label: g.itemLabelEs })), [goalTypes]);

  function toggleExpanded(code: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code); else next.add(code);
      return next;
    });
  }

  function resetFilters() {
    setSearch("");
    setLevelFilter("all");
    setDomainFilter("all");
    setMetricFilter("all");
    setPageOffset(0);
  }

  function openCreate(parent: AdminGoalTarget | null) {
    startTransition(() => {
      setSelectedCode(null);
      setFormValues({
        ...EMPTY_FORM,
        parentTargetCode: parent?.targetCode ?? "",
        levelIndex: String((parent?.levelIndex ?? 0) + 1),
        domainCodesEncoded: parent && parent.domainCodes.length > 0 ? encodeMultiSelectValue(parent.domainCodes) : "all",
      });
    });
  }

  function openEdit(t: AdminGoalTarget) {
    startTransition(() => {
      setSelectedCode(t.targetCode);
      setFormValues({
        targetCode: t.targetCode, targetName: t.targetName,
        targetDescription: t.targetDescription ?? "", parentTargetCode: t.parentTargetCode ?? "",
        levelIndex: String(t.levelIndex), levelLabel: t.levelLabel ?? "",
        metricCode: t.metricCode ?? "",
        domainCodesEncoded: encodeMultiSelectValue(t.domainCodes),
        typeItemCodesEncoded: encodeMultiSelectValue(t.typeItemCodes),
        operatorCode: t.operatorCode ?? "",
        valueMin: t.valueMin !== null ? String(t.valueMin) : "",
        valueMax: t.valueMax !== null ? String(t.valueMax) : "",
        valueText: t.valueText ?? "",
        validFromDate: t.validFrom ? t.validFrom.slice(0, 10) : today,
        notesText: t.notesText ?? "", changeReason: "",
      });
    });
  }

  async function saveTarget(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!formValues.targetCode.trim() || !formValues.targetName.trim() || !formValues.validFromDate) {
      toast.error("Código, nombre y fecha de inicio son obligatorios.");
      return;
    }
    if (isEdit && selected && formValues.validFromDate <= selected.validFrom.slice(0, 10)) {
      toast.error("La nueva fecha de inicio debe ser posterior a la versión vigente.");
      return;
    }
    const payload = {
      targetCode: formValues.targetCode.trim(), targetName: formValues.targetName.trim(),
      targetDescription: formValues.targetDescription.trim() || null,
      parentTargetCode: formValues.parentTargetCode || null,
      levelIndex: Number(formValues.levelIndex) || 1,
      levelLabel: formValues.levelLabel.trim() || null,
      metricCode: formValues.metricCode || null,
      operatorCode: formValues.operatorCode || null,
      valueMin: formValues.valueMin === "" ? null : Number(formValues.valueMin),
      valueMax: formValues.valueMax === "" ? null : Number(formValues.valueMax),
      valueText: formValues.valueText.trim() || null,
      notesText: formValues.notesText.trim() || null,
      domainCodes: decodeMultiSelectValue(formValues.domainCodesEncoded),
      typeItemCodes: decodeMultiSelectValue(formValues.typeItemCodesEncoded),
      validFromDate: formValues.validFromDate,
      changeReason: formValues.changeReason.trim() || (isEdit ? "manual_update" : "manual_create"),
    };
    try {
      if (isEdit) {
        await fetchJson(ENDPOINT, "No se pudo actualizar.", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "update", ...payload }),
        });
        toast.success("Meta actualizada (nueva versión SCD2).");
      } else {
        await fetchJson(ENDPOINT, "No se pudo crear.", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        toast.success("Meta creada.");
      }
      setSelectedCode(payload.targetCode);
      await mutate(undefined, { revalidate: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al guardar.");
    }
  }

  async function deactivate() {
    if (!selected) return;
    try {
      await fetchJson(ENDPOINT, "No se pudo desactivar.", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set-validity", targetCode: selected.targetCode, isValid: false }),
      });
      toast.success("Meta desactivada.");
      await mutate(undefined, { revalidate: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo desactivar.");
    }
  }

  function renderNode(node: TreeNode, depth: number): React.ReactNode {
    const isOpen = expanded.has(node.targetCode);
    const isSelected = selectedCode === node.targetCode;
    const hasChildren = node.children.length > 0;
    const domain = node.domainCodes[0] ?? null;
    return (
      <div key={node.targetCode}>
        <div
          className={cn(
            "flex items-center gap-2 rounded-[18px] border px-3 py-2 transition-colors",
            isSelected ? "border-slate-900 bg-slate-900 text-white" : "border-border/70 bg-background/80 hover:border-slate-300",
          )}
          style={{ marginLeft: depth * 18 }}
        >
          <button type="button" className="shrink-0 p-1" onClick={() => toggleExpanded(node.targetCode)} aria-label={isOpen ? "Contraer" : "Expandir"}>
            {hasChildren ? (isOpen ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />) : <span className="block size-4" />}
          </button>
          <button type="button" className="min-w-0 flex-1 text-left" onClick={() => openEdit(node)}>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold">{node.targetName}</span>
              <Badge
                variant={isSelected ? "secondary" : "outline"}
                className={cn("rounded-full px-2 py-0.5 text-[10px]", isSelected && "border-white/20 bg-white/12 text-white")}
              >
                L{node.levelIndex}
              </Badge>
              {node.levelLabel ? (
                <Badge
                  variant="outline"
                  className={cn("rounded-full px-2 py-0.5 text-[10px]", isSelected && "border-white/20 bg-white/12 text-white")}
                >
                  {node.levelLabel}
                </Badge>
              ) : null}
              {node.metricName ? (
                <Badge
                  variant="outline"
                  className={cn("rounded-full px-2 py-0.5 text-[10px]", isSelected && "border-white/20 bg-white/12 text-white")}
                >
                  {node.metricName}
                  {node.unitSymbol ? ` (${node.unitSymbol})` : ""}
                </Badge>
              ) : null}
              {domain ? (
                <Badge
                  variant="outline"
                  className={cn("rounded-full px-2 py-0.5 text-[10px]", isSelected && "border-white/20 bg-white/12 text-white")}
                >
                  {domain}
                </Badge>
              ) : null}
              {hasChildren ? (
                <Badge
                  variant="outline"
                  className={cn("rounded-full px-2 py-0.5 text-[10px]", isSelected && "border-white/20 bg-white/12 text-white")}
                >
                  {node.descendantCount} {node.descendantCount === 1 ? "hijo" : "descendientes"}
                </Badge>
              ) : null}
            </div>
            <p className={cn("mt-1 text-[11px]", isSelected ? "text-white/80" : "text-muted-foreground")}>{node.targetCode}</p>
          </button>
          <Button type="button" variant="ghost" size="sm" className="shrink-0" onClick={() => openCreate(node)} title="Agregar hijo (siguiente nivel)">
            <Plus className="size-3" />
          </Button>
        </div>
        {isOpen && hasChildren ? (
          <div className="mt-1 space-y-1">{node.children.map((c) => renderNode(c, depth + 1))}</div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <SectionPageShell
        eyebrow="Administración / Administración Maestros / Metas & Objetivos"
        title="Metas & Objetivos"
        subtitle="Administración jerárquica multinivel. Filtra por nivel, dominio o métrica; cada meta puede crear hijos en niveles inferiores."
        icon={<Target className="size-5" aria-hidden="true" />}
        actions={(
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" className="rounded-full" onClick={() => void mutate()}>
              <RefreshCcw className={cn("size-4", isValidating && "animate-spin")} />
              Recargar
            </Button>
            <Button type="button" className="rounded-full" onClick={() => openCreate(null)}>
              <Plus className="size-4" />
              Nueva meta raíz
            </Button>
          </div>
        )}
      >
        <FilterPanel>
          <div className="grid gap-3 md:grid-cols-3">
            <SingleSelectField
              id="goal-level-filter"
              label="Nivel"
              value={levelFilter}
              options={levelOptions}
              displayValue={(v) => v}
              emptyLabel="Todos los niveles"
              onChange={(v) => { setLevelFilter(v); setPageOffset(0); }}
            />
            <SingleSelectField
              id="goal-domain-filter"
              label="Dominio"
              value={domainFilter}
              options={domains.map((d) => d.domainCode)}
              displayValue={(v) => domains.find((d) => d.domainCode === v)?.domainName ?? v}
              emptyLabel="Todos los dominios"
              onChange={(v) => { setDomainFilter(v); setPageOffset(0); }}
            />
            <SingleSelectField
              id="goal-metric-filter"
              label="Métrica"
              value={metricFilter}
              options={metrics.map((m) => m.metricCode)}
              displayValue={(v) => metrics.find((m) => m.metricCode === v)?.metricName ?? v}
              emptyLabel="Todas las métricas"
              onChange={(v) => { setMetricFilter(v); setPageOffset(0); }}
            />
          </div>
          <KpiGrid columns={4}>
            <MetricTile label="Metas activas (filtro)" value={String(filteredFlat.length)} hint={`Total catálogo: ${targets.length}`} />
            <MetricTile label="Niveles" value={String(maxLevel)} hint="Profundidad máxima del árbol." />
            <MetricTile label="Distribución por nivel" value={levelDistribution.map(([l, n]) => `L${l}:${n}`).join(" ")} hint="Conteo por nivel." />
            <MetricTile label="Dominios" value={String(domains.length)} hint="Macro-dominios disponibles." />
          </KpiGrid>
        </FilterPanel>
      </SectionPageShell>

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="starter-panel border-border/70 bg-card/84">
          <CardHeader className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-slate-900/10 p-3 text-slate-700 dark:bg-slate-900/20 dark:text-white">
                <Target className="size-5" aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <CardTitle className="text-lg">Árbol de metas</CardTitle>
                <CardDescription>
                  {filteredTree.length === totalRoots
                    ? `${totalRoots} raíces`
                    : `${totalRoots} raíces filtradas`}
                  {totalRoots > PAGE_SIZE ? ` · mostrando ${Math.min(PAGE_SIZE, totalRoots - pageOffset)} desde ${pageOffset + 1}` : ""}
                  · clic en + para crear hijo
                </CardDescription>
              </div>
              {(search || levelFilter !== "all" || domainFilter !== "all" || metricFilter !== "all") ? (
                <Button type="button" variant="ghost" size="sm" className="rounded-full" onClick={resetFilters}>
                  Limpiar filtros
                </Button>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="goal-search">Buscar meta</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="goal-search"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPageOffset(0); }}
                  placeholder="Buscar por código, nombre o etiqueta..."
                  className="pl-10"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-1">
            <div className="max-h-[calc(100dvh-22rem)] space-y-1 overflow-y-auto pr-1">
              {pagedRoots.length ? (
                pagedRoots.map((n) => renderNode(n, 0))
              ) : (
                <div className="rounded-[18px] border border-dashed border-border/70 px-4 py-8 text-center text-sm text-muted-foreground">
                  No hay metas que coincidan con los filtros.
                </div>
              )}
              {hasMore ? (
                <div className="flex justify-center pt-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-full"
                    onClick={() => setPageOffset((p) => p + PAGE_SIZE)}
                  >
                    Mostrar siguientes {Math.min(PAGE_SIZE, totalRoots - pageOffset - PAGE_SIZE)}
                  </Button>
                </div>
              ) : null}
              {pageOffset > 0 ? (
                <div className="flex justify-center pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="rounded-full"
                    onClick={() => setPageOffset(0)}
                  >
                    Volver al inicio
                  </Button>
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <AdminGoalTargetEditor
          isEdit={isEdit}
          formValues={formValues}
          setFormValues={setFormValues}
          parentOptions={parentOptions}
          metricOptions={metricOptions}
          domainOptions={domainOptions}
          goalTypeOptions={goalTypeOptions}
          operatorOptions={operatorOptions}
          onSubmit={saveTarget}
          onDeactivate={isEdit ? deactivate : undefined}
          selectedTitle={selected?.targetName ?? null}
        />
      </div>
    </div>
  );
}
