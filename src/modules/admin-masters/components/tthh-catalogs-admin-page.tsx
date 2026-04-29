"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { DatabaseZap, Save } from "lucide-react";
import { toast } from "sonner";

import { fetchJson } from "@/lib/fetch-json";
import { SectionPageShell } from "@/shared/layout/section-page-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { ScrollFadeTable } from "@/shared/tables/scroll-fade-table";
import { StandardTable, StandardTd } from "@/shared/tables/standard-table";
import { Badge } from "@/shared/ui/badge";

type CatalogGroup = { catalogCode: string; catalogName: string; catalogDescription: string | null; isValid: boolean };
type CatalogItem = { catalogCode: string; itemCode: string; itemLabelEs: string; itemDescription: string | null; displayOrder: number; isValid: boolean };
type CatalogPayload = { groups: CatalogGroup[]; items: CatalogItem[] };

const fetcher = (url: string) => fetchJson<CatalogPayload>(url, "No se pudo cargar catalogos.");

export function TthhCatalogsAdminPage() {
  const { data, mutate, isLoading } = useSWR("/api/talento-humano/catalogos", fetcher, { revalidateOnFocus: false });
  const [selectedCatalog, setSelectedCatalog] = useState("");
  const [groupForm, setGroupForm] = useState({ catalogCode: "", catalogName: "", catalogDescription: "" });
  const [itemForm, setItemForm] = useState({ itemCode: "", itemLabelEs: "", itemDescription: "", displayOrder: "0" });

  const groups = useMemo(() => data?.groups ?? [], [data?.groups]);
  const items = useMemo(() => data?.items ?? [], [data?.items]);
  const activeCatalog = selectedCatalog || groups[0]?.catalogCode || "";
  const visibleItems = useMemo(() => items.filter((item) => item.catalogCode === activeCatalog), [items, activeCatalog]);

  async function saveGroup() {
    try {
      await fetchJson("/api/talento-humano/catalogos", "No se pudo guardar el catalogo.", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "group", action: "upsert", ...groupForm }),
      });
      toast.success("Catalogo guardado.");
      setGroupForm({ catalogCode: "", catalogName: "", catalogDescription: "" });
      await mutate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al guardar.");
    }
  }

  async function saveItem() {
    try {
      await fetchJson("/api/talento-humano/catalogos", "No se pudo guardar la opcion.", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "item",
          action: "upsert",
          catalogCode: activeCatalog,
          ...itemForm,
          displayOrder: Number(itemForm.displayOrder) || 0,
        }),
      });
      toast.success("Opcion guardada.");
      setItemForm({ itemCode: "", itemLabelEs: "", itemDescription: "", displayOrder: "0" });
      await mutate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al guardar.");
    }
  }

  async function setValidity(kind: "group" | "item", payload: Record<string, unknown>) {
    await fetchJson("/api/talento-humano/catalogos", "No se pudo cambiar el estado.", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, action: "set-validity", ...payload }),
    });
    await mutate();
  }

  return (
    <SectionPageShell
      eyebrow="Gestion / Talento Humano / Administrar Maestros"
      title="Catálogos TTHH"
      subtitle="Administra catálogos y opciones usados por formularios de Talento Humano."
      icon={<DatabaseZap className="size-5" />}
    >
      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="starter-panel">
          <CardHeader>
            <CardTitle>Catálogos</CardTitle>
            <CardDescription>{isLoading ? "Cargando..." : `${groups.length} catalogo(s)`}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2"><Label>Código</Label><Input value={groupForm.catalogCode} onChange={(e) => setGroupForm((p) => ({ ...p, catalogCode: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Nombre</Label><Input value={groupForm.catalogName} onChange={(e) => setGroupForm((p) => ({ ...p, catalogName: e.target.value }))} /></div>
              <div className="space-y-2 sm:col-span-2"><Label>Descripción</Label><Input value={groupForm.catalogDescription} onChange={(e) => setGroupForm((p) => ({ ...p, catalogDescription: e.target.value }))} /></div>
              <Button className="sm:col-span-2" onClick={saveGroup}><Save className="size-4" /> Guardar catálogo</Button>
            </div>
            <ScrollFadeTable className="border border-border/70">
              <StandardTable>
                <tbody>
                  {groups.map((group) => (
                    <tr key={group.catalogCode} className={activeCatalog === group.catalogCode ? "bg-slate-900 text-white" : ""}>
                      <StandardTd>
                        <button
                          type="button"
                          className="text-left font-medium"
                          onClick={() => {
                            setSelectedCatalog(group.catalogCode);
                            setGroupForm({
                              catalogCode: group.catalogCode,
                              catalogName: group.catalogName,
                              catalogDescription: group.catalogDescription ?? "",
                            });
                          }}
                        >
                          {group.catalogName}
                        </button>
                        <p className="text-xs opacity-70">{group.catalogCode}</p>
                      </StandardTd>
                      <StandardTd><Badge variant={group.isValid ? "success" : "outline"}>{group.isValid ? "Activo" : "Inactivo"}</Badge></StandardTd>
                      <StandardTd>
                        <Button size="sm" variant="outline" onClick={() => setValidity("group", { catalogCode: group.catalogCode, isValid: !group.isValid })}>
                          {group.isValid ? "Inactivar" : "Activar"}
                        </Button>
                      </StandardTd>
                    </tr>
                  ))}
                </tbody>
              </StandardTable>
            </ScrollFadeTable>
          </CardContent>
        </Card>

        <Card className="starter-panel">
          <CardHeader>
            <CardTitle>Opciones: {activeCatalog || "Seleccione catálogo"}</CardTitle>
            <CardDescription>Crear, editar, activar, inactivar y ordenar opciones.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-4">
              <div className="space-y-2"><Label>Código</Label><Input value={itemForm.itemCode} onChange={(e) => setItemForm((p) => ({ ...p, itemCode: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Etiqueta</Label><Input value={itemForm.itemLabelEs} onChange={(e) => setItemForm((p) => ({ ...p, itemLabelEs: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Orden</Label><Input value={itemForm.displayOrder} onChange={(e) => setItemForm((p) => ({ ...p, displayOrder: e.target.value }))} /></div>
              <div className="flex items-end"><Button className="w-full" onClick={saveItem} disabled={!activeCatalog}><Save className="size-4" /> Guardar opción</Button></div>
              <div className="space-y-2 sm:col-span-4"><Label>Descripción</Label><Input value={itemForm.itemDescription} onChange={(e) => setItemForm((p) => ({ ...p, itemDescription: e.target.value }))} /></div>
            </div>
            <ScrollFadeTable className="border border-border/70">
              <StandardTable>
                <tbody>
                  {visibleItems.map((item) => (
                    <tr key={`${item.catalogCode}:${item.itemCode}`}>
                      <StandardTd>{item.displayOrder}</StandardTd>
                      <StandardTd>
                        <p className="font-medium">{item.itemLabelEs}</p>
                        <p className="text-xs text-muted-foreground">{item.itemCode}</p>
                      </StandardTd>
                      <StandardTd><Badge variant={item.isValid ? "success" : "outline"}>{item.isValid ? "Activo" : "Inactivo"}</Badge></StandardTd>
                      <StandardTd>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => setItemForm({
                            itemCode: item.itemCode,
                            itemLabelEs: item.itemLabelEs,
                            itemDescription: item.itemDescription ?? "",
                            displayOrder: String(item.displayOrder),
                          })}>
                            Editar
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setValidity("item", { catalogCode: item.catalogCode, itemCode: item.itemCode, isValid: !item.isValid })}>
                            {item.isValid ? "Inactivar" : "Activar"}
                          </Button>
                        </div>
                      </StandardTd>
                    </tr>
                  ))}
                  {!visibleItems.length ? <tr><td colSpan={4} className="px-4 py-10 text-center text-sm text-muted-foreground">Sin opciones para este catálogo.</td></tr> : null}
                </tbody>
              </StandardTable>
            </ScrollFadeTable>
          </CardContent>
        </Card>
      </div>
    </SectionPageShell>
  );
}
