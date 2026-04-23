# Cómo pedir un PDF a Claude

Este sistema existe para que puedas decir en lenguaje natural qué documento
necesitas y obtener un `.tex` listo para compilar sin que se invente nada.

---

## El contrato

Tú describes el documento. Claude:
1. Elige el template correcto de `templates/`
2. Escribe el `.tex` usando **solo** componentes de `canon.cls`
3. Rellena los datos con lo que le proporciones
4. Entrega un archivo que compila sin modificaciones

---

## Cómo describir lo que necesitas

### Mínimo necesario

```
"Necesito un [tipo de documento] de [área] con [contenido principal]"
```

Ejemplos que funcionan bien:

| Lo que dices | Template que se usa |
|---|---|
| "un informe ejecutivo de postcosecha con KPIs de la semana" | `informe_ejecutivo.tex` |
| "un reporte técnico del error que tuvimos en el servidor BAL2" | `reporte_tecnico.tex` |
| "un acta de la reunión de hoy con los acuerdos que acordamos" | `acta_minuta.tex` |
| "un memorando para decirle a los supervisores que cierren los registros antes del mantenimiento" | `memorando.tex` |
| "una solicitud formal para pedir acceso a los datos históricos" | `solicitud_formal.tex` |
| "una ficha de una página con los 6 KPIs de producción" | `ficha_resumen.tex` |
| "un plan de trabajo con las actividades de la semana y sus responsables" | `plan_trabajo.tex` |
| "un anexo con la tabla completa de lotes procesados" | `anexo_tecnico.tex` |

---

## Qué datos incluir en la descripción

Cuantos más datos des, más completo sale el documento. Puedes dar:

- **Metadatos:** título, código del documento, área, autor, fecha
- **Números:** los valores reales de los KPIs, tablas, rendimientos
- **Texto:** los hallazgos, recomendaciones, instrucciones exactas
- **Personas:** nombres y cargos para firmas, asistentes, contactos

Si no das algún dato, Claude pone un placeholder descriptivo como
`[insertar valor]` o `[responsable]` para que lo completes después.

---

## Qué componentes tiene disponibles Claude

Cuando pides ciertas cosas, Claude sabe exactamente qué usar:

| "Necesito..." | Componente |
|---|---|
| un resumen ejecutivo para gerencia | `\begin{ParrafoEjecutivo}` |
| explicar de dónde vienen los datos | `\begin{ParrafoMetodologico}` |
| destacar un hallazgo importante | `\KeyFindingBox{...}` |
| mostrar una observación | `\ObservationBox{...}` |
| mostrar una alerta o error crítico | `\WarningBox{...}` |
| 3 o 6 KPIs en cajas | `\FichaKPI` en tabla 3×N |
| una tabla simple de datos | `tabular` + booktabs |
| una tabla con muchas filas | `longtable` |
| una tabla muy ancha | `adjustbox` + `tabular` |
| poner un gráfico (aunque no exista el archivo) | `\FiguraConFallback` |
| una firma al final | `\SignatureBlock` |
| los datos de contacto del área | `\ContactSignature` |
| Para/De/Asunto para memo o solicitud | `\MemoBlock` |
| lista de asistentes de una reunión | `\begin{AsistentesBlock}` |
| acuerdos numerados de una reunión | `\begin{AcuerdosList}` |
| una ruta de endpoint o archivo | `\CodePath{...}` |
| una consulta SQL o script | `\begin{CodeBlock}` |

---

## Ejemplo completo de pedido

```
Necesito un reporte técnico (REP-TEC-004) del área de Tecnología.

El tema es que el servidor de adquisición BAL2 perdió datos entre las 02:15
y las 04:40 del 2026-04-17. Se imputaron 88 registros con el método imp_avg3.
La reconciliación con nómina muestra una diferencia de solo 3 tallos (0.001%).

Hallazgo clave: la integridad está confirmada.
Alerta: hay que instalar un UPS en BAL2 antes de semana 20.

Recomendaciones:
1. Instalar UPS — Infraestructura, antes de semana 20
2. Alerta automática si BAL2 no reporta por 15 min — Monitoreo, 2026-04-30
3. Documentar método imp_avg3 — Equipo de Datos, 2026-05-07

Firma: Diego Arévalo, Ingeniero de Datos Senior.
Contacto: d.arevalo@empresa.com
```

Claude genera un `.tex` listo usando `reporte_tecnico.tex` con todo eso.

---

## Flujo para un botón en la app web

```
1. "Necesito un botón que genere el informe ejecutivo de balanzas
   con los datos de la semana seleccionada"

→ Claude crea:
   - La API route (src/app/api/reportes/balanzas/pdf/route.ts)
   - La función que construye el dataTexContent con los datos reales de la DB
   - Usa generateCanonicalPdf() de pdf-canon/scripts/generate_pdf_service.ts
   - Retorna con pdfBufferToResponse()
   
   Y en el frontend:
   - El botón que hace fetch a esa route y descarga el archivo
```

---

## Lo que Claude NO hará

- Inventar estilos nuevos (colores hex, fuentes nuevas, layouts custom)
- Usar `\usepackage` que no esté ya en `canon.cls`
- Crear comandos LaTeX nuevos cuando ya existe uno que hace lo mismo
- Generar un documento fuera de los 10 tipos documentales del canon

Si necesitas algo que no existe en el canon, Claude lo dirá explícitamente
antes de improvisar.
