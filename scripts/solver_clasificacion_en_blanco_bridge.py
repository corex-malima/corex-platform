from __future__ import annotations

import json
import os
import sys
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd
import pulp


DASHBOARD_ROOT = Path(__file__).resolve().parent.parent
SOLVER_ROOT = Path(
    os.environ.get(
        "POSTHARVEST_SOLVER_ROOT",
        str(DASHBOARD_ROOT.parent / "solver_poscosecha"),
    )
).resolve()

if str(SOLVER_ROOT) not in sys.path:
    sys.path.insert(0, str(SOLVER_ROOT))

try:
    from solver_logic import DATE_COLUMNS, excel_round, load_workbook_defaults, solve_pipeline
except Exception as exc:  # pragma: no cover - runtime bridge
    raise RuntimeError(
        f"No se pudo importar el motor de solver desde {SOLVER_ROOT}: {exc}"
    ) from exc


RECIPE_OBJECTIVE_TOLERANCE = 1e-6


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
    defaults = load_workbook_defaults()
    availability_template = defaults.availability[["grado", "peso_tallo_seed"]].copy()

    return {
        "settings": {
            "desperdicio": float(defaults.settings.get("desperdicio", 0.13)),
        },
        "availability_template": [
            {
                "grado": int(row["grado"]),
                "peso_tallo_seed": float(row["peso_tallo_seed"]),
            }
            for _, row in availability_template.iterrows()
        ],
        "workbook_path": str(defaults.workbook_path),
        "master_path": str(defaults.master_path),
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
    tallos_minimos = tallos_min * bunches
    tallos_maximos = tallos_max * bunches

    if tallos_totales < tallos_minimos or tallos_totales > tallos_maximos:
        raise RuntimeError(
            "Los tallos resueltos del SKU no caben dentro del rango min/max por bunch."
        )

    candidates = generate_recipe_candidates(
        grade_values,
        tallos_min,
        tallos_max,
        peso_ideal_bunch,
        peso_min_objetivo,
        peso_max_objetivo,
    )

    if not candidates:
        raise RuntimeError("No se encontraron combinaciones posibles para construir la receta.")

    problem = pulp.LpProblem("postharvest_recipe", pulp.LpMinimize)
    recipe_vars = {
        index: pulp.LpVariable(f"recipe_{index}", lowBound=0, cat="Integer")
        for index in range(len(candidates))
    }
    use_vars = {
        index: pulp.LpVariable(f"use_{index}", lowBound=0, upBound=1, cat="Binary")
        for index in range(len(candidates))
    }

    problem += (
        pulp.lpSum(recipe_vars[index] for index in recipe_vars) == bunches
    ), "recipe_total_bunches"

    for grade_position, grade_data in enumerate(grade_values):
        problem += (
            pulp.lpSum(
                candidates[index]["counts"][grade_position] * recipe_vars[index]
                for index in recipe_vars
            )
            == int(grade_data["tallosNetos"])
        ), f"recipe_grade_{grade_data['grado']}"

    for index in recipe_vars:
        problem += (
            recipe_vars[index] <= bunches * use_vars[index]
        ), f"recipe_use_link_{index}"

    range_penalty_expr = pulp.lpSum(
        float(candidates[index]["range_penalty"]) * recipe_vars[index]
        for index in recipe_vars
    )
    distinct_expr = pulp.lpSum(use_vars[index] for index in use_vars)
    deviation_expr = pulp.lpSum(
        float(candidates[index]["deviation_abs"]) * recipe_vars[index]
        for index in recipe_vars
    )

    solver = pulp.PULP_CBC_CMD(msg=False, timeLimit=30)
    problem.setObjective(range_penalty_expr)
    status_range = problem.solve(solver)
    if pulp.LpStatus[status_range] not in {"Optimal", "Feasible"}:
        raise RuntimeError("No se pudo encontrar una receta factible para el SKU seleccionado.")

    range_penalty_opt = float(pulp.value(range_penalty_expr) or 0.0)
    problem += (
        range_penalty_expr <= range_penalty_opt + RECIPE_OBJECTIVE_TOLERANCE
    ), "recipe_fix_range_penalty"

    problem.setObjective(distinct_expr)
    status_distinct = problem.solve(solver)
    if pulp.LpStatus[status_distinct] not in {"Optimal", "Feasible"}:
        raise RuntimeError("No se pudo estabilizar la receta del SKU con pocas combinaciones.")
    distinct_opt = float(pulp.value(distinct_expr) or 0.0)
    problem += (
        distinct_expr <= distinct_opt + RECIPE_OBJECTIVE_TOLERANCE
    ), "recipe_fix_distinct"

    problem.setObjective(deviation_expr)
    status_deviation = problem.solve(solver)
    if pulp.LpStatus[status_deviation] not in {"Optimal", "Feasible"}:
        raise RuntimeError("No se pudo cerrar la receta final del SKU seleccionado.")

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

        candidate = candidates[index]
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
        pulp.LpStatus[status_range],
        pulp.LpStatus[status_distinct],
        pulp.LpStatus[status_deviation],
    }

    return {
        "summary": {
            "sku": sku,
            "bunchesObjetivo": bunches,
            "bunchesResueltos": bunches_resueltos,
            "recetasUsadas": len(final_rows),
            "tallosTotales": tallos_totales,
            "pesoIdealBunch": peso_ideal_bunch,
            "pesoPromedioReal": peso_promedio_real,
            "penalidadRango": range_penalty_opt,
            "desvioAbsolutoTotal": float(pulp.value(deviation_expr) or 0.0),
            "status": "Optimal"
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
