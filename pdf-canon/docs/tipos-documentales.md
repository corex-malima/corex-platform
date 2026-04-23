# Tipos documentales del sistema canon

## Resumen

| Código tipo | Nombre | Template | Audiencia típica |
|---|---|---|---|
| `INF` | Informe ejecutivo | `informe_ejecutivo.tex` | Gerencia / Dirección |
| `INF` | Informe estadístico | `informe_estadistico.tex` | Gerencia media / Técnica |
| `REP` | Reporte técnico | `reporte_tecnico.tex` | Equipo técnico |
| `PLN` | Plan de trabajo | `plan_trabajo.tex` | Equipo operativo |
| `PLN` | Plan técnico | `plan_tecnico.tex` | Equipo técnico / Gerencia |
| `PET` | Solicitud formal | `solicitud_formal.tex` | Área receptora |
| `MEM` | Memorando | `memorando.tex` | Toda la organización |
| `ACT` | Acta / Minuta | `acta_minuta.tex` | Participantes de reunión |
| `FIC` | Ficha resumen | `ficha_resumen.tex` | Cualquier audiencia |
| `ANX` | Anexo técnico | `anexo_tecnico.tex` | Referenciado desde otro doc |

---

## INF — Informe ejecutivo

**Cuándo usarlo:** Resultados periódicos (semanales, mensuales) dirigidos a
gerencia o dirección. El lector no necesita conocer los detalles metodológicos.

**Estructura típica:**
1. Resumen ejecutivo (`ParrafoEjecutivo`)
2. KPIs en tabla o `\FichaKPI`
3. Hallazgos y recomendaciones (listas)
4. Observaciones y alertas (`\ObservationBox`, `\WarningBox`)
5. Firma (`\SignatureBlock`) + contacto (`\ContactSignature`)

**Longitud:** 1–3 páginas máximo.

---

## INF — Informe estadístico

**Cuándo usarlo:** Análisis cuantitativos con tablas extensas, longtables y
metodología detallada. Audiencia técnica o gerencia media.

**Diferencia respecto al ejecutivo:** incluye sección metodológica
(`ParrafoMetodologico`), tablas longtable y mayor nivel de detalle numérico.

**Longitud:** Sin límite estricto; tablas longtable se paginarán automáticamente.

---

## REP — Reporte técnico

**Cuándo usarlo:** Documentación de incidentes, validaciones de sistemas,
auditorías o cualquier resultado que requiera trazabilidad técnica completa.

**Elementos clave:** `CodeBlock`, `\CodePath`, `\KeyFindingBox`, `\WarningBox`.

**Longitud:** Variable; incluir evidencia técnica completa aunque supere 5 páginas.

---

## PLN — Plan de trabajo

**Cuándo usarlo:** Planificación semanal/mensual de actividades con
responsables, fechas y prioridades. Documento interno de equipo.

**Estructura:** tabla de actividades + recursos + riesgos.

---

## PLN — Plan técnico

**Cuándo usarlo:** Planes de implementación, migración o proyecto de mayor
alcance que requieren justificación técnica, riesgos y cronograma.

---

## PET — Solicitud formal

**Cuándo usarlo:** Solicitudes oficiales entre áreas o hacia dirección.
Requiere fundamento y firma del solicitante.

**Elementos clave:** `\MemoBlock` (Para/De/Asunto/Ref), `\SignatureBlock`.

---

## MEM — Memorando

**Cuándo usarlo:** Comunicaciones internas cortas de carácter normativo o
instructivo. Una sola página preferentemente.

**Elementos clave:** `\MemoBlock`, listas numeradas de instrucciones.

---

## ACT — Acta / Minuta

**Cuándo usarlo:** Registro de reuniones, acuerdos y compromisos con
responsables y fechas de seguimiento.

**Elementos clave:** `AsistentesBlock`, `AcuerdosList`.

---

## FIC — Ficha resumen

**Cuándo usarlo:** Documento de una página con KPIs destacados. Útil para
dashboards impresos, briefs de reunión o adjuntos de correo ejecutivo.

**Estructura:** `\FichaKPI` en tabla, observación breve. Sin secciones extensas.

---

## ANX — Anexo técnico

**Cuándo usarlo:** Material de soporte referenciado desde otro documento
principal. No se distribuye de forma independiente.

**Elementos clave:** Longtables, figuras, código. Sin resumen ejecutivo.
