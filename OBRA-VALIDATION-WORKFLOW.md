# Flujo de Validación de Obra

## Descripción General

Este documento describe el nuevo flujo de validación de obras implementado para requisiciones creadas por roles PQRS y Coordinador Operativo que incluyan información de obra.

## Problema Resuelto

Cuando los usuarios PQRS o Coordinador Operativo crean requisiciones con información de "Obra", se requiere una validación adicional por parte del Director de Proyecto antes de que la requisición pase a la revisión técnica normal.

## Flujo de Trabajo

### Flujo Sin Obra (Existente)
```
PQRS/Coord.Operativo crea → pendiente
  → Director de Proyecto REVISA → aprobada_revisor / rechazada_revisor
  → Gerencia de Proyectos AUTORIZA → autorizado / rechazada_autorizador
  → Gerencia APRUEBA → aprobada_gerencia / rechazada_gerencia
```

### Flujo Con Obra (Nuevo)
```
PQRS/Coord.Operativo crea (con Obra) → pendiente_validacion
  → Director de Proyecto VALIDA → pendiente / rechazada_validador
  → Director Técnico REVISA → aprobada_revisor / rechazada_revisor
  → Gerencia de Proyectos AUTORIZA → autorizado / rechazada_autorizador
  → Gerencia APRUEBA → aprobada_gerencia / rechazada_gerencia
```

## Nuevos Estados

| Código | Nombre | Descripción | Color |
|--------|--------|-------------|-------|
| `pendiente_validacion` | Pendiente de validación | Requisición con obra pendiente de validación por Director de Proyecto | indigo |
| `rechazada_validador` | Rechazada por validador | Devuelta al solicitante por Director de Proyecto en validación de obra | pink |

## Roles Involucrados

### Roles que Activan el Flujo de Validación
- **PQRS** (todos los roles con category = 'PQRS')
- **Coordinador Operativo** (rol_id = 32)

### Rol que Valida
- **Director de Proyecto** (roles con category = 'DIRECTOR_PROYECTO')
  - Director de Proyecto Antioquia
  - Director de Proyecto Quindío
  - Director de Proyecto Valle
  - Director de Proyecto Putumayo

### Rol que Revisa Después de Validación
- **Director Técnico** (rol_id = 6)

## Condiciones para Activar el Flujo

El flujo de validación de obra se activa cuando:
1. El creador tiene rol con category = 'PQRS' **O** rol_id = 32 (Coordinador Operativo)
2. **Y** el campo `obra` está diligenciado (no vacío)

Si alguna de estas condiciones no se cumple, la requisición sigue el flujo normal.

## Endpoints Nuevos/Modificados

### POST /purchases/requisitions/:id/validate

Permite a un Director de Proyecto validar una requisición con obra.

**Request Body:**
```json
{
  "decision": "validate" | "reject",
  "comments": "Comentarios opcionales (obligatorio si rechaza)"
}
```

**Respuestas:**
- `200 OK`: Requisición validada exitosamente
- `400 Bad Request`: La requisición no está en estado "pendiente_validacion"
- `403 Forbidden`: No es Director de Proyecto o no es autorizador del creador
- `404 Not Found`: Requisición no encontrada

### POST /purchases/requisitions (Modificado)

Ahora detecta automáticamente si debe usar el flujo de validación:
- Si el usuario es PQRS/Coord.Operativo **Y** tiene campo `obra` → estado inicial: `pendiente_validacion`
- Caso contrario → estado inicial: `pendiente` (flujo normal)

### GET /purchases/requisitions/pending-actions (Modificado)

Ahora los Directores de Proyecto ven:
- Requisiciones en estado `pendiente_validacion` (para validar)
- Requisiciones en estado `pendiente` y `en_revision` (para revisar)

## Migración de Base de Datos

Se incluye la migración `1736200000000-AddObraValidationStatuses.ts` que:
1. Agrega el estado `pendiente_validacion` con order = 1
2. Agrega el estado `rechazada_validador` después de `rechazada_revisor`
3. Ajusta automáticamente el orden de los estados existentes

**Para aplicar en producción (Render):**
```bash
npm run migration:run
```

**O ejecutar manualmente el SQL:**
```sql
-- Agregar pendiente_validacion
UPDATE requisition_statuses SET "order" = "order" + 1 WHERE "order" >= 1;
INSERT INTO requisition_statuses (code, name, description, color, "order")
VALUES ('pendiente_validacion', 'Pendiente de validación',
        'Esperando validación por Director de Proyecto antes de revisión', 'indigo', 1);

-- Agregar rechazada_validador (después de rechazada_revisor, ajustar order según su base)
INSERT INTO requisition_statuses (code, name, description, color, "order")
VALUES ('rechazada_validador', 'Rechazada por validador',
        'Devuelta al solicitante por Director de Proyecto en validación', 'pink',
        (SELECT "order" + 1 FROM requisition_statuses WHERE code = 'rechazada_revisor'));
```

## Notificaciones

Se agregan nuevos tipos de notificación:
- `new_for_validation`: Notifica al Director de Proyecto cuando hay una nueva requisición para validar
- `validated`: Notifica al creador cuando su requisición fue validada
- `validation_rejected`: Notifica al creador cuando su requisición fue rechazada en validación

## Registros (Logs)

Nuevas acciones en `requisition_logs`:
- `crear_requisicion_obra`: Requisición creada con obra (flujo de validación)
- `validar_obra`: Requisición validada por Director de Proyecto
- `rechazar_validacion_obra`: Requisición rechazada en validación

## Archivos Modificados

1. **purchases.service.ts**
   - Método `createRequisition`: Detecta flujo de validación
   - Nuevo método `requiresObraValidation`: Helper para detectar condiciones
   - Nuevo método `validateRequisition`: Lógica de validación
   - Método `getPendingActions`: Actualizado para visibilidad de validación

2. **purchases.controller.ts**
   - Nuevo endpoint `POST :id/validate`

3. **validate-requisition.dto.ts** (nuevo)
   - DTO para validación de requisiciones

4. **seed.ts**
   - Agregados nuevos estados de requisición

5. **1736200000000-AddObraValidationStatuses.ts** (nueva migración)
   - Migración para agregar estados en producción

## Pruebas Recomendadas

1. Crear requisición como PQRS **con** campo obra → Debe quedar en `pendiente_validacion`
2. Crear requisición como PQRS **sin** campo obra → Debe quedar en `pendiente`
3. Validar requisición como Director de Proyecto → Debe pasar a `pendiente`
4. Rechazar validación como Director de Proyecto → Debe pasar a `rechazada_validador`
5. Verificar que Director Técnico puede revisar después de validación
6. Verificar visibilidad en `pending-actions` para Directores de Proyecto
