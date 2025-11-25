# Documentación: Nuevo Flujo de Autorización de Requisiciones

## Resumen Ejecutivo

Se ha implementado un nuevo paso de autorización en el flujo de requisiciones que aplica **solo cuando un Director de Proyecto crea requisiciones en proyectos específicos**. Este documento detalla todos los cambios en el backend para que el equipo de frontend pueda implementar la interfaz correspondiente.

---

## 1. Contexto del Negocio

### ¿Cuándo aplica el nuevo paso de autorización?

El paso de autorización de "Gerencia de Proyectos" **SOLO** aplica cuando se cumplen estas condiciones:

#### ✅ Aplica en estos casos:

1. **Director de Proyecto** (cualquier región: Antioquia, Quindío, Valle, Putumayo) crea una requisición, **Y** se cumple una de estas condiciones:
   - La requisición es para una **Unión Temporal (UT)**: Uniones y Alianzas (U&A) o Inversiones Garcés Escalante (IGE)
   - La requisición es para uno de estos proyectos de **Canales & Contactos**:
     - Ciudad Bolívar
     - Jericó
     - Pueblo Rico
     - Tarso

#### ❌ NO aplica en estos casos:

1. La requisición es creada por:
   - PQRS (cualquier región)
   - Analistas (cualquier área)
   - Directores de Área (PMO, Comercial, Jurídico, Técnico, Financiero)
   - Cualquier otro rol

2. La requisición es para:
   - Oficina Principal (Canales & Contactos)
   - Proyectos de C&C que NO son: Ciudad Bolívar, Jericó, Pueblo Rico, Tarso
   - Empresas que no requieren autorización

---

## 2. Cambios en el Flujo de Estados

### Estados Anteriores

```
1. Pendiente → 2. En revisión → 3. Aprobada por revisor → 4. Aprobada por gerencia → ...
```

### Nuevos Estados Agregados

Se agregaron **2 nuevos estados** en el flujo:

| Código | Nombre | Descripción | Color | Orden |
|--------|--------|-------------|-------|-------|
| `pendiente_autorizacion` | Pendiente de autorización | Esperando autorización de Gerencia de Proyectos | `amber` | 4 |
| `autorizado` | Autorizado | Autorizado por Gerencia de Proyectos, listo para Gerencia | `lime` | 5 |

### Flujo Completo Actualizado

```
1. pendiente (Pendiente)
2. en_revision (En revisión)
3. aprobada_revisor (Aprobada por revisor)
4. pendiente_autorizacion (Pendiente de autorización) ← NUEVO
5. autorizado (Autorizado) ← NUEVO
6. aprobada_gerencia (Aprobada por gerencia)
7. en_cotizacion (En cotización)
8. rechazada_revisor (Rechazada por revisor)
9. rechazada_gerencia (Rechazada por gerencia)
10. cotizada (Cotizada)
11. en_orden_compra (En orden de compra)
12. pendiente_recepcion (Pendiente de recepción)
13. en_recepcion (En recepción)
14. recepcion_completa (Recepción completa)
```

---

## 3. Nuevo Rol y Permisos

### Rol: "Gerencia de Proyectos"

- **Categoría**: GERENCIA
- **Descripción**: Autoriza requisiciones creadas por Directores de Proyecto
- **Permisos**:
  - `Ver` - Ver requisiciones
  - `Crear` - Crear requisiciones propias
  - `Autorizar` - Autorizar/rechazar requisiciones de Directores de Proyecto
- **Gestiones**:
  - `Inventarios` - Para recepción de materiales

### Credenciales de Prueba

```
Email: gerencia.proyectos@canalcongroup.com
Password: password123
Nombre: Carlos Ramírez
Cargo: Gerente de Proyectos
```

---

## 4. Nuevo Endpoint de API

### POST `/api/purchases/requisitions/:id/authorize`

Permite a **Gerencia de Proyectos** autorizar o rechazar requisiciones.

#### Headers

```
Authorization: Bearer {token}
Content-Type: application/json
```

#### Request Body

```json
{
  "decision": "authorize",  // "authorize" | "reject"
  "comments": "Aprobado para proceder a Gerencia"  // Opcional
}
```

#### Responses

**200 OK** - Requisición autorizada exitosamente
```json
{
  "requisitionId": 123,
  "status": {
    "code": "autorizado",
    "name": "Autorizado"
  },
  // ... resto de datos de la requisición
}
```

**400 Bad Request** - La requisición no está en estado válido
```json
{
  "statusCode": 400,
  "message": "Esta requisición no puede ser autorizada en su estado actual: aprobada_gerencia"
}
```

**403 Forbidden** - No tiene permisos para autorizar
```json
{
  "statusCode": 403,
  "message": "Solo Gerencia de Proyectos puede autorizar requisiciones"
}
```

**404 Not Found** - Requisición no encontrada
```json
{
  "statusCode": 404,
  "message": "Requisición no encontrada"
}
```

---

## 5. Lógica de Transición de Estados

### Cuando un Director de Área revisa y aprueba una requisición

El backend ahora evalúa automáticamente si requiere autorización:

```javascript
// Antes (flujo antiguo):
aprobada_revisor → aprobada_gerencia

// Ahora (flujo condicional):
if (requiereAutorización) {
  aprobada_revisor → pendiente_autorizacion
} else {
  aprobada_revisor → aprobada_gerencia
}
```

### Cuando Gerencia de Proyectos autoriza/rechaza

```javascript
// Si autoriza:
pendiente_autorizacion → autorizado

// Si rechaza:
pendiente_autorizacion → rechazada_revisor
```

### Cuando Gerencia aprueba

Gerencia ahora puede aprobar requisiciones que vengan de:
- `aprobada_revisor` (flujo sin autorización)
- `autorizado` (flujo con autorización)

---

## 6. Cambios Requeridos en el Frontend

### 6.1 Actualizar Gestión de Estados

#### Archivo de constantes de estados
Agregar los nuevos estados al enum/objeto de estados:

```typescript
export const RequisitionStatus = {
  // ... estados existentes
  PENDIENTE_AUTORIZACION: 'pendiente_autorizacion',
  AUTORIZADO: 'autorizado',
} as const;

export const requisitionStatusConfig = {
  // ... configs existentes
  pendiente_autorizacion: {
    code: 'pendiente_autorizacion',
    name: 'Pendiente de autorización',
    description: 'Esperando autorización de Gerencia de Proyectos',
    color: 'amber',
    order: 4,
  },
  autorizado: {
    code: 'autorizado',
    name: 'Autorizado',
    description: 'Autorizado por Gerencia de Proyectos, listo para Gerencia',
    color: 'lime',
    order: 5,
  },
};
```

### 6.2 Componente de Detalle de Requisición

Agregar botones de acción condicionales para **Gerencia de Proyectos**:

```tsx
// Pseudo-código
function RequisitionDetail({ requisition, currentUser }) {
  const isGerenciaProyectos = currentUser.role === 'Gerencia de Proyectos';
  const canAuthorize =
    isGerenciaProyectos &&
    requisition.status.code === 'pendiente_autorizacion';

  return (
    <div>
      {/* ... detalles de la requisición ... */}

      {canAuthorize && (
        <div className="authorization-actions">
          <button onClick={() => handleAuthorize('authorize')}>
            ✓ Autorizar
          </button>
          <button onClick={() => handleAuthorize('reject')}>
            ✗ Rechazar
          </button>
        </div>
      )}
    </div>
  );
}

async function handleAuthorize(decision: 'authorize' | 'reject') {
  const comments = await showCommentsModal();

  await fetch(`/api/purchases/requisitions/${requisitionId}/authorize`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ decision, comments }),
  });

  // Recargar la requisición
  await fetchRequisition();
}
```

### 6.3 Lista de Requisiciones

Agregar filtro para **Gerencia de Proyectos**:

```tsx
// Filtro para mostrar requisiciones pendientes de autorización
function RequisitionsList({ currentUser }) {
  const filters = {
    // ... filtros existentes
    ...(currentUser.role === 'Gerencia de Proyectos' && {
      pendingAuthorization: {
        label: 'Pendientes de autorización',
        status: 'pendiente_autorizacion',
        badge: 'amber',
      },
    }),
  };
}
```

### 6.4 Badge/Chip de Estado

Actualizar el componente de badge para mostrar el nuevo estado:

```tsx
function StatusBadge({ status }) {
  const colorMap = {
    // ... colores existentes
    pendiente_autorizacion: 'bg-amber-100 text-amber-800',
    autorizado: 'bg-lime-100 text-lime-800',
  };

  return (
    <span className={colorMap[status.code]}>
      {status.name}
    </span>
  );
}
```

### 6.5 Timeline/Historial de Cambios

Agregar iconos y textos para las nuevas acciones:

```tsx
const actionLabels = {
  // ... acciones existentes
  autorizar_aprobar: {
    icon: '✓',
    label: 'Autorizó',
    color: 'green',
  },
  autorizar_rechazar: {
    icon: '✗',
    label: 'Rechazó autorización',
    color: 'red',
  },
  revisar_aprobar_pendiente_autorizacion: {
    icon: '→',
    label: 'Envió a autorización',
    color: 'blue',
  },
};
```

### 6.6 Dashboard/Indicadores

Para el rol **Gerencia de Proyectos**, mostrar:

```tsx
function Dashboard({ currentUser }) {
  if (currentUser.role === 'Gerencia de Proyectos') {
    return (
      <div>
        <Card>
          <h3>Pendientes de Autorización</h3>
          <span className="count">{pendingAuthCount}</span>
        </Card>
        {/* ... otros indicadores ... */}
      </div>
    );
  }
}
```

---

## 7. Permisos y Roles en el Frontend

### Actualizar el enum/objeto de roles

```typescript
export const UserRole = {
  // ... roles existentes
  GERENCIA_PROYECTOS: 'Gerencia de Proyectos',
} as const;
```

### Actualizar el enum/objeto de permisos

```typescript
export const Permission = {
  // ... permisos existentes
  AUTORIZAR: 'Autorizar',
} as const;
```

### Guards de Autorización

```typescript
function canAuthorizeRequisition(user: User, requisition: Requisition): boolean {
  return (
    user.role === 'Gerencia de Proyectos' &&
    requisition.status.code === 'pendiente_autorizacion'
  );
}
```

---

## 8. Flujos de Usuario por Rol

### 8.1 Director de Proyecto

**Escenario A**: Crea requisición en proyecto que requiere autorización

```
1. Crea requisición
2. Director de Área la revisa y aprueba
3. Estado cambia a: "Pendiente de autorización"
4. Espera autorización de Gerencia de Proyectos
5. Si es autorizada → Estado: "Autorizado"
6. Gerencia la aprueba
7. Continúa flujo normal
```

**Escenario B**: Crea requisición en proyecto que NO requiere autorización

```
1. Crea requisición
2. Director de Área la revisa y aprueba
3. Estado cambia a: "Aprobada por revisor"
4. Gerencia la aprueba directamente
5. Continúa flujo normal
```

### 8.2 Gerencia de Proyectos

```
1. Ve lista de requisiciones con estado "Pendiente de autorización"
2. Abre detalle de la requisición
3. Revisa la información
4. Decide:
   - ✓ Autorizar → Requisición pasa a "Autorizado"
   - ✗ Rechazar → Requisición vuelve a "Rechazada por revisor"
5. Agrega comentarios (opcional)
6. Confirma la acción
```

### 8.3 Gerencia (rol existente)

**Cambio**: Ahora puede recibir requisiciones de dos estados:

```
Estado anterior → Estado siguiente
──────────────────────────────────
aprobada_revisor → aprobada_gerencia  (flujo sin autorización)
autorizado → aprobada_gerencia         (flujo con autorización)
```

**Interfaz**: No necesita cambios, solo debe poder aprobar ambos estados.

---

## 9. Ejemplos de Interfaz

### 9.1 Card de Requisición (Vista de Lista)

```
┌─────────────────────────────────────────────────────┐
│ REQ-C&C-0123                    [Pendiente de aut.] │
│ Materiales eléctricos para Ciudad Bolívar           │
│                                                      │
│ Creado por: Juan Pérez (Dir. Proyecto Antioquia)   │
│ Proyecto: Ciudad Bolívar                            │
│ Monto estimado: $5,000,000                          │
│                                                      │
│ [Ver detalles] [Autorizar ✓] [Rechazar ✗]          │
└─────────────────────────────────────────────────────┘
```

### 9.2 Modal de Autorización

```
┌───────────────────────────────────────┐
│ Autorizar Requisición REQ-C&C-0123    │
├───────────────────────────────────────┤
│                                        │
│ ¿Desea autorizar esta requisición?   │
│                                        │
│ [Comentarios (opcional)]              │
│ ┌────────────────────────────────┐   │
│ │                                 │   │
│ └────────────────────────────────┘   │
│                                        │
│           [Cancelar] [Autorizar]      │
└───────────────────────────────────────┘
```

### 9.3 Timeline de Estados (en detalle de requisición)

```
✓ Pendiente (hace 2 días)
  Creado por Juan Pérez - Director de Proyecto Antioquia

✓ En revisión (hace 1 día)
  Asignado a María López - Director PMO

✓ Aprobada por revisor (hace 1 día)
  Aprobado por María López
  Comentario: "Materiales validados, envío a autorización"

→ Pendiente de autorización (hace 4 horas)
  Esperando autorización de Gerencia de Proyectos

  [ACCIÓN PENDIENTE]
```

---

## 10. Testing

### Casos de Prueba Sugeridos

#### Test 1: Flujo con autorización (Director de Proyecto → Ciudad Bolívar)

```
1. Login como: director.antioquia@canalcongroup.com
2. Crear requisición para proyecto "Ciudad Bolívar"
3. Login como: director.pmo@canalcongroup.com
4. Revisar y aprobar la requisición
5. Verificar que el estado es "pendiente_autorizacion"
6. Login como: gerencia.proyectos@canalcongroup.com
7. Autorizar la requisición
8. Verificar que el estado es "autorizado"
9. Login como: gerencia@canalcongroup.com
10. Aprobar la requisición
11. Verificar que el estado es "aprobada_gerencia"
```

#### Test 2: Flujo sin autorización (Analista → Oficina Principal)

```
1. Login como: analista.pmo@canalcongroup.com
2. Crear requisición para proyecto "Oficina Principal"
3. Login como: director.pmo@canalcongroup.com
4. Revisar y aprobar la requisición
5. Verificar que el estado es "aprobada_revisor" (NO pendiente_autorizacion)
6. Login como: gerencia@canalcongroup.com
7. Aprobar la requisición directamente
8. Verificar que el estado es "aprobada_gerencia"
```

#### Test 3: Rechazo por Gerencia de Proyectos

```
1. Login como: director.quindio@canalcongroup.com
2. Crear requisición para proyecto "Jericó"
3. Login como: director.pmo@canalcongroup.com
4. Revisar y aprobar la requisición
5. Login como: gerencia.proyectos@canalcongroup.com
6. Rechazar la requisición con comentarios
7. Verificar que el estado es "rechazada_revisor"
8. Verificar que el creador puede ver los comentarios de rechazo
```

---

## 11. Endpoints Relacionados

### Endpoints existentes que siguen funcionando:

- `GET /api/purchases/requisitions` - Listar requisiciones (filtra por rol)
- `GET /api/purchases/requisitions/:id` - Obtener detalle de requisición
- `POST /api/purchases/requisitions` - Crear requisición
- `POST /api/purchases/requisitions/:id/review` - Revisar requisición (Director de Área)
- `POST /api/purchases/requisitions/:id/approve` - Aprobar requisición (Gerencia)

### Nuevo endpoint:

- `POST /api/purchases/requisitions/:id/authorize` - Autorizar requisición (Gerencia de Proyectos)

---

## 12. Validaciones Importantes

### Frontend debe validar:

1. ✅ Solo mostrar botones de autorización si:
   - Usuario es "Gerencia de Proyectos"
   - Estado de requisición es "pendiente_autorizacion"

2. ✅ Mostrar mensaje informativo en requisiciones con estado "autorizado":
   - "Esta requisición fue autorizada por Gerencia de Proyectos y está lista para aprobación de Gerencia"

3. ✅ En el dashboard de Gerencia de Proyectos:
   - Solo mostrar requisiciones en estado "pendiente_autorizacion"
   - No mostrar requisiciones de otros estados que no le corresponden

4. ✅ En el filtro de estados:
   - Los nuevos estados deben aparecer en orden correcto (4 y 5)
   - Usar los colores especificados (amber y lime)

---

## 13. Preguntas Frecuentes

### ¿Qué pasa si un Director de Proyecto crea una requisición para un proyecto que luego cambia?
El sistema evalúa la necesidad de autorización **en el momento de la revisión**, no en el momento de creación. Si el proyecto cambia antes de la revisión, se aplicará la lógica correspondiente al proyecto actual.

### ¿Gerencia de Proyectos puede crear requisiciones?
Sí, tiene permiso de "Crear", pero sus propias requisiciones **no requieren autorización**. Como Gerencia de Proyectos no es un "Director de Proyecto", sus requisiciones pasan directamente a aprobación de Gerencia sin pasar por el paso de autorización.

### ¿Qué pasa si Gerencia de Proyectos rechaza una requisición?
La requisición vuelve al estado "rechazada_revisor" para que el Director de Proyecto pueda corregirla y reenviarla.

### ¿El rol de Gerencia normal cambió?
No, Gerencia sigue aprobando requisiciones. Ahora puede recibir requisiciones desde dos estados diferentes: "aprobada_revisor" (flujo antiguo) o "autorizado" (flujo nuevo).

---

## 14. Servidor de Desarrollo

**URL del backend**: `http://localhost:3000`
**Documentación Swagger**: `http://localhost:3000/api`

---

## 15. Contacto

Para dudas sobre la implementación del backend o la lógica de negocio, contactar al equipo de backend.

**Última actualización**: 2024-11-25
