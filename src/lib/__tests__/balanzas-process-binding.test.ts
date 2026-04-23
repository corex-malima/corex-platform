import { describe, expect, it, vi } from "vitest";

import {
  reportBindingDrift,
  resolveStrictProcessSelection,
  validateBindings,
} from "@/modules/postcosecha/lib/balanzas-process-binding";
import type { BalanzasNodeData } from "@/lib/postcosecha-balanzas";

function makeNode(key: string, elementIds: (string | undefined)[]): BalanzasNodeData {
  return {
    key,
    processBindings: elementIds.map((elementId, index) => ({
      taskName: `Task_${index}`,
      elementId,
    })),
  } as unknown as BalanzasNodeData;
}

function makeRegistry(existingIds: string[]) {
  const ids = new Set(existingIds);
  return {
    get: (id: string) => (ids.has(id) ? { id } : undefined),
  };
}

// ─── validateBindings ─────────────────────────────────────────────────────────

describe("validateBindings", () => {
  it("returns 0 missing when all bindings resolve", () => {
    const nodes = [makeNode("b1ab_pre_gv", ["Task_B1AB"])];
    const registry = makeRegistry(["Task_B1AB"]);
    const result = validateBindings(nodes, registry);
    expect(result.missing).toHaveLength(0);
    expect(result.checked).toBe(1);
  });

  it("reports missing-element-id when binding has no elementId", () => {
    const nodes = [makeNode("b1ab_pre_gv", [undefined])];
    const result = validateBindings(nodes, makeRegistry([]));
    expect(result.missing).toHaveLength(1);
    expect(result.missing[0]?.reason).toBe("missing-element-id");
    expect(result.missing[0]?.elementId).toBeNull();
  });

  it("reports element-not-found when elementId not in registry", () => {
    const nodes = [makeNode("b1ab_pre_gv", ["Task_NonExistent"])];
    const result = validateBindings(nodes, makeRegistry([]));
    expect(result.missing).toHaveLength(1);
    expect(result.missing[0]?.reason).toBe("element-not-found");
    expect(result.missing[0]?.elementId).toBe("Task_NonExistent");
  });

  it("skips b1_preclasificacion (root node)", () => {
    const nodes = [makeNode("b1_preclasificacion", ["Task_Root"])];
    const result = validateBindings(nodes, makeRegistry([]));
    expect(result.checked).toBe(0);
    expect(result.missing).toHaveLength(0);
  });

  it("skips b1_apertura (root node)", () => {
    const nodes = [makeNode("b1_apertura", ["Task_Root"])];
    const result = validateBindings(nodes, makeRegistry([]));
    expect(result.checked).toBe(0);
    expect(result.missing).toHaveLength(0);
  });

  it("returns empty result for empty nodes array", () => {
    const result = validateBindings([], makeRegistry([]));
    expect(result.checked).toBe(0);
    expect(result.missing).toHaveLength(0);
  });

  it("checks multiple bindings per node and counts all", () => {
    const nodes = [makeNode("b2_pre_gv", ["Task_A", "Task_B", "Task_C"])];
    const registry = makeRegistry(["Task_A", "Task_B"]);
    const result = validateBindings(nodes, registry);
    expect(result.checked).toBe(3);
    expect(result.missing).toHaveLength(1);
    expect(result.missing[0]?.elementId).toBe("Task_C");
  });

  it("includes nodeKey and taskName in each issue", () => {
    const nodes = [makeNode("b2_pre_directo", ["Task_Missing"])];
    const result = validateBindings(nodes, makeRegistry([]));
    expect(result.missing[0]?.nodeKey).toBe("b2_pre_directo");
    expect(result.missing[0]?.taskName).toBe("Task_0");
  });
});

// ─── reportBindingDrift ───────────────────────────────────────────────────────

describe("reportBindingDrift", () => {
  it("does nothing when there are no missing bindings", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    reportBindingDrift({ checked: 5, missing: [] });
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it("logs a warning in non-production when there are missing bindings", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    reportBindingDrift({
      checked: 2,
      missing: [{ nodeKey: "b2_pre_gv", taskName: "Task_0", elementId: "Task_Missing", reason: "element-not-found" }],
    });
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]?.[0]).toContain("b2_pre_gv");
    warn.mockRestore();
  });
});

// ─── resolveStrictProcessSelection ───────────────────────────────────────────

describe("resolveStrictProcessSelection", () => {
  it("returns the correct selection when elementId matches exactly", () => {
    const nodes = [makeNode("b1ab_pre_gv", ["Task_B1AB_Pre_GV"])];
    const result = resolveStrictProcessSelection(nodes, { id: "Task_B1AB_Pre_GV" });
    expect(result?.nodeKey).toBe("b1ab_pre_gv");
  });

  it("returns null when no binding matches the element id", () => {
    const nodes = [makeNode("b1ab_pre_gv", ["Task_B1AB_Pre_GV"])];
    expect(resolveStrictProcessSelection(nodes, { id: "Task_Unknown" })).toBeNull();
  });

  it("skips b1_preclasificacion even when its binding matches", () => {
    const nodes = [makeNode("b1_preclasificacion", ["Task_Root"])];
    expect(resolveStrictProcessSelection(nodes, { id: "Task_Root" })).toBeNull();
  });

  it("skips b1_apertura even when its binding matches", () => {
    const nodes = [makeNode("b1_apertura", ["Task_Root"])];
    expect(resolveStrictProcessSelection(nodes, { id: "Task_Root" })).toBeNull();
  });

  it("returns first match when multiple nodes share the same elementId", () => {
    const nodes = [
      makeNode("b1ab_pre_gv", ["Task_Shared"]),
      makeNode("b2_pre_gv", ["Task_Shared"]),
    ];
    const result = resolveStrictProcessSelection(nodes, { id: "Task_Shared" });
    expect(result?.nodeKey).toBe("b1ab_pre_gv");
  });

  it("returns null for empty nodes array", () => {
    expect(resolveStrictProcessSelection([], { id: "Task_B1AB" })).toBeNull();
  });
});
