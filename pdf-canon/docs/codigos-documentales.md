# Códigos documentales

## Formato

```
[TIPO]-[AREA]-[###]
```

Ejemplo: `INF-OPS-042`

---

## Segmento TIPO

| Código | Documento |
|---|---|
| `INF` | Informe (ejecutivo o estadístico) |
| `REP` | Reporte técnico |
| `PLN` | Plan (de trabajo o técnico) |
| `PET` | Solicitud / Petición formal |
| `MEM` | Memorando |
| `ACT` | Acta o Minuta |
| `FIC` | Ficha resumen |
| `ANX` | Anexo técnico |

---

## Segmento AREA

Tres letras mayúsculas que identifican el área emisora.

| Código | Área |
|---|---|
| `OPS` | Operaciones / Postcosecha |
| `TEC` | Tecnología & Sistemas |
| `FIN` | Finanzas |
| `CAL` | Calidad |
| `LOG` | Logística |
| `RHH` | Recursos Humanos |
| `GER` | Gerencia General |
| `SYS` | Sistema (uso interno de herramientas) |

Pueden crearse nuevos códigos de área con aprobación del responsable documental.

---

## Segmento ### (correlativo)

Número de tres dígitos con cero a la izquierda, secuencial por combinación
TIPO+AREA. Primera emisión: `001`. No se reutilizan correlativos de documentos
eliminados. Las revisiones del mismo documento conservan el código y añaden
`Rev.N` en el título: `INF-OPS-042 Rev.2`.

---

## Ejemplos

| Código | Descripción |
|---|---|
| `INF-OPS-017` | Informe semanal de rendimiento postcosecha |
| `REP-TEC-003` | Reporte de validación de integridad ERP |
| `PET-OPS-005` | Solicitud de acceso a datos históricos |
| `MEM-GER-001` | Memorando de instrucción de cierre excepcional |
| `ACT-OPS-028` | Acta de revisión operativa semanal |
| `ANX-SYS-001` | Catálogo visual de componentes canon |
