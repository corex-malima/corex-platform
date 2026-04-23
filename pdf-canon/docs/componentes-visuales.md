# Componentes visuales del canon

## Metadatos del documento

| Comando | Descripción | Ejemplo |
|---|---|---|
| `\SetDocType{X}` | Tipo visible en encabezado | `INFORME EJECUTIVO` |
| `\SetDocTitle{X}` | Título principal | `Rendimiento Semanal` |
| `\SetDocCode{X}` | Código documental | `INF-OPS-017` |
| `\SetDocArea{X}` | Área emisora | `Operaciones` |
| `\SetDocAuthor{X}` | Autor | `Juan Pérez` |
| `\SetDocDate{X}` | Fecha | `2026-04-22` |
| `\SetDocLogo{X}` | Ruta al logo (PDF/PNG) | `../assets/logo.pdf` |
| `\SetDocUnit{X}` | Unidad en pie de página | `Tecnología` |
| `\SetContactUnit{X}` | Nombre del bloque de contacto | `Mesa de soporte` |
| `\SetContactMembers{X}` | Filas de la tabla de contacto | ver abajo |
| `\SetContactNote{X}` | Nota al pie del bloque contacto | texto libre |

`\SetContactMembers` acepta filas de tabla LaTeX:
```latex
\SetContactMembers{%
  Andrea Morales & Coordinadora & andrea@empresa.com \\
  Luis Samaniego & Técnico      & luis@empresa.com%
}
```

---

## Cajas de contenido

### ObservationBox
```latex
\ObservationBox[Título opcional]{Texto de la observación.}
```
Borde lateral izquierdo color `CanonMuted`. Para observaciones y contexto.

### KeyFindingBox
```latex
\KeyFindingBox[Título opcional]{Texto del hallazgo.}
```
Borde lateral `CanonInk`. Para hallazgos clave y conclusiones.

### WarningBox
```latex
\WarningBox[Título opcional]{Texto de la alerta.}
```
Borde lateral rojo. Para alertas que requieren acción inmediata.

### NoteInline
```latex
\NoteInline{Etiqueta:} texto en la misma línea.
```

---

## Párrafos especiales

```latex
\begin{ParrafoEjecutivo}
  Texto para audiencia no técnica...
\end{ParrafoEjecutivo}

\begin{ParrafoMetodologico}
  Descripción técnica de fuentes y procedimientos...
\end{ParrafoMetodologico}
```

---

## KPIs

```latex
\FichaKPI{Etiqueta}{Valor}{Nota secundaria}
```

Uso en tabla 3×2:
```latex
\begin{center}
\begin{tabular}{ccc}
  \FichaKPI{Tallos}{842\,000}{semana 17} &
  \FichaKPI{Rendimiento}{96.3\,\%}{meta 95\,\%} &
  \FichaKPI{Merma}{2.1\,\%}{límite 3\,\%} \\
\end{tabular}
\end{center}
```

---

## Bloques de documento

### MemoBlock
```latex
\MemoBlock{Para — Cargo}{De — Área}{Asunto}{CÓDIGO-REF}
```

### AsistentesBlock (en actas)
```latex
\begin{AsistentesBlock}
  Nombre & Cargo & correo@empresa.com \\
\end{AsistentesBlock}
```

### AcuerdosList (en actas)
```latex
\begin{AcuerdosList}
  \item \textbf{Responsable — Fecha:} Descripción del acuerdo.
\end{AcuerdosList}
```

---

## Figuras

```latex
% Con fallback automático si la ruta no existe:
\FiguraConFallback[0.82\linewidth]{ruta/grafico.pdf}{Leyenda del gráfico}

% Placeholder explícito:
\FiguraPlaceholder[0.6\linewidth]{Descripción del gráfico pendiente}
```

---

## Código

```latex
% Ruta o identificador inline:
\CodePath{/api/balanzas/reporte?semana=17}

% Bloque de código:
\begin{CodeBlock}
SELECT * FROM tabla WHERE condicion = true;
\end{CodeBlock}
```

---

## Firma y contacto

```latex
\SignatureBlock{Nombre Apellido}{Cargo del firmante}

\sectionrule   % separador horizontal delgado

\ContactSignature   % bloque de contacto definido con \SetContact*
```

---

## Separador

```latex
\sectionrule
```

---

## Paleta de colores

| Nombre | Hex | Uso |
|---|---|---|
| `CanonInk` | `#202020` | Texto principal |
| `CanonMuted` | `#6B6B6B` | Texto secundario, bordes de observación |
| `CanonRule` | `#D7D7D7` | Líneas horizontales y bordes de tabla |
| `CanonSoft` | `#F8F8F6` | Fondos de cajas y secciones alternadas |
| `CanonSoftLine` | `#E1E1DD` | Bordes de cajas de contenido |
| `CanonRed` | `#C0392B` | WarningBox |
| `CanonAccent` | `#1A56A0` | Links y CodePath |

Uso en LaTeX: `\textcolor{CanonMuted}{texto}` o `\colorbox{CanonSoft}{texto}`.
