# ColCanal Backend

Backend API para el sistema ERP ColCanal construido con NestJS, TypeORM y PostgreSQL.

## Stack Tecnológico

| Tecnología | Versión | Descripción |
|------------|---------|-------------|
| NestJS | 11.0.1 | Framework backend Node.js |
| TypeScript | 5.7.3 | Lenguaje de programación |
| PostgreSQL | 16 | Base de datos relacional |
| TypeORM | 0.3.27 | ORM para TypeScript |
| Passport + JWT | 0.7.0 | Autenticación |
| class-validator | 0.14.2 | Validación de DTOs |
| Swagger | 11.2.1 | Documentación API |

## Características

- **Autenticación JWT** con access y refresh tokens
- **Control de acceso basado en roles (RBAC)** y permisos granulares
- **Módulo de Requisiciones** completo con flujo de aprobaciones
- **Módulo de Órdenes de Compra** con cotizaciones y SLA
- **Módulo de Levantamientos/Encuestas**
- **Sistema de notificaciones** por email
- **Documentación Swagger** en `/api/docs`

## Instalación

```bash
# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env

# Ejecutar migraciones
npm run migration:run

# Ejecutar seeds
npm run seed:run

# Iniciar en desarrollo
npm run start:dev
```

## Variables de Entorno

```bash
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=***
DATABASE_NAME=colcanal

JWT_SECRET=***
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d

SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=***
SMTP_PASS=***
```

---

# Módulo de Requisiciones

## Estructura de Base de Datos

### Tablas Principales

| Tabla | Descripción |
|-------|-------------|
| `requisitions` | Requisiciones de compra |
| `requisition_items` | Ítems de cada requisición |
| `requisition_statuses` | Catálogo de estados |
| `requisition_approvals` | Registro de aprobaciones |
| `requisition_logs` | Auditoría de acciones |
| `requisition_item_quotations` | Cotizaciones de proveedores |

### Estados de Requisición

| Código | Nombre | Descripción |
|--------|--------|-------------|
| `pendiente` | Pendiente | Requisición nueva sin validación de obra |
| `pendiente_validacion` | Pendiente de validación | Requiere validación de Director de Proyecto |
| `aprobada_revisor` | Aprobada por revisor | Aprobada por Director Técnico |
| `pendiente_autorizacion` | Pendiente de autorización | Requiere autorización de Gerencia de Proyectos |
| `autorizado` | Autorizado | Autorizada por Gerencia de Proyectos |
| `aprobada_gerencia` | Aprobada por gerencia | Aprobada, lista para cotizar |
| `en_cotizacion` | En cotización | En proceso de cotización |
| `cotizada` | Cotizada | Cotización completa, lista para OC |
| `en_orden_compra` | En orden de compra | Orden de compra generada |
| `pendiente_recepcion` | Pendiente de recepción | Esperando recepción de materiales |
| `recepcion_completa` | Recepción completa | Proceso completado |

## Flujo de Aprobaciones

```
CREAR REQUISICIÓN
        │
        ├── PQRS/Coord.Op + obra especial ──► pendiente_validacion
        │                                            │
        │                                    Dir.Proyecto VALIDA
        │                                            │
        ├── Dir.Proyecto/PQRS sin obra ─────────────┤
        │                                            │
        │                                            ▼
        │                                    Dir.Técnico REVISA
        │                                            │
        │                               ┌────────────┴────────────┐
        │                               │                         │
        │                    ¿Requiere Autorización?              │
        │                               │                         │
        │                          SÍ   │   NO                    │
        │                               ▼                         │
        │                    Ger.Proyectos AUTORIZA               │
        │                               │                         │
        ├── Dir.Área ───────────────────┼─────────────────────────┘
        │                               │
        │                               ▼
        │                       Gerencia APRUEBA
        │                               │
        │                               ▼
        │                       COTIZACIÓN (Compras)
        │                               │
        │                               ▼
        │                       ORDEN DE COMPRA
        │                               │
        │                               ▼
        │                       RECEPCIÓN
```

### Condiciones Especiales

**¿Cuándo se requiere VALIDACIÓN de obra?**
- Creador tiene rol PQRS o Coordinador Operativo
- Y la obra es: 'Modernización', 'Expansión', 'Operación y mantenimiento', 'Inversión' o 'Donación'

**¿Cuándo se requiere AUTORIZACIÓN de Gerencia de Proyectos?**
- Creador es Director de Proyecto
- Y la empresa es Unión Temporal, o es C&C con proyecto diferente a 'Oficina Principal'

## API Endpoints

### Requisiciones

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/purchases/requisitions` | Crear requisición |
| GET | `/api/purchases/requisitions` | Listar requisiciones |
| GET | `/api/purchases/requisitions/:id` | Obtener detalle |
| PATCH | `/api/purchases/requisitions/:id` | Actualizar requisición |
| POST | `/api/purchases/requisitions/:id/validate` | Validar obra |
| POST | `/api/purchases/requisitions/:id/review` | Revisar |
| POST | `/api/purchases/requisitions/:id/authorize` | Autorizar |
| POST | `/api/purchases/requisitions/:id/approve` | Aprobar |
| GET | `/api/purchases/requisitions/pending-actions` | Pendientes por rol |
| GET | `/api/purchases/requisitions/my-requisitions` | Mis requisiciones |

### Cotizaciones

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/purchases/quotations` | Listar requisiciones para cotizar |
| GET | `/api/purchases/quotations/:id` | Detalle de cotización |
| POST | `/api/purchases/quotations/:id` | Gestionar cotización |
| POST | `/api/purchases/quotations/:id/assign-prices` | Asignar precios |

### Órdenes de Compra

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/purchases/purchase-orders` | Crear orden de compra |
| GET | `/api/purchases/purchase-orders` | Listar órdenes |
| GET | `/api/purchases/purchase-orders/:id` | Detalle de orden |
| POST | `/api/purchases/purchase-orders/:id/approve` | Aprobar orden |
| POST | `/api/purchases/purchase-orders/:id/reject` | Rechazar orden |

## DTOs Principales

### CreateRequisitionDto
```typescript
{
  companyId: number;              // Requerido
  projectId?: number;             // Requerido para C&C
  obra?: string;                  // Activa validación si tiene valor especial
  codigoObra?: string;
  priority?: 'alta' | 'normal';   // Default: 'normal'
  items: [{
    materialId: number;
    quantity: number;
    observation?: string;
  }]
}
```

### ReviewRequisitionDto
```typescript
{
  decision: 'approve' | 'reject';
  comments?: string;              // Requerido si rechaza
  itemDecisions?: [{
    itemId: number;
    decision: 'approve' | 'reject';
    comments?: string;
  }]
}
```

## Permisos

| ID | Permiso | Descripción |
|----|---------|-------------|
| 1 | Ver | Ver requisiciones |
| 2 | Crear | Crear requisiciones |
| 3 | Revisar | Revisar (Director Técnico) |
| 4 | Aprobar | Aprobar (Gerencia) |
| 5 | Autorizar | Autorizar (Gerencia de Proyectos) |
| 6 | Cotizar | Cotizar (Compras) |
| 7 | Exportar | Exportar datos |
| 8 | Validar | Validar obra (Director de Proyecto) |

## SLA (Plazos)

| Estado | Plazo | Descripción |
|--------|-------|-------------|
| `aprobada_gerencia` | 1 día hábil | Para realizar cotización |
| `cotizada` | 2 días hábiles | Para generar orden de compra |

**Regla de las 3 PM**: Si una aprobación/cotización ocurre después de las 3:00 PM, el SLA comienza el siguiente día hábil.

**Días hábiles**: Lunes a Viernes, excluyendo festivos colombianos.
**Horario laboral**: 7:00 AM - 7:00 PM.

---

## Documentación API

Acceder a Swagger UI: `http://localhost:3000/api/docs`

## Testing

```bash
npm run test        # Unit tests
npm run test:e2e    # E2E tests
npm run test:cov    # Coverage
```

## Licencia

UNLICENSED - Proyecto Privado
