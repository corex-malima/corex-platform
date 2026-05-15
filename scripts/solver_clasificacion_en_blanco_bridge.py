from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd
import pulp


DASHBOARD_ROOT = Path(__file__).resolve().parent.parent

ENGINE_ROOT = Path(__file__).resolve().parent

if str(ENGINE_ROOT) not in sys.path:
    sys.path.insert(0, str(ENGINE_ROOT))

try:
    from postharvest_solver_engine import (
        DATE_COLUMNS,
        excel_round,
        solve_pipeline,
        stem_overrun_flex_per_bunch,
        stem_shortfall_flex_per_bunch,
    )
except Exception as exc:  # pragma: no cover - runtime bridge
    raise RuntimeError(
        f"No se pudo importar el motor local del solver desde {ENGINE_ROOT}: {exc}"
    ) from exc


RECIPE_OBJECTIVE_TOLERANCE = 1e-6
RECIPE_INTEGRAL_TOLERANCE = 1e-5
DEFAULT_AVAILABILITY_TEMPLATE = [
    {"grado": 15, "peso_tallo_seed": 15.0},
    {"grado": 20, "peso_tallo_seed": 20.0},
    {"grado": 25, "peso_tallo_seed": 28.62},
    {"grado": 30, "peso_tallo_seed": 31.15},
    {"grado": 35, "peso_tallo_seed": 35.27},
    {"grado": 40, "peso_tallo_seed": 40.25},
    {"grado": 45, "peso_tallo_seed": 46.91},
    {"grado": 50, "peso_tallo_seed": 51.21},
    {"grado": 55, "peso_tallo_seed": 56.89},
    {"grado": 60, "peso_tallo_seed": 63.08},
    {"grado": 65, "peso_tallo_seed": 65.65},
    {"grado": 70, "peso_tallo_seed": 71.36},
    {"grado": 75, "peso_tallo_seed": 77.38},
]


def read_payload() -> dict[str, Any]:
    raw = sys.stdin.read().strip()
    if not raw:
        return {}
    return json.loads(raw)


def clean_value(value: Any) -> Any:
    if pd.isna(value):
        return None
    if isinstance(value, (np.integer, int)):
        return int(value)
    if isinstance(value, (np.floating, float)):
        return float(value)
    if isinstance(value, (np.bool_, bool)):
        return bool(value)
    if isinstance(value, Path):
        return str(value)
    return value


def dataframe_records(df: pd.DataFrame) -> list[dict[str, Any]]:
    records: list[dict[str, Any]] = []
    for _, row in df.iterrows():
        record: dict[str, Any] = {}
        for column in df.columns:
            record[str(column)] = clean_value(row[column])
        records.append(record)
    return records


def build_defaults_payload() -> dict[str, Any]:
    return {
        "settings": {
            "desperdicio": 0.13,
        },
        "availability_template": DEFAULT_AVAILABILITY_TEMPLATE,
        "workbook_path": None,
        "master_path": None,
    }


def build_priority_rows(summary: dict[str, Any]) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for position, date_key in enumerate(DATE_COLUMNS, start=1):
        rows.append(
            {
                "prioridad": position,
                "fecha": f"Fecha {position}",
                "pedido": float(summary.get(f"pedido_{date_key}", 0.0)),
                "resuelto": float(summary.get(f"resuelto_{date_key}", 0.0)),
                "noRealizado": float(summary.get(f"no_realizado_{date_key}", 0.0)),
                "cumplimiento": float(summary.get(f"cumplimiento_{date_key}", 1.0)),
            }
        )
    return rows


def build_order_rows(df: pd.DataFrame) -> list[dict[str, Any]]:
    selected = df[
        [
            "sku",
            "estado_peso",
            "pedido_total",
            "pedido_resuelto",
            "ajuste_bunches",
            "cumplimiento_bunches",
            "peso_ideal_bunch",
            "peso_ideal_pedido",
            "peso_ideal_resuelto",
            "peso_real_total",
            "peso_real_bunch",
            "tallos_min",
            "tallos_max",
            "tallos_promedio_ramo",
            "peso_min_objetivo",
            "peso_max_objetivo",
            "sobrepeso_pct",
            "sobrepeso_bunch",
            "sobrepeso_total",
            "tallos_asignados_netos",
            "tallos_asignados_brutos",
            "mallas_totales",
            "grados_usados",
            "exceso_grados_objetivo",
        ]
    ].copy()

    renamed = selected.rename(
        columns={
            "estado_peso": "estadoPeso",
            "pedido_total": "pedidoTotal",
            "pedido_resuelto": "pedidoResuelto",
            "ajuste_bunches": "ajusteBunches",
            "cumplimiento_bunches": "cumplimientoBunches",
            "peso_ideal_bunch": "pesoIdealBunch",
            "peso_ideal_pedido": "pesoIdealPedido",
            "peso_ideal_resuelto": "pesoIdealResuelto",
            "peso_real_total": "pesoRealTotal",
            "peso_real_bunch": "pesoRealBunch",
            "tallos_min": "tallosMin",
            "tallos_max": "tallosMax",
            "tallos_promedio_ramo": "tallosPromedioRamo",
            "peso_min_objetivo": "pesoMinObjetivo",
            "peso_max_objetivo": "pesoMaxObjetivo",
            "sobrepeso_pct": "sobrepesoPct",
            "sobrepeso_bunch": "sobrepesoBunch",
            "sobrepeso_total": "sobrepesoTotal",
            "tallos_asignados_netos": "tallosAsignadosNetos",
            "tallos_asignados_brutos": "tallosAsignadosBrutos",
            "mallas_totales": "mallasTotales",
            "grados_usados": "gradosUsados",
            "exceso_grados_objetivo": "excesoGradosObjetivo",
        }
    )

    return dataframe_records(renamed)


def build_availability_rows(df: pd.DataFrame) -> list[dict[str, Any]]:
    selected = df[
        [
            "grado",
            "peso_tallo_seed",
            "tallos_brutos",
            "tallos_netos",
            "tallos_usados_netos",
            "tallos_restantes_netos",
            "peso_total_gestionable",
            "peso_usado",
            "peso_restante",
            "mallas_usadas",
        ]
    ].copy()

    renamed = selected.rename(
        columns={
            "peso_tallo_seed": "pesoTalloSeed",
            "tallos_brutos": "tallosBrutos",
            "tallos_netos": "tallosNetos",
            "tallos_usados_netos": "tallosUsadosNetos",
            "tallos_restantes_netos": "tallosRestantesNetos",
            "peso_total_gestionable": "pesoTotalGestionable",
            "peso_usado": "pesoUsado",
            "peso_restante": "pesoRestante",
            "mallas_usadas": "mallasUsadas",
        }
    )

    return dataframe_records(renamed)


def build_matrix_payload(matrix_df: pd.DataFrame) -> dict[str, Any]:
    grade_labels = [int(label) for label in matrix_df.columns.tolist()]
    rows: list[dict[str, Any]] = []

    for sku, series in matrix_df.iterrows():
        values = {
            str(column): int(excel_round(float(series[column]), 0))
            for column in matrix_df.columns
        }
        rows.append(
            {
                "sku": str(sku),
                "values": values,
                "total": int(sum(values.values())),
            }
        )

    totals = {
        str(column): int(
            excel_round(
                float(pd.to_numeric(matrix_df[column], errors="coerce").fillna(0).sum()),
                0,
            )
        )
        for column in matrix_df.columns
    }

    return {
        "gradeLabels": grade_labels,
        "rows": rows,
        "totals": totals,
        "grandTotal": int(sum(totals.values())),
    }


def recipe_status(weight: float, weight_min: float, weight_max: float) -> str:
    if weight < weight_min - 1e-6:
        return "Debajo de objetivo"
    if weight > weight_max + 1e-6:
        return "Sobre objetivo"
    return "Dentro de objetivo"


def recipe_solve_status(
    problem: pulp.LpProblem,
    status_code: int,
    integer_vars: list[pulp.LpVariable],
) -> str:
    status = pulp.LpStatus.get(status_code, str(status_code))
    if status in {"Optimal", "Feasible"}:
        return status
    if status == "Not Solved":
        values = [pulp.value(variable) for variable in integer_vars]
        if values and all(
            value is not None and abs(float(value) - round(float(value))) <= RECIPE_INTEGRAL_TOLERANCE
            for value in values
        ) and pulp.value(problem.objective) is not None:
            return status
    raise RuntimeError(status)


def generate_recipe_candidates(
    grade_values: list[dict[str, float]],
    tallos_min: int,
    tallos_max: int,
    peso_ideal_bunch: float,
    peso_min_objetivo: float,
    peso_max_objetivo: float,
) -> list[dict[str, Any]]:
    if not grade_values:
        return []

    candidates: list[dict[str, Any]] = []
    total_grades = len(grade_values)

    def build_counts(remaining: int, position: int, current: list[int]) -> None:
        if position == total_grades - 1:
            final_counts = [*current, remaining]
            stems_total = int(sum(final_counts))
            weight_total = float(
                sum(
                    final_counts[index] * float(grade_values[index]["pesoTalloSeed"])
                    for index in range(total_grades)
                )
            )
            low_slack = max(float(peso_min_objetivo) - weight_total, 0.0)
            high_slack = max(weight_total - float(peso_max_objetivo), 0.0)
            candidates.append(
                {
                    "counts": final_counts,
                    "tallos_por_bunch": stems_total,
                    "peso_por_bunch": weight_total,
                    "low_slack": low_slack,
                    "high_slack": high_slack,
                    "range_penalty": low_slack + high_slack,
                    "deviation_abs": abs(weight_total - float(peso_ideal_bunch)),
                }
            )
            return

        for count in range(remaining + 1):
            build_counts(remaining - count, position + 1, [*current, count])

    for stems_total in range(tallos_min, tallos_max + 1):
        build_counts(stems_total, 0, [])

    return candidates


def build_greedy_recipe_fallback(
    sku: str,
    bunches: int,
    peso_ideal_bunch: float,
    peso_min_objetivo: float,
    peso_max_objetivo: float,
    grade_values: list[dict[str, float]],
    candidates: list[dict[str, Any]],
) -> dict[str, Any]:
    remaining = [int(item["tallosNetos"]) for item in grade_values]
    remaining_weight = float(
        sum(int(item["tallosNetos"]) * float(item["pesoTalloSeed"]) for item in grade_values)
    )
    chosen: list[dict[str, Any]] = []
    current_max_deviation = 0.0

    for bunch_index in range(bunches):
        remaining_bunches = max(bunches - bunch_index, 1)
        target_weight = remaining_weight / remaining_bunches if remaining_bunches > 0 else peso_ideal_bunch
        feasible_indexes: list[int] = []
        for index, candidate in enumerate(candidates):
            counts = candidate["counts"]
            if all(int(counts[pos]) <= remaining[pos] for pos in range(len(remaining))):
                feasible_indexes.append(index)

        if not feasible_indexes:
            break

        best_index = min(
            feasible_indexes,
            key=lambda index: (
                max(current_max_deviation, float(candidates[index]["deviation_abs"])),
                abs(float(candidates[index]["peso_por_bunch"]) - target_weight),
                max(float(candidates[index]["peso_por_bunch"]) - max(target_weight, peso_max_objetivo), 0.0),
                float(candidates[index]["range_penalty"]),
                abs(float(candidates[index]["peso_por_bunch"]) - peso_ideal_bunch),
                -int(candidates[index]["tallos_por_bunch"]),
            ),
        )
        candidate = candidates[best_index]
        chosen.append(candidate)
        current_max_deviation = max(current_max_deviation, float(candidate["deviation_abs"]))
        for pos in range(len(remaining)):
            remaining[pos] -= int(candidate["counts"][pos])
        remaining_weight -= float(candidate["peso_por_bunch"])

    grouped: dict[tuple[int, ...], dict[str, Any]] = {}
    grade_totals = {
        int(grade_data["grado"]): {
            "grado": int(grade_data["grado"]),
            "tallosObjetivo": int(grade_data["tallosNetos"]),
            "tallosAsignados": 0,
            "pesoTalloSeed": float(grade_data["pesoTalloSeed"]),
            "pesoTotal": 0.0,
        }
        for grade_data in grade_values
    }

    for candidate in chosen:
        key = tuple(int(value) for value in candidate["counts"])
        bucket = grouped.setdefault(
            key,
            {
                "candidate": candidate,
                "cantidad": 0,
            },
        )
        bucket["cantidad"] += 1

    final_rows: list[dict[str, Any]] = []
    for index, (_, bucket) in enumerate(
        sorted(grouped.items(), key=lambda item: (-int(item[1]["cantidad"]), float(item[1]["candidate"]["deviation_abs"])))
    ):
        candidate = bucket["candidate"]
        quantity = int(bucket["cantidad"])
        composition = []
        for grade_position, grade_data in enumerate(grade_values):
            stems = int(candidate["counts"][grade_position])
            if stems <= 0:
                continue
            peso_tallo = float(grade_data["pesoTalloSeed"])
            composition.append(
                {
                    "grado": int(grade_data["grado"]),
                    "tallos": stems,
                    "pesoTalloSeed": peso_tallo,
                    "pesoTotal": float(stems * peso_tallo),
                }
            )
            grade_totals[int(grade_data["grado"])]["tallosAsignados"] += stems * quantity
            grade_totals[int(grade_data["grado"])]["pesoTotal"] += stems * quantity * peso_tallo

        final_rows.append(
            {
                "recetaId": f"heuristica-{index + 1}",
                "cantidad": quantity,
                "tallosPorBunch": int(candidate["tallos_por_bunch"]),
                "pesoPorBunch": float(candidate["peso_por_bunch"]),
                "difIdeal": float(candidate["peso_por_bunch"] - peso_ideal_bunch),
                "estadoPeso": recipe_status(
                    float(candidate["peso_por_bunch"]),
                    peso_min_objetivo,
                    peso_max_objetivo,
                ),
                "composicion": composition,
            }
        )

    bunches_resueltos = int(sum(int(row["cantidad"]) for row in final_rows))
    tallos_sin_receta = int(sum(max(value, 0) for value in remaining))
    peso_promedio_real = (
        float(
            sum(float(row["pesoPorBunch"]) * int(row["cantidad"]) for row in final_rows) / bunches_resueltos
        )
        if bunches_resueltos > 0
        else 0.0
    )

    return {
        "summary": {
            "sku": sku,
            "bunchesObjetivo": bunches,
            "bunchesResueltos": bunches_resueltos,
            "recetasUsadas": len(final_rows),
            "tallosTotales": int(sum(int(item["tallosNetos"]) for item in grade_values)),
            "tallosSinReceta": tallos_sin_receta,
            "pesoIdealBunch": peso_ideal_bunch,
            "pesoPromedioReal": peso_promedio_real,
            "penalidadRango": float(
                sum(float(row["cantidad"]) * max(abs(float(row["difIdeal"])), 0.0) for row in final_rows)
            ),
            "desvioAbsolutoTotal": float(
                sum(abs(float(row["difIdeal"])) * int(row["cantidad"]) for row in final_rows)
            ),
            "status": "Heuristica parcial" if bunches_resueltos < bunches or tallos_sin_receta > 0 else "Heuristica",
        },
        "rows": final_rows,
        "gradeTotals": list(grade_totals.values()),
    }


def build_recipe_result(payload: dict[str, Any]) -> dict[str, Any]:
    sku = str(payload.get("sku", "")).strip()
    bunches = int(excel_round(payload.get("pedidoResuelto", 0), 0))
    peso_ideal_bunch = float(payload.get("pesoIdealBunch", 0.0) or 0.0)
    peso_min_objetivo = float(payload.get("pesoMinObjetivo", 0.0) or 0.0)
    peso_max_objetivo = float(payload.get("pesoMaxObjetivo", 0.0) or 0.0)
    tallos_min = int(excel_round(payload.get("tallosMin", 0), 0))
    tallos_max = int(excel_round(payload.get("tallosMax", 0), 0))

    if not sku:
        raise RuntimeError("Debes indicar el SKU para construir la receta.")
    if bunches <= 0:
        raise RuntimeError("El SKU seleccionado no tiene bunches resueltos.")
    if tallos_min <= 0 or tallos_max <= 0 or tallos_max < tallos_min:
        raise RuntimeError("El rango de tallos del SKU es invalido para construir la receta.")

    grade_values = sorted(
        [
            {
                "grado": int(excel_round(item.get("grado", 0), 0)),
                "tallosNetos": int(excel_round(item.get("tallosNetos", 0), 0)),
                "pesoTalloSeed": float(item.get("pesoTalloSeed", 0.0) or 0.0),
            }
            for item in payload.get("grados", [])
            if int(excel_round(item.get("tallosNetos", 0), 0)) > 0
        ],
        key=lambda row: row["grado"],
    )

    if not grade_values:
        raise RuntimeError("No hay tallos netos por grado para construir la receta del SKU.")

    tallos_totales = int(sum(int(item["tallosNetos"]) for item in grade_values))
    effective_tallos_min = max(int(tallos_min - stem_shortfall_flex_per_bunch(sku)), 1)
    effective_tallos_max = max(int(tallos_max + stem_overrun_flex_per_bunch(sku)), effective_tallos_min)
    tallos_minimos = effective_tallos_min * bunches
    tallos_maximos = effective_tallos_max * bunches

    if tallos_totales < tallos_minimos or tallos_totales > tallos_maximos:
        raise RuntimeError(
            "Los tallos resueltos del SKU no caben dentro del rango min/max por bunch."
        )

    candidates = generate_recipe_candidates(
        grade_values,
        effective_tallos_min,
        effective_tallos_max,
        peso_ideal_bunch,
        peso_min_objetivo,
        peso_max_objetivo,
    )

    if not candidates:
        raise RuntimeError("No se encontraron combinaciones posibles para construir la receta.")

    valid_candidates = [
        candidate
        for candidate in candidates
        if float(candidate["range_penalty"]) <= RECIPE_OBJECTIVE_TOLERANCE
    ]

    if not valid_candidates:
        raise RuntimeError(
            "No existe una receta valida dentro del rango objetivo para el SKU seleccionado."
        )

    problem = pulp.LpProblem("postharvest_recipe", pulp.LpMinimize)
    recipe_vars = {
        index: pulp.LpVariable(f"recipe_{index}", lowBound=0, cat="Integer")
        for index in range(len(valid_candidates))
    }
    use_vars = {
        index: pulp.LpVariable(f"use_{index}", lowBound=0, upBound=1, cat="Binary")
        for index in range(len(valid_candidates))
    }
    max_deviation_var = pulp.LpVariable("max_recipe_deviation", lowBound=0)

    problem += (
        pulp.lpSum(recipe_vars[index] for index in recipe_vars) == bunches
    ), "recipe_total_bunches"

    unassigned_vars = {
        grade_position: pulp.LpVariable(f"unassigned_{grade_position}", lowBound=0)
        for grade_position in range(len(grade_values))
    }

    for grade_position, grade_data in enumerate(grade_values):
        assigned_expr = pulp.lpSum(
            valid_candidates[index]["counts"][grade_position] * recipe_vars[index]
            for index in recipe_vars
        )
        problem += (
            assigned_expr + unassigned_vars[grade_position] == int(grade_data["tallosNetos"])
        ), f"recipe_grade_{grade_data['grado']}"

    for index in recipe_vars:
        problem += (
            recipe_vars[index] <= bunches * use_vars[index]
        ), f"recipe_use_link_{index}"
        problem += (
            max_deviation_var
            >= float(valid_candidates[index]["deviation_abs"]) - float(valid_candidates[index]["deviation_abs"]) * (1 - use_vars[index])
        ), f"recipe_max_deviation_{index}"

    range_penalty_expr = pulp.lpSum(
        float(valid_candidates[index]["range_penalty"]) * recipe_vars[index]
        for index in recipe_vars
    )
    deviation_expr = pulp.lpSum(
        float(valid_candidates[index]["deviation_abs"]) * recipe_vars[index]
        for index in recipe_vars
    )
    distinct_expr = pulp.lpSum(use_vars[index] for index in use_vars)
    unassigned_expr = pulp.lpSum(unassigned_vars[grade_position] for grade_position in unassigned_vars)

    solver = pulp.PULP_CBC_CMD(msg=False, timeLimit=90)
    problem.setObjective(unassigned_expr)
    status_unassigned = problem.solve(solver)
    try:
        recipe_solve_status(problem, status_unassigned, list(recipe_vars.values()) + list(use_vars.values()))
    except RuntimeError as exc:
        return build_greedy_recipe_fallback(
            sku=sku,
            bunches=bunches,
            peso_ideal_bunch=peso_ideal_bunch,
            peso_min_objetivo=peso_min_objetivo,
            peso_max_objetivo=peso_max_objetivo,
            grade_values=grade_values,
            candidates=valid_candidates,
        )

    unassigned_opt = float(pulp.value(unassigned_expr) or 0.0)
    problem += (
        unassigned_expr <= unassigned_opt + RECIPE_OBJECTIVE_TOLERANCE
    ), "recipe_fix_unassigned"

    problem.setObjective(range_penalty_expr)
    status_range = problem.solve(solver)
    try:
        recipe_solve_status(problem, status_range, list(recipe_vars.values()) + list(use_vars.values()))
    except RuntimeError as exc:
        raise RuntimeError("No se pudo estabilizar el rango objetivo de la receta.") from exc

    range_penalty_opt = float(pulp.value(range_penalty_expr) or 0.0)
    problem += (
        range_penalty_expr <= range_penalty_opt + RECIPE_OBJECTIVE_TOLERANCE
    ), "recipe_fix_range_penalty"

    problem.setObjective(max_deviation_var)
    status_max_deviation = problem.solve(solver)
    try:
        recipe_solve_status(problem, status_max_deviation, list(recipe_vars.values()) + list(use_vars.values()))
    except RuntimeError as exc:
        raise RuntimeError("No se pudo balancear la peor receta del SKU seleccionado.") from exc

    max_deviation_opt = float(pulp.value(max_deviation_var) or 0.0)
    problem += (
        max_deviation_var <= max_deviation_opt + RECIPE_OBJECTIVE_TOLERANCE
    ), "recipe_fix_max_deviation"

    problem.setObjective(deviation_expr)
    status_deviation = problem.solve(solver)
    try:
        recipe_solve_status(problem, status_deviation, list(recipe_vars.values()) + list(use_vars.values()))
    except RuntimeError as exc:
        raise RuntimeError("No se pudo cerrar la receta final del SKU seleccionado.") from exc

    deviation_opt = float(pulp.value(deviation_expr) or 0.0)
    problem += (
        deviation_expr <= deviation_opt + RECIPE_OBJECTIVE_TOLERANCE
    ), "recipe_fix_deviation"

    problem.setObjective(distinct_expr)
    status_distinct = problem.solve(solver)
    try:
        recipe_solve_status(problem, status_distinct, list(recipe_vars.values()) + list(use_vars.values()))
    except RuntimeError as exc:
        raise RuntimeError("No se pudo estabilizar la receta del SKU con pocas combinaciones.") from exc
    distinct_opt = float(pulp.value(distinct_expr) or 0.0)
    problem += (
        distinct_expr <= distinct_opt + RECIPE_OBJECTIVE_TOLERANCE
    ), "recipe_fix_distinct"

    final_rows: list[dict[str, Any]] = []
    grade_totals = {
        int(grade_data["grado"]): {
            "grado": int(grade_data["grado"]),
            "tallosObjetivo": int(grade_data["tallosNetos"]),
            "tallosAsignados": 0,
            "pesoTalloSeed": float(grade_data["pesoTalloSeed"]),
            "pesoTotal": 0.0,
        }
        for grade_data in grade_values
    }

    for index, variable in recipe_vars.items():
        quantity = int(excel_round(pulp.value(variable) or 0.0, 0))
        if quantity <= 0:
            continue

        candidate = valid_candidates[index]
        composition = []
        for grade_position, grade_data in enumerate(grade_values):
            stems = int(candidate["counts"][grade_position])
            if stems <= 0:
                continue

            peso_tallo = float(grade_data["pesoTalloSeed"])
            composition.append(
                {
                    "grado": int(grade_data["grado"]),
                    "tallos": stems,
                    "pesoTalloSeed": peso_tallo,
                    "pesoTotal": float(stems * peso_tallo),
                }
            )
            grade_totals[int(grade_data["grado"])]["tallosAsignados"] += stems * quantity
            grade_totals[int(grade_data["grado"])]["pesoTotal"] += stems * quantity * peso_tallo

        final_rows.append(
            {
                "recetaId": f"receta-{index + 1}",
                "cantidad": quantity,
                "tallosPorBunch": int(candidate["tallos_por_bunch"]),
                "pesoPorBunch": float(candidate["peso_por_bunch"]),
                "difIdeal": float(candidate["peso_por_bunch"] - peso_ideal_bunch),
                "estadoPeso": recipe_status(
                    float(candidate["peso_por_bunch"]),
                    peso_min_objetivo,
                    peso_max_objetivo,
                ),
                "composicion": composition,
            }
        )

    final_rows.sort(
        key=lambda row: (-int(row["cantidad"]), float(row["difIdeal"]), row["recetaId"])
    )

    if any(row["estadoPeso"] != "Dentro de objetivo" for row in final_rows):
        raise RuntimeError(
            "La receta resultante contiene combinaciones fuera del rango objetivo."
        )

    bunches_resueltos = int(sum(int(row["cantidad"]) for row in final_rows))
    peso_promedio_real = (
        float(
            sum(float(row["pesoPorBunch"]) * int(row["cantidad"]) for row in final_rows)
            / bunches_resueltos
        )
        if bunches_resueltos > 0
        else 0.0
    )
    final_statuses = {
        pulp.LpStatus[status_unassigned],
        pulp.LpStatus[status_range],
        pulp.LpStatus[status_max_deviation],
        pulp.LpStatus[status_deviation],
        pulp.LpStatus[status_distinct],
    }
    unassigned_total = float(pulp.value(unassigned_expr) or 0.0)

    return {
        "summary": {
            "sku": sku,
            "bunchesObjetivo": bunches,
            "bunchesResueltos": bunches_resueltos,
            "recetasUsadas": len(final_rows),
            "tallosTotales": tallos_totales,
            "tallosSinReceta": int(excel_round(unassigned_total, 0)),
            "pesoIdealBunch": peso_ideal_bunch,
            "pesoPromedioReal": peso_promedio_real,
            "penalidadRango": range_penalty_opt,
            "desvioAbsolutoTotal": float(pulp.value(deviation_expr) or 0.0),
            "status": "Parcial"
            if unassigned_total > RECIPE_OBJECTIVE_TOLERANCE
            else "Optimal"
            if final_statuses == {"Optimal"}
            else "Feasible con ajustes",
        },
        "rows": final_rows,
        "gradeTotals": list(grade_totals.values()),
    }


def build_result_payload(payload: dict[str, Any]) -> dict[str, Any]:
    result = solve_pipeline(
        orders_df=pd.DataFrame(payload.get("orders", [])),
        availability_df=pd.DataFrame(payload.get("availability", [])),
        settings=payload.get("settings", {}),
        master_df=pd.DataFrame(payload.get("master", [])),
    )

    return {
        "stage1Summary": {
            key: float(value) if isinstance(value, (int, float, np.integer, np.floating)) else clean_value(value)
            for key, value in dict(result.stage1.summary).items()
        },
        "stage2Summary": {
            key: float(value) if isinstance(value, (int, float, np.integer, np.floating)) else clean_value(value)
            for key, value in dict(result.stage2.summary).items()
        },
        "solverMeta": {
            key: float(value) if isinstance(value, (int, float, np.integer, np.floating)) else clean_value(value)
            for key, value in dict(result.stage2.solver_meta).items()
        },
        "priorityRows": build_priority_rows(dict(result.stage1.summary)),
        "orderRows": build_order_rows(result.stage2.orders),
        "availabilityRows": build_availability_rows(result.stage2.availability),
        "matrix": build_matrix_payload(result.stage2.mallas_display),
        "netStemMatrix": build_matrix_payload(result.stage2.net_tallos),
    }


def main() -> int:
    if len(sys.argv) < 2:
        raise RuntimeError("Debes indicar el comando del puente: defaults, solve o recipe.")

    command = sys.argv[1].strip().lower()

    if command == "defaults":
        payload = build_defaults_payload()
    elif command == "solve":
        payload = build_result_payload(read_payload())
    elif command == "recipe":
        payload = build_recipe_result(read_payload())
    else:
        raise RuntimeError(f"Comando no soportado: {command}")

    json.dump(payload, sys.stdout, ensure_ascii=True)
    sys.stdout.flush()
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:  # pragma: no cover - runtime bridge
        print(str(exc), file=sys.stderr)
        raise SystemExit(1)
