"use client";

import type { KeyboardEvent } from "react";

import type {
  PoscosechaClasificacionOrderRow,
  SolverDateKey,
} from "@/lib/postcosecha-clasificacion-en-blanco-types";
import { buildRecipeInput, buildRecipeInputFromResult } from "@/lib/postcosecha-clasificacion-recipe-input";
import { SOLVER_DATE_KEYS } from "@/lib/postcosecha-clasificacion-en-blanco-types";

export function toInteger(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(Math.round(parsed), 0) : 0;
}

export function toFloat(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(parsed, 0) : 0;
}

export function orderTotal(row: PoscosechaClasificacionOrderRow) {
  return SOLVER_DATE_KEYS.reduce((accumulator, key) => accumulator + toInteger(row[key]), 0);
}

// Builders de input de receta: una sola fuente de verdad en
// @/lib/postcosecha-clasificacion-recipe-input. Se re-exportan aquí para uso
// desde componentes cliente del solver.
export { buildRecipeInput, buildRecipeInputFromResult };

export type SolverOrderValueUpdater = (skuId: string, dateKey: SolverDateKey, value: string) => void;
export type SolverAvailabilityDateUpdater = (
  grado: number,
  dateKey: SolverDateKey,
  value: string,
) => void;

export function handleCaptureInputTab(event: KeyboardEvent<HTMLInputElement>) {
  if (event.key !== "Tab") {
    return;
  }

  const currentInput = event.currentTarget;
  const captureContainer = currentInput.closest("[data-capture-scope='true']");

  if (!captureContainer) {
    return;
  }

  const inputs = Array.from(
    captureContainer.querySelectorAll<HTMLInputElement>("input[data-capture-input='true']"),
  ).filter((input) => !input.disabled && input.tabIndex !== -1);

  const currentIndex = inputs.indexOf(currentInput);

  if (currentIndex === -1) {
    return;
  }

  const nextIndex = event.shiftKey ? currentIndex - 1 : currentIndex + 1;
  const nextInput = inputs[nextIndex];

  if (!nextInput) {
    return;
  }

  event.preventDefault();
  nextInput.focus();
  nextInput.select();
}
