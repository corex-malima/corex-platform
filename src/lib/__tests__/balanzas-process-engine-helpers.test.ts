import { describe, expect, it, vi } from "vitest";

import {
  centerProcessOnElementIds,
  getNodeMarkerClass,
  isInteractiveProcessNode,
  matchesProcessBinding,
  resolveProcessSelection,
  scrollProcessToLane,
  type ViewerApi,
} from "@/modules/postcosecha/lib/balanzas-process-engine-helpers";
import { PROCESS_LANES } from "@/modules/postcosecha/lib/balanzas-process-stages";
import type { BalanzasNodeData, BalanzasProcessBinding } from "@/lib/postcosecha-balanzas";

function createViewer(options?: {
  elements?: Record<string, { id: string; x?: number; y?: number; width?: number; height?: number }>;
  viewbox?: { x: number; y: number; width: number; height: number };
}) {
  const defaultViewbox = options?.viewbox ?? { x: 0, y: 0, width: 500, height: 280 };
  const elements = options?.elements ?? {};
  const zoom = vi.fn(() => 1);
  const viewbox = vi.fn((box?: Partial<typeof defaultViewbox>) => {
    if (!box) {
      return defaultViewbox;
    }

    return { ...defaultViewbox, ...box };
  });
  const viewer = {
    get(service: string) {
      if (service === "canvas") {
        return {
          zoom,
          viewbox,
          addMarker: vi.fn(),
          removeMarker: vi.fn(),
        };
      }

      if (service === "elementRegistry") {
        return {
          get: (id: string) => elements[id],
          forEach: vi.fn(),
        };
      }

      if (service === "eventBus") {
        return { on: vi.fn() };
      }

      return {
        clear: vi.fn(),
        add: vi.fn(),
      };
    },
    destroy: vi.fn(),
    importXML: vi.fn(),
    saveSVG: vi.fn(),
  } as unknown as ViewerApi;

  return { viewer, zoom, viewbox };
}

describe("balanzas process engine helpers", () => {
  it("ignores invalid geometry and does not attempt a non-finite viewbox", () => {
    const { viewer, viewbox } = createViewer({
      elements: {
        SequenceFlow_1: { id: "SequenceFlow_1" },
        BrokenTask: { id: "BrokenTask", x: Number.NaN, y: 20, width: 80, height: 40 },
      },
    });

    expect(centerProcessOnElementIds(viewer, ["SequenceFlow_1", "BrokenTask"])).toBe(false);
    expect(viewbox).toHaveBeenCalledTimes(0);
  });

  it("recenters the canvas when valid bounded elements exist", () => {
    const { viewer, viewbox } = createViewer({
      elements: {
        Task_A: { id: "Task_A", x: 200, y: 120, width: 120, height: 80 },
        Task_B: { id: "Task_B", x: 420, y: 120, width: 120, height: 80 },
      },
    });

    expect(centerProcessOnElementIds(viewer, ["Task_A", "Task_B"])).toBe(true);
    expect(viewbox).toHaveBeenCalledTimes(2);
    expect(viewbox).toHaveBeenLastCalledWith({ x: 120, y: 20, width: 500, height: 280 });
  });

  it("falls back to fit viewport when a lane has no valid targets", () => {
    const { viewer, zoom, viewbox } = createViewer();
    const lane = PROCESS_LANES.find((entry) => entry.id === "apertura-apertura");

    expect(lane).toBeTruthy();
    expect(scrollProcessToLane(
      viewer,
      lane!,
      [{ id: "Unknown", name: "Sin match" }],
    )).toBe(false);
    expect(viewbox).toHaveBeenCalledTimes(0);
    expect(zoom).toHaveBeenCalledWith("fit-viewport", "auto");
  });
});

describe("getNodeMarkerClass", () => {
  it("returns aggregate marker for aggregate nodes", () => {
    expect(getNodeMarkerClass({ kind: "aggregate" } as BalanzasNodeData)).toBe("balanzas-node-aggregate");
  });

  it("returns metric marker for metric nodes", () => {
    expect(getNodeMarkerClass({ kind: "metric" } as BalanzasNodeData)).toBe("balanzas-node-metric");
  });
});

describe("isInteractiveProcessNode", () => {
  it("excludes root nodes b1_preclasificacion and b1_apertura", () => {
    expect(isInteractiveProcessNode({ key: "b1_preclasificacion" } as BalanzasNodeData)).toBe(false);
    expect(isInteractiveProcessNode({ key: "b1_apertura" } as BalanzasNodeData)).toBe(false);
  });

  it("includes all other nodes", () => {
    expect(isInteractiveProcessNode({ key: "b1ab_pre_gv" } as BalanzasNodeData)).toBe(true);
    expect(isInteractiveProcessNode({ key: "general_apertura_directo" } as BalanzasNodeData)).toBe(true);
    expect(isInteractiveProcessNode({ key: "b2a_apertura_max10_arcoiris" } as BalanzasNodeData)).toBe(true);
  });
});

describe("matchesProcessBinding", () => {
  it("returns true when elementId matches exactly", () => {
    const binding: BalanzasProcessBinding = { taskName: "B1AB", elementId: "Task_B1AB_Pre_GV" };
    expect(matchesProcessBinding(binding, { id: "Task_B1AB_Pre_GV" })).toBe(true);
  });

  it("returns false when elementId does not match", () => {
    const binding: BalanzasProcessBinding = { taskName: "B1AB", elementId: "Task_B1AB_Pre_GV" };
    expect(matchesProcessBinding(binding, { id: "Task_B1AB_Pre_Directo" })).toBe(false);
  });

  it("returns false when binding has no elementId", () => {
    const binding: BalanzasProcessBinding = { taskName: "B1AB" };
    expect(matchesProcessBinding(binding, { id: "Task_B1AB_Pre_GV" })).toBe(false);
  });
});

describe("resolveProcessSelection", () => {
  const makeNode = (key: BalanzasNodeData["key"], kind: BalanzasNodeData["kind"], elementId: string): BalanzasNodeData =>
    ({
      key,
      kind,
      processBindings: [{ taskName: "Task", elementId }],
    }) as unknown as BalanzasNodeData;

  it("returns the matching selection for an interactive node", () => {
    const nodes = [
      makeNode("b1_preclasificacion", "aggregate", "Task_Root"),
      makeNode("b1ab_pre_gv", "aggregate", "Task_B1AB_Pre_GV"),
    ];
    const result = resolveProcessSelection(nodes, { id: "Task_B1AB_Pre_GV" });
    expect(result?.nodeKey).toBe("b1ab_pre_gv");
  });

  it("skips root nodes (b1_preclasificacion, b1_apertura) even if binding matches", () => {
    const nodes = [makeNode("b1_preclasificacion", "aggregate", "Task_Root")];
    expect(resolveProcessSelection(nodes, { id: "Task_Root" })).toBeNull();
  });

  it("returns null when no binding matches", () => {
    const nodes = [makeNode("b1ab_pre_gv", "aggregate", "Task_B1AB_Pre_GV")];
    expect(resolveProcessSelection(nodes, { id: "Task_Unknown" })).toBeNull();
  });
});
