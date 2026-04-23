import { describe, expect, it } from "vitest";

import type { BalanzasNodeData, BalanzasNodeKey } from "@/lib/postcosecha-balanzas";
import {
  findLaneByNodeKey,
  findLaneBySelection,
  getProcessSelection,
  PROCESS_LANES,
  resolveAggregateChildren,
  resolveLaneViewportTargetIds,
} from "@/modules/postcosecha/lib/balanzas-process-stages";

describe("balanzas process lanes", () => {
  it("maps the new node selections to the canonical lanes", () => {
    expect(findLaneBySelection(getProcessSelection("b1ab_pre_gv"))?.id).toBe("pre-gv");
    expect(findLaneBySelection(getProcessSelection("b2_pre_directo"))?.id).toBe("pre-directo");
    expect(findLaneBySelection(getProcessSelection("b2_apertura_max10"))?.id).toBe("apertura-gv-pelado");
    expect(findLaneBySelection(getProcessSelection("general_apertura_directo"))?.id).toBe("apertura-apertura");
  });

  it("prefers explicit element ids and falls back to name hints", () => {
    const preLane = PROCESS_LANES.find((lane) => lane.id === "pre-gv");

    expect(preLane).toBeTruthy();
    expect(resolveLaneViewportTargetIds(
      preLane!,
      [
        { id: "Task_B1AB_Pre_GV", name: "B1AB" },
        { id: "fallback", name: "General alterno" },
      ],
    )).toEqual(["Task_B1AB_Pre_GV"]);

    expect(resolveLaneViewportTargetIds(
      { ...preLane!, viewportTargetIds: ["missing-id"], elementNameHints: ["GENERAL"] },
      [{ id: "Task_General_Pre_GV", name: "GENERAL" }],
    )).toEqual(["Task_General_Pre_GV"]);
  });

  it("resolves aggregate children from the explicit node inventory", () => {
    const nodes = [
      {
        key: "general_apertura_directo",
        kind: "aggregate",
        childrenKeys: [
          "b2a_apertura_directo_arcoiris",
          "b2a_apertura_directo_tinturado",
        ],
      },
      {
        key: "b2a_apertura_directo_arcoiris",
        kind: "metric",
        childrenKeys: [],
      },
      {
        key: "b2a_apertura_directo_tinturado",
        kind: "metric",
        childrenKeys: [],
      },
    ] as BalanzasNodeData[];

    expect(resolveAggregateChildren(nodes[0]!, nodes).map((node) => node.key)).toEqual([
      "b2a_apertura_directo_arcoiris",
      "b2a_apertura_directo_tinturado",
    ]);
  });
});

describe("findLaneByNodeKey edge cases", () => {
  it("returns null for null or undefined nodeKey", () => {
    expect(findLaneByNodeKey(null)).toBeNull();
    expect(findLaneByNodeKey(undefined)).toBeNull();
  });

  it("returns null for findLaneBySelection when selection is null", () => {
    expect(findLaneBySelection(null)).toBeNull();
  });

  it("every BalanzasNodeKey in LANE_BY_NODE maps to a valid PROCESS_LANES entry", () => {
    const laneIds = new Set(PROCESS_LANES.map((lane) => lane.id));
    const allNodeKeys: BalanzasNodeKey[] = [
      "b1_preclasificacion", "b1ab_pre_gv", "b2_pre_gv",
      "b3_pre_gv_arcoiris", "b3_pre_gv_tinturado", "b3_pre_gv_blanco", "general_pre_gv",
      "b1ab_pre_directo", "b2_pre_directo", "b3_pre_directo_arcoiris",
      "b3_pre_directo_tinturado", "b3_pre_directo_blanco", "general_pre_directo",
      "b1_apertura", "b1c_apertura_gv", "b2_apertura_max10",
      "b2a_apertura_max10_arcoiris", "b2a_apertura_max10_tinturado", "b2a_apertura_max10_blanco",
      "general_apertura_max10", "b1c_apertura_directo", "b2_apertura_directo",
      "b2a_apertura_directo_arcoiris", "b2a_apertura_directo_tinturado", "b2a_apertura_directo_blanco",
      "general_apertura_directo",
    ];

    for (const key of allNodeKeys) {
      const lane = findLaneByNodeKey(key);
      expect(lane, `nodeKey "${key}" must map to a valid lane`).not.toBeNull();
      expect(laneIds.has(lane!.id), `lane id "${lane!.id}" for "${key}" must exist in PROCESS_LANES`).toBe(true);
    }
  });
});

describe("resolveLaneViewportTargetIds edge cases", () => {
  it("returns empty array when lane has no hints and no matching element ids", () => {
    const laneWithNoHints = { ...PROCESS_LANES[0]!, viewportTargetIds: [], elementNameHints: [] };
    expect(resolveLaneViewportTargetIds(laneWithNoHints, [{ id: "Task_X", name: "unknown" }])).toEqual([]);
  });

  it("returns empty array when elements list is empty", () => {
    const lane = PROCESS_LANES[0]!;
    expect(resolveLaneViewportTargetIds(lane, [])).toEqual([]);
  });
});

describe("resolveAggregateChildren edge cases", () => {
  it("returns empty array for null node", () => {
    expect(resolveAggregateChildren(null, [])).toEqual([]);
  });

  it("returns empty array for metric node (non-aggregate)", () => {
    const node = { key: "b2_pre_gv", kind: "metric", childrenKeys: [] } as unknown as BalanzasNodeData;
    expect(resolveAggregateChildren(node, [])).toEqual([]);
  });
});
