# Guía simple y estricta para bases modulares en PostgreSQL (`public`)

## 1. Alcance

Esta guía aplica a **bases modulares operacionales** como `db_human_talent`, donde **todo vive en el esquema `public`** y la semántica se resuelve por el nombre de la tabla.

No aplica al lakehouse como contrato analítico completo. Aquí el objetivo es:

- simplicidad operativa
- nombres previsibles
- trazabilidad suficiente
- facilidad para crecer sin perder orden

La guía conserva la base de tu canon previo: separación entre identidad de negocio, identidad física de fila, vigencia temporal, trazabilidad y reconstrucción punto-en-tiempo. fileciteturn3file0

---

## 2. Regla base: un solo esquema

Todas las tablas viven en:

```sql
public
```

No se crean esquemas funcionales como `hr`, `payroll`, `social_work`, etc.

La clasificación funcional se resuelve **solo con el prefijo `domain_`** en el nombre de la tabla.

---

## 3. Regla de nombres obligatoria

Todas las tablas nuevas deben seguir esta forma:

```text
<domain>_<kind>_<entity>_<role>_<temporal>
```

Ejemplos válidos:

```text
tthh_ref_employee_core_scd2
tthh_dim_employee_profile_scd2
tthh_fact_absence_event_cur
ttss_fact_case_event_cur
payroll_fact_adjustment_event_cur
common_dim_variable_item_scd0
common_map_variable_value_cur
```

Esta regla mantiene la idea de tu arquitectura original: separar dominio, tipo estructural, entidad, rol semántico y comportamiento temporal. fileciteturn3file0turn3file3

---

## 4. Dominios permitidos dentro de `db_human_talent`

Dentro de `db_human_talent` pueden coexistir varios dominios. Eso es correcto.

## 4.1 Dominios base

```text
tthh
ttss
payroll
common
```

### Significado

- `tthh`: talento humano general
- `ttss`: trabajo social
- `payroll`: nómina
- `common`: catálogos, listas maestras, mappings, uso compartido y soporte transversal

## 4.2 Regla estricta

Una tabla pertenece a **un solo dominio**.

Incorrecto:

```text
tthh_payroll_fact_xxx
ttss_tthh_dim_xxx
```

Correcto:

```text
tthh_fact_absence_event_cur
payroll_fact_adjustment_event_cur
ttss_fact_case_event_cur
```

Si una tabla sirve a varios dominios, debe ir a `common_`.

---

## 5. Kinds permitidos

## 5.1 `ref`

Registro mínimo de existencia de una identidad.

Ejemplo:

```text
tthh_ref_employee_core_scd2
```

## 5.2 `dim`

Tabla descriptiva.

Ejemplo:

```text
tthh_dim_employee_profile_scd2
```

## 5.3 `fact`

Evento, transacción, movimiento o medición.

Ejemplo:

```text
payroll_fact_adjustment_event_cur
```

## 5.4 `asgn`

Relación o asignación entre dos identidades de negocio.

Ejemplo:

```text
tthh_asgn_employee_cost_center_core_scd2
```

## 5.5 `map`

Mapeo de valores observados a valores canónicos.

Ejemplo:

```text
common_map_variable_value_cur
```

## 5.6 `dim` para catálogos

Para listas maestras o catálogos simples, usa `dim`, no `ref`.

Ejemplo:

```text
common_dim_variable_item_scd0
```

Porque un catálogo sí es descriptivo y no solo de existencia.

---

## 6. Roles permitidos

Para mantener simpleza, usa solo estos roles:

```text
core
profile
event
item
usage
```

### Significado

- `core`: identidad mínima y vigencia
- `profile`: atributos descriptivos
- `event`: evento o transacción
- `item`: ítem de catálogo o lista maestra
- `usage`: uso o aplicación de una regla/variable

## 6.1 Regla práctica

- `ref` suele combinarse con `core`
- `dim` suele combinarse con `profile` o `item`
- `fact` suele combinarse con `event`
- `asgn` puede usar `core`
- `map` normalmente no necesita mucha creatividad: usa `value` como entidad y `cur` como temporal

Ejemplos:

```text
tthh_ref_employee_core_scd2
tthh_dim_employee_profile_scd2
payroll_fact_adjustment_event_cur
common_dim_variable_item_scd0
common_asgn_variable_usage_cur
common_map_variable_value_cur
```

---

## 7. Temporales permitidos

```text
scd0
scd2
cur
```

### Significado

- `scd0`: sin historia
- `scd2`: con historia versionada
- `cur`: estado o salida actual

---

## 8. Regla de identidad

Toda tabla debe separar:

- identidad de negocio
- identidad física de fila o evento

Eso es obligatorio en tu canon base. `record_id` no reemplaza la identidad de negocio y `event_id` no reemplaza la llave del hecho. fileciteturn3file0

## 8.1 Para tablas versionadas

Usa:

```text
record_id
<entity>_id
```

o, si aplica mejor:

```text
record_id
<entity>_key
```

## 8.2 Para hechos

Usa:

```text
event_id
```

más las columnas que definen el grano del evento.

## 8.3 Para asignaciones

La identidad de negocio puede ser compuesta.

Ejemplo:

```text
area_id + station_id
employee_id + cost_center_id
employee_id + payroll_run_id
```

Si la identidad es compuesta, la documentación y las reglas de unicidad deben usarla completa. fileciteturn3file0

---

## 9. Columnas obligatorias por tipo de tabla

## 9.1 `ref_*_core_scd2`

Uso: existencia mínima de una entidad.

Ejemplo real similar al tuyo:

```text
postharvest_ref_sku_id_core_scd2
```

Columnas mínimas:

```text
record_id
<entity>_id
valid_from
valid_to
is_current
is_valid
loaded_at
run_id
actor_id
change_reason
```

Descripción:

- `record_id`: identifica la versión física de la fila
- `<entity>_id`: identidad estable del negocio
- `valid_from`: desde cuándo esa versión es válida
- `valid_to`: hasta cuándo fue válida; `NULL` si sigue abierta
- `is_current`: indica si es la fila vigente
- `is_valid`: indica si es consumible lógicamente
- `loaded_at`: fecha/hora de carga técnica
- `run_id`: identificador de corrida o proceso
- `actor_id`: usuario, servicio o proceso responsable
- `change_reason`: motivo controlado del cambio

### Recomendación de tipos

```text
record_id      text o uuid
<entity>_id    text
valid_from     timestamptz o timestamp
valid_to       timestamptz o timestamp nullable
is_current     boolean
is_valid       boolean
loaded_at      timestamptz o timestamp
run_id         text
actor_id       text
change_reason  text
```

## 9.2 `dim_*_profile_scd2`

Uso: atributos descriptivos con historia.

Ejemplo real similar al tuyo:

```text
postharvest_dim_sku_profile_scd2
```

Columnas mínimas:

```text
record_id
<entity>_id
...atributos descriptivos...
valid_from
valid_to
is_current
is_valid
loaded_at
run_id
actor_id
change_reason
```

Regla fuerte:

- aquí viven los atributos de negocio
- no deben ir en `core` salvo que sean inseparables de la identidad

Ejemplos de atributos válidos en `profile`:

```text
employee_name
document_number
birth_date
hire_date
status_name
sku_name
ideal_bunch_weight
stems_min
stems_max
```

## 9.3 `asgn_*_core_scd2`

Uso: relaciones entre dos entidades con vigencia.

Ejemplo similar al tuyo:

```text
camp_asgn_area_station_core_scd2
```

Columnas mínimas:

```text
record_id
left_entity_id
right_entity_id
valid_from
valid_to
is_current
is_valid
loaded_at
run_id
actor_id
change_reason
```

En nombres reales, no uses `left_entity_id` y `right_entity_id`. Usa los nombres reales:

```text
area_id
station_id
employee_id
cost_center_id
employee_id
payroll_run_id
```

Regla fuerte:

- si la relación depende de dos lados, ambos lados son parte de la identidad de negocio
- no audites una `asgn` usando solo un lado si el grano real es compuesto

## 9.4 `fact_*_event_cur`

Uso: formularios, eventos, movimientos, transacciones y hechos operacionales.

Ejemplo similar al tuyo:

```text
prod_fact_hours_event_cur
```

Columnas mínimas:

```text
event_id
event_at
event_date
...llaves del grano...
...medidas o atributos del evento...
is_valid
loaded_at
run_id
actor_id
change_reason
```

Ejemplos de llaves del grano:

```text
employee_id
absence_type_id
case_id
payroll_run_id
adjustment_type_id
person_id
cycle_key
activity_id
```

Ejemplos de medidas o atributos:

```text
hours_worked
units_produced
amount_value
observation_text
status_code
```

Regla fuerte:

- todo `fact` debe tener `event_id`
- todo `fact` debe declarar su grano
- `loaded_at` no reemplaza a `event_at` fileciteturn3file0turn3file1

## 9.5 `dim_*_item_scd0` para catálogos

Uso: listas maestras y opciones de uso operativo.

Ejemplo:

```text
common_dim_variable_item_scd0
```

Columnas mínimas:

```text
variable_item_id
variable_name
item_code
item_name
item_description
sort_order
is_active
loaded_at
run_id
```

Opcionales:

```text
item_group
parent_item_code
attributes_jsonb
actor_id
```

---

## 10. Regla para formularios transaccionales

No nombres una tabla por la pantalla o por la palabra “formulario”, salvo que guardes literalmente la captura del formulario.

Incorrecto:

```text
tthh_formulario
ttss_registro_formulario
payroll_form_ajuste
```

Correcto:

```text
tthh_fact_absence_request_event_cur
ttss_fact_case_intake_event_cur
payroll_fact_adjustment_event_cur
```

La tabla debe nombrarse por el **hecho de negocio**.

---

## 11. Grano obligatorio

Toda tabla debe declarar su grano.

Ejemplos:

```text
tthh_ref_employee_core_scd2
Grano: una fila por employee_id por versión de vigencia

tthh_dim_employee_profile_scd2
Grano: una fila por employee_id por versión descriptiva

ttss_fact_case_event_cur
Grano: una fila por case_event_id

payroll_fact_adjustment_event_cur
Grano: una fila por adjustment_event_id

tthh_asgn_employee_cost_center_core_scd2
Grano: una fila por employee_id + cost_center_id por versión
```

Si no puedes escribir el grano en una sola línea, la tabla no está bien definida. Eso está completamente alineado con tu regla de grain. fileciteturn3file0

---

## 12. Reglas de nullabilidad

## 12.1 Deben ser `NOT NULL`

En general:

```text
record_id
event_id
<entity>_id
valid_from
is_current
is_valid
loaded_at
run_id
```

## 12.2 Puede ser `NULL`

Según el caso:

```text
valid_to
actor_id
change_reason
item_description
attributes_jsonb
```

## 12.3 Regla fuerte

Si una columna es obligatoria semánticamente, debe ser obligatoria físicamente.

No conviene dejar todo nullable por comodidad.

---

## 13. Reglas de unicidad

## 13.1 `ref_*_core_scd2`

Recomendado:

```text
PK: record_id
UK histórica: (<entity>_id, valid_from)
UK actual parcial: (<entity>_id) WHERE is_current AND is_valid
```

## 13.2 `dim_*_profile_scd2`

Recomendado:

```text
PK: record_id
UK histórica: (<entity>_id, valid_from)
UK actual parcial: (<entity>_id) WHERE is_current AND is_valid
```

## 13.3 `asgn_*_core_scd2`

Recomendado:

```text
PK: record_id
UK histórica: (<left_id>, <right_id>, valid_from)
```

y si aplica una restricción de una sola asignación activa:

```text
UK actual parcial: (<left_id>) WHERE is_current AND is_valid
```

o:

```text
UK actual parcial: (<right_id>) WHERE is_current AND is_valid
```

según la regla real del negocio.

## 13.4 `fact_*_event_cur`

Recomendado:

```text
PK: event_id
```

y si el evento viene de una fuente con identificador nativo:

```text
UK opcional: (source_event_id)
```

---

## 14. Reglas de tiempo

## 14.1 En `scd2`

- `valid_from` marca el inicio de vigencia
- `valid_to` marca el fin de vigencia
- `valid_to = NULL` significa fila abierta
- `is_current = TRUE` solo para la fila abierta actual
- no debe haber dos filas activas válidas para la misma identidad

Eso sigue tu modelo base de vigencia e integridad de intervalos. fileciteturn3file0turn3file1

## 14.2 En `fact`

- `event_at` = instante del negocio
- `event_date` = fecha derivada del negocio
- `loaded_at` = carga técnica

Nunca confundas esos tiempos. fileciteturn3file0turn3file1

---

## 15. JSON

Usa `jsonb`, no `text`, cuando la columna sea realmente JSON gobernado.

Correcto:

```text
assignment_trace_jsonb  jsonb
attributes_jsonb        jsonb
variants_jsonb          jsonb
```

Incorrecto:

```text
assignment_trace_jsonb  text
```

Si el nombre termina en `_jsonb`, el tipo físico debe ser `jsonb`. Eso ya está explícito en tu canon base. fileciteturn3file0turn3file2

---

## 16. Catálogos simples

Para listas maestras usadas en combos, formularios o validaciones, usa una sola tabla simple:

```text
common_dim_variable_item_scd0
```

## 16.1 Grano

```text
una fila por variable_name + item_code
```

## 16.2 Columnas recomendadas

```text
variable_item_id
variable_name
item_code
item_name
item_description
item_group
sort_order
parent_item_code
is_active
attributes_jsonb
loaded_at
run_id
actor_id
```

## 16.3 Semántica

- `variable_name`: nombre lógico de la variable
- `item_code`: código estable del ítem
- `item_name`: etiqueta visible
- `item_description`: descripción ampliada
- `item_group`: grupo lógico
- `sort_order`: orden de despliegue
- `parent_item_code`: para catálogos jerárquicos
- `is_active`: si el ítem se puede seguir usando
- `attributes_jsonb`: extras opcionales

## 16.4 Ejemplos de `variable_name`

```text
absence_type
absence_status
gender
marital_status
payroll_adjustment_type
social_case_status
social_case_channel
employee_status
contract_type
```

## 16.5 Ejemplo de filas

```text
variable_name = 'absence_status'
item_code     = 'APPROVED'
item_name     = 'Approved'

variable_name = 'absence_status'
item_code     = 'REJECTED'
item_name     = 'Rejected'
```

---

## 17. Mapeo de valores observados a catálogo

Si además de catálogo quieres resolver variantes sucias del origen, usa una tabla aparte:

```text
common_map_variable_value_cur
```

## 17.1 Grano

```text
una fila por variable_name + observed_value
```

## 17.2 Columnas recomendadas

```text
variable_value_map_id
variable_name
observed_value
normalized_value
canonical_item_code
match_rule
is_valid
loaded_at
run_id
actor_id
change_reason
```

## 17.3 Para qué sirve

Ejemplo:

```text
observed_value   = 'Aprobado'
normalized_value = 'APROBADO'
canonical_item_code = 'APPROVED'
```

Así separas:

- la lista oficial: `common_dim_variable_item_scd0`
- el mapeo de variantes: `common_map_variable_value_cur`

Esto es una simplificación operativa de tu esquema de gobernanza de variables y mappings. fileciteturn3file0turn3file2

---

## 18. Tabla de uso de variables

Si quieres saber dónde se usa cada catálogo o variable, usa:

```text
common_asgn_variable_usage_cur
```

Grano:

```text
una fila por variable_name + table_name + column_name
```

Columnas recomendadas:

```text
variable_usage_id
variable_name
table_name
column_name
usage_role
is_valid
loaded_at
run_id
actor_id
change_reason
```

Esto también está alineado con tu gobernanza previa. fileciteturn3file0

---

## 19. Ejemplos concretos para `db_human_talent`

## 19.1 TTHH

```text
tthh_ref_employee_core_scd2
tthh_dim_employee_profile_scd2
tthh_fact_absence_request_event_cur
tthh_fact_absence_resolution_event_cur
tthh_asgn_employee_cost_center_core_scd2
```

## 19.2 Trabajo social

```text
ttss_ref_case_core_scd2
ttss_dim_case_profile_scd2
ttss_fact_case_intake_event_cur
ttss_fact_case_followup_event_cur
ttss_asgn_case_social_worker_core_scd2
```

## 19.3 Nómina

```text
payroll_ref_employee_payroll_core_scd2
payroll_dim_payroll_concept_profile_scd0
payroll_fact_adjustment_event_cur
payroll_fact_payslip_line_event_cur
payroll_asgn_employee_payroll_run_core_scd2
```

## 19.4 Compartidas

```text
common_dim_variable_item_scd0
common_map_variable_value_cur
common_asgn_variable_usage_cur
```

---

## 20. Anti-patrones prohibidos

Prohibido:

- usar `loaded_at` como tiempo del negocio
- meter atributos descriptivos grandes en `core`
- crear `fact` sin `event_id`
- crear `scd2` sin `record_id`
- dejar dos filas actuales válidas para la misma identidad
- usar nombres ambiguos como `data`, `master`, `general`, `registro`
- usar la palabra `formulario` como sustituto del hecho de negocio
- usar columnas `_jsonb` físicamente como `text`
- mezclar idiomas o abreviaturas para el mismo dominio
- saltarse el grano explícito
- crear catálogos hardcodeados en la app sin tabla maestra

Estos anti-patrones están directamente en tensión con tu canon base. fileciteturn3file0turn3file1

---

## 21. Regla ejecutiva final

En bases modulares como `db_human_talent`:

- todo vive en `public`
- el orden lo da el nombre de tabla
- cada tabla debe empezar por su dominio real
- cada tabla debe declarar claramente si es `ref`, `dim`, `fact`, `asgn` o `map`
- cada tabla debe tener un rol simple y estable
- cada tabla debe declarar su temporalidad
- las identidades deben estar separadas de las filas físicas
- los eventos deben tener `event_id`
- la historia debe vivir en `scd2`
- los catálogos simples deben vivir en `common_dim_variable_item_scd0`
- los mappings de valores observados deben vivir en `common_map_variable_value_cur`

---

## 22. Plantillas rápidas

## 22.1 Plantilla `ref_*_core_scd2`

```text
record_id
<entity>_id
valid_from
valid_to
is_current
is_valid
loaded_at
run_id
actor_id
change_reason
```

## 22.2 Plantilla `dim_*_profile_scd2`

```text
record_id
<entity>_id
...business_attributes...
valid_from
valid_to
is_current
is_valid
loaded_at
run_id
actor_id
change_reason
```

## 22.3 Plantilla `asgn_*_core_scd2`

```text
record_id
<left_entity>_id
<right_entity>_id
valid_from
valid_to
is_current
is_valid
loaded_at
run_id
actor_id
change_reason
```

## 22.4 Plantilla `fact_*_event_cur`

```text
event_id
event_at
event_date
...grain_keys...
...event_attributes_or_measures...
is_valid
loaded_at
run_id
actor_id
change_reason
```

## 22.5 Plantilla de catálogo

```text
variable_item_id
variable_name
item_code
item_name
item_description
item_group
sort_order
parent_item_code
is_active
attributes_jsonb
loaded_at
run_id
actor_id
```
