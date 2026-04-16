"use client";

import type { BlockModalRow } from "@/lib/fenograma";
import { useCycleSelection } from "./use-cycle-selection";
import { useValveSelection } from "./use-valve-selection";
import { useCurveData } from "./use-curve-data";

// Re-export types for consumers that import them from this file
export type { SelectedMortalityCurveState } from "./use-curve-data";
export type SelectedValveState = {
  cycleKey: string;
  valveId: string;
};

/**
 * Composer hook that combines cycle selection, valve selection, and curve data.
 *
 * Previously a 323-line monolith, now delegates to 3 focused hooks while
 * maintaining 100% backward-compatible return type.
 *
 * Consumers: fenograma-explorer, mortality-explorer, campo-explorer.
 */
export function useBlockProfileModal(selectedRow: BlockModalRow | null) {
  const cycles = useCycleSelection(selectedRow);
  const valves = useValveSelection(cycles.selectedRowKey);
  const curves = useCurveData(cycles.selectedRowKey);

  // Wrap openBeds/closeBeds to also clear valve detail (cross-concern)
  function openBeds(cycleKey: string) {
    cycles.openBeds(cycleKey);
    valves.resetValveDetail();
  }

  function closeBeds() {
    cycles.closeBeds();
    valves.resetValveDetail();
  }

  return {
    // Block data (from cycle selection)
    blockData: cycles.blockData,
    blockLoading: cycles.blockLoading,
    blockError: cycles.blockError,

    // Bed selection (from cycle selection)
    selectedCycleKey: cycles.selectedCycleKey,
    bedData: cycles.bedData,
    bedLoading: cycles.bedLoading,
    bedError: cycles.bedError,

    // Valve cycle selection (from valve selection)
    selectedValveCycleKey: valves.selectedValveCycleKey,
    valvesData: valves.valvesData,
    valvesLoading: valves.valvesLoading,
    valvesError: valves.valvesError,

    // Individual valve detail (from valve selection)
    selectedValve: valves.selectedValve,
    valveData: valves.valveData,
    valveLoading: valves.valveLoading,
    valveError: valves.valveError,

    // Harvest curve (from curve data)
    selectedCurveCycleKey: curves.selectedCurveCycleKey,
    curveData: curves.curveData,
    curveLoading: curves.curveLoading,
    curveError: curves.curveError,

    // Mortality curve (from curve data)
    selectedMortalityCurve: curves.selectedMortalityCurve,
    mortalityCurveData: curves.mortalityCurveData,
    mortalityCurveLoading: curves.mortalityCurveLoading,
    mortalityCurveError: curves.mortalityCurveError,

    // Actions (wrapped for cross-concern coordination)
    openBeds,
    closeBeds,
    openValves: valves.openValves,
    closeValves: valves.closeValves,
    openValve: valves.openValve,
    openCurve: curves.openCurve,
    closeCurve: curves.closeCurve,
    openCycleMortalityCurve: curves.openCycleMortalityCurve,
    openValveMortalityCurve: curves.openValveMortalityCurve,
    openBedMortalityCurve: curves.openBedMortalityCurve,
    closeMortalityCurve: curves.closeMortalityCurve,
  };
}
