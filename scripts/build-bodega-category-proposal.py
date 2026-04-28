from __future__ import annotations

from pathlib import Path
import re

import pandas as pd
import psycopg


SOURCE_PATH = Path(r"\\10.0.2.15\14_produccion\Vigentes\Produccion General\Datos\PRESUPUESTOS\D-PR-000 (000-000 Presupuesto_MH_SJ)Rev.1.xlsx")
OUTPUT_PATH = Path(r"C:\Users\paul.loja\PYPROYECTOS\dashboard_v2\docs\bodega\propuesta-categorizacion-productos-base.xlsx")
FALLBACK_OUTPUT_PATH = Path(r"C:\Users\paul.loja\PYPROYECTOS\dashboard_v2\docs\bodega\propuesta-categorizacion-productos-base-actualizado.xlsx")
ENV_PATH = Path(r"C:\Users\paul.loja\PYPROYECTOS\dashboard_v2\.env.local")


def load_env(file_path: Path) -> dict[str, str]:
    result: dict[str, str] = {}
    for line in file_path.read_text(encoding="utf-8").splitlines():
        trimmed = line.strip()
        if not trimmed or trimmed.startswith("#") or "=" not in trimmed:
            continue
        key, value = trimmed.split("=", 1)
        result[key.strip()] = value.strip()
    return result


def clean(value: object) -> str:
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return ""
    return re.sub(r"\s+", " ", str(value)).strip()


def code_prefix(code: str) -> str:
    match = re.match(r"^([A-Z]+)", code)
    return match.group(1) if match else ""


def classify_product(row: dict[str, str]) -> dict[str, str]:
    code = row["codigo"]
    desc = row["descripcion"].upper()
    active_ingredient = row["ingrd_activo"].upper()
    prefix = code_prefix(code)

    result = {
        "tipo_propuesto": "Herramientas y mantenimiento",
        "familia_propuesta": "Herramientas manuales",
        "subfamilia_propuesta": "Implementos y repuestos",
        "confianza": "media",
        "criterio_asignacion": f"fallback por prefijo {prefix or 'sin_prefijo'}",
    }

    if any(term in desc for term in ["CAPUCHON", "CAP.M", "CAPUCHÓN"]):
        result.update(
            {
                "tipo_propuesto": "Empaque",
                "familia_propuesta": "Capuchones",
                "subfamilia_propuesta": "Capuchon microperforado" if any(term in desc for term in ["MICRO", "PERFOR"]) else "Capuchon monoorientado",
                "confianza": "alta",
                "criterio_asignacion": "keyword capuchon",
            }
        )
        return result

    if "ETIQUETA" in desc:
        result.update(
            {
                "tipo_propuesto": "Empaque",
                "familia_propuesta": "Etiquetas",
                "subfamilia_propuesta": "Etiqueta termica" if "TERM" in desc else "Etiqueta adhesiva",
                "confianza": "alta",
                "criterio_asignacion": "keyword etiqueta",
            }
        )
        return result

    if prefix == "PF":
        result.update(
            {
                "tipo_propuesto": "Agroquimicos",
                "familia_propuesta": "Fungicidas",
                "subfamilia_propuesta": "Fungicidas de proteccion y sistemicos",
                "confianza": "alta",
                "criterio_asignacion": "prefijo PF",
            }
        )
        return result

    if prefix == "PI":
        result.update(
            {
                "tipo_propuesto": "Agroquimicos",
                "familia_propuesta": "Insecticidas y acaricidas",
                "subfamilia_propuesta": "Insecticidas y acaricidas de control",
                "confianza": "alta",
                "criterio_asignacion": "prefijo PI",
            }
        )
        return result

    if prefix in {"PH", "PJ", "PN"}:
        result.update(
            {
                "tipo_propuesto": "Agroquimicos",
                "familia_propuesta": "Reguladores y coadyuvantes",
                "subfamilia_propuesta": "Reguladores, herbicidas y otros agroquimicos",
                "confianza": "media",
                "criterio_asignacion": f"prefijo {prefix}",
            }
        )
        return result

    if prefix in {"FA", "FI"}:
        result.update(
            {
                "tipo_propuesto": "Materia prima",
                "familia_propuesta": "Fertilizantes solubles",
                "subfamilia_propuesta": "Sales y correctores",
                "confianza": "alta",
                "criterio_asignacion": f"prefijo {prefix}",
            }
        )
        return result

    if prefix in {"FB", "FS"}:
        result.update(
            {
                "tipo_propuesto": "Materia prima",
                "familia_propuesta": "Bioinsumos",
                "subfamilia_propuesta": "Bioestimulantes y biologicos",
                "confianza": "media",
                "criterio_asignacion": f"prefijo {prefix}",
            }
        )
        return result

    if any(term in desc for term in ["ACIDO", "ÁCIDO", "ACID", "BUFFER"]) or "ACID" in active_ingredient:
        result.update(
            {
                "tipo_propuesto": "Materia prima",
                "familia_propuesta": "Acidificantes",
                "subfamilia_propuesta": "Acondicionadores de solucion",
                "confianza": "media",
                "criterio_asignacion": "keyword acido",
            }
        )
        return result

    if prefix == "TNT" or "TINTE" in desc:
        result.update(
            {
                "tipo_propuesto": "Materia prima",
                "familia_propuesta": "Colorantes y acabados",
                "subfamilia_propuesta": "Tintes base agua",
                "confianza": "alta" if prefix == "TNT" else "media",
                "criterio_asignacion": "prefijo TNT / keyword tinte",
            }
        )
        return result

    if prefix in {"EO", "LP", "CO"} or any(term in desc for term in ["CLORO", "JABON", "JABÓN", "DESINFECT", "TOALLAS", "CAFÉ", "CAFE", "TANG", "AXION"]):
        family = "Higiene institucional"
        subfamily = "Aseo y desinfeccion"
        confidence = "media"
        criteria = f"prefijo {prefix}" if prefix else "keyword limpieza"

        if any(term in desc for term in ["CAFÉ", "CAFE", "TANG", "TE ", "AGUAS AROMATICAS"]):
            family = "Consumo general"
            subfamily = "Cafeteria y bienestar"

        result.update(
            {
                "tipo_propuesto": "Limpieza y consumo",
                "familia_propuesta": family,
                "subfamilia_propuesta": subfamily,
                "confianza": confidence,
                "criterio_asignacion": criteria,
            }
        )
        return result

    if prefix in {"US"} or any(term in desc for term in ["GUANTE", "BOTA", "MASCAR", "ARNES", "GAFA", "CHAQUETA", "CASCO", "RESPIRADOR"]):
        subfamily = "Guantes y proteccion de manos"
        if any(term in desc for term in ["BOTA", "CHAQUETA"]):
            subfamily = "Botas y proteccion corporal"
        elif any(term in desc for term in ["MASCAR", "ARNES", "GAFA", "RESPIRADOR"]):
            subfamily = "Proteccion respiratoria y visual"

        result.update(
            {
                "tipo_propuesto": "Operacion y seguridad",
                "familia_propuesta": "EPP y dotacion",
                "subfamilia_propuesta": subfamily,
                "confianza": "alta" if prefix == "US" else "media",
                "criterio_asignacion": f"prefijo {prefix or 'keyword epp'}",
            }
        )
        return result

    if prefix in {"MR"} or any(term in desc for term in ["PVC", "UNION", "ADAPTADOR", "CODO", "TEE", "VALVULA", "VÁLVULA", "MANGUERA", "PEGABLE", "ROSCA"]):
        result.update(
            {
                "tipo_propuesto": "Herramientas y mantenimiento",
                "familia_propuesta": "Infraestructura",
                "subfamilia_propuesta": "Riego y conexiones",
                "confianza": "alta" if prefix == "MR" else "media",
                "criterio_asignacion": f"prefijo {prefix or 'keyword riego'}",
            }
        )
        return result

    if prefix in {"MA", "MM", "ME", "TT"}:
        result.update(
            {
                "tipo_propuesto": "Herramientas y mantenimiento",
                "familia_propuesta": "Herramientas manuales",
                "subfamilia_propuesta": "Implementos y repuestos",
                "confianza": "media",
                "criterio_asignacion": f"prefijo {prefix}",
            }
        )
        return result

    return result


def load_presupuesto() -> pd.DataFrame:
    df = pd.read_excel(SOURCE_PATH, sheet_name="Presupuesto", header=3, usecols="A:F")
    df = df.rename(
        columns={
            "CODIGO": "codigo",
            "INGRD_ACTIVO": "ingrd_activo",
            "DESCRIPCION": "descripcion",
            "UNIDAD": "unidad",
            "AREA": "area_fuente",
            "TIPO": "tipo_fuente",
        }
    )
    df = df[df["codigo"].notna()].copy()
    for column in df.columns:
        df[column] = df[column].map(clean)
    df["source_sheet"] = "Presupuesto"
    return df


def load_otros_productos() -> pd.DataFrame:
    df = pd.read_excel(SOURCE_PATH, sheet_name="Otros Productos", header=0)
    df.columns = ["codigo", "descripcion", "unidad"]
    df = df[(df["codigo"].notna()) & (df["codigo"].map(clean) != "CODIGO")].copy()
    for column in df.columns:
        df[column] = df[column].map(clean)
    df["ingrd_activo"] = ""
    df["area_fuente"] = ""
    df["tipo_fuente"] = ""
    df["source_sheet"] = "Otros Productos"
    return df[["source_sheet", "codigo", "descripcion", "unidad", "area_fuente", "tipo_fuente", "ingrd_activo"]]


def load_source_activities() -> pd.DataFrame:
    env = load_env(ENV_PATH)
    conn = psycopg.connect(
        host=env["DATABASE_HOST"],
        port=int(env["DATABASE_PORT"]),
        dbname=env.get("DATABASE_NAME", "datalakehouse"),
        user=env["DATABASE_USER"],
        password=env["DATABASE_PASSWORD"],
        sslmode="require" if env.get("DATABASE_SSL") == "true" else "prefer",
    )

    try:
        query = """
            select distinct on (trim(activity_id::text))
              trim(activity_id::text) as activity_id,
              nullif(trim(activity_name), '') as activity_name,
              nullif(trim(cost_area), '') as cost_area,
              nullif(trim(sub_cost_center), '') as sub_cost_center,
              nullif(trim(activity_type), '') as activity_type,
              nullif(trim(unit_of_measure), '') as unit_of_measure
            from slv.prod_dim_activity_profile_scd2
            where is_current = true
              and is_valid = true
              and nullif(trim(activity_id::text), '') is not null
            order by trim(activity_id::text), loaded_at desc, valid_from desc
        """
        with conn.cursor() as cur:
            cur.execute(query)
            rows = cur.fetchall()
            columns = [item.name for item in cur.description]
        df = pd.DataFrame(rows, columns=columns)
    finally:
        conn.close()

    for column in df.columns:
        df[column] = df[column].map(clean)

    df["uso_operativo"] = df.apply(
        lambda row: " / ".join(
            [
                value
                for value in [row["cost_area"], row["sub_cost_center"], f'{row["activity_name"]} ({row["activity_id"]})']
                if value
            ]
        ),
        axis=1,
    )
    return df.sort_values(["cost_area", "sub_cost_center", "activity_name", "activity_id"]).reset_index(drop=True)


def main() -> None:
    presupuesto = load_presupuesto()
    otros = load_otros_productos()
    activities = load_source_activities()

    base = pd.concat(
        [
            presupuesto[["source_sheet", "codigo", "descripcion", "unidad", "area_fuente", "tipo_fuente", "ingrd_activo"]],
            otros,
        ],
        ignore_index=True,
    )

    classified = base.drop_duplicates(subset=["source_sheet", "codigo", "descripcion", "unidad"], keep="first").copy()

    proposal_rows: list[dict[str, str]] = []
    for row in classified.to_dict(orient="records"):
        classified_row = classify_product(row)
        proposal_rows.append({**row, **classified_row})

    proposal = pd.DataFrame(proposal_rows)
    proposal["rama_propuesta"] = proposal["tipo_propuesto"] + " > " + proposal["familia_propuesta"] + " > " + proposal["subfamilia_propuesta"]
    proposal["active_component_mode_propuesto"] = proposal["ingrd_activo"].map(lambda value: "na" if not clean(value) else "applies")
    proposal["requiere_revision"] = proposal["confianza"].isin(["baja", "media"]).map({True: "SI", False: "NO"})

    for index in range(1, 4):
        proposal[f"activity_id_{index}"] = ""
        proposal[f"activity_name_{index}"] = ""
        proposal[f"cost_area_{index}"] = ""
        proposal[f"sub_cost_center_{index}"] = ""

    proposal["nota_asignacion_actividad"] = ""

    proposal = proposal[
        [
            "source_sheet",
            "codigo",
            "descripcion",
            "unidad",
            "ingrd_activo",
            "active_component_mode_propuesto",
            "tipo_propuesto",
            "familia_propuesta",
            "subfamilia_propuesta",
            "rama_propuesta",
            "confianza",
            "criterio_asignacion",
            "requiere_revision",
            "activity_id_1",
            "activity_name_1",
            "cost_area_1",
            "sub_cost_center_1",
            "activity_id_2",
            "activity_name_2",
            "cost_area_2",
            "sub_cost_center_2",
            "activity_id_3",
            "activity_name_3",
            "cost_area_3",
            "sub_cost_center_3",
            "nota_asignacion_actividad",
        ]
    ]

    branches = (
        proposal.groupby(["tipo_propuesto", "familia_propuesta", "subfamilia_propuesta"], dropna=False)
        .size()
        .reset_index(name="productos_asignados")
        .sort_values(["tipo_propuesto", "familia_propuesta", "subfamilia_propuesta"])
    )
    branches["rama_propuesta"] = branches["tipo_propuesto"] + " > " + branches["familia_propuesta"] + " > " + branches["subfamilia_propuesta"]

    families = (
        proposal.groupby(["tipo_propuesto", "familia_propuesta"], dropna=False)
        .agg(
            productos_asignados=("codigo", "size"),
            subfamilias_detectadas=("subfamilia_propuesta", lambda s: ", ".join(sorted(pd.Series(s).dropna().astype(str).unique()))),
        )
        .reset_index()
        .sort_values(["tipo_propuesto", "familia_propuesta"])
    )
    families["familia_ruta"] = families["tipo_propuesto"] + " > " + families["familia_propuesta"]

    types = (
        proposal.groupby(["tipo_propuesto"], dropna=False)
        .agg(
            productos_asignados=("codigo", "size"),
            familias_detectadas=("familia_propuesta", lambda s: ", ".join(sorted(pd.Series(s).dropna().astype(str).unique()))),
        )
        .reset_index()
        .sort_values(["tipo_propuesto"])
    )

    cost_centers = (
        activities.groupby(["cost_area", "sub_cost_center"], dropna=False)
        .agg(
            actividades=("activity_id", "size"),
            activity_ids=("activity_id", lambda s: ", ".join(sorted(pd.Series(s).dropna().astype(str).unique()))),
        )
        .reset_index()
        .sort_values(["cost_area", "sub_cost_center"])
    )

    summary = pd.DataFrame(
        [
            {"metrica": "productos_propuestos", "valor": len(proposal)},
            {"metrica": "ramas_unicas", "valor": len(branches)},
            {"metrica": "requiere_revision_si", "valor": int((proposal["requiere_revision"] == "SI").sum())},
            {"metrica": "source_presupuesto", "valor": int((classified["source_sheet"] == "Presupuesto").sum())},
            {"metrica": "source_otros_productos", "valor": int((classified["source_sheet"] == "Otros Productos").sum())},
            {"metrica": "actividades_fuente", "valor": len(activities)},
            {"metrica": "centros_subcentros_fuente", "valor": len(cost_centers)},
        ]
    )

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)

    def write_workbook(target_path: Path) -> None:
        with pd.ExcelWriter(target_path, engine="openpyxl") as writer:
            proposal.to_excel(writer, sheet_name="Productos", index=False)
            branches.to_excel(writer, sheet_name="Ramas", index=False)
            families.to_excel(writer, sheet_name="Familias", index=False)
            types.to_excel(writer, sheet_name="Tipos", index=False)
            activities.to_excel(writer, sheet_name="ActividadesFuente", index=False)
            cost_centers.to_excel(writer, sheet_name="CentrosCostos", index=False)
            summary.to_excel(writer, sheet_name="Resumen", index=False)

    output_used = OUTPUT_PATH
    try:
        write_workbook(OUTPUT_PATH)
    except PermissionError:
        output_used = FALLBACK_OUTPUT_PATH
        write_workbook(FALLBACK_OUTPUT_PATH)

    print(f"Proposal workbook created at: {output_used}")


if __name__ == "__main__":
    main()
