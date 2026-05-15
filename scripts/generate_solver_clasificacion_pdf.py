import argparse
import json
from datetime import datetime
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle


def format_int(value):
    if value is None:
        return "---"
    return f"{int(round(float(value))):,}".replace(",", ".")


def format_dec(value, digits=2):
    if value is None:
        return "---"
    return f"{float(value):,.{digits}f}".replace(",", "X").replace(".", ",").replace("X", ".")


def format_pct(value, ratio=True):
    if value is None:
        return "---"
    numeric = float(value) * 100.0 if ratio else float(value)
    return f"{numeric:,.2f} %".replace(",", "X").replace(".", ",").replace("X", ".")


def build_table(data, col_widths=None, header_rows=1):
    table = Table(data, colWidths=col_widths, repeatRows=header_rows)
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#EAF0F6")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#0F172A")),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 8),
                ("LEADING", (0, 0), (-1, -1), 10),
                ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#CBD5E1")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8FAFC")]),
                ("LEFTPADDING", (0, 0), (-1, -1), 4),
                ("RIGHTPADDING", (0, 0), (-1, -1), 4),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )
    return table


def add_section_title(story, text, style):
    story.append(Paragraph(text, style))
    story.append(Spacer(1, 2 * mm))


def build_recipe_block(recipe_entry, heading, body):
    recipe = recipe_entry.get("recipe")
    if not recipe:
        return [
            Paragraph(f"SKU {recipe_entry.get('sku', 'N/A')}", heading),
            Paragraph("No se pudo construir la receta para este SKU en la exportacion.", body),
            Spacer(1, 3 * mm),
        ]

    summary = recipe.get("summary", {})
    rows = recipe.get("rows", [])
    grade_totals = recipe.get("gradeTotals", [])

    story = [
        Paragraph(f"SKU {recipe_entry.get('sku', 'N/A')}", heading),
        Paragraph(
            (
                f"Bunches resueltos: {format_int(summary.get('bunchesResueltos'))} | "
                f"Recetas activas: {format_int(summary.get('recetasUsadas'))} | "
                f"Peso promedio real: {format_dec(summary.get('pesoPromedioReal'))} g | "
                f"Estado: {summary.get('status', 'n/a')}"
            ),
            body,
        ),
        Spacer(1, 2 * mm),
    ]

    recipe_table = [["Cantidad", "Combinacion", "Tallos", "Peso/bunch", "Dif. ideal", "Estado"]]
    for row in rows:
      combinacion = ", ".join(
          [f"G{item.get('grado')} x {format_int(item.get('tallos'))}" for item in row.get("composicion", [])]
      )
      recipe_table.append(
          [
              format_int(row.get("cantidad")),
              combinacion or "---",
              format_int(row.get("tallosPorBunch")),
              f"{format_dec(row.get('pesoPorBunch'))} g",
              f"{format_dec(row.get('difIdeal'))} g",
              str(row.get("estadoPeso", "")),
          ]
      )

    story.append(
        build_table(
            recipe_table,
            col_widths=[18 * mm, 70 * mm, 18 * mm, 22 * mm, 22 * mm, 28 * mm],
        )
    )
    story.append(Spacer(1, 2 * mm))

    grade_table = [["Grado", "Objetivo", "Asignado", "Peso seed", "Peso total"]]
    for row in grade_totals:
        grade_table.append(
            [
                format_int(row.get("grado")),
                format_int(row.get("tallosObjetivo")),
                format_int(row.get("tallosAsignados")),
                f"{format_dec(row.get('pesoTalloSeed'))} g",
                f"{format_dec(row.get('pesoTotal'))} g",
            ]
        )

    story.append(build_table(grade_table, col_widths=[18 * mm, 22 * mm, 22 * mm, 24 * mm, 28 * mm]))
    story.append(Spacer(1, 4 * mm))
    return story


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input-json", required=True)
    parser.add_argument("--output-pdf", required=True)
    args = parser.parse_args()

    payload = json.loads(Path(args.input_json).read_text(encoding="utf-8-sig"))
    runs = payload.get("runs", [])
    export_date = payload.get("exportDate")
    try:
        export_date = datetime.fromisoformat(export_date).strftime("%d/%m/%Y %H:%M")
    except Exception:
        export_date = str(export_date or "")

    doc = SimpleDocTemplate(
        args.output_pdf,
        pagesize=landscape(A4),
        leftMargin=12 * mm,
        rightMargin=12 * mm,
        topMargin=12 * mm,
        bottomMargin=12 * mm,
    )
    styles = getSampleStyleSheet()
    title = ParagraphStyle(
        "TitleLocal",
        parent=styles["Title"],
        fontName="Helvetica-Bold",
        fontSize=16,
        leading=19,
        textColor=colors.HexColor("#0F172A"),
    )
    subtitle = ParagraphStyle(
        "SubtitleLocal",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=11,
        textColor=colors.HexColor("#475569"),
    )
    heading = ParagraphStyle(
        "HeadingLocal",
        parent=styles["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=11,
        leading=13,
        textColor=colors.HexColor("#0F172A"),
        spaceAfter=4,
    )
    body = ParagraphStyle(
        "BodyLocal",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8.5,
        leading=10.5,
        textColor=colors.HexColor("#1E293B"),
    )
    note = ParagraphStyle(
        "NoteLocal",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8,
        leading=10,
        textColor=colors.HexColor("#475569"),
    )

    story = [
        Paragraph("Orden de trabajo - Clasificacion en blanco", title),
        Spacer(1, 2 * mm),
        Paragraph(f"Fecha de exportacion: {export_date}", subtitle),
        Paragraph(f"Corridas incluidas: {len(runs)}", subtitle),
        Spacer(1, 3 * mm),
        Paragraph(
            "Nota metodologica: el flujo se presenta por origen. El cumplimiento de cada paso se calcula contra la demanda que entra a ese origen en ese momento, no contra el pedido global inicial.",
            note,
        ),
        Spacer(1, 5 * mm),
    ]

    flow_table = [["Paso", "Entrante", "Resuelto en origen", "Restante al siguiente paso", "Cumplimiento interno"]]
    for index, run in enumerate(runs, start=1):
        flow = run.get("flow", {})
        flow_table.append(
            [
                f"{index}. {run.get('label', 'N/A')}",
                format_int(flow.get("incoming")),
                format_int(flow.get("resolved")),
                format_int(flow.get("remaining")),
                format_pct(flow.get("compliance"), ratio=True),
            ]
        )
    add_section_title(story, "Resumen general del flujo por origen", heading)
    story.append(build_table(flow_table, col_widths=[45 * mm, 24 * mm, 32 * mm, 38 * mm, 30 * mm]))
    story.append(Spacer(1, 5 * mm))

    for index, run in enumerate(runs, start=1):
        story.append(Paragraph(f"Paso {index}. {run.get('label', 'N/A')}", heading))
        story.append(Paragraph(str(run.get("originScope", "")), subtitle))
        precheck = run.get("precheck", {})
        story.append(
            Paragraph(
                (
                    f"Prevalidacion: {precheck.get('message', 'N/A')}<br/>"
                    f"Holgura: {format_int(precheck.get('diferencia'))} | "
                    f"Pedidos: {format_int(precheck.get('tallosPedidos'))} | "
                    f"Disponibles: {format_int(precheck.get('tallosDisponibles'))}"
                ),
                body,
            )
        )
        story.append(Spacer(1, 3 * mm))

        result = run.get("result")
        if not result:
            story.append(Paragraph("Sin resultado para esta corrida.", body))
            story.append(Spacer(1, 4 * mm))
            continue

        stage1 = result.get("stage1Summary", {})
        stage2 = result.get("stage2Summary", {})
        meta = result.get("solverMeta", {})

        summary_table = build_table(
            [
                ["Indicador", "Valor"],
                ["Entrante al origen", format_int(stage1.get("pedido_bunches_total"))],
                ["Resuelto en este paso", format_int(stage1.get("pedido_bunches_resuelto"))],
                ["Restante al siguiente paso", format_int(stage1.get("ajuste_bunches_total"))],
                ["Peso real total (kg)", format_dec(stage2.get("peso_real_total"), 2)],
                ["Sobrepeso macro", format_pct(stage2.get("sobrepeso_pct_macro"), ratio=True)],
                ["Status solver", str(meta.get("status", "n/a"))],
            ],
            col_widths=[60 * mm, 42 * mm],
        )
        story.append(summary_table)
        story.append(Spacer(1, 4 * mm))

        priority_rows = result.get("priorityRows", [])
        priority_table = [["Prior.", "Fecha", "Entrante", "Resuelto", "Restante", "Cumplimiento interno"]]
        for row in priority_rows:
            priority_table.append(
                [
                    format_int(row.get("prioridad")),
                    str(row.get("fecha", "")),
                    format_int(row.get("pedido")),
                    format_int(row.get("resuelto")),
                    format_int(row.get("noRealizado")),
                    format_pct(row.get("cumplimiento"), ratio=True),
                ]
            )
        story.append(Paragraph("Prioridad de cumplimiento dentro del origen", heading))
        story.append(
            Paragraph(
                "Cada fila muestra la demanda que llego a este origen para esa fecha, lo que el solver resolvio aqui y lo que pasa al siguiente origen.",
                note,
            )
        )
        story.append(Spacer(1, 1.5 * mm))
        story.append(build_table(priority_table, col_widths=[16 * mm, 32 * mm, 22 * mm, 22 * mm, 28 * mm, 26 * mm]))
        story.append(Spacer(1, 4 * mm))

        order_rows = result.get("orderRows", [])
        order_table = [["SKU", "Estado", "Entrante", "Resuelto", "Restante", "Cumpl.", "Peso bunch", "Sobrepeso"]]
        for row in order_rows:
            order_table.append(
                [
                    str(row.get("sku", "")),
                    str(row.get("estadoPeso", "")),
                    format_int(row.get("pedidoTotal")),
                    format_int(row.get("pedidoResuelto")),
                    format_int(row.get("ajusteBunches")),
                    format_pct(row.get("cumplimientoBunches"), ratio=True),
                    format_dec(row.get("pesoRealBunch"), 2),
                    format_pct(row.get("sobrepesoPct"), ratio=True),
                ]
            )
        story.append(Paragraph("Orden de trabajo por SKU", heading))
        story.append(
            Paragraph(
                "La columna Entrante corresponde al pedido que llega a este paso. Resuelto es lo fabricado en este origen. Restante es lo que debe seguir al siguiente paso del flujo.",
                note,
            )
        )
        story.append(Spacer(1, 1.5 * mm))
        story.append(
            build_table(
                order_table,
                col_widths=[36 * mm, 28 * mm, 18 * mm, 18 * mm, 18 * mm, 18 * mm, 22 * mm, 20 * mm],
            )
        )
        story.append(Spacer(1, 4 * mm))

        recipes = run.get("recipes", [])
        if recipes:
            story.append(Paragraph("Receta operativa por SKU resuelto", heading))
            story.append(
                Paragraph(
                    "Aqui ya se muestra la orden de trabajo real por SKU, incluyendo sus recetas activas y el consumo por grado que se usara en produccion.",
                    note,
                )
            )
            story.append(Spacer(1, 1.5 * mm))
            for recipe_entry in recipes:
                story.extend(build_recipe_block(recipe_entry, heading, body))

        if index < len(runs):
            story.append(PageBreak())

    doc.build(story)


if __name__ == "__main__":
    main()
